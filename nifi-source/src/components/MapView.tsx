/**
 * The Iowa map (Leaflet).
 *
 * Base layers:
 *   - OpenStreetMap tiles when online (free, no API key; attribution required).
 *   - Iowa county outlines bundled in the app, always drawn. If tiles can't load (offline, demo,
 *     or blocked), the counties become the base map, so the map never comes up blank.
 *
 * Every site is a marker showing its reading, colored by level. Official sites are circles;
 * community sites are dashed squares; lab-sample sites (no live sensor) are hollow rings.
 * Rivers you're watching get a small gold star.
 * Markers can be reached with the Tab key and opened with Enter.
 */
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { GeoJSON, MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import countiesJson from '../data/geo/iowa-counties.json';
import type { Place, Site } from '../data/types';
import { EMBEDDED } from '../lib/env';
import { usePageTurnDone } from '../fx/pageTurn';
import { formatDate } from '../lib/format';
import { IOWA_BOUNDS } from '../lib/geo';
import { LEVELS, levelFor } from '../lib/nitrate';

const counties = countiesJson as GeoJSON.FeatureCollection;

export interface FlyTarget {
  lat: number;
  lon: number;
  zoom: number;
  key: number; // changes every request, so flying to the same place twice still works
}

interface Props {
  sites: Site[];
  selectedId: string | null;
  onSelect: (site: Site) => void;
  you?: Place | null;
  flyTo?: FlyTarget | null;
  watchedIds?: Set<string>; // these markers get a gold star
}

/** Moves the map when asked, and fixes its size after the page layout changes. */
function MapController({ flyTo }: { flyTo?: FlyTarget | null }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) map.flyTo([flyTo.lat, flyTo.lon], flyTo.zoom, { duration: 0.8 });
  }, [flyTo, map]);
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

/** Zoomed out further than this, lab-sample sites shrink to small rings so the map stays readable. */
const SAMPLE_LABEL_ZOOM = 9;

function SiteMarker({ site, selected, watched, zoom, onSelect }: { site: Site; selected: boolean; watched: boolean; zoom: number; onSelect: (s: Site) => void }) {
  const value = site.latest?.value ?? 0;
  const level = levelFor(value);
  // Live sensors are filled circles (44 px). Lab-sample sites are hollow rings: 36 px with the
  // value when zoomed in, a small 20 px ring when zoomed out.
  const sampled = !!site.sampled;
  const dot = sampled && zoom < SAMPLE_LABEL_ZOOM && !selected;
  const size = !sampled ? 44 : dot ? 20 : 36;
  const icon = useMemo(
    () =>
      L.divIcon({
        className: '', // no default Leaflet styling
        html:
          `<div class="cc-marker cc-marker--${level}${site.kind === 'community' ? ' cc-marker--community' : ''}${sampled ? ' cc-marker--sampled' : ''}${dot ? ' cc-marker--dot' : ''}${selected ? ' cc-marker--selected' : ''}" style="width:${size}px;height:${size}px">` +
          `${dot ? '' : value.toFixed(1)}${watched ? '<span class="cc-marker__star">★</span>' : ''}</div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
      }),
    [level, value, selected, watched, site.kind, sampled, dot, size],
  );
  const what = sampled ? `lab sample from ${formatDate(site.latest!.time)}, ${value.toFixed(1)} mg/L` : `${value.toFixed(1)} mg/L`;
  const label = `${site.name}: ${what}, ${LEVELS[level].label}${site.kind === 'community' ? ', community sensor' : ''}${watched ? ', on your watch list' : ''}`;
  return (
    <Marker
      position={[site.lat, site.lon]}
      icon={icon}
      title={label}
      keyboard
      // Live sensors draw on top of lab-sample rings; the selected site is always on top.
      zIndexOffset={selected ? 1000 : sampled ? -500 : level === 'high' ? 500 : 0}
      eventHandlers={{
        click: () => onSelect(site),
        add: (e) => {
          // Tell screen readers what this marker is.
          const el = (e.target as L.Marker).getElement();
          el?.setAttribute('role', 'button');
          el?.setAttribute('aria-label', label);
        },
      }}
    />
  );
}

/** All the site markers. It sits inside the map so it can follow the zoom level. */
function SiteMarkers({ sites, selectedId, watchedIds, onSelect }: Pick<Props, 'sites' | 'selectedId' | 'watchedIds' | 'onSelect'>) {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());
  useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  return (
    <>
      {sites.map((site) => (
        <SiteMarker key={site.id} site={site} selected={site.id === selectedId} watched={!!watchedIds?.has(site.id)} zoom={zoom} onSelect={onSelect} />
      ))}
    </>
  );
}

const youIcon = L.divIcon({ className: '', html: '<div class="cc-you"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });

export function MapView({ sites, selectedId, onSelect, you, flyTo, watchedIds }: Props) {
  // If several map tiles fail to load, stop asking for them and use the bundled county map.
  const [tilesFailed, setTilesFailed] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);
  const showTiles = online && !tilesFailed && !EMBEDDED;
  const turnDone = usePageTurnDone();
  const errors = useMemo(() => ({ count: 0 }), []);

  return (
    <MapContainer bounds={IOWA_BOUNDS} boundsOptions={{ padding: [12, 12] }} minZoom={5} maxZoom={16} maxBounds={[[37.5, -101], [46.5, -86]]} className="h-full w-full">
      {showTiles && (
        <TileLayer
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          maxZoom={19}
          eventHandlers={{
            tileerror: () => {
              errors.count += 1;
              if (errors.count >= 3) setTilesFailed(true);
            },
          }}
        />
      )}
      <GeoJSON
        key={showTiles ? 'outline' : 'filled'}
        data={counties}
        style={
          showTiles
            ? { color: '#39ff88', weight: 1, opacity: 0.22, fillOpacity: 0 }
            : { color: '#1f5a3a', weight: 1, fillColor: '#06100b', fillOpacity: 1 }
        }
        interactive={false}
      />
      {/* ~100 markers take a moment to build, so during a 3D page turn they appear right after it. */}
      {turnDone && <SiteMarkers sites={sites} selectedId={selectedId} watchedIds={watchedIds} onSelect={onSelect} />}
      {you && <Marker position={[you.lat, you.lon]} icon={youIcon} title={`Your location: ${you.name}`} keyboard={false} />}
      <MapController flyTo={flyTo} />
    </MapContainer>
  );
}
