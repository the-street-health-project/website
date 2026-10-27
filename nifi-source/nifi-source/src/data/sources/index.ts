/**
 * Chooses which data sources the app uses.
 *
 * Normal mode: live USGS data (with fallbacks).
 * Demo mode:   the saved USGS snapshot plus example community sensors, so every feature works offline.
 * Both modes:  lab samples from rivers with no live sensor (saved in the app; see labSamples.ts).
 *
 * A future community sensor network would be added to the list here. Nothing else changes.
 */
import type { DataSource } from '../types';
import { BundledUsgsSource, ExampleCommunitySource } from './bundled';
import { LabSampleSource } from './labSamples';
import { ResilientSource } from './resilient';
import { UsgsWaterDataApiSource } from './usgsWaterDataApi';
import { UsgsWaterServicesSource } from './usgsWaterServices';

export interface SourceSet {
  official: DataSource;
  others: DataSource[];
}

export function createSources(opts: { demo: boolean; showCommunityExamples: boolean }): SourceSet {
  const official = opts.demo
    ? new BundledUsgsSource()
    : new ResilientSource('usgs', 'USGS', [new UsgsWaterServicesSource(), new UsgsWaterDataApiSource()], new BundledUsgsSource());
  const others: DataSource[] = [new LabSampleSource()];
  if (opts.demo && opts.showCommunityExamples) others.push(new ExampleCommunitySource());
  return { official, others };
}

export { LabSampleSource, ResilientSource };
