/**
 * A year of daily readings, summed up: the highest and lowest days, how many days were over
 * the limit, and how today compares ("higher than 62% of days this year").
 */
import type { Reading } from '../data/types';
import { formatDate } from './format';
import { formatMgL, isAboveLimit } from './nitrate';

export interface HistorySummary {
  days: number; // days with a reading (sensors are often pulled out of rivers in winter, so there can be gaps)
  spanDays: number; // from the first reading to the last
  high: Reading;
  low: Reading;
  average: number;
  daysAbove: number;
  /** Percent of days lower than `current` (0 to 100). */
  rank: number;
}

/** Returns null with fewer than 14 days (too little to say anything about a year). */
export function summarizeHistory(readings: Reading[], current: number): HistorySummary | null {
  if (readings.length < 14) return null;
  let high = readings[0];
  let low = readings[0];
  let sum = 0;
  let daysAbove = 0;
  let lower = 0;
  for (const r of readings) {
    if (r.value > high.value) high = r;
    if (r.value < low.value) low = r;
    sum += r.value;
    if (isAboveLimit(r.value)) daysAbove++;
    if (r.value < current) lower++;
  }
  const spanDays = Math.round((Date.parse(readings[readings.length - 1].time) - Date.parse(readings[0].time)) / 86_400_000) + 1;
  return { days: readings.length, spanDays, high, low, average: sum / readings.length, daysAbove, rank: Math.round((lower / readings.length) * 100) };
}

/** Lab samples are taken now and then, so they're described sample by sample instead of day by day. */
export function describeSamples(samples: Reading[]): string[] {
  if (!samples.length) return ['No lab samples in this period.'];
  if (samples.length === 1) return [`One lab sample, on ${formatDate(samples[0].time)}.`];
  let high = samples[0];
  let low = samples[0];
  for (const r of samples) {
    if (r.value > high.value) high = r;
    if (r.value < low.value) low = r;
  }
  const above = samples.filter((r) => isAboveLimit(r.value)).length;
  return [
    `${samples.length} lab samples from ${formatDate(samples[0].time)} to ${formatDate(samples[samples.length - 1].time)}.`,
    `Highest: ${formatMgL(high.value)} on ${formatDate(high.time)}. Lowest: ${formatMgL(low.value)} on ${formatDate(low.time)}.`,
    above ? `${above} of the ${samples.length} samples were above the drinking water limit.` : 'None of them were above the drinking water limit.',
  ];
}

export function describeHistory(s: HistorySummary): string[] {
  const span = s.spanDays >= 330 ? 'the past year' : `the last ${s.spanDays} days`;
  const measured = s.days < s.spanDays - 7 ? ` (the sensor reported on ${s.days} of them)` : '';
  return [
    `Highest in ${span}: ${formatMgL(s.high.value)} on ${formatDate(s.high.time)}. Lowest: ${formatMgL(s.low.value)} on ${formatDate(s.low.time)}.`,
    s.daysAbove
      ? `Above the drinking water limit on ${s.daysAbove} days in ${span}${measured}.`
      : `Never above the drinking water limit in ${span}${measured}.`,
    `Right now it's higher than ${s.rank}% of those days.`,
  ];
}
