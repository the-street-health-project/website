/**
 * One panel of a river's details. The data (reading, conditions, nitrogen load) and each graph are
 * separate slabs. When a site opens they start stacked deep inside the screen and split apart,
 * fanning out one after another (cc-split-part in index.css). `i` is the panel's place in that order.
 */
import type { CSSProperties, ReactNode } from 'react';
import { Depth } from './ui';

export function SplitPanel({ i, label, className = '', children }: { i: number; label?: string; className?: string; children: ReactNode }) {
  return (
    <div className="cc-split-part" style={{ '--i': i } as CSSProperties}>
      <Depth reveal={false} aria-label={label} className={`rounded-2xl border border-line bg-card p-4 ${className}`}>
        {children}
      </Depth>
    </div>
  );
}
