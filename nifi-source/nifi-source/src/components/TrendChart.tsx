/**
 * Line chart of daily nitrate readings. Accepts any number of series from any source:
 * official data draws as a solid line, community data as a dashed line.
 * Dashed reference lines mark the elevated level (5) and the EPA limit (10).
 */
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Reading, Site } from '../data/types';
import { EPA_LIMIT, WATCH_LEVEL } from '../lib/nitrate';
import { CHART, TOOLTIP } from './chartTheme';

export interface ChartSeries {
  site: Site;
  readings: Reading[];
}

const COLORS = { official: CHART.nitrate, community: CHART.community };

const dayKey = (iso: string) => iso.slice(0, 10);
const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/** `dots`: draw a dot for every reading (for lab samples, which are weeks apart). */
export function TrendChart({ series, height = 230, dots = false }: { series: ChartSeries[]; height?: number; dots?: boolean }) {
  // Recharts wants one row per date with a column per site: { day: '2026-10-01', 'USGS-1': 9.2, 'EX-1': 8.7 }
  const rows = new Map<string, Record<string, number | string>>();
  for (const s of series) {
    for (const r of s.readings) {
      const day = dayKey(r.time);
      const row = rows.get(day) ?? { day };
      row[s.site.id] = r.value;
      rows.set(day, row);
    }
  }
  const data = [...rows.values()].sort((a, b) => String(a.day).localeCompare(String(b.day)));
  if (!data.length) return <p className="py-10 text-center text-ink-3">No recent readings to chart.</p>;

  const max = Math.max(...series.flatMap((s) => s.readings.map((r) => r.value)));
  const top = Math.ceil(Math.max(EPA_LIMIT * 1.2, max * 1.1));
  let officialIndex = 0;
  let communityIndex = 0;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: -8 }} accessibilityLayer>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDate} tick={{ fill: CHART.tick, fontSize: 13 }} minTickGap={24} />
          <YAxis domain={[0, top]} tick={{ fill: CHART.tick, fontSize: 13 }} width={44} unit="" allowDecimals={false} />
          <ReferenceLine y={EPA_LIMIT} stroke={CHART.limit} strokeWidth={2} strokeDasharray="6 4" label={{ value: 'EPA limit (10)', position: 'insideTopLeft', fill: CHART.limit, fontSize: 13, fontWeight: 700 }} />
          <ReferenceLine y={WATCH_LEVEL} stroke={CHART.elevated} strokeDasharray="4 4" label={{ value: 'Elevated (5)', position: 'insideBottomLeft', fill: CHART.elevated, fontSize: 12 }} />
          <Tooltip {...TOOLTIP}
            labelFormatter={(day) => shortDate(String(day))}
            formatter={(value, name) => [`${Number(value).toFixed(1)} mg/L`, series.find((s) => s.site.id === name)?.site.name ?? String(name)]}
          />
          {series.length > 1 && <Legend formatter={(id) => series.find((s) => s.site.id === id)?.site.name ?? id} />}
          {series.map((s) => {
            const community = s.site.kind === 'community';
            const color = community ? COLORS.community[communityIndex++ % 2] : COLORS.official[officialIndex++ % 3];
            return (
              <Line
                key={s.site.id}
                type="monotone"
                dataKey={s.site.id}
                stroke={color}
                strokeWidth={3}
                strokeDasharray={community ? '7 5' : undefined}
                dot={dots ? { r: 4, fill: color, strokeWidth: 0 } : false}
                activeDot={{ r: 6 }}
                connectNulls
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
