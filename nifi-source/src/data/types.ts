/**
 * Shared data types.
 *
 * Every water-data provider (USGS today, a community sensor network later) is converted
 * into these same shapes, so the map, charts, and alerts never need to know where data came from.
 */

/** Official = government monitoring (USGS). Community = low-cost sensors run by people (future). */
export type SourceKind = 'official' | 'community';

/**
 * One measurement in a daily series. For nitrate, values are mg/L of nitrate as nitrogen
 * (the unit EPA's limit uses). For river flow series, values are cubic feet per second.
 */
export interface Reading {
  time: string; // ISO 8601 date-time
  value: number; // mg/L nitrate as N (or ft³/s for river flow)
}

/** Something else measured at a site right now, such as river flow or water temperature. */
export interface Measurement {
  code: string; // USGS parameter code, e.g. "00060" = river flow (names and units: src/lib/parameters.ts)
  value: number;
  time: string; // ISO 8601 date-time
}

/** A place where water is measured. */
export interface Site {
  id: string; // unique across all sources, e.g. "USGS-05482500"
  name: string;
  lat: number;
  lon: number;
  sourceId: string; // which DataSource it came from
  kind: SourceKind;
  latest?: Reading; // most recent measurement, if any
  url?: string; // where to see the official record
  isExample?: boolean; // true for made-up demo data (shown with an "Example" label)
  /**
   * Set for sites with no live sensor, where people collect water by hand now and then and a lab
   * tests it. `latest` is then the newest lab sample, which can be months old, so the app always
   * shows its date and never treats it as "right now" (no alerts, not in "above the limit right now").
   */
  sampled?: { agency: string };
}

/** How much history to load. */
export interface DateRange {
  days: number;
}

/**
 * The one interface every data provider implements.
 * To add a new source (for example community sensors), write a class with the first
 * two methods. Nothing in the user interface has to change.
 * The last two are optional: a simple nitrate-only sensor can skip them, and the app
 * just leaves those sections out.
 */
export interface DataSource {
  id: string;
  label: string; // shown to users, e.g. "USGS"
  kind: SourceKind;
  /** All monitoring sites, each with its latest reading. */
  getSites(): Promise<Site[]>;
  /** Daily nitrate readings for one site, oldest first. */
  getReadings(siteId: string, range: DateRange): Promise<Reading[]>;
  /** Optional: everything else measured at the site right now (river flow, temperature, ...). */
  getConditions?(siteId: string): Promise<Measurement[]>;
  /** Optional: daily river flow in cubic feet per second, oldest first. */
  getFlow?(siteId: string, range: DateRange): Promise<Reading[]>;
}

/** Where the data on screen came from, so the app can tell the user honestly. */
export type DataStatus =
  | { mode: 'live'; sourceLabel: string; updatedAt: string }
  | { mode: 'cached'; sourceLabel: string; updatedAt: string }
  | { mode: 'demo'; updatedAt: string }
  | { mode: 'loading' };

/** A place the user picked (their home or a field). */
export interface Place {
  name: string;
  lat: number;
  lon: number;
}
