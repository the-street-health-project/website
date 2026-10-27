/**
 * Makes a box feel like a physical slab (used by every Card):
 *
 *   - It rises into place in 3D when it scrolls into view.
 *   - With a mouse, it tilts toward the pointer, lifts toward you, and a glare follows the pointer.
 *     Springs (see spring.ts) drive the motion, so it wobbles a little and settles.
 *   - Pressing it pushes it in; letting go springs it back.
 *   - Firing a "cc-nudge" event on it makes it wobble (the Learn page does this when you jump to a topic).
 *
 * The springs write CSS variables (--rx, --ry, --tz ...) straight onto the element, and index.css turns
 * those into a transform and shadow. Writing to the element directly, instead of through React state,
 * means a moving card doesn't re-render the page 60 times a second.
 *
 * With motion turned down (Settings, or the device's reduce-motion setting) the box keeps its depth
 * but doesn't move.
 */
import { useEffect, type RefObject } from 'react';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { isSettled, spring, stepSpring } from './spring';

const LIFT_PX = 26; // how far a hovered card rises toward you
const PRESS_PX = -9; // how far a pressed card sinks in
const MAX_TILT = 10; // degrees, for small cards (big ones tilt less, see onMove)

/** Pointer movement over these doesn't tilt the card (dragging a 3D model or the map, typing, picking). */
const IGNORE = 'canvas, input, select, textarea, .leaflet-container';

/**
 * `tilt: false` keeps the depth but doesn't follow the pointer.
 * `reveal: false` shows the box straight away, for boxes that have their own entrance (like the split panels).
 */
export function useDepth(ref: RefObject<HTMLElement | null>, { tilt = true, reveal: rises = true }: { tilt?: boolean; reveal?: boolean } = {}) {
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // ---------- rising into view ----------
    let observer: IntersectionObserver | null = null;
    const reveal = (instant: boolean) => {
      if (instant) {
        el.classList.add('cc-no-anim');
        el.classList.add('cc-in');
        requestAnimationFrame(() => el.classList.remove('cc-no-anim'));
      } else {
        el.classList.add('cc-in');
      }
    };
    const rect = el.getBoundingClientRect();
    const onScreen = rect.top < window.innerHeight && rect.bottom > 0;
    if (reduced || !rises || typeof IntersectionObserver === 'undefined') {
      reveal(true);
    } else if (onScreen && document.documentElement.classList.contains('cc-vt-running')) {
      // A 3D page turn is taking a picture of the new page right now; show cards already in place.
      reveal(true);
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return;
          // Cards nearer the top start first, so a screenful rises in a wave.
          const delay = Math.max(0, Math.min(260, (entry.boundingClientRect.top / window.innerHeight) * 260));
          el.style.transitionDelay = `${Math.round(delay)}ms`;
          reveal(false);
          window.setTimeout(() => (el.style.transitionDelay = ''), 1200);
          observer?.disconnect();
        },
        { threshold: 0.08 },
      );
      observer.observe(el);
    }
    // "cc-reveal" (see revealOnScreen) shows the box at once, for jumps where it has no time to rise.
    const onReveal = () => {
      observer?.disconnect();
      reveal(true);
    };
    el.addEventListener('cc-reveal', onReveal);
    if (reduced)
      return () => {
        observer?.disconnect();
        el.removeEventListener('cc-reveal', onReveal);
      };

    // ---------- springs ----------
    const rx = spring();
    const ry = spring();
    const tz = spring();
    const glare = spring();
    const all = [rx, ry, tz, glare];
    let hovering = false;
    let frame = 0;
    let last = 0;

    const write = () => {
      const s = el.style;
      s.setProperty('--rx', `${rx.value.toFixed(3)}deg`);
      s.setProperty('--ry', `${ry.value.toFixed(3)}deg`);
      s.setProperty('--tz', `${tz.value.toFixed(2)}px`);
      s.setProperty('--pop', `${Math.max(0, tz.value).toFixed(2)}px`);
      // The shadow slides away from the light as the card tips, and spreads as it lifts (.cc-card3d__shadow).
      s.setProperty('--sx', (-ry.value * 1.6).toFixed(2));
      s.setProperty('--sy', (rx.value * 1.6 + tz.value * 0.7).toFixed(2));
      s.setProperty('--sb', (tz.value * 1.2).toFixed(2));
      s.setProperty('--gl', glare.value.toFixed(3));
    };
    const loop = (now: number) => {
      const dt = last ? (now - last) / 1000 : 1 / 60;
      last = now;
      for (const s of all) stepSpring(s, dt);
      if (all.every(isSettled)) {
        for (const s of all) {
          s.value = s.target;
          s.velocity = 0;
        }
        write();
        frame = 0;
        return;
      }
      write();
      frame = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (frame) return;
      last = 0;
      frame = requestAnimationFrame(loop);
    };

    const ignored = (e: PointerEvent) => !!(e.target as Element | null)?.closest?.(IGNORE);
    const onMove = (e: PointerEvent) => {
      if (!tilt || (e.pointerType !== 'mouse' && e.pointerType !== 'pen') || ignored(e)) return;
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = (e.clientY - r.top) / r.height;
      // Big boxes tilt less, so long text stays easy to read.
      const max = Math.min(MAX_TILT, 2600 / Math.max(r.width, r.height, 1));
      ry.target = (x - 0.5) * 2 * max;
      rx.target = -(y - 0.5) * 2 * max;
      if (!hovering) tz.target = LIFT_PX;
      hovering = true;
      glare.target = 1;
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
      kick();
    };
    const onLeave = () => {
      hovering = false;
      rx.target = 0;
      ry.target = 0;
      tz.target = 0;
      glare.target = 0;
      kick();
    };
    let pressed = false;
    const onDown = (e: PointerEvent) => {
      if (ignored(e)) return;
      pressed = true;
      tz.target = PRESS_PX;
      kick();
    };
    // Listens on the whole window (the pointer may be let go off the card), so only the pressed card reacts.
    const onUp = () => {
      if (!pressed) return;
      pressed = false;
      tz.target = hovering ? LIFT_PX : 0;
      tz.velocity += 40; // a little bounce on release
      kick();
    };
    const onNudge = () => {
      rx.velocity += 90;
      ry.velocity -= 70;
      tz.velocity += 160;
      kick();
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    el.addEventListener('cc-nudge', onNudge);
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      el.removeEventListener('cc-nudge', onNudge);
      el.removeEventListener('cc-reveal', onReveal);
    };
  }, [ref, tilt, rises, reduced]);
}

/**
 * Shows every box now on screen that hasn't risen into view yet. A page turn's picture is taken before
 * the boxes' scroll watchers run, so after jumping somewhere in a turn, boxes would otherwise be missing from it.
 */
export function revealOnScreen() {
  for (const el of document.querySelectorAll('.cc-card3d:not(.cc-in)')) {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) el.dispatchEvent(new CustomEvent('cc-reveal'));
  }
}

/** Makes the box around `el` (a card) wobble, e.g. after jumping to it. */
export function nudge(el: Element | null | undefined) {
  el?.closest('.cc-card3d')?.dispatchEvent(new CustomEvent('cc-nudge'));
}
