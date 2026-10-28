/**
 * Distance and "nearest site" helpers.
 */
import type { Place, Site } from '../data/types';

/** Distance in miles between two points on Earth (the haversine formula). */
export function distanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // Earth's radius in miles
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export interface SiteDistance {
  site: Site;
  miles: number;
}

/** Sites sorted by distance from a place, closest first. Sites without readings are skipped. */
export function nearestSites(sites: Site[], place: Pick<Place, 'lat' | 'lon'>, count = 3): SiteDistance[] {
  return sites
    .filter((s) => s.latest)
    .map((site) => ({ site, miles: distanceMiles(place.lat, place.lon, site.lat, site.lon) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, count);
}

/**
 * Drops lab-sample sites that sit on the same spot (within half a kilometer) as a live sensor,
 * since the live sensor is newer. Different streams can be a kilometer apart where they join,
 * so the distance is kept small.
 */
export function withoutDuplicateSamples(sites: Site[]): Site[] {
  const live = sites.filter((s) => !s.sampled && !s.isExample);
  return sites.filter((s) => !s.sampled || !live.some((l) => distanceMiles(l.lat, l.lon, s.lat, s.lon) < 0.31));
}

/** A rough box around Iowa, used to check that a picked location is in (or near) the state. */
export const IOWA_BOUNDS: [[number, number], [number, number]] = [
  [40.37, -96.64],
  [43.51, -90.14],
];
export const IOWA_CENTER: [number, number] = [41.95, -93.4];

export function isNearIowa(lat: number, lon: number): boolean {
  return lat > 39.9 && lat < 44 && lon > -97.2 && lon < -89.6;
}
