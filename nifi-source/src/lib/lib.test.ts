import { describe, expect, it } from 'vitest';
import type { Place, Site } from '../data/types';
import { rainAhead, rainBehind, type RainOutlook } from '../data/weather';
import { computeAlerts } from './alerts';
import { practicesFor, runoffRisk } from './farmGuidance';
import { distanceMiles, nearestSites } from './geo';
import { explainReading, levelFor } from './nitrate';
import { nearestTown, searchPlaces } from './places';
import { residentGuidance } from './residentGuidance';
import { computeTrend, slope } from './trend';

const site = (id: string, lat: number, lon: number, value: number): Site => ({
  id, name: id, lat, lon, sourceId: 'test', kind: 'official', latest: { time: '2026-10-26T12:00:00.000Z', value },
});
const ames: Place = { name: 'Ames', lat: 42.0347, lon: -93.6199 };

describe('nitrate levels', () => {
  it('uses the EPA limit of 10 mg/L as the red line', () => {
    expect(levelFor(0)).toBe('low');
    expect(levelFor(4.94)).toBe('low');
    expect(levelFor(5)).toBe('watch');
    expect(levelFor(10)).toBe('watch'); // exactly at the limit is not over it
    expect(levelFor(10.1)).toBe('high');
  });

  it('judges the number people see, so the badge always matches it', () => {
    expect(levelFor(4.97)).toBe('watch'); // shown as "5.0"
    expect(levelFor(10.04)).toBe('watch'); // shown as "10.0"
    expect(levelFor(10.06)).toBe('high'); // shown as "10.1"
  });

  it('explains readings in plain English', () => {
    expect(explainReading(14.5)).toContain('45% above');
    expect(explainReading(25)).toContain('2.5 times');
    expect(explainReading(9.4)).toContain('94%');
    expect(explainReading(0.8)).toContain('well under');
  });
});

describe('distance', () => {
  it('measures miles between towns', () => {
    // Ames to Des Moines is about 30 miles in a straight line.
    expect(distanceMiles(42.0347, -93.6199, 41.5868, -93.625)).toBeGreaterThan(29);
    expect(distanceMiles(42.0347, -93.6199, 41.5868, -93.625)).toBeLessThan(32);
  });

  it('sorts sites closest first', () => {
    const list = nearestSites([site('far', 41.0, -95.0, 3), site('near', 42.0, -93.6, 3)], ames, 2);
    expect(list.map((x) => x.site.id)).toEqual(['near', 'far']);
  });
});

describe('trend', () => {
  it('finds the slope of a straight line', () => {
    expect(slope([0, 1, 2, 3], [1, 3, 5, 7])).toBeCloseTo(2);
  });

  it('calls a rise of 1 mg/L per week "rising"', () => {
    const readings = [0, 7, 14, 21].map((d, i) => ({ time: new Date(Date.UTC(2026, 9, 1 + d)).toISOString(), value: 8 + i }));
    const t = computeTrend(readings)!;
    expect(t.direction).toBe('rising');
    expect(t.perWeek).toBeCloseTo(1);
    expect(t.daysAboveLimit).toBe(1); // only the last reading (11) is over 10
  });

  it('needs at least 3 readings', () => {
    expect(computeTrend([{ time: '2026-10-01T12:00:00Z', value: 5 }])).toBeNull();
  });
});

describe('alerts', () => {
  const sites = [site('crossed', 42.0, -93.6, 11), site('above', 42.1, -93.7, 14), site('fine', 42.05, -93.65, 3), site('far', 40.6, -95.9, 20)];

  it('alerts on nearby crossings first, then sites above the limit', () => {
    const alerts = computeAlerts(sites, ames, 30, { crossed: 9 });
    expect(alerts.map((a) => `${a.site.id}:${a.kind}`)).toEqual(['crossed:crossed', 'above:above']);
    expect(alerts[0].body).toContain('up from 9.0 mg/L a week ago');
  });

  it('ignores sites outside the alert distance', () => {
    expect(computeAlerts(sites, ames, 30, {}).some((a) => a.site.id === 'far')).toBe(false);
  });

  it('needs a location', () => {
    expect(computeAlerts(sites, null, 30, {})).toEqual([]);
  });
});

describe('farm runoff risk', () => {
  const base = { crop: 'corn' as const, tileDrained: 'no' as const, month: 7, nearby: [{ value: 3, trend: null }], rainNext3: 0, rainPast7: 0 };

  it('is low in a dry August with clean streams', () => {
    expect(runoffRisk(base).level).toBe('low');
  });

  it('is high with heavy rain coming, high streams, tile drainage, and spring', () => {
    const r = runoffRisk({ ...base, month: 4, tileDrained: 'yes', nearby: [{ value: 14, trend: null }], rainNext3: 1.2 });
    expect(r.level).toBe('high');
    expect(r.reasons.length).toBeGreaterThanOrEqual(4);
  });

  it('tells soybean growers they usually do not need nitrogen fertilizer', () => {
    const p = practicesFor({ crop: 'soybeans', tileDrained: 'unsure', month: 5 }, runoffRisk(base));
    expect(p.find((x) => x.id === 'timing')!.why).toContain('make their own nitrogen');
  });

  it('puts controlled drainage first-tier only for tile-drained fields', () => {
    const p = practicesFor({ crop: 'corn', tileDrained: 'no', month: 5 }, runoffRisk(base));
    expect(p.find((x) => x.id === 'drainage')!.relevant).toBe(false);
  });
});

describe('resident guidance', () => {
  it('flags drinking water when a stream is above the limit', () => {
    const g = residentGuidance(14.5);
    expect(g[0].status).toBe('caution');
    expect(g[0].text).toContain('above the 10 mg/L');
  });

  it('says nitrate does not make fish unsafe to eat', () => {
    expect(residentGuidance(3)[2].text).toContain('does not build up in fish');
  });
});

describe('places (offline town search)', () => {
  it('finds Iowa towns by name', () => {
    expect(searchPlaces('Ames')[0].name).toBe('Ames, Iowa');
    expect(searchPlaces('des moi').some((p) => p.name === 'Des Moines, Iowa')).toBe(true);
  });

  it('names a GPS point after the nearest town', () => {
    expect(nearestTown(42.0347, -93.6199).name).toBe('Ames');
  });
});

describe('rain outlook math', () => {
  const o: RainOutlook = {
    days: [0.5, 0.25, 0, 1.0, 0.2, 0.3, 0].map((rainIn, i) => ({ date: `2026-10-0${i + 1}`, rainIn })),
    todayIndex: 3,
    source: 'demo',
    updatedAt: '',
  };
  it('adds rain ahead (from today) and behind (before today)', () => {
    expect(rainAhead(o, 3)).toBeCloseTo(1.5);
    expect(rainBehind(o, 7)).toBeCloseTo(0.75);
  });
});
