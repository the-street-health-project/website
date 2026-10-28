/**
 * Turning map coordinates into 3D scene coordinates.
 *
 * Longitude/latitude are angles on a globe. For one state, a flat "equirectangular" projection is
 * accurate enough: x = east-west, z = north-south. Lines of longitude get closer together as you go
 * north, so east-west distances are multiplied by cos(latitude) to keep Iowa's shape right.
 * The y axis points up: that's where nitrate becomes height.
 */

export const ORIGIN = { lon: -93.4, lat: 41.95 }; // near the middle of Iowa
export const UNITS_PER_DEGREE = 2; // Iowa ends up about 10 units wide
const COS_LAT = Math.cos((ORIGIN.lat * Math.PI) / 180);

/** Scene position for a longitude/latitude. North is -z (away from the starting camera). */
export function toScene(lon: number, lat: number): { x: number; z: number } {
  return {
    x: (lon - ORIGIN.lon) * COS_LAT * UNITS_PER_DEGREE,
    z: -(lat - ORIGIN.lat) * UNITS_PER_DEGREE,
  };
}

export const PLATE_THICKNESS = 0.08; // the glass map plate
export const HEIGHT_PER_MGL = 0.12; // each 1 mg/L of nitrate = 0.12 units of pillar height

/** Pillar height for a nitrate reading. The EPA limit (10 mg/L) is 1.2 units tall. */
export const pillarHeight = (value: number) => Math.max(0.04, value * HEIGHT_PER_MGL);
