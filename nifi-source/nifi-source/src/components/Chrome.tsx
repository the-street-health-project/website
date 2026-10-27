/**
 * The frame around every screen: the header (logo, data status, desktop navigation)
 * and the bottom tab bar on phones.
 */
import type { ReactNode } from 'react';
import type { DataStatus } from '../data/types';
import { timeAgo } from '../lib/format';
import { PARENT_SITE } from '../lib/parentSite';
import { useData } from '../state/data';
import { useNav, type Tab } from '../state/nav';
import { useSettings } from '../state/settings';
import { Logo } from './Logo';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

const ICONS: Record<Tab, ReactNode> = {
  map: icon(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>),
  home: icon(<><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-5h4v5" /></>),
  learn: icon(<><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5Z" /><path d="M12 6v13.5" /></>),
  sensor: icon(<><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" /><path d="M7.5 15h9" /></>),
  settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></>),
};

function useTabs(): { id: Tab; label: string }[] {
  const { settings } = useSettings();
  return [
    { id: 'home', label: settings.mode === 'farmer' ? 'My Field' : 'My Water' },
    { id: 'map', label: 'Map' },
    { id: 'learn', label: 'Learn' },
    { id: 'sensor', label: 'My Sensor' },
    { id: 'settings', label: 'Settings' },
  ];
}

function statusText(status: DataStatus): { text: string; tone: string } {
  switch (status.mode) {
    case 'live':
      return { text: `Live · ${timeAgo(status.updatedAt)}`, tone: 'bg-sky-soft text-sky' };
    case 'cached':
      return { text: `Saved data · ${timeAgo(status.updatedAt)}`, tone: 'bg-watch-soft text-watch-ink' };
    case 'demo':
      return { text: 'Demo data', tone: 'bg-community-soft text-community' };
    default:
      return { text: 'Loading…', tone: 'bg-paper text-ink-3' };
  }
}

export function Header() {
  const { status } = useData();
  const { tab, go } = useNav();
  const tabs = useTabs();
  const s = statusText(status);
  return (
    <header className="z-[700] border-b border-line bg-card pt-[env(safe-area-inset-top)]">
      {/* On The Street Health Project's site, a way back to the nonprofit NiFi belongs to. */}
      {PARENT_SITE && (
        <a href={PARENT_SITE} className="flex min-h-8 items-center justify-center gap-2 border-b border-line bg-paper px-4 text-sm font-bold text-ink-3 hover:text-sky">
          <span aria-hidden="true">←</span> A program of The Street Health Project
        </a>
      )}
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
        <button type="button" onClick={() => go('home')} className="flex min-h-12 items-center gap-2" aria-label="NiFi home">
          <Logo size={44} />
          <span className="text-xl font-bold text-ink">NiFi</span>
        </button>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${s.tone}`} role="status" aria-label={`Data status: ${s.text}`}>
          {s.text}
        </span>
        <nav className="ml-auto hidden gap-1 md:flex" aria-label="Main">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-h-12 items-center gap-2 rounded-xl px-3 font-bold ${tab === t.id ? 'bg-sky text-on-accent' : 'text-ink-2 hover:bg-sky-soft'}`}
            >
              {ICONS[t.id]}
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function TabBar() {
  const { tab, go } = useNav();
  const tabs = useTabs();
  return (
    <nav className="z-[700] border-t border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden" aria-label="Main">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => go(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex min-h-16 w-full flex-col items-center justify-center gap-0.5 text-xs font-bold ${tab === t.id ? 'text-sky' : 'text-ink-3'}`}
            >
              <span className={`cc-tab-pill rounded-full px-3 py-0.5 ${tab === t.id ? 'bg-sky-soft' : ''}`}>{ICONS[t.id]}</span>
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
