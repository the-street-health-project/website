/**
 * Loads monitoring sites from every active data source and shares them with the whole app.
 *
 *   const { sites, status, getReadings } = useData();
 *
 * Sites from all sources (official USGS, and in demo mode the example community sensors)
 * come back in one list. Each site remembers which source it came from, so getReadings()
 * asks the right source for its history.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { SNAPSHOT_TIME } from '../data/sources/bundled';
import { createSources, ResilientSource } from '../data/sources';
import type { DataSource, DataStatus, Measurement, Reading, Site } from '../data/types';
import { EMBEDDED } from '../lib/env';
import { withoutDuplicateSamples } from '../lib/geo';
import { useSettings } from './settings';

interface DataContextValue {
  sites: Site[];
  status: DataStatus;
  refresh: () => void;
  getReadings: (site: Site, days?: number) => Promise<Reading[]>;
  /** Daily river flow (ft³/s). Empty if the site's source doesn't measure flow. */
  getFlow: (site: Site, days?: number) => Promise<Reading[]>;
  /** River flow, temperature, oxygen... right now. Empty if the source doesn't measure them. */
  getConditions: (site: Site) => Promise<Measurement[]>;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  // Embedded previews block outside requests, so they always use the saved (demo) data.
  const demo = settings.demo || EMBEDDED;
  const { showCommunityExamples } = settings;

  // Rebuild the list of sources only when demo mode or the community setting changes.
  const sources = useMemo(() => createSources({ demo, showCommunityExamples }), [demo, showCommunityExamples]);
  const all: DataSource[] = useMemo(() => [sources.official, ...sources.others], [sources]);

  const [sites, setSites] = useState<Site[]>([]);
  const [status, setStatus] = useState<DataStatus>({ mode: 'loading' });
  const [reloadCount, setReloadCount] = useState(0);
  // Requests already made, so two screens asking for the same thing share one download.
  const readingCache = useRef(new Map<string, Promise<unknown>>());

  useEffect(() => {
    let cancelled = false;
    readingCache.current.clear();
    setStatus({ mode: 'loading' });
    Promise.all(all.map((src) => src.getSites().catch(() => [] as Site[]))).then((lists) => {
      if (cancelled) return;
      setSites(withoutDuplicateSamples(lists.flat()));
      const official = sources.official;
      setStatus(official instanceof ResilientSource ? official.status : { mode: 'demo', updatedAt: SNAPSHOT_TIME });
    });
    return () => {
      cancelled = true;
    };
  }, [all, sources, reloadCount]);

  /** Asks the site's own source, once per key; failures become an empty list. */
  const ask = useCallback(
    <T,>(key: string, site: Site, load: (source: DataSource) => Promise<T[]> | undefined): Promise<T[]> => {
      let pending = readingCache.current.get(key) as Promise<T[]> | undefined;
      if (!pending) {
        const source = all.find((s) => s.id === site.sourceId) ?? sources.official;
        pending = (load(source) ?? Promise.resolve([])).catch(() => []);
        readingCache.current.set(key, pending);
      }
      return pending;
    },
    [all, sources],
  );

  const getReadings = useCallback(
    (site: Site, days = 30) => ask(`readings:${site.sourceId}:${site.id}:${days}`, site, (src) => src.getReadings(site.id, { days })),
    [ask],
  );
  const getFlow = useCallback(
    (site: Site, days = 30) => ask(`flow:${site.sourceId}:${site.id}:${days}`, site, (src) => src.getFlow?.(site.id, { days })),
    [ask],
  );
  const getConditions = useCallback(
    (site: Site) => ask(`conditions:${site.sourceId}:${site.id}`, site, (src) => src.getConditions?.(site.id)),
    [ask],
  );

  const refresh = useCallback(() => setReloadCount((n) => n + 1), []);
  const value = useMemo(
    () => ({ sites, status, refresh, getReadings, getFlow, getConditions }),
    [sites, status, refresh, getReadings, getFlow, getConditions],
  );
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

/**
 * Runs `load` whenever `key` changes and returns its list ([] while loading).
 * `key` must change whenever what's being loaded changes; `load` itself isn't watched.
 */
function useList<T>(key: string, load: (() => Promise<T[]>) | null): { data: T[]; loading: boolean } {
  const [state, setState] = useState<{ key: string; data: T[] }>({ key: '', data: [] });
  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    if (!loadRef.current) return;
    let cancelled = false;
    loadRef.current().then((data) => {
      if (!cancelled) setState({ key, data });
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { data: state.key === key ? state.data : [], loading: !!load && state.key !== key };
}

const siteKey = (site: Site | null, extra = '') => (site ? `${site.sourceId}:${site.id}:${extra}` : '');

/** A site's daily nitrate readings (or [] while loading). */
export function useReadings(site: Site | null, days = 30): { readings: Reading[]; loading: boolean } {
  const { getReadings } = useData();
  const { data, loading } = useList(siteKey(site, `n${days}`), site ? () => getReadings(site, days) : null);
  return { readings: data, loading };
}

/** A site's daily river flow in ft³/s (or [] while loading, or if it isn't measured). */
export function useFlow(site: Site | null, days = 30): { flow: Reading[]; loading: boolean } {
  const { getFlow } = useData();
  const { data, loading } = useList(siteKey(site, `f${days}`), site ? () => getFlow(site, days) : null);
  return { flow: data, loading };
}

/** What else is measured at a site right now (or [] while loading). */
export function useConditions(site: Site | null): { conditions: Measurement[]; loading: boolean } {
  const { getConditions } = useData();
  const { data, loading } = useList(siteKey(site, 'c'), site ? () => getConditions(site) : null);
  return { conditions: data, loading };
}
