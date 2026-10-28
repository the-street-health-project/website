/**
 * The whole app. Providers share settings, data, and navigation with every screen;
 * <Shell> shows onboarding the first time, then the screen for the current tab.
 *
 * Each screen is loaded only when it's first opened (React.lazy), so the app starts faster.
 * The offline service worker still saves all of them for use without internet.
 */
import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import { AlertBanners } from './components/AlertBanners';
import { Header, TabBar } from './components/Chrome';
import { World3D } from './fx/World3D';
import { useReducedMotion } from './hooks/useReducedMotion';
import { DataProvider } from './state/data';
import { NavProvider, useNav } from './state/nav';
import { SettingsProvider, useSettings } from './state/settings';

/**
 * A screen whose code downloads the first time it's needed (like React.lazy), but which can also be
 * downloaded ahead of time with .preload(). Once preloaded it shows up immediately: with plain
 * React.lazy, React shows "Loading…" for about 300 ms even when the code is already there, and that
 * would hold up the 3D page turn.
 */
function screen(load: () => Promise<ComponentType>) {
  let loaded: ComponentType | null = null;
  const preload = () =>
    load().then((component) => {
      loaded = component;
      return component;
    });
  const Lazy = lazy(() => preload().then((component) => ({ default: component })));
  function Screen() {
    // Decided once per visit, so a screen never switches between the two and loses its state.
    const [Ready] = useState(() => loaded);
    return Ready ? <Ready /> : <Lazy />;
  }
  return Object.assign(Screen, { preload });
}

const MapPage = screen(() => import('./pages/MapPage').then((m) => m.MapPage));
const ResidentPage = screen(() => import('./pages/ResidentPage').then((m) => m.ResidentPage));
const FarmerPage = screen(() => import('./pages/FarmerPage').then((m) => m.FarmerPage));
const LearnPage = screen(() => import('./pages/LearnPage').then((m) => m.LearnPage));
const SensorPage = screen(() => import('./pages/SensorPage').then((m) => m.SensorPage));
const SettingsPage = screen(() => import('./pages/SettingsPage').then((m) => m.SettingsPage));
const screens = [MapPage, ResidentPage, FarmerPage, LearnPage, SensorPage, SettingsPage];
const Onboarding = lazy(() => import('./pages/Onboarding').then((m) => ({ default: m.Onboarding })));

// data-cc-loading lets the 3D page turn wait until the real screen is ready (fx/pageTurn.ts).
const Loading = () => (
  <p role="status" data-cc-loading="" className="p-6 text-center text-ink-3">
    Loading…
  </p>
);

const mainArea = () => document.getElementById('main');

function Shell() {
  const { settings } = useSettings();
  const { tab } = useNav();
  const reduced = useReducedMotion();

  // "cc-fx" on the page turns on the moving 3D effects in index.css (off with motion turned down).
  useEffect(() => {
    document.documentElement.classList.toggle('cc-fx', !reduced);
  }, [reduced]);

  // Once the first screen is up, quietly download the others, so turning to them is instant.
  useEffect(() => {
    const load = () => screens.forEach((s) => s.preload().catch(() => {}));
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (idle) idle(load);
    else window.setTimeout(load, 1500);
  }, []);

  if (!settings.onboarded) {
    return (
      <div className={`h-full overflow-y-auto ${reduced ? 'cc-reduced' : ''}`}>
        <Suspense fallback={<Loading />}>
          <Onboarding />
        </Suspense>
      </div>
    );
  }

  const page = {
    home: settings.mode === 'farmer' ? <FarmerPage /> : <ResidentPage />,
    learn: <LearnPage />,
    sensor: <SensorPage />,
    settings: <SettingsPage />,
    map: null,
  }[tab];

  return (
    <div className={`relative flex h-full flex-col ${reduced ? 'cc-reduced' : ''}`}>
      <World3D scroller={mainArea} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[2000] focus:m-2 focus:rounded-lg focus:bg-gold focus:p-3 focus:text-on-accent"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <Header />
      {/* On the map, alerts sit above the map. On other screens they scroll with the page. */}
      {tab === 'map' && <AlertBanners />}
      {/* overflow-x-hidden: cards waiting off to the side (or tipped back in 3D) before they rise in mustn't make the page scroll sideways. */}
      <main id="main" tabIndex={-1} className="relative min-h-0 flex-1 overflow-x-hidden overflow-y-auto focus:outline-none">
        <Suspense fallback={<Loading />}>
          {tab === 'map' ? (
            <MapPage />
          ) : (
            <>
              <AlertBanners />
              {/* key={tab} gives each screen a fresh start (and, without the 3D page turn, a slide-in) */}
              {/* data-scene picks how this screen's cards move into place (see "Scenes" in index.css) */}
              <div key={tab} data-scene={tab} className="cc-page mx-auto max-w-3xl px-4 py-6 pb-10">
                {page}
              </div>
            </>
          )}
        </Suspense>
      </main>
      <TabBar />
    </div>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <DataProvider>
        <NavProvider>
          <Shell />
        </NavProvider>
      </DataProvider>
    </SettingsProvider>
  );
}
