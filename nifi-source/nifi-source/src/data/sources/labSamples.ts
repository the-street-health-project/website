/**
 * Lab samples from Iowa rivers that have no live sensor.
 *
 * Iowa DNR, USGS, the Meskwaki Nation, the Upper Mississippi River Restoration Program, and
 * Minnesota's Pollution Control Agency collect water from these rivers by hand (often monthly in
 * the warm season) and test it in a lab. scripts/build-demo-data.mjs downloads the results from
 * two public services, the Water Quality Portal and the USGS Samples API, and saves them in the app.
 * All values are nitrate + nitrite in mg/L as nitrogen, the same unit as the EPA limit.
 *
 * The data is a separate file that loads after the live sensors, so it doesn't slow down the start.
 */
import type { DataSource, DateRange, Reading, Site } from '../types';

interface LabFile {
  generatedAt: string;
  since: string;
  sites: { id: string; name: string; lat: number; lon: number; agency: string; url?: string; latest: Reading }[];
  readings: Record<string, Reading[]>;
}

let file: Promise<LabFile> | null = null;
const load = () => (file ??= import('../bundled/lab-samples.json').then((m) => m.default as LabFile));

export class LabSampleSource implements DataSource {
  id = 'lab-samples';
  label = 'Lab samples';
  kind = 'official' as const;

  async getSites(): Promise<Site[]> {
    const data = await load();
    return data.sites.map((s) => ({
      id: s.id,
      name: s.name,
      lat: s.lat,
      lon: s.lon,
      latest: s.latest,
      url: s.url,
      sourceId: this.id,
      kind: 'official',
      sampled: { agency: s.agency },
    }));
  }

  /** The samples from the `range.days` days before (and including) the newest one. */
  async getReadings(siteId: string, range: DateRange): Promise<Reading[]> {
    const list = (await load()).readings[siteId] ?? [];
    if (!list.length) return [];
    const end = Date.parse(list[list.length - 1].time);
    return list.filter((r) => end - Date.parse(r.time) < range.days * 86_400_000);
  }
}
