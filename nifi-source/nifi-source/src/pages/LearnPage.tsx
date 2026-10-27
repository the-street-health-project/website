/**
 * Learn: short explainers with sources. Every number here comes from the linked source.
 */
import { lazy, type ReactNode } from 'react';
import { TileDrainageAnimation } from '../components/TileDrainageAnimation';
import { Safe3D } from '../components/Safe3D';
import { Card, ExternalLink, PageTitle } from '../components/ui';
import { turnPage } from '../fx/pageTurn';
import { nudge, revealOnScreen } from '../fx/useDepth';
import { useReducedMotion } from '../hooks/useReducedMotion';

// three.js is big, so the 3D molecule loads separately, only when this screen opens.
const NitrateMolecule = lazy(() => import('../three/NitrateMolecule'));

function Explainer({ id, title, children, sources }: { id: string; title: string; children: ReactNode; sources: { label: string; href: string }[] }) {
  return (
    <Card as="article">
      <h2 id={id} className="text-2xl font-bold">
        {title}
      </h2>
      <div className="mt-2 flex flex-col gap-3 text-lg text-ink">{children}</div>
      <p className="mt-4 border-t border-line pt-3 text-sm text-ink-3">
        Sources:{' '}
        {sources.map((s, i) => (
          <span key={s.href}>
            {i > 0 && ' · '}
            <ExternalLink href={s.href}>{s.label}</ExternalLink>
          </span>
        ))}
      </p>
    </Card>
  );
}

const TOPICS = [
  { id: 'what', label: 'What is nitrate?' },
  { id: 'where', label: 'Where it comes from' },
  { id: 'iowa', label: 'Why Iowa' },
  { id: 'health', label: 'Health' },
  { id: 'gulf', label: 'Downstream' },
  { id: 'data', label: 'About the data' },
];

export function LearnPage() {
  const reducedMotion = useReducedMotion();
  return (
    <div className="flex flex-col gap-5">
      <PageTitle eyebrow="Learn" title="Nitrate, explained">
        Short answers to the big questions, with sources you can check.
      </PageTitle>

      <nav aria-label="Topics" className="flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              const heading = document.getElementById(t.id);
              if (!heading) return;
              // A 3D warp through the page to the topic (see pageTurn.ts); without the turn, a smooth scroll.
              turnPage(
                'warp',
                () => {},
                () => {
                  heading.scrollIntoView({ block: 'start', behavior: reducedMotion ? 'auto' : 'instant' });
                  revealOnScreen();
                },
                !reducedMotion,
              );
              // Once it arrives, the topic's card wobbles, so your eye lands on it.
              window.setTimeout(() => nudge(heading), 800);
            }}
            className="min-h-11 rounded-full border-2 border-line bg-card px-4 font-bold text-ink-2 hover:border-sky"
          >
            {t.label}
          </button>
        ))}
      </nav>

      <Explainer
        id="what"
        title="What is nitrate?"
        sources={[{ label: 'EPA drinking water standards', href: 'https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations' }]}
      >
        <figure className="cc-stage overflow-hidden rounded-2xl">
          <Safe3D className="h-64">
            <NitrateMolecule reducedMotion={reducedMotion} className="h-64 w-full" />
          </Safe3D>
          <figcaption className="px-4 pb-3 text-sm text-ink-2">
            Nitrate (NO₃⁻): one nitrogen atom holding three oxygen atoms. Drag to spin it.
          </figcaption>
        </figure>
        <p>
          Nitrate is a form of nitrogen, a nutrient every plant needs. It dissolves easily in water, so whatever plants don't use can wash out of
          the soil and into streams and groundwater.
        </p>
        <p>
          It's measured in milligrams per liter (mg/L) "as nitrogen." The U.S. EPA's drinking water limit is <strong>10 mg/L</strong>. NiFi
          colors sites green under 5, yellow from 5 to 10, and red above 10.
        </p>
      </Explainer>

      <Explainer
        id="where"
        title="Where does it come from?"
        sources={[
          { label: 'Iowa State University Extension (SP 435)', href: 'https://www.agronext.iastate.edu/soilfertility/info/SP435.pdf' },
          { label: 'Iowa Nutrient Reduction Strategy', href: 'https://nrstracking.cals.iastate.edu/iowa-nutrient-reduction-strategy' },
        ]}
      >
        <p>
          In Iowa, most of it comes from farmland: commercial fertilizer, manure, and nitrogen released as organic matter in the soil breaks down.
          Towns and cities add some through wastewater.
        </p>
        <p>
          Nitrate leaves fields when water moves through the soil faster than crops can take it up. That happens most in spring, when heavy rain
          falls before crops are big, and after harvest, when no crop is growing.
        </p>
        <TileDrainageAnimation reducedMotion={reducedMotion} />
      </Explainer>

      <Explainer
        id="iowa"
        title="Why is Iowa affected so much?"
        sources={[
          { label: 'Iowa Nutrient Reduction Strategy', href: 'https://nrstracking.cals.iastate.edu/iowa-nutrient-reduction-strategy' },
          { label: 'Iowa State University Extension (SP 435)', href: 'https://www.agronext.iastate.edu/soilfertility/info/SP435.pdf' },
        ]}
      >
        <p>
          Iowa is one of the most intensively farmed places on Earth, mostly corn and soybeans. Much of that farmland is flat and wet, so it's drained
          with underground pipes called tile lines. Tile drainage makes fields farmable, but it also carries nitrate straight to ditches and streams.
        </p>
        <p>
          Iowa's Nutrient Reduction Strategy aims to cut the nitrogen and phosphorus leaving the state by <strong>45%</strong>, with most of the
          nitrogen cut (41 percentage points) expected to come from farm practices like cover crops, better fertilizer timing, and edge-of-field
          practices.
        </p>
      </Explainer>

      <Explainer
        id="health"
        title="Is it a health problem?"
        sources={[
          { label: 'EPA', href: 'https://www.epa.gov/ground-water-and-drinking-water/national-primary-drinking-water-regulations' },
          { label: 'Ward et al. 2018, NIH review', href: 'https://pubmed.ncbi.nlm.nih.gov/30041450/' },
          { label: 'Iowa DNR private well testing', href: 'https://iowadnr.gov/Environmental-Protection/Water-Quality/Private-Well-Program/Private-Well-Testing' },
        ]}
      >
        <p>
          The 10 mg/L limit protects babies. Infants who drink formula made with high-nitrate water can develop "blue baby syndrome," where blood
          can't carry enough oxygen.
        </p>
        <p>
          Researchers, including teams studying Iowans, have also found possible links between long-term nitrate in drinking water, sometimes even
          below the limit, and some cancers and birth defects. Scientists are still studying these links.
        </p>
        <p>
          City water systems must test and treat their water to stay under the limit. Private wells aren't regulated, so owners need to test them;
          Iowa offers free well testing through county health departments while funds last.
        </p>
      </Explainer>

      <Explainer
        id="gulf"
        title="What happens downstream?"
        sources={[
          { label: 'Gulf hypoxia monitoring (NOAA-supported), Aug. 2026', href: 'https://gulfhypoxia.net/2026/08/' },
          { label: 'Central Iowa Water Works coverage (June 2025)', href: 'https://www.polkcityia.gov/node/28581' },
        ]}
      >
        <p>
          In June 2025, nitrate in the Des Moines and Raccoon rivers got so high that Central Iowa Water Works banned lawn watering for the first time,
          to avoid breaking the drinking water limit for about 600,000 customers.
        </p>
        <p>
          Iowa's rivers flow to the Mississippi and on to the Gulf. There, nitrogen feeds algae; when the algae die and decay, they use up the oxygen,
          creating a summer "dead zone" where fish and shrimp can't survive. In 2026 it measured about 1,332 square miles, unusually small because a
          tropical storm stirred oxygen into the water.
        </p>
      </Explainer>

      <Explainer
        id="data"
        title="Where does NiFi's data come from?"
        sources={[
          { label: 'USGS Water Services', href: 'https://waterservices.usgs.gov/' },
          { label: 'USGS Water Data APIs', href: 'https://api.waterdata.usgs.gov/' },
          { label: 'Water Quality Portal', href: 'https://www.waterqualitydata.us/' },
          { label: 'Open-Meteo', href: 'https://open-meteo.com/' },
        ]}
      >
        <p>
          The U.S. Geological Survey runs live nitrate sensors in 12 Iowa rivers that take a reading every 15 minutes. NiFi shows the latest
          reading and daily averages (USGS parameter code 99133: nitrate plus nitrite, in mg/L as nitrogen; nitrite is normally a tiny part of it).
          The data is provisional, meaning USGS may revise it after review.
        </p>
        <p>
          Most Iowa rivers have no live sensor. For about 90 more river sites, NiFi shows lab samples: water that Iowa DNR, USGS, the Meskwaki
          Nation, the Upper Mississippi River Restoration Program, or Minnesota's Pollution Control Agency collected by hand and had tested. These
          come from the Water Quality Portal (run by USGS and EPA) and USGS's sample database. Samples are taken every few weeks at most, and some
          agencies publish them a year or more later, so NiFi always shows the sample's date and never uses them for alerts.
        </p>
        <p>
          All of these are stream readings, not tap water. They show how much nitrate is moving through a watershed. Rain forecasts come from
          Open-Meteo, and maps from OpenStreetMap and the U.S. Census Bureau.
        </p>
      </Explainer>
    </div>
  );
}
