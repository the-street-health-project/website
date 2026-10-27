/**
 * The other things USGS measures at many nitrate sites, in plain English.
 *
 * USGS names every kind of measurement with a 5-digit "parameter code". Not every site
 * measures everything: most measure river flow and water level; a few big-river sites
 * also measure oxygen, algae, and more. The app shows whatever a site has.
 */
import type { Measurement } from '../data/types';

export const FLOW = '00060'; // river flow (discharge), cubic feet per second

export interface ParameterInfo {
  label: string;
  unit: string;
  decimals: number;
  /** One short sentence: why someone would care. */
  meaning: string;
}

export const PARAMETERS: Record<string, ParameterInfo> = {
  [FLOW]: { label: 'River flow', unit: 'ft³/s', decimals: 0, meaning: 'How much water passes each second. Big rains can multiply it.' },
  '00065': { label: 'Water level', unit: 'ft', decimals: 1, meaning: "Height of the water at the gauge (not the river's depth)." },
  '00010': { label: 'Water temperature', unit: '°F', decimals: 0, meaning: 'Warmer water holds less oxygen for fish.' },
  '00300': { label: 'Dissolved oxygen', unit: 'mg/L', decimals: 1, meaning: 'Fish breathe it. Many struggle below about 5 mg/L.' },
  '63680': { label: 'Muddiness (turbidity)', unit: 'FNU', decimals: 0, meaning: 'Cloudiness from soil and algae. Rises when rain washes soil in.' },
  '32316': { label: 'Algae (chlorophyll)', unit: 'µg/L', decimals: 1, meaning: 'Algae feed on nitrogen and phosphorus.' },
  '00400': { label: 'pH', unit: '', decimals: 1, meaning: '7 is neutral. Iowa rivers usually run a little higher.' },
  '00095': { label: 'Dissolved salts (conductance)', unit: 'µS/cm', decimals: 0, meaning: 'Rises with dissolved minerals and salts.' },
};

/**
 * The codes to ask USGS for, in the order they're shown. (Written out instead of
 * Object.keys(PARAMETERS), because JavaScript puts keys that look like plain numbers,
 * such as '32316', ahead of the others.)
 */
export const CONDITION_CODES = [FLOW, '00065', '00010', '00300', '63680', '32316', '00400', '00095'];

/** Readings older than this aren't "right now", so they're left out. */
export const CONDITIONS_MAX_AGE_DAYS = 3;

/** USGS marks missing values with -999999. */
export const isRealValue = (v: number) => Number.isFinite(v) && v > -999;

/**
 * Picks the newest real value for each parameter, dropping old ones.
 * USGS sometimes sends several series for one parameter (two sensors, or an old one
 * that stopped years ago), so all values for a code are considered together.
 */
export function latestMeasurements(series: { code: string; values: { time: string; value: number }[] }[], now = Date.now()): Measurement[] {
  const best = new Map<string, Measurement>();
  for (const s of series) {
    if (!PARAMETERS[s.code]) continue;
    for (const v of s.values) {
      if (!isRealValue(v.value)) continue;
      const time = new Date(v.time).toISOString();
      if (now - Date.parse(time) > CONDITIONS_MAX_AGE_DAYS * 86_400_000) continue;
      const current = best.get(s.code);
      if (!current || time > current.time) best.set(s.code, { code: s.code, value: v.value, time });
    }
  }
  return CONDITION_CODES.filter((c) => best.has(c)).map((c) => best.get(c)!);
}

/** A measurement ready to show: "1,290" + "ft³/s". Temperatures are shown in °F with °C alongside. */
export function formatMeasurement(m: Measurement): { value: string; unit: string; extra?: string } {
  const info = PARAMETERS[m.code];
  if (m.code === '00010') {
    return { value: Math.round((m.value * 9) / 5 + 32).toString(), unit: '°F', extra: `${m.value.toFixed(1)} °C` };
  }
  const value = m.value.toLocaleString('en-US', { maximumFractionDigits: info?.decimals ?? 1, minimumFractionDigits: info?.decimals ?? 0 });
  return { value, unit: info?.unit ?? '' };
}
