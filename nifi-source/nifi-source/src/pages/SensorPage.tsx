/**
 * My Sensor: a placeholder for the team's future low-cost nitrate sensor.
 * Intentionally empty: no sensor logic, hardware code, or manual entry lives here yet.
 * When the sensor is ready, it will plug in as a new DataSource (see src/data/types.ts).
 */
import { lazy } from 'react';
import { Safe3D } from '../components/Safe3D';
import { Card, PageTitle } from '../components/ui';
import { useReducedMotion } from '../hooks/useReducedMotion';

// A 3D concept picture of the sensor. It's only a picture: no device code lives here.
const SensorHologram = lazy(() => import('../three/SensorHologram'));

export function SensorPage() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow="My Sensor" title="Coming soon">
        A low-cost nitrate sensor will connect here.
      </PageTitle>

      <Card className="!p-0">
        {/* cc-boot: the hologram powers on like a screen (a line of light that opens up).
            The stage rounds its own top corners, so the card doesn't have to clip (which would cut off its shadow). */}
        <div className="cc-stage cc-boot overflow-hidden rounded-t-2xl">
          <Safe3D className="h-72">
            <SensorHologram reducedMotion={reducedMotion} className="h-72 w-full" />
          </Safe3D>
        </div>
        <p className="px-5 pt-1 text-center text-sm text-ink-3">Concept art: the real sensor is still being built. Drag to turn it.</p>
        <p className="p-5 pt-3 text-lg">
          Professional river sensors cost thousands of dollars, so most of Iowa's creeks, ditches, and tile outlets are never measured. Our team
          is building a cheap nitrate sensor that a farmer or a school could put in the water they care about.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">How it will work</h2>
        <ol className="cc-steps mt-2 list-decimal space-y-2 pl-6 text-lg">
          <li>Connect your NiFi sensor on this screen.</li>
          <li>Its readings appear on the map as community data, with a dashed outline, next to official USGS sites.</li>
          <li>Your readings get the same 30-day charts, plain-English explanations, and alerts as official data.</li>
        </ol>
        <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-paper p-4">
          <span className="cc-marker cc-marker--watch" aria-hidden="true">8.2</span>
          <span className="cc-marker cc-marker--watch cc-marker--community" aria-hidden="true">7.9</span>
          <p className="min-w-0 flex-1 text-ink-2">Official sites are circles. Community sensors will be dashed squares.</p>
        </div>
      </Card>

      <p className="text-ink-3">Nothing to set up yet. This screen will be updated when the sensor is ready.</p>
    </div>
  );
}
