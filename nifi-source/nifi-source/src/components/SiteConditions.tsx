/**
 * Two panels of a river's details: "Right now at this site" (everything else the sensor measures:
 * river flow, water level, temperature, oxygen...) and how much nitrogen the river carries past each day.
 * `i` is the first panel's place in the split-apart order (see SplitPanel).
 */
import type { Site } from '../data/types';
import { timeAgo } from '../lib/format';
import { CORN_N_LB_PER_ACRE, describeLoad, LB_PER_DAY_PER_MGL_CFS, nitrateLoad } from '../lib/load';
import { FLOW, formatMeasurement, PARAMETERS } from '../lib/parameters';
import { useConditions } from '../state/data';
import { SplitPanel } from './SplitPanel';

function NitrateLoad({ mgL, cfs }: { mgL: number; cfs: number }) {
  const lb = nitrateLoad(mgL, cfs);
  const { amount, acres } = describeLoad(lb);
  return (
    <div className="border-l-8 border-sky pl-4">
      <p className="text-sm font-bold uppercase tracking-wider text-sky-dark">Nitrogen flowing past</p>
      <p className="text-2xl font-bold text-ink">About {amount} a day</p>
      <p className="mt-1 text-ink-2">
        That's roughly what farmers would spread on {acres.toLocaleString('en-US')} acres of corn (at about {CORN_N_LB_PER_ACRE} pounds an
        acre). It keeps flowing downstream, toward city water plants and, in the end, the Gulf.
      </p>
      <details className="mt-2 text-sm text-ink-2">
        <summary className="cursor-pointer font-bold text-sky">How we figured this</summary>
        <p className="mt-1">
          {mgL.toFixed(1)} mg/L × {cfs.toLocaleString('en-US')} ft³/s × {LB_PER_DAY_PER_MGL_CFS} = {Math.round(lb).toLocaleString('en-US')} pounds
          a day. The {LB_PER_DAY_PER_MGL_CFS} turns "milligrams per liter times cubic feet per second" into pounds per day: a cubic foot holds
          28.3 liters, and a day has 86,400 seconds. It's an estimate: both numbers change through the day.
        </p>
      </details>
    </div>
  );
}

export function SiteConditions({ site, i }: { site: Site; i: number }) {
  const { conditions, loading } = useConditions(site);
  if (loading) return <p className="text-ink-3">Loading river conditions…</p>;
  if (!conditions.length) return null; // this site (or source) measures nitrate only

  const flow = conditions.find((m) => m.code === FLOW);
  const newest = conditions.reduce((a, b) => (a.time > b.time ? a : b));
  // Only multiply nitrate by flow if both were measured within about a day of each other.
  const sameTime = !!flow && !!site.latest && Math.abs(Date.parse(site.latest.time) - Date.parse(flow.time)) < 36 * 3_600_000;
  const nitrate = sameTime ? site.latest!.value : undefined;

  return (
    <>
      <SplitPanel i={i} label="Right now at this site">
        <h3 className="font-bold text-ink">Right now at this site</h3>
        <dl className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {conditions.map((m) => {
            const info = PARAMETERS[m.code];
            const shown = formatMeasurement(m);
            return (
              <div key={m.code} className="rounded-xl border border-line bg-paper p-3">
                <dt className="text-sm font-bold leading-snug text-ink-2">{info.label}</dt>
                <dd className="text-2xl font-bold tabular-nums text-sky">
                  {shown.value}
                  {shown.unit && <span className="ml-1 text-base font-normal text-ink-2">{shown.unit}</span>}
                </dd>
                {shown.extra && <dd className="text-sm text-ink-3">{shown.extra}</dd>}
                <dd className="mt-1 text-sm leading-snug text-ink-3">{info.meaning}</dd>
              </div>
            );
          })}
        </dl>
        <p className="mt-1 text-sm text-ink-3">Measured by USGS {timeAgo(newest.time)}.</p>
      </SplitPanel>
      {flow && nitrate != null && flow.value > 0 && (
        <SplitPanel i={i + 1} label="Nitrogen flowing past">
          <NitrateLoad mgL={nitrate} cfs={flow.value} />
        </SplitPanel>
      )}
    </>
  );
}
