/**
 * Resident mode ("My Water"): the rivers you're watching, the nearest monitoring site to where
 * you live, its risk level, and what that means for drinking water, swimming, and fishing.
 */
import { useState } from 'react';
import { LocationPicker } from '../components/LocationPicker';
import { SiteDetail } from '../components/SiteDetail';
import { Button, Card, Depth, ExternalLink, LevelBadge, PageTitle } from '../components/ui';
import { WatchButton } from '../components/WatchButton';
import { WatchedRivers } from '../components/WatchedRivers';
import { formatDate, formatMiles } from '../lib/format';
import { nearestSites } from '../lib/geo';
import { residentGuidance, WELL_TIP } from '../lib/residentGuidance';
import { useData } from '../state/data';
import { useNav } from '../state/nav';
import { activePlace, useSettings } from '../state/settings';

const STATUS_STYLE = {
  ok: 'border-low bg-low-soft',
  caution: 'border-watch bg-watch-soft',
  info: 'border-sky bg-sky-soft',
};

export function ResidentPage() {
  const { settings, update } = useSettings();
  const { sites } = useData();
  const { showOnMap } = useNav();
  const [changing, setChanging] = useState(false);
  const place = activePlace(settings);

  if (!place || changing) {
    return (
      <div>
        <PageTitle eyebrow="My Water" title="Where do you live?">
          We'll find the nearest stream monitoring site and explain what its readings mean for you.
        </PageTitle>
        <Card>
          <LocationPicker
            label="Your town"
            value={place}
            onChange={(p) => {
              update({ home: p });
              setChanging(false);
            }}
          />
        </Card>
      </div>
    );
  }

  // The main card uses the nearest live sensor, since its advice is about the water right now.
  // "Other sites nearby" also lists lab-sample sites, with their dates.
  const main = nearestSites(sites.filter((s) => s.kind === 'official' && !s.sampled), place, 1)[0];
  const others = main ? nearestSites(sites.filter((s) => s.kind === 'official' && s.id !== main.site.id), place, 4) : [];

  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow="My Water" title={`Water near ${place.name.replace(/, Iowa$/, '')}`}>
        <Button variant="quiet" className="!min-h-0 !px-0" onClick={() => setChanging(true)}>
          Change location
        </Button>
      </PageTitle>

      {settings.watched.length > 0 && <WatchedRivers />}

      {!main ? (
        <Card>
          <p>Loading nearby monitoring sites…</p>
        </Card>
      ) : (
        <>
          {/* SiteDetail splits into its own panels (reading, conditions, each graph), so no outer card here. */}
          <section aria-label="Nearest monitoring site">
            <p className="mb-2 text-sm font-bold uppercase tracking-wider text-ink-3">
              Nearest monitoring site · {formatMiles(main.miles)} away
            </p>
            <SiteDetail site={main.site} miles={main.miles} showNearby={false} />
            <div className="mt-4">
              <Button variant="secondary" onClick={() => showOnMap(main.site.id)}>
                See it on the map
              </Button>
            </div>
          </section>

          <section aria-labelledby="meaning">
            <h2 id="meaning" className="mb-3 text-2xl font-bold">
              What this means for you
            </h2>
            <div className="flex flex-col gap-3">
              {residentGuidance(main.site.latest!.value).map((g) => (
                <Depth key={g.title} className={`rounded-2xl border-l-8 p-4 ${STATUS_STYLE[g.status]}`}>
                  <h3 className="text-lg font-bold">{g.title}</h3>
                  <p className="text-ink">{g.text}</p>
                </Depth>
              ))}
            </div>
          </section>

          <Card className="border-2 border-gold bg-gold-soft">
            <h2 className="text-xl font-bold">Private well tip</h2>
            <p className="mt-1">{WELL_TIP}</p>
            <p className="mt-2">
              <ExternalLink href="https://iowadnr.gov/Environmental-Protection/Water-Quality/Private-Well-Program/Private-Well-Testing">
                Iowa DNR: private well testing
              </ExternalLink>
            </p>
          </Card>

          {others.length > 0 && (
            <Card>
              <h2 className="text-xl font-bold">Other sites nearby</h2>
              <ul className="mt-2 divide-y divide-line">
                {others.map(({ site, miles }) => (
                  <li key={site.id} className="flex items-center gap-2">
                    <button type="button" onClick={() => showOnMap(site.id)} className="flex min-h-14 min-w-0 flex-1 items-center gap-3 py-2 text-left hover:bg-paper">
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{site.name}</span>
                        <span className="text-sm text-ink-3">
                          {formatMiles(miles)} away · {site.latest!.value.toFixed(1)} mg/L
                          {site.sampled ? ` in a ${site.sampled.agency} lab sample on ${formatDate(site.latest!.time)}` : ' now'}
                        </span>
                      </span>
                      <LevelBadge value={site.latest!.value} />
                    </button>
                    <WatchButton site={site} compact />
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {settings.watched.length === 0 && <WatchedRivers />}

          <p className="text-sm text-ink-3">
            Stream readings show what's in rivers and creeks, not what comes out of your tap. USGS data is provisional and may be revised.
          </p>
        </>
      )}
    </div>
  );
}
