/**
 * Nitrate "load": how much nitrogen a river carries past a sensor each day.
 *
 *   load = concentration × flow
 *
 * 1 mg/L flowing at 1 cubic foot per second carries about 5.39 pounds a day:
 *   28.317 liters in a cubic foot × 86,400 seconds in a day = 2,446,575 liters a day
 *   × 1 milligram per liter = 2,446,575 mg = 5.39 pounds.
 *
 * A small creek with high nitrate can carry less than a big river with lower nitrate.
 * The total load is what ends up downstream, feeding the Gulf "dead zone".
 */

export const LB_PER_DAY_PER_MGL_CFS = 5.394;

/** A typical Iowa corn nitrogen rate, for a rough size comparison (ISU's guidelines run about 140 to 190 lb/acre). */
export const CORN_N_LB_PER_ACRE = 150;

/** Pounds of nitrate-nitrogen per day. */
export function nitrateLoad(mgL: number, cfs: number): number {
  return mgL * cfs * LB_PER_DAY_PER_MGL_CFS;
}

/** Rounds to 2 significant digits, so big numbers don't look more exact than they are. */
export function roughly(n: number): number {
  if (n <= 0) return 0;
  const digits = Math.floor(Math.log10(n)) - 1;
  return Math.round(n / 10 ** digits) * 10 ** digits;
}

/** "50 tons", "1.2 tons", or "640 pounds", plus the acres-of-corn comparison. */
export function describeLoad(lbPerDay: number): { amount: string; acres: number } {
  const tons = lbPerDay / 2000;
  const amount =
    tons >= 10
      ? `${roughly(tons).toLocaleString('en-US')} tons`
      : tons >= 1
        ? `${tons.toFixed(1)} tons`
        : `${roughly(lbPerDay).toLocaleString('en-US')} pounds`;
  return { amount, acres: roughly(lbPerDay / CORN_N_LB_PER_ACRE) };
}
