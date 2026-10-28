/**
 * Settings: switch between Resident and Farmer, turn demo mode on or off, change alert distance,
 * and see where the data comes from.
 */
import { useState } from 'react';
import { Button, Card, ExternalLink, PageTitle } from '../components/ui';
import { SNAPSHOT_TIME } from '../data/sources/bundled';
import { EMBEDDED } from '../lib/env';
import { formatDate, timeAgo } from '../lib/format';
import { PARENT_SITE, returnToParent, SHP_SITE } from '../lib/parentSite';
import { useData } from '../state/data';
import { useSettings, type Mode } from '../state/settings';

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span>
        <span className="block font-bold">{label}</span>
        <span className="block text-ink-2">{description}</span>
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 size-7 shrink-0 accent-sky" />
    </label>
  );
}

export function SettingsPage() {
  const { settings, update, reset } = useSettings();
  const { status, refresh } = useData();
  const [confirmReset, setConfirmReset] = useState(false);

  const statusLine =
    status.mode === 'live'
      ? `Live from ${status.sourceLabel}, updated ${timeAgo(status.updatedAt)}.`
      : status.mode === 'cached'
        ? `Couldn't reach USGS, so this is the copy saved ${timeAgo(status.updatedAt)}.`
        : status.mode === 'demo'
          ? `Demo data: a real USGS snapshot saved on ${formatDate(SNAPSHOT_TIME)}.`
          : 'Loading…';

  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow="Settings" title="Settings" />

      <Card>
        <h2 className="text-xl font-bold">I'm using NiFi as a…</h2>
        <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="Mode">
          {(['resident', 'farmer'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={settings.mode === m}
              onClick={() => update({ mode: m })}
              className={`min-h-14 rounded-xl border-2 px-4 text-lg font-bold ${settings.mode === m ? 'border-sky bg-sky text-on-accent' : 'border-line bg-card text-ink'}`}
            >
              {m === 'resident' ? 'Resident' : 'Farmer'}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Data</h2>
        <p className="mt-1 text-ink-2">{statusLine}</p>
        {EMBEDDED &&<p className="mt-1 text-ink-2">This preview can't reach live data, so it uses the saved snapshot. Open NiFi on its own for live readings.</p>}
        <div className="divide-y divide-line">
          <Toggle
            label="Demo mode"
            description="Uses real USGS data saved inside the app, so everything works without internet. Handy for presentations."
            checked={settings.demo}
            onChange={(demo) => update({ demo })}
          />
          {(settings.demo || EMBEDDED) && (
            <Toggle
              label="Show example community sensors"
              description="Three made-up sensors (dashed outlines) that preview how community data will look. Not real data."
              checked={settings.showCommunityExamples}
              onChange={(showCommunityExamples) => update({ showCommunityExamples })}
            />
          )}
        </div>
        {!settings.demo && (
          <Button variant="secondary" className="mt-2" onClick={refresh}>
            Check for new readings
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Look and feel</h2>
        <Toggle
          label="3D holograms and animations"
          description="Turn off for a calmer, still version: easier on older phones and for anyone sensitive to motion. NiFi also follows your device's reduce-motion setting."
          checked={settings.effects === 'full'}
          onChange={(on) => update({ effects: on ? 'full' : 'reduced' })}
        />
      </Card>

      <Card>
        <h2 className="text-xl font-bold">Alerts</h2>
        <label className="mt-2 flex flex-col gap-1">
          <span className="text-ink-2">Show alerts for sites within</span>
          <select
            value={settings.alertRadiusMi}
            onChange={(e) => update({ alertRadiusMi: Number(e.target.value) })}
            className="min-h-12 rounded-xl border-2 border-line bg-card px-3 text-base"
          >
            {[15, 30, 50, 100].map((mi) => (
              <option key={mi} value={mi}>
                {mi} miles
              </option>
            ))}
          </select>
        </label>
        {settings.dismissedAlerts.length > 0 && (
          <Button variant="quiet" className="mt-2 !px-0" onClick={() => update({ dismissedAlerts: [] })}>
            Show dismissed alerts again
          </Button>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-bold">About NiFi</h2>
        <p className="mt-1 text-ink-2">
          NiFi is a program of{' '}
          {PARENT_SITE ? (
            <a href={PARENT_SITE} onClick={returnToParent} className="font-bold text-sky underline underline-offset-4 hover:text-sky-dark">
              The Street Health Project
            </a>
          ) : (
            <ExternalLink href={SHP_SITE}>The Street Health Project</ExternalLink>
          )}
          , a student-led nonprofit in Cedar Rapids and Marion, Iowa, alongside its Care Kits program.
        </p>
        <p className="mt-2 text-ink-2">
          Made by its co-founders: Arya Ravikumar, Dakshesh &ldquo;Dakshi&rdquo; Kondiboyina, Kushagra, and Nish.
        </p>
        <p className="mt-2 text-ink-2">
          Built for the Congressional App Challenge. Water data: U.S. Geological Survey (live sensors and lab samples); lab samples from Iowa DNR,
          the Meskwaki Nation, the Upper Mississippi River Restoration Program, and the Minnesota Pollution Control Agency via the Water Quality
          Portal. Weather: Open-Meteo (CC BY 4.0). Maps: ©{' '}
          <ExternalLink href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</ExternalLink> and U.S. Census Bureau. Font:
          Atkinson Hyperlegible, designed by the Braille Institute for readers with low vision. Your settings stay on this device.
        </p>
      </Card>

      <Card>
        {confirmReset ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-bold">Erase your settings and start over?</p>
            <Button className="!bg-high" onClick={reset}>
              Yes, start over
            </Button>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setConfirmReset(true)}>
            Start over (show welcome screens)
          </Button>
        )}
      </Card>
    </div>
  );
}
