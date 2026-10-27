/**
 * The 3D space behind every screen: Iowa field rows stretching to the horizon, and water
 * droplets floating at different depths. Close droplets move more than far ones when you
 * scroll or move the mouse (parallax), which is how your eyes judge depth in real life.
 *
 * It's plain CSS 3D (see .cc-world in index.css), drawn very faintly so text stays easy to read.
 * Decorative only: hidden from screen readers and never in the way of a click.
 */
import { useEffect, useRef, type CSSProperties } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

// [left %, top %, size px, depth px (negative = farther away), drift seconds]
const DROPS: [number, number, number, number, number][] = [
  [8, 22, 120, -260, 19],
  [82, 14, 90, -420, 23],
  [64, 58, 150, -120, 17],
  [18, 70, 70, -520, 27],
  [44, 34, 54, -620, 31],
  [90, 76, 110, -200, 21],
  [30, 88, 60, -360, 25],
];

export function World3D({ scroller }: { scroller: () => HTMLElement | null }) {
  const world = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = world.current;
    if (!el || reduced) return;
    let frame = 0;
    let px = 0;
    let py = 0;
    let scroll = 0;
    const write = () => {
      frame = 0;
      el.style.setProperty('--px', px.toFixed(3));
      el.style.setProperty('--py', py.toFixed(3));
      el.style.setProperty('--scroll', scroll.toFixed(0));
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };
    const onPointer = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      px = e.clientX / window.innerWidth - 0.5;
      py = e.clientY / window.innerHeight - 0.5;
      schedule();
    };
    // The main area scrolls, not the window, and it can be swapped out, so listen in the capture phase.
    const onScroll = (e: Event) => {
      const main = scroller();
      if (e.target !== main || !main) return;
      scroll = main.scrollTop;
      schedule();
    };
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('scroll', onScroll, { capture: true });
    };
  }, [reduced, scroller]);

  return (
    <div ref={world} className="cc-world" aria-hidden="true">
      <div className="cc-world__sky" />
      <div className="cc-world__floor">
        <div className="cc-world__grid" />
      </div>
      {DROPS.map(([left, top, size, depth, drift], i) => (
        <span
          key={i}
          className="cc-world__drop"
          style={{ left: `${left}%`, top: `${top}%`, '--size': `${size}px`, '--z': `${depth}px`, '--drift': `${drift}s` } as CSSProperties}
        />
      ))}
    </div>
  );
}
