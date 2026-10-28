/**
 * A spring, the physics behind the cards' tilt and wobble.
 *
 * Picture a weight on a spring with some friction (Hooke's law, from physics class):
 *   force = -stiffness × (position - target) - damping × velocity
 * Each frame, the force changes the velocity, and the velocity changes the position.
 * With this much damping the card overshoots a little and wobbles before it settles,
 * which is what makes it feel like a real object instead of a slide.
 */

export interface Spring {
  value: number;
  velocity: number;
  target: number;
}

export const STIFFNESS = 170;
export const DAMPING = 16; // damping ratio 16 / (2 × √170) ≈ 0.6: a little bounce, settles in about half a second

export const spring = (value = 0): Spring => ({ value, velocity: 0, target: value });

/** Moves the spring forward by `dt` seconds (mass = 1). Big steps are split up so a slow frame can't make it blow up. */
export function stepSpring(s: Spring, dt: number, stiffness = STIFFNESS, damping = DAMPING): void {
  let left = Math.min(dt, 0.1);
  while (left > 0) {
    const h = Math.min(left, 1 / 120);
    const force = -stiffness * (s.value - s.target) - damping * s.velocity;
    s.velocity += force * h; // update velocity first ("semi-implicit Euler"), which keeps springs stable
    s.value += s.velocity * h;
    left -= h;
  }
}

/** Close enough to stop animating. */
export const isSettled = (s: Spring) => Math.abs(s.value - s.target) < 0.005 && Math.abs(s.velocity) < 0.005;
