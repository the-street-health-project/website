/**
 * Live Map: every Iowa stream sensor, colored by nitrate level.
 * Tap a site for its reading, river conditions, history, and a plain-English explanation.
 * The site list can show all sites or just the rivers you're watching.
 */
import { lazy, useEffect, useMemo, useState } from 'react';
import { MapView, type FlyTarget } from '../components/MapView';
import { PlaceSearch } from '../components/PlaceSearch';
import { SiteDetail } from '../components/SiteDetail';
import { Safe3D } from '../components/Safe3D';
import { Button, LevelBadge } from '../components/ui';
import { WatchButton } from '../components/WatchButton';
import type { Place, Site } from '../data/types';
import { turnPage } from '../fx/pageTurn';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMyLocation } from '../hooks/useMyLocation';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { formatDate, formatMiles } from '../lib/format';
import { distanceMiles, nearestSites } from '../lib/geo';
import { isAboveLimit, LEVELS } from '../lib/nitrate';
import { useData } from '../state/data';
import { useNav } from '../state/nav';
import { activePlace, useSettings, useWatchlist } from '../state/settings';

// The 3D hologram (and the three.js library behind it) only downloads when someone opens it.
const HologramIowa = lazy(() => import('../three/HologramIowa'));

/** Switch between the flat map and the 3D hologram. */
function ViewToggle({ view, onChange }: { view: '2d' | '3d'; onChange: (v: '2d' | '3d') => void }) {
  return (
    <div className="inline-flex rounded-xl bg-card p-1 shadow-md" role="radiogroup" aria-label="Map view">
      {(['2d', '3d'] as const).map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={view === v}
          onClick={() => onChange(v)}
          className={`min-h-11 rounded-lg px-4 font-bold ${view === v ? (v === '3d' ? 'bg-[#020604] text-[#39ff88]' : 'bg-sky text-on-accent') : 'text-ink-2'}`}
        >
          {v === '2d' ? 'Map' : '3D Hologram'}
        </button>
      ))}
    </div>
  );
}

/** The hologram's legend. Like the map legend, it starts folded up on phones. */
function HoloLegend({ showCommunity, compact }: { showCommunity: boolean; compact: boolean }) {
  const [open, setOpen] = useState(!compact);
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-12 rounded-xl bg-[#020604]/90 px-4 font-bold text-[#eafff2] shadow-md ring-1 ring-[#39ff88]/40"
        aria-expanded={false}
      >
        Legend
      </button>
    );
  }
  return (
    <div className="relative rounded-xl bg-[#020604]/90 p-3 pr-10 text-sm text-[#eafff2] shadow-md ring-1 ring-[#39ff88]/40" aria-label="Hologram legend">
      {compact && (
        <button type="button" onClick={() => setOpen(false)} className="absolute right-1 top-1 grid size-10 place-items-center text-xl" aria-label="Hide legend">
          ×
        </button>
      )}
      <p className="font-bold">Reading the hologram</p>
      <p>Pillar height = nitrate level</p>
      <p className="flex items-center gap-2"><span className="inline-block h-3 w-5 rounded-sm border border-[#ff3b4f] bg-[#ff3b4f]/30" aria-hidden="true" /> Red glass = EPA limit (10 mg/L)</p>
      <p className="mt-1 flex flex-wrap gap-x-3">
        <span><span className="text-[#3dff9a]">●</span> Low</span>
        <span><span className="text-[#ffd23d]">▲</span> Elevated</span>
        <span><span className="text-[#ff4d5e]">■</span> Above limit</span>
      </p>
      {showCommunity && <p><span className="text-[#b38cff]">┊</span> Purple wire pillars = example community sensors</p>}
      <p className="text-[#8fbba2]">Live sensors only. Lab-sample sites are on the flat map.</p>
      <p className="text-[#8fbba2]">Drag to turn · pinch to zoom · tap a pillar</p>
    </div>
  );
}

/** On phones the legend starts as a small button, so it doesn't cover the map. */
function Legend({ showCommunity, compact }: { showCommunity: boolean; compact: boolean }) {
  const [open, setOpen] = useState(!compact);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-12 rounded-xl bg-card px-4 font-bold text-ink shadow-md" aria-expanded={false}>
        Legend
      </button>
    );
  }
  return (
    <div className="relative rounded-xl bg-card/95 p-3 pr-10 text-sm shadow-md" aria-label="Map legend">
      {compact && (
        <button type="button" onClick={() => setOpen(false)} className="absolute right-1 top-1 grid size-10 place-items-center text-xl" aria-label="Hide legend">
          ×
        </button>
      )}
      <p className="mb-1 font-bold">Nitrate (mg/L)</p>
      <ul className="space-y-1">
        <li className="flex items-center gap-2"><span className="size-4 rounded-full bg-low" aria-hidden="true" /> {LEVELS.low.symbol} Low · under 5</li>
        <li className="flex items-center gap-2"><span className="size-4 rounded-full bg-watch" aria-hidden="true" /> {LEVELS.watch.symbol} Elevated · 5 to 10</li>
        <li className="flex items-center gap-2"><span className="size-4 rounded-full bg-high" aria-hidden="true" /> {LEVELS.high.symbol} Above limit · over 10</li>
      </ul>
      <p className="mt-2 flex items-center gap-2"><span className="size-4 rounded-full border-2 border-line bg-ink-3 shadow" aria-hidden="true" /> Live sensor (USGS)</p>
      <p className="flex items-center gap-2"><span className="size-4 rounded-full border-[3px] border-ink-3 bg-card" aria-hidden="true" /> Lab sample (tap for its date)</p>
      {showCommunity && (
        <p className="flex items-center gap-2"><span className="size-4 rounded border-2 border-dashed border-community" aria-hidden="true" /> Community (example)</p>
      )}
    </div>
  );
}

type ListFilter = 'all' | 'watched';

function SiteList({
  sites,
  you,
  onSelect,
  filter,
  onFilter,
}: {
  sites: Site[];
  you: Place | null;
  onSelect: (s: Site) => void;
  filter: ListFilter;
  onFilter: (f: ListFilter) => void;
}) {
  const { watched, isWatched } = useWatchlist();
  const [query, setQuery] = useState('');
  const withReading = useMemo(() => sites.filter((s) => s.latest), [sites]);
  // Live sensors (highest reading first), then lab-sample sites (A to Z), then example community sensors.
  const groups = useMemo(() => {
    const byValue = (a: Site, b: Site) => b.latest!.value - a.latest!.value;
    return [
      { title: 'Live sensors', sites: withReading.filter((s) => s.kind === 'official' && !s.sampled).sort(byValue) },
      { title: 'Lab samples (no live sensor)', sites: withReading.filter((s) => s.sampled).sort((a, b) => a.name.localeCompare(b.name)) },
      { title: 'Example community sensors (not real)', sites: withReading.filter((s) => s.kind === 'community').sort(byValue) },
    ];
  }, [withReading]);
  const [live, lab, examples] = groups.map((g) => g.sites);
  const above = live.filter((s) => isAboveLimit(s.latest!.value)).length;
  const words = query.trim().toLowerCase();
  const keep = (s: Site) => (filter === 'all' || isWatched(s.id)) && (!words || s.name.toLowerCase().includes(words));
  const offline = filter === 'watched' ? watched.filter((w) => !withReading.some((s) => s.id === w.id)) : [];

  return (
    <div>
      <h2 className="text-xl font-bold">{filter === 'watched' ? "Rivers you're watching" : 'All monitoring sites'}</h2>
      <p className="text-ink-2">
        {live.length} live USGS sensors, <strong>{above}</strong> above the EPA drinking water limit right now. Plus {lab.length} more river sites
        with lab samples{examples.length ? ` and ${examples.length} example community sensors` : ''}.
      </p>
      <div className="mt-3 inline-flex rounded-xl border-2 border-line bg-card p-1" role="radiogroup" aria-label="Which sites to list">
        {(['all', 'watched'] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => onFilter(f)}
            className={`min-h-10 rounded-lg px-3 font-bold ${filter === f ? 'bg-sky text-on-accent' : 'text-ink-2'}`}
          >
            {f === 'all' ? `All (${withReading.length})` : `★ Watched (${watched.length})`}
          </button>
        ))}
      </div>
      <label className="mt-3 block">
        <span className="sr-only">Filter the list by river name</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by river name"
          className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-3 text-base"
        />
      </label>
      {filter === 'watched' && !watched.length && (
        <p className="mt-3 text-ink-2">
          You aren't watching any rivers yet. Tap the <span aria-hidden="true">☆</span> star next to a river to save it here and on your home screen.
        </p>
      )}
      {groups.map((g) => {
        const rows = g.sites.filter(keep);
        if (!rows.length) return null;
        return (
          <section key={g.title} className="mt-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-ink-3">
              {g.title} · {rows.length}
            </h3>
            <ul className="divide-y divide-line">
              {rows.map((s) => (
                <li key={s.id} className="flex items-center gap-2">
                  <button type="button" onClick={() => onSelect(s)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left hover:bg-paper">
                    <span className="w-12 shrink-0 text-right text-lg font-bold">{s.latest!.value.toFixed(1)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold leading-snug text-ink">{s.name}</span>
                      <span className="block text-sm text-ink-3">
                        {s.sampled ? `${s.sampled.agency} lab sample, ${formatDate(s.latest!.time)}` : s.kind === 'community' ? 'Community example' : 'USGS live sensor'}
                        {you ? ` · ${formatMiles(distanceMiles(you.lat, you.lon, s.lat, s.lon))} away` : ''}
                      </span>
                    </span>
                    <LevelBadge value={s.latest!.value} />
                  </button>
                  <WatchButton site={s} compact />
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {words && groups.every((g) => !g.sites.some(keep)) && <p className="mt-3 text-ink-2">No river names match "{query}".</p>}
      <ul className="mt-3 divide-y divide-line">
        {offline.map((w) => (
          <li key={w.id} className="flex items-center gap-2">
            <span className="flex min-h-14 min-w-0 flex-1 flex-col justify-center py-2">
              <span className="block font-bold leading-snug text-ink-2">{w.name}</span>
              <span className="block text-sm text-ink-3">Not reporting right now</span>
            </span>
            <WatchButton site={w} compact />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MapPage() {
  const { sites, status } = useData();
  const { settings, update } = useSettings();
  const { focusSiteId, clearFocus } = useNav();
  const desktop = useMediaQuery('(min-width: 1024px)');
  const reducedMotion = useReducedMotion();
  const view = settings.mapView;
  const { locate, loading: locating, error: locateError } = useMyLocation();

  const [you, setYou] = useState<Place | null>(() => activePlace(settings));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [panel, setPanel] = useState<'closed' | 'list'>('closed'); // phone only
  const [listFilter, setListFilter] = useState<ListFilter>('all');
  const { watched } = useWatchlist();
  const watchedIds = useMemo(() => new Set(watched.map((w) => w.id)), [watched]);
  // The 3D view shows today's readings, so it leaves out lab samples (which can be months old).
  const liveSites = useMemo(() => sites.filter((s) => !s.sampled), [sites]);

  const selected = sites.find((s) => s.id === selectedId) ?? null;
  const fly = (lat: number, lon: number, zoom: number) => setFlyTo({ lat, lon, zoom, key: Date.now() });

  const select = (site: Site) => {
    setSelectedId(site.id);
    setPanel('closed');
    fly(site.lat, site.lon, 10);
  };

  // Another screen asked to show a particular site ("See it on the map").
  useEffect(() => {
    if (!focusSiteId || !sites.length) return;
    const site = sites.find((s) => s.id === focusSiteId);
    if (site) {
      setSelectedId(site.id);
      setFlyTo({ lat: site.lat, lon: site.lon, zoom: 10, key: Date.now() });
    }
    clearFocus();
  }, [focusSiteId, sites, clearFocus]);

  const useLocation = async () => {
    const place = await locate();
    if (!place) return;
    setYou(place);
    fly(place.lat, place.lon, 10);
    const nearest = nearestSites(sites, place, 1)[0];
    if (nearest) setSelectedId(nearest.site.id);
  };

  const miles = selected && you ? distanceMiles(you.lat, you.lon, selected.lat, selected.lon) : undefined;
  const panelContent = selected ? (
    <SiteDetail site={selected} miles={miles} onClose={() => setSelectedId(null)} onSelectSite={select} />
  ) : (
    <SiteList sites={sites} you={you} onSelect={select} filter={listFilter} onFilter={setListFilter} />
  );
  const openList = (filter: ListFilter) => {
    setListFilter(filter);
    setPanel('list');
  };
  // Flat map → hologram: the map tips back and the hologram rises out of it. Hologram → flat: it folds down onto the map.
  const switchView = (mapView: '2d' | '3d') => {
    if (mapView === view) return;
    turnPage(mapView === '3d' ? 'to-holo' : 'to-flat', () => update({ mapView }), () => {}, !reducedMotion);
  };

  return (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 lg:right-[27rem]" role="region" aria-label="Map of Iowa water monitoring sites">
        {view === '3d' ? (
          <Safe3D className="cc-stage h-full" placeholder={<div className="cc-stage grid h-full place-items-center">Starting the hologram…</div>}>
            <HologramIowa sites={liveSites} selectedId={selectedId} onSelect={select} reducedMotion={reducedMotion} className="h-full w-full" />
          </Safe3D>
        ) : (
          <MapView sites={sites} selectedId={selectedId} onSelect={select} you={you} flyTo={flyTo} watchedIds={watchedIds} />
        )}
      </div>

      {/* Search and "my location", floating over the top of the map */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] p-3 lg:right-[27rem]">
        <div className="pointer-events-auto mx-auto flex max-w-xl gap-2">
          <div className="min-w-0 flex-1">
            <PlaceSearch
              hideLabel
              label="Search towns and monitoring sites"
              placeholder="Search towns or rivers"
              sites={sites}
              onPickPlace={(p) => {
                setYou(p);
                fly(p.lat, p.lon, 10);
              }}
              onPickSite={select}
            />
          </div>
          <Button variant="secondary" onClick={useLocation} disabled={locating} aria-label="Use my location">
            <span aria-hidden="true">◎</span>
            <span className="hidden sm:inline">{locating ? 'Finding…' : 'My location'}</span>
          </Button>
        </div>
        <div className="pointer-events-auto mx-auto mt-2 flex max-w-xl justify-center">
          <ViewToggle view={view} onChange={switchView} />
        </div>
        {locateError && (
          <p role="status" className="pointer-events-auto mx-auto mt-2 max-w-xl rounded-xl bg-card p-3 text-ink shadow">
            {locateError}
          </p>
        )}
        {status.mode === 'loading' && !sites.length && (
          <p role="status" className="pointer-events-auto mx-auto mt-2 max-w-xl rounded-xl bg-card p-3 text-ink shadow">
            Loading water data…
          </p>
        )}
      </div>

      {/* Legend */}
      <div className={`absolute left-3 z-[500] ${desktop ? 'bottom-3' : 'bottom-20'} ${!desktop && (selected || panel === 'list') ? 'hidden' : ''}`}>
        {view === '3d' ? (
          <HoloLegend showCommunity={sites.some((s) => s.kind === 'community')} compact={!desktop} />
        ) : (
          <Legend showCommunity={sites.some((s) => s.kind === 'community')} compact={!desktop} />
        )}
      </div>

      {/* Details and list: a side panel on desktops, a bottom sheet on phones */}
      {desktop ? (
        // key: a new site starts scrolled to the top
        <aside key={selectedId ?? 'list'} className="cc-flip-in absolute inset-y-0 right-0 z-[600] w-[27rem] overflow-y-auto border-l border-line bg-card p-5">
          {panelContent}
        </aside>
      ) : selected || panel === 'list' ? (
        <aside
          key={selectedId ?? 'list'}
          className="cc-flip-up absolute inset-x-0 bottom-0 z-[600] max-h-[65%] overflow-y-auto rounded-t-3xl border-t border-line bg-card p-5 shadow-2xl"
        >
          {!selected && (
            <div className="mb-2 flex justify-end">
              <Button variant="quiet" onClick={() => setPanel('closed')}>
                Hide list
              </Button>
            </div>
          )}
          {panelContent}
        </aside>
      ) : (
        <div className="absolute inset-x-3 bottom-3 z-[600] flex gap-2">
          <Button className="flex-1 shadow-lg" onClick={() => openList('all')}>
            List all sites
          </Button>
          {watched.length > 0 && (
            <Button variant="secondary" className="shrink-0 !border-gold shadow-lg" onClick={() => openList('watched')}>
              <span aria-hidden="true">★</span> Watched ({watched.length})
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
