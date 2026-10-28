/**
 * A number that counts up to its value when it first appears (or just shows it, with motion off).
 */
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';

export function CountUp({ value, decimals = 1, duration = 900 }: { value: number; decimals?: number; duration?: number }) {
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(reduced ? value : 0);

  useEffect(() => {
    if (reduced) {
      setShown(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 3; // fast at first, gently settling
      setShown(value * eased);
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration, reduced]);

  // Screen readers get the final number straight away.
  return (
    <>
      <span aria-hidden="true">{shown.toFixed(decimals)}</span>
      <span className="sr-only">{value.toFixed(decimals)}</span>
    </>
  );
}
