/**
 * Nitrate levels and plain-English explanations.
 *
 * EPA's drinking water limit (the "maximum contaminant level") for nitrate is 10 mg/L as nitrogen.
 * NiFi sorts readings into three levels around that limit:
 *   green  (Low):          under 5 mg/L  – less than half the limit
 *   yellow (Elevated):     5 to 10 mg/L  – getting close to the limit
 *   red    (Above limit):  over 10 mg/L  – higher than the drinking water limit
 *
 * (In the code the yellow level is still called 'watch'. Users see "Elevated", so it isn't
 * confused with the ☆ Watch button that saves a river to your list.)
 */

export const EPA_LIMIT = 10; // mg/L nitrate as N
export const WATCH_LEVEL = 5; // half the limit

export type Level = 'low' | 'watch' | 'high';

/**
 * The level for a reading, judged on the number people actually see (one decimal place).
 * Otherwise 4.97 would show as "5.0" next to a green "Low" badge, which looks wrong.
 */
export function levelFor(value: number): Level {
  const shown = Number(value.toFixed(1));
  if (shown > EPA_LIMIT) return 'high';
  if (shown >= WATCH_LEVEL) return 'watch';
  return 'low';
}

/** True if a reading counts as above the drinking water limit (same rule as the red badge). */
export const isAboveLimit = (value: number) => levelFor(value) === 'high';

export const LEVELS: Record<Level, { label: string; color: string; short: string; symbol: string }> = {
  low: { label: 'Low', color: 'green', short: 'Under 5 mg/L', symbol: '●' },
  watch: { label: 'Elevated', color: 'yellow', short: '5 to 10 mg/L', symbol: '▲' },
  high: { label: 'Above limit', color: 'red', short: 'Over 10 mg/L', symbol: '■' },
};

/** One or two sentences explaining what a reading means, for someone who has never heard of nitrate. */
export function explainReading(value: number): string {
  const level = levelFor(value);
  const ratio = value / EPA_LIMIT;
  if (level === 'high') {
    const times = ratio >= 1.95 ? `${ratio.toFixed(1)} times` : `${Math.round((ratio - 1) * 100)}% above`;
    return `This stream is ${times} the EPA drinking water limit for nitrate. A lot of nitrate is washing off the land here, and water plants downstream have to work harder to remove it. City tap water still has to meet the limit, so this reading alone doesn't make your tap water unsafe.`;
  }
  if (level === 'watch') {
    return `This is ${Math.round(ratio * 100)}% of the EPA drinking water limit. Nitrate is washing into this stream, and a heavy rain could push it over.`;
  }
  return `This is well under the EPA drinking water limit of ${EPA_LIMIT} mg/L. Streams with little farm or city runoff usually stay under 1 mg/L.`;
}

/** The same idea for a lab sample, in the past tense, because the sample may be months old. */
export function explainSample(value: number): string {
  const level = levelFor(value);
  const ratio = value / EPA_LIMIT;
  if (level === 'high') {
    const times = ratio >= 1.95 ? `${ratio.toFixed(1)} times` : `${Math.round((ratio - 1) * 100)}% above`;
    return `This sample was ${times} the EPA drinking water limit for nitrate. A lot of nitrate was washing off the land here when it was taken.`;
  }
  if (level === 'watch') return `This sample was ${Math.round(ratio * 100)}% of the EPA drinking water limit.`;
  return `This sample was well under the EPA drinking water limit of ${EPA_LIMIT} mg/L.`;
}

/** Formats a value with its unit, e.g. "14.5 mg/L". */
export const formatMgL = (value: number) => `${value.toFixed(value >= 100 ? 0 : 1)} mg/L`;
