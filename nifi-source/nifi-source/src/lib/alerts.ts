/**
 * In-app alerts: which nearby sites deserve a banner.
 *
 * A site within the user's alert distance, or one they're watching (wherever it is), gets an alert when:
 *   - it CROSSED into a higher level since a week ago (for example from Elevated to Above limit), or
 *   - it is ABOVE the EPA limit right now.
 * Crossings are listed first, then watched and closest sites.
 */
import type { Place, Site } from '../data/types';
import { formatMiles, timeAgo } from './format';
import { distanceMiles } from './geo';
import { formatMgL, levelFor, type Level } from './nitrate';

export interface Alert {
  id: string; // changes when the situation changes, so a dismissed alert can come back later
  site: Site;
  miles: number;
  severity: 'high' | 'watch';
  kind: 'crossed' | 'above';
  title: string;
  body: string;
}

const RANK: Record<Level, number> = { low: 0, watch: 1, high: 2 };
const NO_PLACE_MILES = 1e9; // watched sites when no home is set: sorted after everything else

/**
 * @param previous  each site's value about a week ago (from its daily readings), if known
 * @param watched   ids of sites the user is watching
 */
export function computeAlerts(
  sites: Site[],
  place: Place | null,
  radiusMiles: number,
  previous: Record<string, number>,
  watched: Set<string> = new Set(),
): Alert[] {
  const alerts: Alert[] = [];
  for (const site of sites) {
    // Lab samples can be months old, so they never raise an alert about "now".
    if (!site.latest || site.sampled) continue;
    const isWatched = watched.has(site.id);
    const miles = place ? distanceMiles(place.lat, place.lon, site.lat, site.lon) : NO_PLACE_MILES;
    const inRange = !!place && miles <= radiusMiles;
    if (!inRange && !isWatched) continue;

    const value = site.latest.value;
    const level = levelFor(value);
    const before = previous[site.id];
    const day = site.latest.time.slice(0, 10);
    const where = inRange ? `${formatMiles(miles)} from ${place!.name}` : 'On your watch list';

    if (before != null && RANK[level] > RANK[levelFor(before)]) {
      alerts.push({
        id: `${site.id}:crossed:${level}:${day}`,
        site,
        miles,
        severity: level === 'high' ? 'high' : 'watch',
        kind: 'crossed',
        title: level === 'high' ? `${site.name} rose above the drinking water limit` : `${site.name} rose into the elevated range`,
        body: `Now ${formatMgL(value)}, up from ${formatMgL(before)} a week ago. ${where}.`,
      });
    } else if (level === 'high') {
      alerts.push({
        id: `${site.id}:above:${day}`,
        site,
        miles,
        severity: 'high',
        kind: 'above',
        title: `${site.name} is above the drinking water limit`,
        body: `${formatMgL(value)} measured ${timeAgo(site.latest.time)}. ${where}.`,
      });
    }
  }
  return alerts.sort((a, b) => (a.kind === b.kind ? a.miles - b.miles : a.kind === 'crossed' ? -1 : 1));
}
