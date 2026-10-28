/**
 * The 3D turns between screens.
 *
 * Browsers with the View Transitions API take a picture of the screen before and after a change.
 * index.css then moves those two pictures in 3D. Each destination has its own turn that matches
 * what's coming (TURNS below), and changes inside a screen have their own too: switching the map
 * between flat and 3D, and jumping to a topic on Learn.
 *
 * Browsers without the API just switch screens, and so does everyone with motion turned down.
 */
import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

const turning = () => document.documentElement.classList.contains('cc-vt-running');

/** Resolves once a page turn in progress has finished (right away if there isn't one). */
export function afterPageTurn(): Promise<void> {
  if (!turning()) return Promise.resolve();
  return new Promise((resolve) => {
    const watch = new MutationObserver(() => {
      if (turning()) return;
      watch.disconnect();
      resolve();
    });
    watch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  });
}

/**
 * false while a page turn is running. Heavy things (3D scenes, the ~100 map markers) wait for it,
 * because the turn can't start until the new screen has been drawn once, and building them
 * first would hold the turn up for more than half a second.
 */
export function usePageTurnDone(): boolean {
  const [done, setDone] = useState(() => !turning());
  useEffect(() => {
    if (done) return;
    let live = true;
    afterPageTurn().then(() => live && setDone(true));
    return () => {
      live = false;
    };
  }, [done]);
  return done;
}

/**
 * The turn for each destination, chosen to match what you're going to (the animations are in index.css):
 *   My Water  "surface": the old screen sinks, the new one surfaces through a ripple, like water
 *   Map       "dive":    the old screen lies down like the ground, the map drops in from orbit
 *   Learn     "page":    the old screen turns over like a page in a book
 *   My Sensor "power":   the old screen powers off into a line of light, the new one powers on
 *   Settings  "dial":    the screens spin like a dial being turned
 */
export const TURNS = { home: 'surface', map: 'dive', learn: 'page', sensor: 'power', settings: 'dial' } as const;

/** Turns used inside a screen. */
export type InScreenTurn = 'to-holo' | 'to-flat' | 'warp';
export type TurnKind = (typeof TURNS)[keyof typeof TURNS] | InScreenTurn;

/** The turn for going to a tab. */
export const turnFor = (tab: keyof typeof TURNS): TurnKind => TURNS[tab];

const TURN_CLASSES = ['surface', 'dive', 'page', 'power', 'dial', 'to-holo', 'to-flat', 'warp'].map((k) => `cc-turn-${k}`);

type DocWithTransitions = Document & {
  startViewTransition?: (update: () => Promise<void> | void) => { finished: Promise<void> };
};

/** Waits (at most about half a second) for the new screen to replace its "Loading…" placeholder. */
async function screenReady() {
  const start = performance.now();
  // setTimeout, not requestAnimationFrame: the browser pauses drawing while it waits for this.
  while (document.querySelector('[data-cc-loading]') && performance.now() - start < 500) {
    await new Promise((resolve) => setTimeout(resolve, 16));
  }
}

/**
 * Runs `update` (the React state change that changes the screen) inside a 3D turn of the given kind.
 * `afterUpdate` runs once the new screen is in place (for example, scrolling it to the top).
 */
export function turnPage(kind: TurnKind, update: () => void, afterUpdate: () => void, animate: boolean) {
  const doc = document as DocWithTransitions;
  const root = document.documentElement;
  // A turn that starts while another is still running would fight it, so the change just happens.
  if (!animate || !doc.startViewTransition || turning()) {
    update();
    requestAnimationFrame(afterUpdate);
    return;
  }
  const done = () => root.classList.remove('cc-vt-running', ...TURN_CLASSES);
  root.classList.add('cc-vt-running', `cc-turn-${kind}`);
  try {
    const transition = doc.startViewTransition(async () => {
      flushSync(update);
      afterUpdate();
      await screenReady();
    });
    transition.finished.finally(done);
  } catch {
    done();
    update();
    requestAnimationFrame(afterUpdate);
  }
}
