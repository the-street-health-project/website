/**
 * Iowa cities and towns, for searching without the internet and without a paid geocoding service.
 * The list (1,000+ places with coordinates) comes from the U.S. Census Gazetteer.
 */
import placesJson from '../data/geo/iowa-places.json';
import type { Place } from '../data/types';
import { distanceMiles } from './geo';

const PLACES = placesJson as Place[];

/** Towns whose names match the search, best matches (name starts with the text) first. */
export function searchPlaces(query: string, limit = 6): Place[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const starts: Place[] = [];
  const contains: Place[] = [];
  for (const p of PLACES) {
    const name = p.name.toLowerCase();
    if (name.startsWith(q)) starts.push(p);
    else if (name.includes(q)) contains.push(p);
    if (starts.length >= limit) break;
  }
  return [...starts, ...contains].slice(0, limit).map((p) => ({ ...p, name: `${p.name}, Iowa` }));
}

/** The closest town, used to give a GPS location a friendly name ("Near Ames"). */
export function nearestTown(lat: number, lon: number): { name: string; miles: number } {
  let best = PLACES[0];
  let bestMiles = Infinity;
  for (const p of PLACES) {
    const d = distanceMiles(lat, lon, p.lat, p.lon);
    if (d < bestMiles) {
      best = p;
      bestMiles = d;
    }
  }
  return { name: best.name, miles: bestMiles };
}
