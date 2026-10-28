import { describe, expect, it } from 'vitest';
import type { DataSource, Reading, Site } from '../types';
import { distanceMiles } from '../../lib/geo';
import { BundledUsgsSource, ExampleCommunitySource, expandSeries } from './bundled';
import { LabSampleSource } from './labSamples';
import { ResilientSource } from './resilient';
import { dailyMeans, parseConditions, parseDaily, parseSites, type WsResponse } from './usgsWaterServices';

// A tiny sample of a real USGS Water Services response (trimmed to the fields the app reads).
const now = Date.parse('2026-10-26T12:00:00Z');
const series = (code: string, type: string, values: [string, string][]) => ({
  sourceInfo: {
    siteName: `Site ${code}`,
    siteCode: [{ value: code }],
    geoLocation: { geogLocation: { latitude: 42, longitude: -93 } },
    siteProperty: [{ name: 'siteTypeCd', value: type }],
  },
  values: [{ value: values.map(([dateTime, value]) => ({ dateTime, value })) }],
});
const sample: WsResponse = {
  value: {
    timeSeries: [
      series('05482500', 'ST', [['2026-10-26T06:30:00.000-05:00', '14.5']]),
      series('11111111', 'GW', [['2026-10-26T06:30:00.000-05:00', '3.0']]), // a well: skipped
      series('22222222', 'ST', [['2015-11-10T09:00:00.000-06:00', '14.1']]), // stopped reporting years ago: skipped
      series('33333333', 'ST', [['2026-10-26T06:30:00.000-05:00', '']]), // blank value: skipped
    ],
  },
};

describe('USGS Water Services parsing', () => {
  it('keeps only active stream sensors', () => {
    const sites = parseSites(sample, 'test', now);
    expect(sites.map((s) => s.id)).toEqual(['USGS-05482500']);
    expect(sites[0].latest?.value).toBe(14.5);
    expect(sites[0].kind).toBe('official');
    expect(sites[0].url).toContain('05482500');
  });

  it('stores daily values at noon UTC so the date never shifts', () => {
    const daily = parseDaily({ value: { timeSeries: [series('1', 'ST', [['2026-10-25T00:00:00.000', '9.82']])] } });
    expect(daily).toEqual([{ time: '2026-10-25T12:00:00.000Z', value: 9.82 }]);
  });

  it('averages 15-minute readings by day', () => {
    const daily = dailyMeans([
      { dateTime: '2026-10-24T01:00:00.000-05:00', value: '10' },
      { dateTime: '2026-10-24T13:00:00.000-05:00', value: '12' },
      { dateTime: '2026-10-25T01:00:00.000-05:00', value: '8' },
      { dateTime: '2026-10-25T02:00:00.000-05:00', value: '' },
    ]);
    expect(daily).toEqual([
      { time: '2026-10-24T12:00:00.000Z', value: 11 },
      { time: '2026-10-25T12:00:00.000Z', value: 8 },
    ]);
  });
});

// Fake sources for testing the fallback order.
const site = (id: string): Site => ({ id, name: id, lat: 42, lon: -93, sourceId: 'x', kind: 'official', latest: { time: new Date().toISOString(), value: 5 } });
const failing: DataSource = {
  id: 'down', label: 'Down', kind: 'official',
  getSites: () => Promise.reject(new Error('offline')),
  getReadings: () => Promise.reject(new Error('offline')),
};
const working = (label: string): DataSource => ({
  id: label, label, kind: 'official',
  getSites: async () => [site(`${label}-1`)],
  getReadings: async (): Promise<Reading[]> => [{ time: '2026-10-25T12:00:00.000Z', value: 7 }],
});

describe('ResilientSource fallback order', () => {
  it('uses the first source that answers', async () => {
    const src = new ResilientSource('t1', 'Test', [failing, working('Backup')], new BundledUsgsSource());
    const sites = await src.getSites();
    expect(sites[0].id).toBe('Backup-1');
    expect(sites[0].sourceId).toBe('t1'); // routed back through the resilient source
    expect(src.status.mode).toBe('live');
  });

  it('falls back to the bundled snapshot when every live source fails', async () => {
    const src = new ResilientSource('t2', 'Test', [failing, failing], new BundledUsgsSource());
    const sites = await src.getSites();
    expect(sites.length).toBeGreaterThan(0);
    expect(src.status.mode).toBe('demo');
    const readings = await src.getReadings(sites[0].id, { days: 30 });
    expect(readings.length).toBeGreaterThan(0);
  });
});

describe('bundled demo data', () => {
  it('has Iowa sensors with 30-day histories', async () => {
    const src = new BundledUsgsSource();
    const sites = await src.getSites();
    expect(sites.length).toBeGreaterThanOrEqual(5);
    for (const s of sites) {
      expect(s.lat).toBeGreaterThan(40);
      expect(s.lat).toBeLessThan(44);
      expect(s.latest!.value).toBeGreaterThanOrEqual(0);
    }
    const r = await src.getReadings(sites[0].id, { days: 30 });
    expect(r.length).toBeGreaterThan(5);
  });

  it('labels community sensors as examples', async () => {
    const sites = await new ExampleCommunitySource().getSites();
    expect(sites.every((s) => s.kind === 'community' && s.isExample)).toBe(true);
  });

  it('has a year of history, river flow, and current conditions', async () => {
    const src = new BundledUsgsSource();
    const id = 'USGS-05482500'; // North Raccoon River near Jefferson: reports all year
    const year = await src.getReadings(id, { days: 365 });
    expect(year.length).toBeGreaterThan(300);
    expect((await src.getFlow(id, { days: 30 })).length).toBeGreaterThan(20);
    expect((await src.getFlow(id, { days: 365 })).length).toBeGreaterThan(300);
    expect((await src.getConditions(id)).some((m) => m.code === '00060')).toBe(true);
  });

  it('unpacks compact series one day apart, skipping gaps', () => {
    expect(expandSeries({ start: '2026-01-30', values: [1, null, 3] })).toEqual([
      { time: '2026-01-30T12:00:00.000Z', value: 1 },
      { time: '2026-02-01T12:00:00.000Z', value: 3 },
    ]);
  });
});

describe('lab samples from rivers with no live sensor', () => {
  it('has dozens of Iowa river sites, each with an agency and real values', async () => {
    const src = new LabSampleSource();
    const sites = await src.getSites();
    expect(sites.length).toBeGreaterThanOrEqual(60);
    for (const s of sites) {
      expect(s.sampled?.agency).toBeTruthy();
      expect(s.lat).toBeGreaterThan(40.3);
      expect(s.lat).toBeLessThan(43.6);
      expect(s.lon).toBeGreaterThan(-96.7);
      expect(s.lon).toBeLessThan(-90.1);
      expect(Number.isFinite(s.latest!.value)).toBe(true);
      expect(s.latest!.value).toBeGreaterThanOrEqual(0);
    }
    expect(new Set(sites.map((s) => s.id)).size).toBe(sites.length); // no repeated ids
  });

  it("doesn't repeat a spot that already has a live sensor", async () => {
    const live = await new BundledUsgsSource().getSites();
    const lab = await new LabSampleSource().getSites();
    for (const s of lab) for (const l of live) expect(distanceMiles(s.lat, s.lon, l.lat, l.lon)).toBeGreaterThan(0.3);
  });

  it('returns samples counted back from the newest one, oldest first', async () => {
    const src = new LabSampleSource();
    const [site] = await src.getSites();
    const all = await src.getReadings(site.id, { days: 1200 });
    expect(all.length).toBeGreaterThan(0);
    expect(all[all.length - 1]).toEqual(site.latest);
    for (let i = 1; i < all.length; i++) expect(all[i].time > all[i - 1].time).toBe(true);
  });
});

describe('conditions from USGS Water Services', () => {
  it('reads each parameter code and ignores USGS "no data" values', () => {
    const json: WsResponse = {
      value: {
        timeSeries: [
          { ...series('05482500', 'ST', [['2026-10-26T06:15:00.000-05:00', '1290']]), variable: { variableCode: [{ value: '00060' }] } },
          { ...series('05482500', 'ST', [['2026-10-26T06:15:00.000-05:00', '-999999']]), variable: { variableCode: [{ value: '00010' }] } },
        ],
      },
    };
    expect(parseConditions(json, now)).toEqual([{ code: '00060', value: 1290, time: '2026-10-26T11:15:00.000Z' }]);
  });

  it('treats "nothing else measured here" as a real answer, not a failure', async () => {
    const quiet: DataSource = { ...working('Quiet'), getConditions: async () => [] };
    const src = new ResilientSource('t3', 'Test', [quiet], new BundledUsgsSource());
    expect(await src.getConditions('USGS-05482500')).toEqual([]); // not the bundled conditions
  });
});
