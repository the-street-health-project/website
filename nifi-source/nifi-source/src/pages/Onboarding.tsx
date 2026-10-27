/**
 * First-time welcome: "Resident or Farmer?", then where they are. Can be skipped.
 * Judges can turn on demo mode right here.
 */
import { lazy, useState } from 'react';
import { LocationPicker } from '../components/LocationPicker';
import { Logo } from '../components/Logo';
import { Safe3D } from '../components/Safe3D';
import { Button, Depth } from '../components/ui';
import type { Place } from '../data/types';
import { PARENT_SITE, SHP_SITE } from '../lib/parentSite';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useData } from '../state/data';
import { DEMO_PLACE, useSettings, type Mode } from '../state/settings';

// The spinning 3D Iowa is loaded separately so the welcome text appears instantly.
const HologramIowa = lazy(() => import('../three/HologramIowa'));

export function Onboarding() {
  const { settings, update } = useSettings();
  const { sites } = useData();
  const liveSites = sites.filter((s) => !s.sampled);
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<'mode' | 'place'>('mode');
  const [mode, setMode] = useState<Mode>(settings.mode);

  const finish = (place: Place | null) => {
    update({ onboarded: true, mode, ...(place ? (mode === 'farmer' ? { field: place } : { home: place }) : {}) });
    try {
      window.history.replaceState(null, '', '#home');
    } catch {
      // ignore
    }
  };

  return (
    <main className="min-h-full bg-sky-soft px-4 py-8">
      <div className="mx-auto flex max-w-xl flex-col gap-6">
        <div className="flex items-center gap-3">
          <Logo size={72} />
          <div>
            <span className="block text-3xl font-bold text-ink">NiFi</span>
            {/* NiFi belongs to The Street Health Project; on its site this goes back there. */}
            {PARENT_SITE ? (
              <a href={PARENT_SITE} className="text-sm font-bold text-ink-2 underline underline-offset-4 hover:text-sky">
                A program of The Street Health Project
              </a>
            ) : (
              <a href={SHP_SITE} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-ink-2 underline underline-offset-4 hover:text-sky">
                A program of The Street Health Project<span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </div>
        </div>

        {step === 'mode' ? (
          <>
            <div className="cc-stage relative overflow-hidden rounded-3xl shadow-lg">
              <Safe3D className="h-64 sm:h-80">
                <HologramIowa sites={liveSites} mode="hero" reducedMotion={reducedMotion} className="h-64 w-full sm:h-80" />
              </Safe3D>
              <p className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#020604] to-transparent px-5 pb-4 pt-10 text-lg font-bold">
                <span className="cc-holo-text">
                  Live nitrate readings from {liveSites.filter((s) => !s.isExample).length || 'Iowa'} river sensors, plus lab samples from{' '}
                  {sites.filter((s) => s.sampled).length || 'more'} other sites
                </span>
              </p>
            </div>
            <h1 className="text-4xl font-bold leading-tight text-ink">What's in Iowa's water near you?</h1>
            <p className="text-xl text-ink-2">
              NiFi shows nitrate levels from river sensors across Iowa and explains what they mean. First, how will you use it?
            </p>
            <div className="grid gap-4" role="group" aria-label="Choose how you'll use NiFi">
              {/* Each choice is a 3D slab that tilts toward the pointer and presses in when tapped. */}
              <Depth className="rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('resident');
                    setStep('place');
                  }}
                  className="flex min-h-24 w-full flex-col items-start rounded-2xl border-2 border-line bg-card p-5 text-left hover:border-sky"
                >
                  <span className="text-2xl font-bold text-sky-dark">I'm a resident</span>
                  <span className="text-lg text-ink-2">Check the water near my home: drinking water, swimming, fishing, and wells.</span>
                </button>
              </Depth>
              <Depth className="rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setMode('farmer');
                    setStep('place');
                  }}
                  className="flex min-h-24 w-full flex-col items-start rounded-2xl border-2 border-line bg-card p-5 text-left hover:border-sky"
                >
                  <span className="text-2xl font-bold text-sky-dark">I'm a farmer</span>
                  <span className="text-lg text-ink-2">See nearby stream trends and ways to keep nitrogen on my fields.</span>
                </button>
              </Depth>
            </div>
            <div className="cc-slab rounded-2xl border-2 border-dashed border-community bg-card p-4">
              <p className="font-bold">Judging or presenting?</p>
              <p className="text-ink-2">Demo mode uses real USGS data saved inside the app, so everything works even without internet.</p>
              <Button
                variant="secondary"
                className="mt-2"
                onClick={() => {
                  update({ demo: true, onboarded: true, mode: 'resident', home: settings.home ?? DEMO_PLACE });
                }}
              >
                Start the demo
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-4xl font-bold leading-tight text-ink">{mode === 'farmer' ? 'Where is your field?' : 'Where do you live?'}</h1>
            <p className="text-xl text-ink-2">We'll find the closest monitoring sites. Your location stays on this device.</p>
            <div className="cc-slab rounded-2xl bg-card p-5">
              <LocationPicker label={mode === 'farmer' ? 'Town nearest your field' : 'Your town'} value={null} onChange={finish} />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="quiet" onClick={() => setStep('mode')}>
                Back
              </Button>
              <Button variant="quiet" onClick={() => finish(null)}>
                Skip for now
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
