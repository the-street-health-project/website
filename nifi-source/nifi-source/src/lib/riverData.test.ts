import { describe, expect, it } from 'vitest';
import type { Place, Reading, Site } from '../data/types';
import { toggleWatched } from '../state/settings';
import { computeAlerts } from './alerts';
import { withoutDuplicateSamples } from './geo';
import { describeHistory, describeSamples, summarizeHistory } from './history';
import { describeLoad, nitrateLoad, roughly } from './load';
import { explainSample } from './nitrate';
import { formatMeasurement, latestMeasurements } from './parameters';
import { valueDaysBefore } from './trend';

const now = Date.parse('2026-10-26T20:00:00Z');
const day = (d: number, value: number): Reading => ({ time: new Date(Date.UTC(2026, 0, 1 + d, 12)).toISOString(), value });

describe('river conditions', () => {
  it('keeps the newest real value for each parameter and drops old or missing ones', () => {
    const list = latestMeasurements(
      [
        { code: '00060', values: [{ time: '2026-10-26T14:00:00-05:00', value: 1200 }, { time: '2026-10-26T15:00:00-05:00', value: 1290 }] },
        { code: '00010', values: [{ time: '2026-10-26T15:00:00-05:00', value: -999999 }] }, // USGS "no data"
        { code: '00300', values: [{ time: '2018-04-23T10:45:00-05:00', value: 9.5 }] }, // stopped years ago
        { code: '99999', values: [{ time: '2026-10-26T15:00:00-05:00', value: 1 }] }, // a parameter we don't show
        { code: '00065', values: [{ time: '2026-10-26T15:00:00-05:00', value: 6.66 }] },
      ],
      now,
    );
    expect(list.map((m) => `${m.code}=${m.value}`)).toEqual(['00060=1290', '00065=6.66']); // in display order
  });

  it('shows water temperature in °F with °C alongside', () => {
    expect(formatMeasurement({ code: '00010', value: 15, time: '' })).toEqual({ value: '59', unit: '°F', extra: '15.0 °C' });
    expect(formatMeasurement({ code: '00060', value: 13400, time: '' })).toEqual({ value: '13,400', unit: 'ft³/s' });
  });
});

describe('nitrogen load', () => {
  it('multiplies concentration by flow (1 mg/L at 1 ft³/s ≈ 5.39 lb a day)', () => {
    expect(nitrateLoad(1, 1)).toBeCloseTo(5.39, 2);
    expect(nitrateLoad(14.5, 1290)).toBeCloseTo(100_895, -1);
  });

  it('describes it in tons and acres of corn, rounded', () => {
    expect(describeLoad(100_895)).toEqual({ amount: '50 tons', acres: 670 });
    expect(describeLoad(3_000).amount).toBe('1.5 tons');
    expect(describeLoad(640).amount).toBe('640 pounds');
    expect(roughly(12_345)).toBe(12_000);
  });
});

describe('a year of history', () => {
  const year = Array.from({ length: 365 }, (_, i) => day(i, i < 100 ? 12 : 6)); // 100 days over the limit

  it('finds the high, low, days over the limit, and where today ranks', () => {
    const s = summarizeHistory(year, 8)!;
    expect(s.days).toBe(365);
    expect(s.spanDays).toBe(365);
    expect(s.high.value).toBe(12);
    expect(s.low.value).toBe(6);
    expect(s.daysAbove).toBe(100);
    expect(s.rank).toBe(73); // 8 is higher than the 265 days at 6
    expect(describeHistory(s)[1]).toBe('Above the drinking water limit on 100 days in the past year.');
  });

  it('mentions gaps when the sensor was out of the river', () => {
    const gappy = year.filter((_, i) => i < 30 || i > 200);
    expect(describeHistory(summarizeHistory(gappy, 8)!)[1]).toContain(`reported on ${gappy.length} of them`);
  });

  it('needs at least two weeks of readings', () => {
    expect(summarizeHistory(year.slice(0, 10), 8)).toBeNull();
  });

  it('finds the reading from about a week earlier', () => {
    const series = [day(0, 5), day(7, 9), day(14, 12)];
    expect(valueDaysBefore(series, series[2].time, 7)).toBe(9);
    expect(valueDaysBefore([day(0, 5)], day(30, 1).time, 7)).toBeUndefined(); // nothing near a week back
  });
});

describe('lab-sample sites', () => {
  const live: Site = { id: 'live', name: 'Live River', lat: 42, lon: -93, sourceId: 't', kind: 'official', latest: { time: '2026-10-26T12:00:00.000Z', value: 12 } };
  const sample = (id: string, lat: number, value = 12): Site => ({
    ...live,
    id,
    name: id,
    lat,
    latest: { time: '2025-04-09T12:00:00.000Z', value },
    sampled: { agency: 'Iowa DNR' },
  });

  it('hides a lab site on the same spot as a live sensor, but keeps one on a different stream nearby', () => {
    const kept = withoutDuplicateSamples([live, sample('same spot', 42.001), sample('creek 1.5 km away', 42.0135)]);
    expect(kept.map((s) => s.id)).toEqual(['live', 'creek 1.5 km away']);
  });

  it('never raises alerts, even when watched and over the limit', () => {
    expect(computeAlerts([sample('old', 42.2, 18)], null, 30, {}, new Set(['old']))).toEqual([]);
  });

  it('explains a sample in the past tense', () => {
    expect(explainSample(14.5)).toBe('This sample was 45% above the EPA drinking water limit for nitrate. A lot of nitrate was washing off the land here when it was taken.');
    expect(explainSample(3)).toContain('was well under');
  });

  it('sums up samples one by one', () => {
    const lines = describeSamples([day(0, 4), day(30, 12.4), day(60, 8)]);
    expect(lines[0]).toMatch(/^3 lab samples from /);
    expect(lines[1]).toContain('Highest: 12.4 mg/L');
    expect(lines[2]).toBe('1 of the 3 samples were above the drinking water limit.');
  });
});

describe('watch list', () => {
  const a = { id: 'USGS-1', name: 'River A' };
  const b = { id: 'USGS-2', name: 'River B' };

  it('adds new rivers to the top and removes them on a second tap', () => {
    const one = toggleWatched([], a);
    const two = toggleWatched(one, b);
    expect(two.map((w) => w.id)).toEqual(['USGS-2', 'USGS-1']);
    expect(toggleWatched(two, a)).toEqual([b]);
  });

  it('alerts on watched rivers even when they are far from home', () => {
    const ames: Place = { name: 'Ames', lat: 42.03, lon: -93.62 };
    const far: Site = { id: 'far', name: 'Far River', lat: 40.6, lon: -95.9, sourceId: 't', kind: 'official', latest: { time: '2026-10-26T12:00:00.000Z', value: 15 } };
    expect(computeAlerts([far], ames, 30, {})).toEqual([]);
    const alerts = computeAlerts([far], ames, 30, {}, new Set(['far']));
    expect(alerts).toHaveLength(1);
    expect(alerts[0].body).toContain('On your watch list');
    // ...and even with no home location set
    expect(computeAlerts([far], null, 30, {}, new Set(['far']))).toHaveLength(1);
  });
});
