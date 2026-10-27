/**
 * Search box for Iowa towns (and, optionally, monitoring sites by name).
 * Works offline. Keyboard: arrow keys to move, Enter to choose, Escape to close.
 */
import { useId, useMemo, useState } from 'react';
import type { Place, Site } from '../data/types';
import { searchPlaces } from '../lib/places';

type Result = { kind: 'place'; place: Place } | { kind: 'site'; site: Site };

interface Props {
  label: string;
  placeholder?: string;
  sites?: Site[];
  onPickPlace: (place: Place) => void;
  onPickSite?: (site: Site) => void;
  hideLabel?: boolean;
}

export function PlaceSearch({ label, placeholder = 'Search for a town', sites, onPickPlace, onPickSite, hideLabel }: Props) {
  const id = useId();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const siteHits: Result[] = (sites ?? [])
      .filter((s) => s.name.toLowerCase().includes(q))
      .slice(0, 4)
      .map((site) => ({ kind: 'site', site }));
    const placeHits: Result[] = searchPlaces(q, 6).map((place) => ({ kind: 'place', place }));
    return [...siteHits, ...placeHits].slice(0, 8);
  }, [query, sites]);

  const choose = (r: Result) => {
    if (r.kind === 'place') onPickPlace(r.place);
    else onPickSite?.(r.site);
    setQuery(r.kind === 'place' ? r.place.name : r.site.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'mb-1 block font-bold text-ink'}>
        {label}
      </label>
      <input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={`${id}-list`}
        aria-activedescendant={open && results[active] ? `${id}-opt-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { setActive((i) => Math.min(i + 1, results.length - 1)); e.preventDefault(); }
          else if (e.key === 'ArrowUp') { setActive((i) => Math.max(i - 1, 0)); e.preventDefault(); }
          else if (e.key === 'Enter' && results[active]) { choose(results[active]); e.preventDefault(); }
          else if (e.key === 'Escape') setOpen(false);
        }}
        className="min-h-12 w-full rounded-xl border-2 border-line bg-card px-4 py-2 text-base text-ink placeholder:text-ink-3 focus:border-sky focus:outline-none"
      />
      {open && results.length > 0 && (
        <ul id={`${id}-list`} role="listbox" className="absolute z-[1000] mt-1 max-h-80 w-full overflow-auto rounded-xl border border-line bg-card py-1 shadow-lg">
          {results.map((r, i) => (
            <li
              key={r.kind === 'place' ? `p-${r.place.name}` : `s-${r.site.id}`}
              id={`${id}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(r);
              }}
              className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-2 ${i === active ? 'bg-sky-soft' : ''}`}
            >
              <span className="text-ink">{r.kind === 'place' ? r.place.name : r.site.name}</span>
              <span className="shrink-0 text-sm text-ink-3">{r.kind === 'place' ? 'Town' : 'Monitoring site'}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
