/**
 * USGS Water Data API (https://api.waterdata.usgs.gov/ogcapi/v0) – the newer USGS service
 * that replaces Water Services. Same sensors, same parameter code (99133), different format.
 *
 * The app uses this automatically if the classic service fails. It needs no key for light use,
 * but USGS limits how many requests one computer can make per hour.
 */
import { FLOW, latestMeasurements } from '../../lib/parameters';
import type { DataSource, DateRange, Measurement, Reading, Site } from '../types';
import { fetchJson, round2 } from './http';
import { NITRATE_PARAM, usgsSiteUrl } from './usgsWaterServices';

const API = 'https://api.waterdata.usgs.gov/ogcapi/v0/collections';
// A box around Iowa (west, south, east, north). It also catches a few sites just across the border,
// which are removed by checking each site's state code (19 = Iowa).
const IOWA_BBOX = '-96.64,40.37,-90.14,43.51';
const STALE_DAYS = 14;

interface Feature<P> {
  id: string;
  properties: P;
  geometry: { coordinates: [number, number] } | null;
}
interface Collection<P> {
  features: Feature<P>[];
}

export class UsgsWaterDataApiSource implements DataSource {
  id = 'usgs-waterdata';
  label = 'USGS';
  kind = 'official' as const;

  async getSites(): Promise<Site[]> {
    const latest = await fetchJson<Collection<{ monitoring_location_id: string; time: string; value: string | null }>>(
      `${API}/latest-continuous/items?f=json&limit=500&parameter_code=${NITRATE_PARAM}&bbox=${IOWA_BBOX}` +
        '&properties=monitoring_location_id,time,value',
    );
    const now = Date.now();
    const recent = latest.features.filter((f) => {
      const v = Number(f.properties.value);
      return f.geometry && f.properties.value != null && v >= 0 && now - Date.parse(f.properties.time) < STALE_DAYS * 86_400_000;
    });
    if (!recent.length) return [];

    // Look up names, states, and site types for those sensors in one request.
    const ids = [...new Set(recent.map((f) => f.properties.monitoring_location_id))];
    const filter = encodeURIComponent(`id IN ('${ids.join("','")}')`);
    const meta = await fetchJson<Collection<{ monitoring_location_name: string; state_code: string; site_type_code: string }>>(
      `${API}/monitoring-locations/items?f=json&limit=500&filter-lang=cql-text&filter=${filter}` +
        '&properties=monitoring_location_name,state_code,site_type_code', // only the fields we need (much faster)
    );
    const info = new Map(meta.features.map((f) => [f.id, f.properties]));

    const sites: Site[] = [];
    for (const f of recent) {
      const id = f.properties.monitoring_location_id;
      const m = info.get(id);
      if (!m || m.state_code !== '19' || !m.site_type_code?.startsWith('ST')) continue;
      if (sites.some((s) => s.id === id)) continue;
      const [lon, lat] = f.geometry!.coordinates;
      sites.push({
        id,
        name: m.monitoring_location_name,
        lat,
        lon,
        sourceId: this.id,
        kind: 'official',
        latest: { time: new Date(f.properties.time).toISOString(), value: round2(Number(f.properties.value)) },
        url: usgsSiteUrl(id.replace(/^USGS-/, '')),
      });
    }
    return sites;
  }

  /** Daily averages of one parameter, oldest first. */
  private async daily(siteId: string, code: string, days: number): Promise<Reading[]> {
    const daily = await fetchJson<Collection<{ time: string; value: string | null }>>(
      `${API}/daily/items?f=json&limit=1000&monitoring_location_id=${siteId}&parameter_code=${code}` +
        `&statistic_id=00003&time=P${days}D&properties=time,value`,
    );
    return daily.features
      .filter((f) => f.properties.value != null && Number(f.properties.value) >= 0)
      .map((f) => ({ time: `${f.properties.time.slice(0, 10)}T12:00:00.000Z`, value: round2(Number(f.properties.value)) }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  async getFlow(siteId: string, range: DateRange): Promise<Reading[]> {
    return this.daily(siteId, FLOW, range.days);
  }

  async getConditions(siteId: string): Promise<Measurement[]> {
    const latest = await fetchJson<Collection<{ parameter_code: string; time: string; value: string | null }>>(
      `${API}/latest-continuous/items?f=json&limit=100&monitoring_location_id=${siteId}&properties=parameter_code,time,value`,
    );
    return latestMeasurements(
      latest.features
        .filter((f) => f.properties.value != null)
        .map((f) => ({ code: f.properties.parameter_code, values: [{ time: f.properties.time, value: Number(f.properties.value) }] })),
    );
  }

  async getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    const list = await this.daily(siteId, NITRATE_PARAM, range.days);
    if (list.length) return list;

    // No daily averages yet: average the 15-minute readings by day.
    const cont = await fetchJson<Collection<{ time: string; value: string | null }>>(
      `${API}/continuous/items?f=json&limit=10000&monitoring_location_id=${siteId}&parameter_code=${NITRATE_PARAM}` +
        `&time=P${range.days}D&properties=time,value`,
    );
    const byDay = new Map<string, number[]>();
    for (const f of cont.features) {
      const v = Number(f.properties.value);
      if (f.properties.value == null || !(v >= 0)) continue;
      const day = f.properties.time.slice(0, 10);
      byDay.set(day, [...(byDay.get(day) ?? []), v]);
    }
    return [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, vals]) => ({ time: `${day}T12:00:00.000Z`, value: round2(vals.reduce((a, b) => a + b, 0) / vals.length) }));
  }
}
