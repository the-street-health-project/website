/**
 * fetch() with a time limit. Rural cell signal can hang for a long time;
 * after `seconds`, we give up so the app can fall back to saved data quickly.
 */
export async function fetchJson<T>(url: string, seconds = 12): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), seconds * 1000);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** Rounds to 2 decimal places, the precision USGS reports nitrate in. */
export const round2 = (n: number) => Math.round(n * 100) / 100;
