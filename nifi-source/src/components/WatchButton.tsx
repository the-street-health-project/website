/**
 * "☆ Watch" saves a river to your list. Watched rivers show up at the top of My Water (or My Field) and
 * under "Watched" on the map, get a gold star on the map, and send alerts even if they're
 * far from home. Tap again ("★ Watching") to remove it.
 */
import { useEffect, useState } from 'react';
import type { Site } from '../data/types';
import { useSettings, useWatchlist } from '../state/settings';

export function WatchButton({ site, compact = false }: { site: Pick<Site, 'id' | 'name'>; compact?: boolean }) {
  const { isWatched, toggle } = useWatchlist();
  const { settings } = useSettings();
  const home = settings.mode === 'farmer' ? 'My Field' : 'My Water'; // the first tab's name
  const on = isWatched(site.id);
  const [note, setNote] = useState('');

  // The "Saved" note fades after a few seconds.
  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(''), 3500);
    return () => clearTimeout(t);
  }, [note]);

  const click = () => {
    toggle(site);
    setNote(on ? 'Removed from your watched rivers.' : `Saved. Find it at the top of ${home}.`);
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={click}
          aria-label={on ? `Stop watching ${site.name}` : `Watch ${site.name}`}
          className={`grid size-12 shrink-0 place-items-center rounded-xl border-2 text-2xl leading-none transition-colors ${
            on ? 'border-gold bg-gold text-on-accent' : 'border-line bg-card text-ink-3 hover:border-gold hover:text-ink'
          }`}
        >
          <span aria-hidden="true">{on ? '★' : '☆'}</span>
        </button>
        <span role="status" className="sr-only">
          {note}
        </span>
      </>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <button
        type="button"
        onClick={click}
        className={`inline-flex min-h-12 items-center gap-2 rounded-xl border-2 px-4 font-bold transition-colors ${
          on ? 'border-gold bg-gold text-on-accent' : 'border-gold bg-card text-ink hover:bg-gold-soft'
        }`}
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {on ? '★' : '☆'}
        </span>
        {on ? 'Watching' : 'Watch'}
      </button>
      <span role="status" className="text-sm text-ink-2">
        {note}
      </span>
    </div>
  );
}
