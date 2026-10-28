/**
 * User settings, saved in the browser so they're remembered next time.
 * Any component can read or change them with the useSettings() hook.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Place } from '../data/types';
import { EMBEDDED } from '../lib/env';
import { loadJson, saveJson } from '../lib/storage';

export type Mode = 'resident' | 'farmer';
export type Crop = 'corn' | 'soybeans' | 'small-grains' | 'hay-pasture' | 'other';

export interface Settings {
  onboarded: boolean;
  mode: Mode;
  home: Place | null; // resident: where they live
  field: Place | null; // farmer: where the field is
  crop: Crop;
  tileDrained: 'yes' | 'no' | 'unsure';
  demo: boolean; // use bundled sample data instead of live data
  showCommunityExamples: boolean; // show the example community sensors in demo mode
  alertRadiusMi: number;
  dismissedAlerts: string[];
  effects: 'full' | 'reduced'; // 3D holograms and animations, or calmer still versions
  mapView: '2d' | '3d';
  watched: WatchedSite[]; // rivers the user tapped "Watch" on, newest first
}

/** The name is saved too, so a river still shows on the list while its sensor is offline. */
export interface WatchedSite {
  id: string;
  name: string;
}

// Still saved under the app's first name, so people who already use it keep their settings and watch list.
const KEY = 'clearcreek:settings';

export const DEFAULT_SETTINGS: Settings = {
  onboarded: false,
  mode: 'resident',
  home: null,
  field: null,
  crop: 'corn',
  tileDrained: 'unsure',
  demo: false,
  showCommunityExamples: true,
  alertRadiusMi: 30,
  dismissedAlerts: [],
  effects: 'full',
  mapView: '2d',
  watched: [],
};

/** The location demo mode uses if the user hasn't picked one: a farm town on the Raccoon River. */
export const DEMO_PLACE: Place = { name: 'Jefferson, Iowa (demo)', lat: 42.0158, lon: -94.3772 };

interface SettingsContextValue {
  settings: Settings;
  update: (patch: Partial<Settings>) => void;
  reset: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...loadJson<Partial<Settings>>(KEY, {}) }));

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveJson(KEY, next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveJson(KEY, DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(() => ({ settings, update, reset }), [settings, update, reset]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside <SettingsProvider>');
  return ctx;
}

/** Adds a site to the watch list (at the top) or removes it. Kept separate so it can be tested. */
export function toggleWatched(watched: WatchedSite[], site: WatchedSite): WatchedSite[] {
  return watched.some((w) => w.id === site.id)
    ? watched.filter((w) => w.id !== site.id)
    : [{ id: site.id, name: site.name }, ...watched].slice(0, 30);
}

/** The rivers the user is watching: `const { watched, isWatched, toggle } = useWatchlist()`. */
export function useWatchlist() {
  const { settings, update } = useSettings();
  const { watched } = settings;
  const isWatched = useCallback((id: string) => watched.some((w) => w.id === id), [watched]);
  const toggle = useCallback((site: WatchedSite) => update({ watched: toggleWatched(watched, site) }), [watched, update]);
  return { watched, isWatched, toggle };
}

/** The location the current mode cares about (home for residents, field for farmers). */
export function activePlace(s: Settings): Place | null {
  const place = s.mode === 'farmer' ? s.field ?? s.home : s.home ?? s.field;
  return place ?? (s.demo || EMBEDDED ? DEMO_PLACE : null);
}
