import { describe, expect, it } from 'vitest';
import { TURNS, turnFor } from './pageTurn';
import { isSettled, spring, stepSpring } from './spring';

describe('spring physics', () => {
  it('moves toward its target, overshoots a little, and settles there', () => {
    const s = spring(0);
    s.target = 10;
    let peak = 0;
    for (let i = 0; i < 120; i++) {
      stepSpring(s, 1 / 60); // two seconds at 60 frames a second
      peak = Math.max(peak, s.value);
    }
    expect(peak).toBeGreaterThan(10); // the wobble: it goes past the target before coming back
    expect(peak).toBeLessThan(13); // ...but not wildly
    expect(isSettled(s)).toBe(true);
    expect(s.value).toBeCloseTo(10, 2);
  });

  it("stays stable when a frame is very slow (it splits big steps up)", () => {
    const s = spring(0);
    s.target = 5;
    stepSpring(s, 0.5); // a half-second hiccup
    expect(Number.isFinite(s.value)).toBe(true);
    expect(Math.abs(s.value)).toBeLessThan(10);
  });

  it('a nudge (a kick of speed) wobbles and comes back to rest', () => {
    const s = spring(0);
    s.velocity = 160;
    for (let i = 0; i < 180; i++) stepSpring(s, 1 / 60);
    expect(isSettled(s)).toBe(true);
    expect(s.value).toBeCloseTo(0, 2);
  });
});

describe('page turns', () => {
  it('gives every tab its own turn', () => {
    const tabs = Object.keys(TURNS) as (keyof typeof TURNS)[];
    expect(tabs).toEqual(['home', 'map', 'learn', 'sensor', 'settings']);
    expect(new Set(tabs.map(turnFor)).size).toBe(tabs.length);
  });

  it('matches each turn to where you are going', () => {
    expect(turnFor('home')).toBe('surface'); // water
    expect(turnFor('map')).toBe('dive'); // down from orbit
    expect(turnFor('learn')).toBe('page'); // a book
  });
});
