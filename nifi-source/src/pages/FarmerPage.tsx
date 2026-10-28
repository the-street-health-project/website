/**
 * Farmer mode ("My Field"): nearby stream nitrate trends plus a simple runoff-risk check and
 * practice suggestions. Everything here is labeled as general educational guidance.
 */
import { useEffect, useMemo, useState } from 'react';
import { LocationPicker } from '../components/LocationPicker';
import { TrendChart, type ChartSeries } from '../components/TrendChart';
import { Button, Card, Depth, Disclaimer, ExternalLink, LevelBadge, PageTitle } from '../components/ui';
import { WatchButton } from '../components/WatchButton';
import { WatchedRivers } from '../components/WatchedRivers';
import type { Site } from '../data/types';
import { getRainOutlook, rainAhead, rainBehind, type RainOutlook } from '../data/weather';
import { EMBEDDED } from '../lib/env';
import { practicesFor, runoffRisk } from '../lib/farmGuidance';
import { formatMiles } from '../lib/format';
import { nearestSites } from '../lib/geo';
import { computeTrend, describeTrend } from '../lib/trend';
import { useData } from '../state/data';
import { useNav } from '../state/nav';
import { activePlace, useSettings, type Crop } from '../state/settings';

const CROPS: { id: Crop; label: string }[] = [
  { id: 'corn', label: 'Corn' },
  { id: 'soybeans', label: 'Soybeans' },
  { id: 'small-grains', label: 'Small grains (oats, wheat)' },
  { id: 'hay-pasture', label: 'Hay or pasture' },
  { id: 'other', label: 'Other' },
];

const RISK_STYLE = {
  low: { box: 'border-low bg-low-soft', label: 'Low runoff risk', symbol: '●' },
  moderate: { box: 'border-watch bg-watch-soft', label: 'Moderate runoff risk', symbol: '▲' },
  high: { box: 'border-high bg-high-soft', label: 'High runoff risk', symbol: '■' },
};

/** Loads 30-day readings for several sites at once. */
function useSeries(sites: Site[]): ChartSeries[] {
  const { getReadings } = useData();
  const [series, setSeries] = useState<ChartSeries[]>([]);
  const key = sites.map((s) => s.id).join(',');
  useEffect(() => {
    let cancelled = false;
    Promise.all(sites.map(async (site) => ({ site, readings: await getReadings(site, 30) }))).then((list) => {
      if (!cancelled) setSeries(list);
    });
    return () => {
      cancelled = true;
    };
    // `key` changes exactly when the list of sites changes, so it stands in for `sites` here.
  }, [key, getReadings]);
  return series;
}

function FieldSettings() {
  const { settings, update } = useSettings();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="font-bold">Crop this season</span>
        <select value={settings.crop} onChange={(e) => update({ crop: e.target.value as Crop })} className="min-h-12 rounded-xl border-2 border-line bg-card px-3 text-base">
          {CROPS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">Is the field tile-drained?</span>
        <select value={settings.tileDrained} onChange={(e) => update({ tileDrained: e.target.value as 'yes' | 'no' | 'unsure' })} className="min-h-12 rounded-xl border-2 border-line bg-card px-3 text-base">
          <option value="yes">Yes</option>
          <option value="no">No</option>
          <option value="unsure">Not sure</option>
        </select>
      </label>
    </div>
  );
}

function RainBars({ outlook }: { outlook: RainOutlook }) {
  const days = outlook.days.slice(outlook.todayIndex, outlook.todayIndex + 7);
  const max = Math.max(1, ...days.map((d) => d.rainIn));
  return (
    <div>
      <h3 className="font-bold">Rain forecast</h3>
      <ul className="mt-2 grid grid-cols-7 gap-1 text-center" aria-label="Rain forecast for the next 7 days">
        {days.map((d, i) => {
          const label = i === 0 ? 'Today' : new Date(`${d.date}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
          return (
            <li key={d.date} className="flex flex-col items-center gap-1" aria-label={`${label}: ${d.rainIn.toFixed(2)} inches`}>
              <span className="flex h-16 w-full max-w-9 items-end overflow-hidden rounded-md bg-paper">
                <span className={`w-full rounded-t-md ${d.rainIn >= 0.5 ? 'bg-sky shadow-[0_0_12px_#39ff88]' : 'bg-sky/40'}`} style={{ height: `${Math.max(4, (d.rainIn / max) * 100)}%` }} />
              </span>
              <span className="text-sm font-bold">{d.rainIn >= 0.05 ? `${d.rainIn.toFixed(1)}″` : '–'}</span>
              <span className="text-xs text-ink-3">{label}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-sm text-ink-3">
        Past 7 days: {rainBehind(outlook).toFixed(1)} in. ·{' '}
        {outlook.source === 'demo' ? 'Demo forecast (saved sample)' : outlook.source === 'saved' ? 'Saved forecast' : 'Live forecast'} from Open-Meteo
      </p>
    </div>
  );
}

export function FarmerPage() {
  const { settings, update } = useSettings();
  const { sites } = useData();
  const { showOnMap } = useNav();
  const [changing, setChanging] = useState(false);
  const [outlook, setOutlook] = useState<RainOutlook | null>(null);
  const place = activePlace(settings);

  useEffect(() => {
    if (!place) return;
    let cancelled = false;
    getRainOutlook(place, settings.demo || EMBEDDED).then((o) => !cancelled && setOutlook(o));
    return () => {
      cancelled = true;
    };
  }, [place, settings.demo]);

  const near = useMemo(
    // Live sensors only: the runoff check is about this week, and lab samples can be months old.
    () => (place ? nearestSites(sites.filter((s) => s.kind === 'official' && !s.sampled), place, 3).filter((n, i) => i === 0 || n.miles < 60) : []),
    [sites, place],
  );
  const series = useSeries(near.map((n) => n.site));

  if (!place || changing) {
    return (
      <div className="flex flex-col gap-5">
        <PageTitle eyebrow="My Field" title="Where is your field?">
          We'll combine nearby stream data with the rain forecast and suggest ways to keep nitrate on your field.
        </PageTitle>
        <Card>
          <LocationPicker
            label="Town nearest your field"
            value={place}
            onChange={(p) => {
              update({ field: p });
              setChanging(false);
            }}
          />
        </Card>
        <Card>
          <FieldSettings />
        </Card>
      </div>
    );
  }

  const trends = series.map((s) => computeTrend(s.readings));
  const risk = runoffRisk({
    crop: settings.crop,
    tileDrained: settings.tileDrained,
    month: new Date().getMonth(),
    nearby: near.map((n, i) => ({ value: n.site.latest!.value, trend: trends[i] ?? null })),
    rainNext3: outlook ? rainAhead(outlook) : null,
    rainPast7: outlook ? rainBehind(outlook) : null,
  });
  const style = RISK_STYLE[risk.level];
  const practices = practicesFor({ crop: settings.crop, tileDrained: settings.tileDrained, month: new Date().getMonth() }, risk);

  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow="My Field" title={`Field near ${place.name.replace(/, Iowa$/, '')}`}>
        <Button variant="quiet" className="!min-h-0 !px-0" onClick={() => setChanging(true)}>
          Change location
        </Button>
      </PageTitle>

      <Disclaimer />

      {settings.watched.length > 0 && <WatchedRivers />}

      <Card>
        <FieldSettings />
      </Card>

      <Depth as="section" className={`rounded-2xl border-l-8 p-5 ${style.box}`} aria-labelledby="risk-title">
        <h2 id="risk-title" className="text-2xl font-bold">
          <span aria-hidden="true">{style.symbol} </span>
          {style.label}
        </h2>
        <p className="mt-1 text-ink-2">Based on nearby streams, the rain forecast, the season, and your field.</p>
        {risk.reasons.length > 0 && (
          <ul className="mt-3 list-disc space-y-1 pl-6">
            {risk.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        )}
        {outlook && (
          <div className="mt-4 rounded-xl bg-card p-4">
            <RainBars outlook={outlook} />
          </div>
        )}
      </Depth>

      <Card>
        <h2 className="text-xl font-bold">Nearby streams, last 30 days</h2>
        <ul className="mt-2 space-y-2">
          {near.map(({ site, miles }, i) => (
            <li key={site.id} className="flex items-start gap-2">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
                <button type="button" onClick={() => showOnMap(site.id)} className="font-bold text-sky underline underline-offset-4">
                  {site.name}
                </button>
                <span className="text-ink-3">{formatMiles(miles)}</span>
                <LevelBadge value={site.latest!.value} />
                <span className="w-full text-ink-2">{describeTrend(trends[i] ?? null)}</span>
              </div>
              <WatchButton site={site} compact />
            </li>
          ))}
        </ul>
        <div className="mt-3">
          <TrendChart series={series} height={260} />
        </div>
      </Card>

      <section aria-labelledby="practices">
        <h2 id="practices" className="mb-3 text-2xl font-bold">
          Ways to keep nitrate on your field
        </h2>
        <div className="flex flex-col gap-3">
          {practices.map((p) => (
            <Card key={p.id} as="article">
              <h3 className="text-xl font-bold">{p.title}</h3>
              <p className="mt-1">{p.why}</p>
              <ul className="mt-2 list-disc space-y-1 pl-6 text-ink-2">
                {p.tips.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
              {p.research && <p className="mt-2 rounded-lg bg-sky-soft px-3 py-2 text-sm font-bold text-sky-dark">{p.research}</p>}
            </Card>
          ))}
        </div>
      </section>

      <Card>
        <h2 className="text-xl font-bold">Help paying for conservation</h2>
        <p className="mt-1">
          USDA's Environmental Quality Incentives Program (EQIP) can share the cost of practices like cover crops and bioreactors. Your local USDA
          Service Center can explain what's available.
        </p>
        <p className="mt-2">
          <ExternalLink href="https://www.farmers.gov/working-with-us/service-center-locator">Find your USDA Service Center</ExternalLink>
        </p>
        <p className="mt-2 text-sm text-ink-3">
          Practice numbers: Iowa State University Extension (
          <ExternalLink href="https://www.agronext.iastate.edu/soilfertility/info/SP435.pdf">SP 435</ExternalLink>) and Iowa Agriculture Water Alliance.
        </p>
      </Card>

      <Disclaimer />
    </div>
  );
}
