/**
 * Rain outlook for a location, from Open-Meteo (free, no API key, CC BY 4.0).
 * Used by Farmer mode: heavy rain soon after fertilizer is when the most nitrate washes away.
 * Falls back to a saved copy, then to the bundled demo weather.
 */
import demoWeather from './bundled/weather-demo.json';
import { readCache, isFresh, writeCache } from './cache';
import { fetchJson } from './sources/http';
import type { Place } from './types';

export interface RainDay {
  date: string; // YYYY-MM-DD
  rainIn: number;
}

export interface RainOutlook {
  days: RainDay[];
  todayIndex: number; // which entry in `days` is today
  source: 'live' | 'saved' | 'demo';
  updatedAt: string;
}

interface OpenMeteo {
  daily: { time: string[]; precipitation_sum: (number | null)[] };
}

function fromDemo(): RainOutlook {
  // The demo file holds the 14 days before it was made, then 7 days of forecast.
  const generatedDay = demoWeather.generatedAt.slice(0, 10);
  const idx = demoWeather.daily.findIndex((d) => d.date === generatedDay);
  return { days: demoWeather.daily, todayIndex: idx >= 0 ? idx : 14, source: 'demo', updatedAt: demoWeather.generatedAt };
}

export async function getRainOutlook(place: Place, demo: boolean): Promise<RainOutlook> {
  if (demo) return fromDemo();
  const key = `weather:${place.lat.toFixed(2)},${place.lon.toFixed(2)}`;
  const saved = readCache<RainOutlook>(key);
  if (saved && isFresh(saved, 60)) return saved.data;
  try {
    const json = await fetchJson<OpenMeteo>(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat.toFixed(3)}&longitude=${place.lon.toFixed(3)}` +
        '&daily=precipitation_sum&precipitation_unit=inch&timezone=auto&past_days=7&forecast_days=7',
    );
    const days = json.daily.time.map((date, i) => ({ date, rainIn: json.daily.precipitation_sum[i] ?? 0 }));
    const outlook: RainOutlook = { days, todayIndex: 7, source: 'live', updatedAt: new Date().toISOString() };
    writeCache(key, outlook);
    return outlook;
  } catch {
    if (saved) return { ...saved.data, source: 'saved' };
    return fromDemo();
  }
}

/** Total rain over the next `n` days, starting today. */
export const rainAhead = (o: RainOutlook, n = 3) => o.days.slice(o.todayIndex, o.todayIndex + n).reduce((a, d) => a + d.rainIn, 0);

/** Total rain over the past `n` full days (not counting today). */
export const rainBehind = (o: RainOutlook, n = 7) => o.days.slice(Math.max(0, o.todayIndex - n), o.todayIndex).reduce((a, d) => a + d.rainIn, 0);
