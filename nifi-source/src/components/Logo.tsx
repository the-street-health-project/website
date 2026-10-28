/**
 * The NiFi logo: Iowa's outline with a creek winding across it.
 * The outline is generated from U.S. Census boundaries by scripts/build-demo-data.mjs.
 */
import { IOWA_PATH, IOWA_VIEWBOX } from '../data/geo/iowa-outline';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  const [, , w, h] = IOWA_VIEWBOX.split(' ').map(Number);
  return (
    <svg viewBox={IOWA_VIEWBOX} width={size} height={(size * h) / w} className={className} aria-hidden="true">
      <path d={IOWA_PATH} fill="#39ff88" />
      {/* the creek */}
      <path
        d={`M${w * 0.04},${h * 0.62} C${w * 0.25},${h * 0.35} ${w * 0.4},${h * 0.85} ${w * 0.6},${h * 0.5} S${w * 0.85},${h * 0.3} ${w * 0.97},${h * 0.45}`}
        fill="none"
        stroke="#f2b324"
        strokeWidth={h * 0.09}
        strokeLinecap="round"
      />
    </svg>
  );
}
