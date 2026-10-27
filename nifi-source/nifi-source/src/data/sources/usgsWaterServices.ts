/**
 * USGS Water Services (https://waterservices.usgs.gov/nwis) – the classic USGS web service.
 *
 * Verified October 2026:
 *   - Parameter code 99133 = "Nitrate plus nitrite, water, in situ, mg/L as N"
 *     (nitrite is normally a tiny fraction, so this is effectively nitrate).
 *   - /iv/ = "instantaneous values": sensor readings every 15 minutes.
 *   - /dv/ = "daily values": one average per day (statCd 00003 = mean).
 *   - Both allow requests from web pages (CORS) and need no API key.
 *
 * USGS plans to retire this service in early 2027, so the app also has a second USGS source
 * (usgsWaterDataApi.ts) and switches to it automatically if this one stops answering.
 */
import { CONDITION_CODES, FLOW, latestMeasurements } from '../../lib/parameters';
import type { DataSource, DateRange, Measurement, Reading, Site } from '../types';
import { fetchJson, round2 } from './http';

const BASE = 'https://waterservices.usgs.gov/nwis';
export const NITRATE_PARAM = '99133';
const STALE_DAYS = 14; // sensors that haven't reported in two weeks are left off the map

// The parts of the USGS JSON response that we use.
interface WsValue {
  value: string;
  dateTime: string;
}
interface WsSeries {
  sourceInfo: {
    siteName: string;
    siteCode: { value: string }[];
    geoLocation: { geogLocation: { latitude: number; longitude: number } };
    siteProperty: { name: string; value: string }[];
  };
  variable?: { variableCode: { value: string }[] };
  values: { value: WsValue[] }[];
}
export interface WsResponse {
  value: { timeSeries: WsSeries[] };
}

export const usgsSiteUrl = (code: string) => `https://waterdata.usgs.gov/monitoring-location/${code}/`;

const isValid = (v: WsValue) => v.value !== '' && Number.isFinite(Number(v.value)) && Number(v.value) >= 0;

/** Turns a USGS "latest values" response into Site objects (streams only, still reporting). */
export function parseSites(json: WsResponse, sourceId: string, now = Date.now()): Site[] {
  const sites: Site[] = [];
  for (const ts of json.value.timeSeries) {
    const info = ts.sourceInfo;
    const type = info.siteProperty.find((p) => p.name === 'siteTypeCd')?.value ?? '';
    if (!type.startsWith('ST')) continue; // ST = stream. Skip wells and other site types.
    const values = ts.values[0]?.value.filter(isValid) ?? [];
    const last = values[values.length - 1];
    if (!last) continue;
    const time = new Date(last.dateTime).toISOString();
    if (now - Date.parse(time) > STALE_DAYS * 86_400_000) continue;
    const code = info.siteCode[0].value;
    sites.push({
      id: `USGS-${code}`,
      name: info.siteName,
      lat: info.geoLocation.geogLocation.latitude,
      lon: info.geoLocation.geogLocation.longitude,
      sourceId,
      kind: 'official',
      latest: { time, value: round2(Number(last.value)) },
      url: usgsSiteUrl(code),
    });
  }
  return sites;
}

/** Daily values → readings. USGS gives dates without a time zone; we store noon UTC so the day never shifts. */
export function parseDaily(json: WsResponse): Reading[] {
  const series = json.value.timeSeries[0];
  if (!series) return [];
  return series.values[0].value.filter(isValid).map((v) => ({
    time: `${v.dateTime.slice(0, 10)}T12:00:00.000Z`,
    value: round2(Number(v.value)),
  }));
}

/** Averages 15-minute readings into one reading per day (by the sensor's local date). */
export function dailyMeans(values: WsValue[]): Reading[] {
  const byDay = new Map<string, number[]>();
  for (const v of values.filter(isValid)) {
    const day = v.dateTime.slice(0, 10);
    const list = byDay.get(day) ?? [];
    list.push(Number(v.value));
    byDay.set(day, list);
  }
  return [...byDay.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, list]) => ({
      time: `${day}T12:00:00.000Z`,
      value: round2(list.reduce((a, b) => a + b, 0) / list.length),
    }));
}

/** Latest values for flow, temperature, etc. → Measurements (newest real value per parameter, recent only). */
export function parseConditions(json: WsResponse, now = Date.now()): Measurement[] {
  return latestMeasurements(
    json.value.timeSeries.map((ts) => ({
      code: ts.variable?.variableCode[0]?.value ?? '',
      // one series can hold several lists (for example two sensors), so they're merged
      values: ts.values.flatMap((list) => list.value.filter((v) => v.value !== '').map((v) => ({ time: v.dateTime, value: Number(v.value) }))),
    })),
    now,
  );
}

export class UsgsWaterServicesSource implements DataSource {
  id = 'usgs-waterservices';
  label = 'USGS';
  kind = 'official' as const;

  async getSites(): Promise<Site[]> {
    const json = await fetchJson<WsResponse>(
      `${BASE}/iv/?format=json&stateCd=ia&parameterCd=${NITRATE_PARAM}&siteStatus=active`,
    );
    return parseSites(json, this.id);
  }

  async getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    const code = siteId.replace(/^USGS-/, '');
    const daily = parseDaily(
      await fetchJson<WsResponse>(
        `${BASE}/dv/?format=json&sites=${code}&parameterCd=${NITRATE_PARAM}&statCd=00003&period=P${range.days}D`,
      ),
    );
    if (daily.length) return daily;
    // Some sensors only publish 15-minute values. Average them by day instead.
    const iv = await fetchJson<WsResponse>(
      `${BASE}/iv/?format=json&sites=${code}&parameterCd=${NITRATE_PARAM}&period=P${range.days}D`,
    );
    const series = iv.value.timeSeries[0];
    return series ? dailyMeans(series.values[0].value) : [];
  }

  async getConditions(siteId: string): Promise<Measurement[]> {
    const code = siteId.replace(/^USGS-/, '');
    const json = await fetchJson<WsResponse>(`${BASE}/iv/?format=json&sites=${code}&parameterCd=${CONDITION_CODES.join(',')}`);
    return parseConditions(json);
  }

  async getFlow(siteId: string, range: DateRange): Promise<Reading[]> {
    const code = siteId.replace(/^USGS-/, '');
    return parseDaily(
      await fetchJson<WsResponse>(`${BASE}/dv/?format=json&sites=${code}&parameterCd=${FLOW}&statCd=00003&period=P${range.days}D`),
    );
  }
}
