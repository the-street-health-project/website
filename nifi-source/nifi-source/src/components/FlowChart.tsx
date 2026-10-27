/**
 * Daily river flow as a filled area chart. Rain shows up as spikes. Rainwater can dilute nitrate
 * at first; then in tile-drained farm country nitrate often climbs as drains flush fields.
 */
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Reading } from '../data/types';
import { CHART, TOOLTIP } from './chartTheme';

const shortDate = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
const compactNumber = (n: number) => (n >= 1000 ? `${Math.round(n / 100) / 10}k` : String(Math.round(n)));

export function FlowChart({ flow, height = 150 }: { flow: Reading[]; height?: number }) {
  if (!flow.length) return null;
  const data = flow.map((r) => ({ day: r.time.slice(0, 10), cfs: r.value }));
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }} accessibilityLayer>
          <CartesianGrid stroke={CHART.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="day" tickFormatter={shortDate} tick={{ fill: CHART.tick, fontSize: 13 }} minTickGap={24} />
          <YAxis tickFormatter={compactNumber} tick={{ fill: CHART.tick, fontSize: 13 }} width={44} />
          <Tooltip {...TOOLTIP} labelFormatter={(day) => shortDate(String(day))} formatter={(value) => [`${Number(value).toLocaleString('en-US')} ft³/s`, 'River flow']} />
          <Area type="monotone" dataKey="cfs" stroke={CHART.flow} strokeWidth={2} fill={CHART.flowFill} fillOpacity={1} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
