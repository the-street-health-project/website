/**
 * Data saved inside the app (by scripts/build-demo-data.mjs), so the app always has something to show:
 * in demo mode, with no internet, or if every live source fails.
 *
 * The last 30 days load with the app. The full year (bigger) is a separate file that's only
 * downloaded when someone opens the 1-year view.
 */
import type { DataSource, DateRange, Measurement, Reading, Site } from '../types';
import snapshot from '../bundled/usgs-snapshot.json';
import community from '../bundled/community-example.json';
import { usgsSiteUrl } from './usgsWaterServices';

interface Snapshot {
  generatedAt?: string;
  sites: { id: string; name: string; lat: number; lon: number; latest: Reading }[];
  readings: Record<string, Reading[]>;
  flow?: Record<string, Reading[]>;
  conditions?: Record<string, Measurement[]>;
}
/** A year of daily values stored compactly: a start date and one number (or null) per day. */
interface CompactSeries {
  start: string; // YYYY-MM-DD
  values: (number | null)[];
}
interface History {
  readings: Record<string, CompactSeries>;
  flow: Record<string, CompactSeries>;
}

/** Unpacks a compact series into readings (noon UTC each day, so the date never shifts). */
export function expandSeries(s: CompactSeries | undefined): Reading[] {
  if (!s) return [];
  const start = Date.parse(`${s.start}T12:00:00.000Z`);
  return s.values.flatMap((value, i) => (value == null ? [] : [{ time: new Date(start + i * 86_400_000).toISOString(), value }]));
}

/** When the bundled USGS snapshot was downloaded. */
export const SNAPSHOT_TIME = (snapshot as Snapshot).generatedAt ?? '';

const RECENT_DAYS = 30; // how much history is in the snapshot itself

/** Returns the last `days` days of a saved series, counted back from its newest reading. */
function lastDays(list: Reading[], days: number): Reading[] {
  if (!list.length) return [];
  const end = Date.parse(list[list.length - 1].time);
  return list.filter((r) => end - Date.parse(r.time) < days * 86_400_000);
}

let history: Promise<History> | null = null;
const loadHistory = () => (history ??= import('../bundled/usgs-history.json').then((m) => m.default as History));

/** The saved USGS snapshot: real readings from Iowa sensors on the day the app was built. */
export class BundledUsgsSource implements DataSource {
  id = 'usgs-bundled';
  label = 'USGS (saved)';
  kind = 'official' as const;
  private data = snapshot as Snapshot;

  async getSites(): Promise<Site[]> {
    return this.data.sites.map((s) => ({
      ...s,
      sourceId: this.id,
      kind: 'official',
      url: usgsSiteUrl(s.id.replace(/^USGS-/, '')),
    }));
  }

  async getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    const recent = this.data.readings[siteId] ?? [];
    if (range.days <= RECENT_DAYS) return lastDays(recent, range.days);
    const year = expandSeries((await loadHistory()).readings[siteId]);
    return lastDays(year.length ? year : recent, range.days);
  }

  async getFlow(siteId: string, range: DateRange): Promise<Reading[]> {
    const recent = this.data.flow?.[siteId] ?? [];
    if (range.days <= RECENT_DAYS) return lastDays(recent, range.days);
    const year = expandSeries((await loadHistory()).flow[siteId]);
    return lastDays(year.length ? year : recent, range.days);
  }

  async getConditions(siteId: string): Promise<Measurement[]> {
    return this.data.conditions?.[siteId] ?? [];
  }
}

/**
 * EXAMPLE community sensors for demo mode. These sensors do not exist. They show how readings
 * from a future low-cost sensor network will appear next to official data (dashed outline).
 * Like a simple real sensor, they measure nitrate only, so they skip getConditions and getFlow.
 */
export class ExampleCommunitySource implements DataSource {
  id = 'community-example';
  label = 'Community (example)';
  kind = 'community' as const;
  private data = community as Snapshot;

  async getSites(): Promise<Site[]> {
    return this.data.sites.map((s) => ({ ...s, sourceId: this.id, kind: 'community', isExample: true }));
  }

  async getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    return lastDays(this.data.readings[siteId] ?? [], range.days);
  }
}
