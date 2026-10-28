/**
 * Which tab is showing, kept in the address bar (#map, #home, ...) so the back button
 * and shared links work. Also lets any screen say "show this site on the map".
 * Switching tabs plays that tab's own 3D turn (see fx/pageTurn.ts).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { turnFor, turnPage } from '../fx/pageTurn';
import { useReducedMotion } from '../hooks/useReducedMotion';

export type Tab = 'map' | 'home' | 'learn' | 'sensor' | 'settings';
const TABS: Tab[] = ['map', 'home', 'learn', 'sensor', 'settings'];

const parse = (hash: string): Tab => {
  const t = hash.replace('#', '') as Tab;
  return TABS.includes(t) ? t : 'home';
};

interface NavContextValue {
  tab: Tab;
  go: (tab: Tab) => void;
  /** The site the map should open, if another screen asked to show one. */
  focusSiteId: string | null;
  showOnMap: (siteId: string) => void;
  clearFocus: () => void;
}

const NavContext = createContext<NavContextValue | null>(null);

/** New screens start at the top. */
const scrollToTop = () => {
  document.getElementById('main')?.scrollTo(0, 0);
  window.scrollTo(0, 0);
};

export function NavProvider({ children }: { children: ReactNode }) {
  const [tab, setTab] = useState<Tab>(() => parse(window.location.hash));
  const [focusSiteId, setFocusSiteId] = useState<string | null>(null);
  const reduced = useReducedMotion();
  // The latest tab and motion setting, for the callbacks below (which are created once).
  const current = useRef({ tab, reduced });
  current.current = { tab, reduced };

  // The browser's back and forward buttons.
  useEffect(() => {
    const onHash = () => {
      const next = parse(window.location.hash);
      if (next === current.current.tab) return;
      turnPage(turnFor(next), () => setTab(next), scrollToTop, !current.current.reduced);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((next: Tab) => {
    const from = current.current.tab;
    const update = () => {
      setTab(next);
      try {
        if (window.location.hash !== `#${next}`) window.history.pushState(null, '', `#${next}`);
      } catch {
        // Some embedded previews don't allow changing the address. The tab still changes.
      }
    };
    if (from === next) {
      update();
      scrollToTop();
      return;
    }
    turnPage(turnFor(next), update, scrollToTop, !current.current.reduced);
  }, []);

  const showOnMap = useCallback(
    (siteId: string) => {
      setFocusSiteId(siteId);
      go('map');
    },
    [go],
  );
  const clearFocus = useCallback(() => setFocusSiteId(null), []);

  const value = useMemo(() => ({ tab, go, focusSiteId, showOnMap, clearFocus }), [tab, go, focusSiteId, showOnMap, clearFocus]);
  return <NavContext.Provider value={value}>{children}</NavContext.Provider>;
}

export function useNav(): NavContextValue {
  const ctx = useContext(NavContext);
  if (!ctx) throw new Error('useNav must be used inside <NavProvider>');
  return ctx;
}
