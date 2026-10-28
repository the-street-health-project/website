/**
 * Trend over a series of readings: is nitrate going up, down, or holding steady?
 *
 * Uses a least-squares line (the "line of best fit" from algebra class): the slope tells us
 * how fast nitrate is changing, in mg/L per week.
 */
import type { Reading } from '../data/types';
import { isAboveLimit } from './nitrate';

export type Direction = 'rising' | 'falling' | 'steady';

export interface Trend {
  direction: Direction;
  perWeek: number; // mg/L per week (positive = rising)
  first: number;
  last: number;
  min: number;
  max: number;
  daysAboveLimit: number;
  days: number;
}

/** Slope of the best-fit line through (x, y) points. */
export function slope(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

/** Returns null if there are fewer than 3 readings (not enough to call a trend). */
export function computeTrend(readings: Reading[]): Trend | null {
  if (readings.length < 3) return null;
  const weeks = readings.map((r) => Date.parse(r.time) / (7 * 86_400_000));
  const values = readings.map((r) => r.value);
  const perWeek = slope(weeks, values);
  // Changes smaller than 0.3 mg/L per week are within normal day-to-day ups and downs.
  const direction: Direction = perWeek > 0.3 ? 'rising' : perWeek < -0.3 ? 'falling' : 'steady';
  return {
    direction,
    perWeek,
    first: values[0],
    last: values[values.length - 1],
    min: Math.min(...values),
    max: Math.max(...values),
    daysAboveLimit: values.filter(isAboveLimit).length,
    days: values.length,
  };
}

/**
 * The daily reading closest to `days` days before `fromTime`, if there is one within 3 days of it.
 * Used for "up 1.2 this week" and for alerts that a site crossed into a higher level.
 */
export function valueDaysBefore(readings: Reading[], fromTime: string, days: number): number | undefined {
  const target = Date.parse(fromTime) - days * 86_400_000;
  let best: { value: number; gap: number } | null = null;
  for (const r of readings) {
    const gap = Math.abs(Date.parse(r.time) - target);
    if (!best || gap < best.gap) best = { value: r.value, gap };
  }
  return best && best.gap < 3 * 86_400_000 ? best.value : undefined;
}

export function describeTrend(t: Trend | null): string {
  if (!t) return 'Not enough recent readings to show a trend.';
  const rate = Math.abs(t.perWeek).toFixed(1);
  const span = `over the last ${t.days} days`;
  const above = t.daysAboveLimit ? ` It was above the limit on ${t.daysAboveLimit} of those days.` : '';
  if (t.direction === 'rising') return `Rising about ${rate} mg/L a week ${span}.${above}`;
  if (t.direction === 'falling') return `Falling about ${rate} mg/L a week ${span}.${above}`;
  return `Holding fairly steady ${span}.${above}`;
}
