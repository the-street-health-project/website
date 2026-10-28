/**
 * ResilientSource: makes sure the app always shows *something*, and says where it came from.
 *
 * For every request (sites, nitrate history, river flow, current conditions) it tries, in order:
 *   1. a recent saved copy (less than FRESH_MINUTES old), to avoid re-downloading
 *   2. each live source in the chain (USGS Water Services, then the newer USGS Water Data API)
 *   3. an older saved copy from a previous visit
 *   4. the data bundled inside the app
 *
 * It is itself a DataSource, so the rest of the app uses it exactly like any other source.
 */
import { isFresh, readCache, writeCache } from '../cache';
import type { DataSource, DataStatus, DateRange, Measurement, Reading, Site } from '../types';

const FRESH_MINUTES = 10;

export class ResilientSource implements DataSource {
  kind = 'official' as const;
  /** Describes where the most recent site list came from (live, cached, or demo). */
  status: DataStatus = { mode: 'loading' };

  constructor(
    public id: string,
    public label: string,
    private live: DataSource[],
    private fallback: DataSource,
  ) {}

  async getSites(): Promise<Site[]> {
    const key = `${this.id}:sites`;
    const saved = readCache<{ sourceLabel: string; sites: Site[] }>(key);
    if (saved && isFresh(saved, FRESH_MINUTES) && saved.data.sites.length) {
      this.status = { mode: 'live', sourceLabel: saved.data.sourceLabel, updatedAt: saved.savedAt };
      return this.tag(saved.data.sites);
    }
    for (const source of this.live) {
      try {
        const sites = await source.getSites();
        if (!sites.length) continue; // an empty answer is treated as a failure
        const entry = writeCache(key, { sourceLabel: source.label, sites });
        this.status = { mode: 'live', sourceLabel: source.label, updatedAt: entry.savedAt };
        return this.tag(sites);
      } catch {
        // This source is down or unreachable. Try the next one.
      }
    }
    if (saved?.data.sites.length) {
      this.status = { mode: 'cached', sourceLabel: saved.data.sourceLabel, updatedAt: saved.savedAt };
      return this.tag(saved.data.sites);
    }
    const sites = await this.fallback.getSites();
    this.status = { mode: 'demo', updatedAt: sites[0]?.latest?.time ?? new Date().toISOString() };
    return this.tag(sites);
  }

  getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    return this.chain(`readings:${siteId}:${range.days}`, (s) => s.getReadings(siteId, range), false);
  }

  getFlow(siteId: string, range: DateRange): Promise<Reading[]> {
    return this.chain(`flow:${siteId}:${range.days}`, (s) => s.getFlow?.(siteId, range), false);
  }

  /** Many sites measure nothing besides nitrate, so an empty answer here is a real answer. */
  getConditions(siteId: string): Promise<Measurement[]> {
    return this.chain(`conditions:${siteId}`, (s) => s.getConditions?.(siteId), true);
  }

  /**
   * The same steps for every kind of per-site request: recent saved copy → each live source
   * → older saved copy → bundled data. `ask` returns undefined if a source can't answer that kind.
   */
  private async chain<T>(name: string, ask: (s: DataSource) => Promise<T[]> | undefined, acceptEmpty: boolean): Promise<T[]> {
    const key = `${this.id}:${name}`;
    const saved = readCache<T[]>(key);
    if (saved && isFresh(saved, FRESH_MINUTES * 3)) return saved.data;
    for (const source of this.live) {
      try {
        const pending = ask(source);
        if (!pending) continue;
        const list = await pending;
        if (!list.length && !acceptEmpty) continue;
        writeCache(key, list);
        return list;
      } catch {
        // try the next source
      }
    }
    if (saved) return saved.data;
    return (await ask(this.fallback)) ?? [];
  }

  /** Marks sites as coming from this source, so later reading requests are routed back here. */
  private tag(sites: Site[]): Site[] {
    return sites.map((s) => ({ ...s, sourceId: this.id }));
  }
}
