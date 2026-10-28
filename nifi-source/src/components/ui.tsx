/**
 * Small building blocks used on every screen.
 * Buttons are at least 48px tall: easy to tap with a thumb, or with gloves on.
 * Cards are 3D slabs that tilt and lift with physics (see fx/useDepth.ts); buttons press in like real keys.
 */
import { useRef, type ButtonHTMLAttributes, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import type { Site } from '../data/types';
import { useDepth } from '../fx/useDepth';
import { LEVELS, levelFor, type Level } from '../lib/nitrate';

type DepthProps = HTMLAttributes<HTMLElement> & {
  as?: 'section' | 'div' | 'article' | 'li';
  /** false: keeps the depth but doesn't tilt toward the pointer (for boxes full of controls) */
  tilt?: boolean;
  /** false: shows up straight away instead of moving into place on scroll (for boxes with their own entrance) */
  reveal?: boolean;
  children: ReactNode;
};

/** Any box with 3D depth: a thick edge, a neon rim, a shadow, and spring physics. */
export function Depth({ as = 'div', tilt = true, reveal = true, className = '', children, ...rest }: DepthProps) {
  const ref = useRef<HTMLElement>(null);
  useDepth(ref, { tilt, reveal });
  const Tag = as as ElementType;
  return (
    <Tag ref={ref} className={`cc-card3d ${className}`} {...rest}>
      <span className="cc-card3d__shadow" aria-hidden="true" />
      {children}
    </Tag>
  );
}

export function Card({ children, className = '', as = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return (
    <Depth as={as} className={`rounded-2xl border border-line bg-card p-5 ${className}`}>
      {children}
    </Depth>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' };

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  const styles = {
    primary: 'cc-key cc-key--primary bg-sky text-on-accent hover:bg-sky-dark',
    secondary: 'cc-key cc-key--secondary bg-card text-ink border-2 border-sky hover:bg-sky-soft',
    quiet: 'bg-transparent text-sky underline underline-offset-4 hover:text-sky-dark',
  }[variant];
  return (
    <button
      type="button"
      className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-base font-bold disabled:cursor-not-allowed disabled:opacity-60 ${styles} ${className}`}
      {...props}
    />
  );
}

const LEVEL_CLASSES: Record<Level, string> = {
  low: 'bg-low text-white',
  watch: 'bg-watch text-on-accent',
  high: 'bg-high text-white',
};

/** Colored badge with a shape symbol, so the level is clear without relying on color alone. */
export function LevelBadge({ value, size = 'md' }: { value: number; size?: 'md' | 'lg' }) {
  const level = levelFor(value);
  const info = LEVELS[level];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-bold ${LEVEL_CLASSES[level]} ${size === 'lg' ? 'px-4 py-1.5 text-base' : 'px-3 py-1 text-sm'}`}>
      <span aria-hidden="true">{info.symbol}</span>
      {info.label}
    </span>
  );
}

export function SourceBadge({ site }: { site: Site }) {
  if (site.kind === 'community') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border-2 border-dashed border-community bg-community-soft px-2.5 py-0.5 text-sm font-bold text-community">
        Community{site.isExample ? ' · Example, not real' : ''}
      </span>
    );
  }
  if (site.sampled) {
    return (
      <span className="inline-flex items-center rounded-full border-2 border-ink-3 bg-card px-2.5 py-0.5 text-sm font-bold text-ink-2">
        Lab samples · {site.sampled.agency}
      </span>
    );
  }
  return <span className="inline-flex items-center rounded-full bg-sky-soft px-2.5 py-0.5 text-sm font-bold text-sky-dark">Live sensor · USGS</span>;
}

/** A link that opens in a new tab and says so for screen readers. */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-bold text-sky underline underline-offset-4 hover:text-sky-dark">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

/** The label required on all farming suggestions. */
export function Disclaimer({ children }: { children?: ReactNode }) {
  return (
    <p className="cc-slab rounded-xl border-2 border-gold bg-gold-soft px-4 py-3 text-sm text-ink">
      <strong>General educational guidance, not agronomic or regulatory advice.</strong>{' '}
      {children ?? 'Every field is different. Talk with your agronomist, ISU Extension, or local NRCS office before changing practices.'}
    </p>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-5">
      {eyebrow && <p className="text-sm font-bold uppercase tracking-wider text-ink-3">{eyebrow}</p>}
      <h1 className="cc-title3d text-3xl font-bold leading-tight text-ink">{title}</h1>
      {children && <div className="mt-2 text-lg text-ink-2">{children}</div>}
    </header>
  );
}
