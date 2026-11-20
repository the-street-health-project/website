/**
 * The charts, loaded on their own. The charts library is big (about 370 KB), so on a slow phone
 * connection the readings, levels and advice show up first, and each chart fills in a moment later.
 * The space the chart will take is held from the start, so nothing jumps when it arrives.
 */
import { lazy, Suspense, type ComponentProps } from 'react';
import type { FlowChart as FlowChartImpl } from './FlowChart';
import type { TrendChart as TrendChartImpl } from './TrendChart';

export type { ChartSeries } from './TrendChart';

const LazyTrend = lazy(() => import('./TrendChart').then((m) => ({ default: m.TrendChart })));
const LazyFlow = lazy(() => import('./FlowChart').then((m) => ({ default: m.FlowChart })));

function ChartPlaceholder({ height }: { height: number }) {
  return (
    <div style={{ height }} className="grid place-items-center rounded-xl border border-dashed border-line text-sm text-ink-3">
      <span role="status">Loading chart…</span>
    </div>
  );
}

export function TrendChart(props: ComponentProps<typeof TrendChartImpl>) {
  return (
    <Suspense fallback={<ChartPlaceholder height={props.height ?? 230} />}>
      <LazyTrend {...props} />
    </Suspense>
  );
}

export function FlowChart(props: ComponentProps<typeof FlowChartImpl>) {
  return (
    <Suspense fallback={<ChartPlaceholder height={props.height ?? 150} />}>
      <LazyFlow {...props} />
    </Suspense>
  );
}
