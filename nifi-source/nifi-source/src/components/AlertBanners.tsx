/**
 * Alert banners across the top of every screen when a site near the user's location (or any
 * river they're watching) crosses a threshold or is above the limit. Dismissed alerts stay hidden until something changes.
 */
import { useEffect, useMemo, useState } from 'react';
import { computeAlerts } from '../lib/alerts';
import { distanceMiles } from '../lib/geo';
import { valueDaysBefore } from '../lib/trend';
import { useData } from '../state/data';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNav } from '../state/nav';
import { activePlace, useSettings } from '../state/settings';
import { Button } from './ui';

export function AlertBanners() {
  const { sites, getReadings } = useData();
  const { settings, update } = useSettings();
  const { showOnMap, tab } = useNav();
  // On a phone's map screen, keep alerts to one line so the map stays visible.
  const wide = useMediaQuery('(min-width: 640px)'); // hooks must run every render, so this is outside the condition
  const compact = tab === 'map' && !wide;
  const place = activePlace(settings);
  const [previous, setPrevious] = useState<Record<string, number>>({});
  const [expanded, setExpanded] = useState(false);

  const watchedIds = useMemo(() => new Set(settings.watched.map((w) => w.id)), [settings.watched]);

  // Sites near the user, plus every river they're watching, wherever it is.
  // For each, look up the reading from about a week ago to detect crossings.
  const nearby = useMemo(
    () =>
      sites
        .filter((s) => {
          if (!s.latest || s.isExample || s.sampled) return false; // made-up sensors and old lab samples never trigger alerts
          if (watchedIds.has(s.id)) return true;
          return !!place && distanceMiles(place.lat, place.lon, s.lat, s.lon) <= settings.alertRadiusMi;
        })
        .slice(0, 12),
    [sites, place, settings.alertRadiusMi, watchedIds],
  );
  useEffect(() => {
    let cancelled = false;
    Promise.all(
      nearby.map(async (site) => [site.id, valueDaysBefore(await getReadings(site, 30), site.latest!.time, 7)] as const),
    ).then((pairs) => {
      if (cancelled) return;
      const map: Record<string, number> = {};
      for (const [id, v] of pairs) if (v != null) map[id] = v;
      setPrevious(map);
    });
    return () => {
      cancelled = true;
    };
  }, [nearby, getReadings]);

  const alerts = computeAlerts(nearby, place, settings.alertRadiusMi, previous, watchedIds).filter((a) => !settings.dismissedAlerts.includes(a.id));
  if (!alerts.length) return null;
  const shown = expanded ? alerts : alerts.slice(0, 1);

  return (
    <section aria-label="Alerts" aria-live="polite" className="border-b border-line bg-card">
      <ul className="mx-auto max-w-6xl divide-y divide-line px-4">
        {shown.map((a) => (
          <li key={a.id} className={`cc-slab my-2 flex flex-col gap-2 rounded-xl border-l-8 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 ${a.severity === 'high' ? 'border-high bg-high-soft' : 'border-watch bg-watch-soft'}`}>
            <div className="min-w-0 sm:flex-1">
              <p className="font-bold leading-snug text-ink">
                <span aria-hidden="true">{a.severity === 'high' ? '■ ' : '▲ '}</span>
                {a.title}
              </p>
              {!compact && <p className="text-sm text-ink-2 sm:text-base">{a.body}</p>}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="secondary" onClick={() => showOnMap(a.site.id)}>
                Show on map
              </Button>
              <Button variant="quiet" onClick={() => update({ dismissedAlerts: [...settings.dismissedAlerts, a.id].slice(-50) })} aria-label={`Dismiss alert: ${a.title}`}>
                Dismiss
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {alerts.length > 1 && !compact && (
        <div className="mx-auto max-w-6xl px-4 pb-2">
          <Button variant="quiet" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
            {expanded ? 'Show fewer alerts' : `Show ${alerts.length - 1} more alert${alerts.length === 2 ? '' : 's'}`}
          </Button>
        </div>
      )}
    </section>
  );
}
