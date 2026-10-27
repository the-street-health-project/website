/**
 * A quick look at every river you're watching: today's reading, its level, and how much
 * it changed this week. Tap a river to open it on the map.
 */
import type { Site } from '../data/types';
import { formatDate, timeAgo } from '../lib/format';
import { valueDaysBefore } from '../lib/trend';
import { useData, useReadings } from '../state/data';
import { useNav } from '../state/nav';
import { useWatchlist, type WatchedSite } from '../state/settings';
import { Card, LevelBadge } from './ui';
import { WatchButton } from './WatchButton';

/** "↑ up 1.2 this week", "↓ down 0.4 this week", or "about the same as last week". (Not ▲, which means Elevated.) */
function weekChange(site: Site, readings: { time: string; value: number }[]): string | null {
  if (!site.latest) return null;
  const before = valueDaysBefore(readings, site.latest.time, 7);
  if (before == null) return null;
  const change = site.latest.value - before;
  if (Math.abs(change) < 0.3) return 'about the same as last week';
  return `${change > 0 ? '↑ up' : '↓ down'} ${Math.abs(change).toFixed(1)} this week`;
}

function WatchedRow({ site }: { site: Site }) {
  const { showOnMap } = useNav();
  const { readings } = useReadings(site, 30);
  const value = site.latest?.value;
  const change = weekChange(site, readings);
  return (
    <li className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => showOnMap(site.id)}
        className="flex min-h-16 min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pr-1 text-left hover:bg-paper"
      >
        <span className="w-14 shrink-0 text-right text-2xl font-bold tabular-nums">{value != null ? value.toFixed(1) : '–'}</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug text-ink">{site.name}</span>
          <span className="block text-sm text-ink-3">
            {site.sampled && site.latest ? (
              `${site.sampled.agency} lab sample, ${formatDate(site.latest.time)}`
            ) : (
              <>
                {change ? `${change} · ` : ''}
                {site.latest ? timeAgo(site.latest.time) : 'no recent reading'}
              </>
            )}
          </span>
        </span>
        {value != null && <LevelBadge value={value} />}
      </button>
      <WatchButton site={site} compact />
    </li>
  );
}

/** A watched river whose sensor isn't in today's list (often pulled from the river for winter). */
function OfflineRow({ watched }: { watched: WatchedSite }) {
  return (
    <li className="flex items-center gap-2">
      <div className="flex min-h-16 min-w-0 flex-1 items-center gap-3 py-2">
        <span className="w-14 shrink-0 text-right text-2xl font-bold text-ink-3">–</span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold leading-snug text-ink-2">{watched.name}</span>
          <span className="block text-sm text-ink-3">Not reporting right now. Some sensors come out of the river for winter.</span>
        </span>
      </div>
      <WatchButton site={watched} compact />
    </li>
  );
}

export function WatchedRivers() {
  const { watched } = useWatchlist();
  const { sites, status } = useData();
  const { go } = useNav();
  const loading = status.mode === 'loading' && !sites.length;

  return (
    <Card>
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <span aria-hidden="true" className="text-2xl leading-none text-watch-ink">
          ★
        </span>
        Rivers you're watching
      </h2>
      {!watched.length ? (
        <p className="mt-1 text-ink-2">
          Tap <strong>☆ Watch</strong> on any river to keep it here for a quick look. Find rivers on the{' '}
          <button type="button" onClick={() => go('map')} className="font-bold text-sky underline underline-offset-4">
            map
          </button>
          .
        </p>
      ) : loading ? (
        <p className="mt-1 text-ink-3">Loading your rivers…</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {watched.map((w) => {
            const site = sites.find((s) => s.id === w.id);
            return site ? <WatchedRow key={w.id} site={site} /> : <OfflineRow key={w.id} watched={w} />;
          })}
        </ul>
      )}
    </Card>
  );
}
