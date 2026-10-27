/**
 * Safe wrappers around the browser's localStorage.
 * Private browsing modes and some embedded views block storage, so every call is in try/catch
 * and the app keeps working (it just won't remember things between visits).
 */

export function loadJson<T>(key: string, fallback: T): T {
  try {
    const text = localStorage.getItem(key);
    return text ? (JSON.parse(text) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function saveJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or blocked. Nothing else to do.
  }
}

export function removeKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
