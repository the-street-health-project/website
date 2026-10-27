/**
 * Farmer mode: a simple runoff-risk score and practice suggestions.
 *
 * GENERAL EDUCATIONAL GUIDANCE, NOT AGRONOMIC OR REGULATORY ADVICE.
 *
 * The score adds up points from things that make nitrate loss more likely:
 *   nearby streams already high (+2) or in the elevated range (+1)
 *   nearby streams rising (+1)
 *   heavy rain forecast in the next 3 days (+2), or some rain (+1)
 *   soils wet from the past week's rain (+1)
 *   a high-loss season: spring, after harvest, or frozen winter ground (+1)
 *   tile-drained field (+1)
 * 0–2 points = low, 3–4 = moderate, 5 or more = high.
 */
import type { Crop } from '../state/settings';
import { levelFor } from './nitrate';
import type { Trend } from './trend';

export interface RiskInput {
  crop: Crop;
  tileDrained: 'yes' | 'no' | 'unsure';
  month: number; // 0 = January
  nearby: { value: number; trend: Trend | null }[];
  rainNext3: number | null; // inches
  rainPast7: number | null; // inches
}

export interface Risk {
  level: 'low' | 'moderate' | 'high';
  score: number;
  reasons: string[];
}

export function runoffRisk(input: RiskInput): Risk {
  let score = 0;
  const reasons: string[] = [];
  const add = (points: number, reason: string) => {
    score += points;
    reasons.push(reason);
  };

  const highest = Math.max(0, ...input.nearby.map((n) => n.value));
  if (levelFor(highest) === 'high') add(2, `A nearby stream is above the 10 mg/L drinking water limit (${highest.toFixed(1)} mg/L).`);
  else if (levelFor(highest) === 'watch') add(1, `Nearby streams are in the elevated range (up to ${highest.toFixed(1)} mg/L).`);
  if (input.nearby.some((n) => n.trend?.direction === 'rising')) add(1, 'Nitrate in nearby streams has been rising this month.');

  if (input.rainNext3 != null) {
    if (input.rainNext3 >= 1) add(2, `About ${input.rainNext3.toFixed(1)} in. of rain is forecast in the next 3 days.`);
    else if (input.rainNext3 >= 0.5) add(1, `About ${input.rainNext3.toFixed(1)} in. of rain is forecast in the next 3 days.`);
  }
  if (input.rainPast7 != null && input.rainPast7 >= 1.5) add(1, `Soils are wet: ${input.rainPast7.toFixed(1)} in. of rain fell this past week.`);

  const m = input.month;
  if (m >= 2 && m <= 5) add(1, 'Spring is when most nitrate leaves Iowa fields: rain falls before crops are big enough to use it.');
  else if (m === 9 || m === 10) add(1, 'After harvest, no crop is using the nitrate left in the soil.');
  else if (m === 11 || m <= 1) add(1, 'In winter, frozen or bare ground lets nutrients run off with snowmelt.');

  if (input.tileDrained === 'yes') add(1, 'Tile drainage carries nitrate straight to ditches and streams.');

  const level = score >= 5 ? 'high' : score >= 3 ? 'moderate' : 'low';
  return { level, score, reasons };
}

export interface Practice {
  id: string;
  title: string;
  why: string;
  tips: string[];
  research?: string;
  relevant: boolean; // shown first when true
}

export function practicesFor(input: Pick<RiskInput, 'crop' | 'tileDrained' | 'month'>, risk: Risk): Practice[] {
  const { crop, tileDrained, month } = input;
  const usesNitrogen = crop === 'corn' || crop === 'small-grains' || crop === 'other';
  const fall = month >= 8 && month <= 10;

  const timing: Practice = {
    id: 'timing',
    title: 'Fertilizer timing',
    why: usesNitrogen
      ? 'Nitrogen applied close to when the crop needs it has less time to wash away.'
      : crop === 'soybeans'
        ? 'Soybeans make their own nitrogen, so they usually need no nitrogen fertilizer. Nitrate can still leave the field after soybeans, which is why cover crops help.'
        : 'Hay and pasture keep roots in the ground all year, which holds nitrate well. Time manure so it is not spread before heavy rain or on frozen ground.',
    tips: usesNitrogen
      ? [
          'Favor spring or in-season (sidedress) applications over fall.',
          fall ? 'If you fall-apply, Iowa State suggests waiting until soil at 4 inches is below 50°F and cooling.' : 'Split nitrogen into more than one application when you can.',
          risk.level === 'high' || risk.level === 'moderate' ? 'Hold off on applying fertilizer or manure right before the rain in the forecast.' : 'Check the forecast before applying; avoid applying right before heavy rain.',
          'Use a research-based rate rather than adding extra "insurance" nitrogen.',
        ]
      : ['Avoid spreading manure before heavy rain or on frozen or snow-covered ground.'],
    relevant: usesNitrogen || risk.level !== 'low',
  };

  const cover: Practice = {
    id: 'cover',
    title: 'Cover crops',
    why: 'A cover crop like cereal rye grows after harvest and takes up leftover nitrate before it can leave the field.',
    tips: ['Plant right after harvest so it grows before winter.', 'Cereal rye works well before soybeans; oats winter-kill and need no spring termination.'],
    research: 'Iowa State research: cereal rye cut nitrate leaving fields by 31% on average; oats by 28%.',
    relevant: true,
  };

  const buffers: Practice = {
    id: 'buffers',
    title: 'Buffer strips',
    why: 'Strips of grass or trees between fields and streams slow runoff and let plant roots take up nutrients before water reaches the creek.',
    tips: [
      'Focus on field edges next to streams and ditches.',
      tileDrained === 'yes'
        ? 'A "saturated buffer" sends tile water through the buffer\'s soil instead of straight into the ditch.'
        : 'Keep buffers wide and well-rooted along the whole stream bank.',
    ],
    relevant: true,
  };

  const drainage: Practice = {
    id: 'drainage',
    title: 'Controlled drainage',
    why: 'A control structure on the tile line holds water in the field when drainage isn\'t needed, so less water (and nitrate) leaves.',
    tips: ['Raise the outlet after harvest and in winter; lower it before planting and field work.', 'Works best on flat, tile-drained fields.'],
    research: 'Iowa State research: drainage water management cut nitrate loads by 33% on average.',
    relevant: tileDrained !== 'no',
  };

  const edge: Practice = {
    id: 'edge',
    title: 'Bioreactors and wetlands',
    why: 'At the edge of the field, a woodchip bioreactor or a wetland lets natural bacteria turn nitrate into harmless nitrogen gas.',
    tips: ['Bioreactors treat tile water from one field; wetlands treat water from a larger area.'],
    research: 'Average nitrate reductions: bioreactors about 43% (Iowa Agriculture Water Alliance), wetlands about 52% (Iowa State).',
    relevant: tileDrained === 'yes',
  };

  return [timing, cover, buffers, drainage, edge].sort((a, b) => Number(b.relevant) - Number(a.relevant));
}
