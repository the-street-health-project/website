/**
 * Everything about one monitoring site:
 *   - the current nitrate reading and what it means, with a ☆ Watch button
 *   - what else is measured there right now (river flow, temperature...) and the nitrogen load
 *   - nitrate history (30 days or a whole year) and river flow over the same time
 *   - the nearest other sites
 */
import { useState } from 'react';
import type { Site } from '../data/types';
import { formatDate, formatDateTime, formatMiles, timeAgo } from '../lib/format';
import { nearestSites } from '../lib/geo';
import { describeHistory, describeSamples, summarizeHistory } from '../lib/history';
import { explainReading, explainSample, formatMgL } from '../lib/nitrate';
import { computeTrend, describeTrend } from '../lib/trend';
import { useData, useFlow, useReadings } from '../state/data';
import { useNav } from '../state/nav';
import { CountUp } from './CountUp';
import { FlowChart } from './FlowChart';
import { SiteConditions } from './SiteConditions';
import { SplitPanel } from './SplitPanel';
import { TrendChart } from './TrendChart';
import { ExternalLink, LevelBadge, SourceBadge } from './ui';
import { WatchButton } from './WatchButton';

interface Props {
  site: Site;
  miles?: number;
  onClose?: () => void;
  /** What tapping a nearby site does. Defaults to opening it on the map. */
  onSelectSite?: (site: Site) => void;
  /** Hide the "Around this site" list (for screens that already list nearby sites). */
  showNearby?: boolean;
}

type Span = 30 | 365;

function SpanToggle({ span, onChange }: { span: Span; onChange: (s: Span) => void }) {
  return (
    <div className="inline-flex rounded-xl border-2 border-line bg-card p-1" role="radiogroup" aria-label="How much history to show">
      {([30, 365] as const).map((s) => (
        <button
          key={s}
          type="button"
          role="radio"
          aria-checked={span === s}
          onClick={() => onChange(s)}
          className={`min-h-10 rounded-lg px-3 text-sm font-bold ${span === s ? 'bg-sky text-on-accent' : 'text-ink-2'}`}
        >
          {s === 30 ? '30 days' : '1 year'}
        </button>
      ))}
    </div>
  );
}

function NearbySites({ site, onSelect }: { site: Site; onSelect: (s: Site) => void }) {
  const { sites } = useData();
  const near = nearestSites(
    sites.filter((s) => s.id !== site.id),
    site,
    3,
  );
  if (!near.length) return null;
  return (
    <section aria-labelledby={`near-${site.id}`}>
      <h3 id={`near-${site.id}`} className="font-bold text-ink">
        Around this site
      </h3>
      <ul className="mt-1 divide-y divide-line">
        {near.map(({ site: s, miles }) => (
          <li key={s.id}>
            <button type="button" onClick={() => onSelect(s)} className="flex min-h-14 w-full items-center gap-3 rounded-xl py-2 text-left hover:bg-paper">
              <span className="w-12 shrink-0 text-right text-lg font-bold tabular-nums">{s.latest!.value.toFixed(1)}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold leading-snug text-ink">{s.name}</span>
                <span className="block text-sm text-ink-3">
                  {formatMiles(miles)} away
                  {s.isExample ? ' · example community sensor' : s.sampled ? ` · lab sample, ${formatDate(s.latest!.time)}` : ' · live'}
                </span>
              </span>
              <LevelBadge value={s.latest!.value} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Lab-sample sites show every sample the app has (they go back to January 2024). */
const ALL_SAMPLE_DAYS = 1200;

/** "2 months", "18 months" */
const sampleAge = (days: number) => {
  const months = Math.max(1, Math.round(days / 30.44));
  return `${months} month${months === 1 ? '' : 's'}`;
};

export function SiteDetail({ site, miles, onClose, onSelectSite, showNearby = true }: Props) {
  const sampled = site.sampled;
  const [liveSpan, setSpan] = useState<Span>(30);
  const span = sampled ? ALL_SAMPLE_DAYS : liveSpan;
  const { readings, loading } = useReadings(site, span);
  const { flow } = useFlow(site, span);
  const { showOnMap } = useNav();
  const trend = computeTrend(readings);
  const value = site.latest?.value;
  const ageDays = site.latest ? (Date.now() - Date.parse(site.latest.time)) / 86_400_000 : 0;
  const year = !sampled && span === 365 && value != null ? summarizeHistory(readings, value) : null;

  // The data and each graph are separate panels that split apart when the site opens (SplitPanel).
  // The graphs are keyed by the time span, so switching 30 days / 1 year flips them over (cc-chart-flip).
  return (
    <div className="flex flex-col gap-5">
      <SplitPanel i={0} label={`${site.name}: latest reading`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <SourceBadge site={site} />
            <h2 className="mt-2 text-xl font-bold leading-snug text-ink">{site.name}</h2>
            {miles != null && <p className="text-ink-3">{formatMiles(miles)} from your location</p>}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="grid size-12 shrink-0 place-items-center rounded-xl border-2 border-line text-2xl leading-none text-ink hover:bg-paper"
              aria-label="Close site details"
            >
              ×
            </button>
          )}
        </div>
        <div className="mt-3">
          <WatchButton site={site} />
        </div>

        {value != null ? (
          <div className="mt-4">
            {sampled && <p className="text-sm font-bold uppercase tracking-wider text-ink-3">Latest lab sample</p>}
            <div className="flex flex-wrap items-center gap-3">
              <span className="cc-glow-number text-5xl font-bold tracking-tight text-sky tabular-nums">
                <CountUp key={site.id} value={value} />
              </span>
              <span className="text-lg text-ink-2">mg/L nitrate</span>
              <LevelBadge value={value} size="lg" />
            </div>
            {sampled ? (
              <p className="mt-1 text-ink-3">
                Collected {formatDate(site.latest!.time)} by {sampled.agency} and tested in a lab. There's no live sensor here.
              </p>
            ) : (
              <p className="mt-1 text-ink-3">
                Measured {timeAgo(site.latest!.time)} ({formatDateTime(site.latest!.time)})
                {ageDays > 3 && ' · this sensor may be offline'}
              </p>
            )}
            <p className="mt-3 text-lg text-ink">{sampled ? explainSample(value) : explainReading(value)}</p>
            {sampled && ageDays > 30 && (
              <p className="mt-2 rounded-xl border-2 border-line bg-paper p-3 text-ink-2">
                This is the newest sample the agency has published, and it's about {sampleAge(ageDays)} old. Rivers change from week to week, so
                the water there today may be quite different.
              </p>
            )}
          </div>
        ) : (
          <p className="mt-4 text-ink-2">No recent reading from this site.</p>
        )}
      </SplitPanel>

      {!sampled && <SiteConditions site={site} i={1} />}

      <SplitPanel i={3} label={`Graph: nitrate at ${site.name}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-ink">
            {sampled ? 'Nitrate in lab samples' : `Nitrate, last ${span === 30 ? '30 days' : 'year'}`}
          </h3>
          {!sampled && <SpanToggle span={liveSpan} onChange={setSpan} />}
        </div>
        <div key={span} className="cc-chart-flip">
          {loading ? <p className="py-10 text-center text-ink-3">Loading readings…</p> : <TrendChart series={[{ site, readings }]} dots={!!sampled} />}
          {!loading && sampled && (
            <ul className="mt-2 space-y-1 text-ink-2">
              {describeSamples(readings).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {!loading &&
            !sampled &&
            (span === 365 ? (
              year ? (
                <ul className="mt-2 space-y-1 text-ink-2">
                  {describeHistory(year).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-ink-2">This sensor doesn't have a year of readings yet.</p>
              )
            ) : (
              <>
                <p className="mt-2 text-ink-2">{describeTrend(trend)}</p>
                {trend && (
                  <p className="text-sm text-ink-3">
                    30-day range: {formatMgL(trend.min)} to {formatMgL(trend.max)}
                  </p>
                )}
              </>
            ))}
        </div>
      </SplitPanel>

      {flow.length > 0 && (
        <SplitPanel i={4} label={`Graph: river flow at ${site.name}`}>
          <h3 className="font-bold text-ink">River flow, same {span === 30 ? '30 days' : 'year'} (ft³/s)</h3>
          <div key={span} className="cc-chart-flip">
            <FlowChart flow={flow} />
          </div>
          <p className="mt-1 text-sm text-ink-3">
            Big rains show up as spikes. Compare them with the nitrate chart: rainwater can dilute nitrate at first, then in tile-drained farm
            country it often climbs as drains flush water out of fields.
          </p>
        </SplitPanel>
      )}

      {showNearby && (
        <SplitPanel i={5} label="Around this site">
          <NearbySites site={site} onSelect={onSelectSite ?? ((s) => showOnMap(s.id))} />
        </SplitPanel>
      )}

      {site.isExample ? (
        <p className="rounded-xl bg-community-soft p-3 text-ink">
          <strong>This sensor isn't real.</strong> It's example data showing how readings from NiFi's future
          low-cost community sensors will look next to official USGS data.
        </p>
      ) : site.url ? (
        <ExternalLink href={site.url}>See this site on USGS Water Data</ExternalLink>
      ) : (
        sampled && (
          <p className="text-ink-2">
            Data: {sampled.agency}, from the <ExternalLink href="https://www.waterqualitydata.us/">Water Quality Portal</ExternalLink> (run by USGS and EPA).
          </p>
        )
      )}
    </div>
  );
}
