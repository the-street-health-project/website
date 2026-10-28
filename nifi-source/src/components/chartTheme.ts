/**
 * Chart colors for the black-and-green theme, shared by every chart.
 * Text colors are at least 4.5:1 against the dark boxes the charts sit in.
 */
import type { CSSProperties } from 'react';

export const CHART = {
  grid: '#173226',
  tick: '#8fbba2',
  limit: '#ff5c63', // the EPA limit line: red, bright enough to read on black
  elevated: '#ffd84d', // the 5 mg/L line
  nitrate: ['#39ff88', '#eafff2', '#3de7ff'], // official sites: neon green first
  community: ['#b38cff', '#d6c2ff'],
  flow: '#3de7ff', // river flow is cyan, so it's never mistaken for nitrate
  flowFill: 'rgba(61, 231, 255, 0.18)',
};

/** Recharts tooltips are white by default; these make them dark with a green edge. */
export const TOOLTIP = {
  contentStyle: { background: '#07110c', border: '1px solid #39ff88', borderRadius: 10, color: '#eafff2' } as CSSProperties,
  labelStyle: { color: '#8dffbd', fontWeight: 700 } as CSSProperties,
  itemStyle: { color: '#eafff2' } as CSSProperties,
  cursor: { stroke: '#39ff88', strokeOpacity: 0.4 },
};
