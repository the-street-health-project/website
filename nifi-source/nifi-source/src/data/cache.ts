/**
 * A small time-stamped cache in localStorage.
 *
 * Every successful download is saved with the time it was saved. If the next download fails
 * (no signal, USGS is down), the app uses the saved copy and tells the user how old it is.
 */
import { loadJson, saveJson } from '../lib/storage';

interface Entry<T> {
  savedAt: string; // ISO time
  data: T;
}

const PREFIX = 'clearcreek:cache:'; // the app's first name; kept so saved data still works

export function readCache<T>(key: string): Entry<T> | null {
  return loadJson<Entry<T> | null>(PREFIX + key, null);
}

export function writeCache<T>(key: string, data: T): Entry<T> {
  const entry = { savedAt: new Date().toISOString(), data };
  saveJson(PREFIX + key, entry);
  return entry;
}

/** True if the entry is younger than maxAgeMinutes. */
export function isFresh(entry: { savedAt: string } | null, maxAgeMinutes: number): boolean {
  return !!entry && Date.now() - Date.parse(entry.savedAt) < maxAgeMinutes * 60_000;
}
