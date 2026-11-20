import { describe, expect, it } from 'vitest';
import { preferLite } from './lite';

describe('preferLite', () => {
  it('gives the full experience when the browser shares nothing', () => {
    expect(preferLite(undefined)).toBe(false);
    expect(preferLite({})).toBe(false);
  });

  it('goes easy when Data Saver is on', () => {
    expect(preferLite({ connection: { saveData: true, effectiveType: '4g' } })).toBe(true);
  });

  it('goes easy on 2G connections, not on 3G or 4G', () => {
    expect(preferLite({ connection: { effectiveType: 'slow-2g' } })).toBe(true);
    expect(preferLite({ connection: { effectiveType: '2g' } })).toBe(true);
    expect(preferLite({ connection: { effectiveType: '3g' } })).toBe(false);
    expect(preferLite({ connection: { effectiveType: '4g' } })).toBe(false);
  });

  it('goes easy on devices with 2 GB of memory or less', () => {
    expect(preferLite({ deviceMemory: 1 })).toBe(true);
    expect(preferLite({ deviceMemory: 2 })).toBe(true);
    expect(preferLite({ deviceMemory: 4 })).toBe(false);
  });
});
