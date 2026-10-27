# NiFi

NiFi is a web app for Iowans and farmers who want to know how much nitrate is in the streams near them, and what to do about it. It uses public USGS water data and runs on a phone like an app. It was made for the Congressional App Challenge, and it's a program of [The Street Health Project](https://thestreethealthproject.org/), a student-led nonprofit in Cedar Rapids and Marion, Iowa, alongside its Care Kits program.

## What it does

The map shows every Iowa river site with public nitrate data, colored green, yellow, or red around the EPA drinking water limit of 10 mg/L (nitrate as nitrogen). That's 12 live USGS sensors, which report every 15 minutes, plus about 90 sites where Iowa DNR, USGS, the Meskwaki Nation, the Upper Mississippi River Restoration Program, or Minnesota's Pollution Control Agency take water samples by hand and test them in a lab. Live sensors are filled circles. Lab-sample sites are hollow rings, and every one shows the date of its newest sample, since some agencies publish samples a year or more after taking them. You can search for a town or river, filter the site list by name, or jump to your own location.

Tap a river to see its latest reading in plain English. Below that is whatever else USGS measures at that spot right now. River flow and water level are measured almost everywhere; a few big-river sites add temperature, oxygen, muddiness, algae, pH, and dissolved salts. Where there's a flow reading, NiFi multiplies it by the nitrate reading to show how many tons of nitrogen pass the sensor each day. You can also switch the chart between the last 30 days and the whole year. One sensor on the North Raccoon River, for example, was over the limit on 297 days of the past year. The nearest other sensors are listed at the bottom.

Tap ☆ Watch on any river to save it. Saved rivers sit at the top of the home screen with how much they changed this week, show under "Watched" on the map with a gold star, and trigger alerts even if they're nowhere near you.

The home screen depends on who you are. Residents get their nearest site and what its reading means for drinking water, swimming, fishing, and private wells. Farmers get a runoff-risk check that combines nearby stream trends, the rain forecast, the season, and their crop and drainage, plus practices that keep nitrogen on the field: fertilizer timing, cover crops, buffer strips, controlled drainage, bioreactors, and wetlands. That advice is labeled as general educational guidance, not agronomic or regulatory advice.

Other screens:

- Learn has short explainers, each with its sources.
- My Sensor is a placeholder for the low-cost nitrate sensor our team is building. The data code is already set up for it.
- Alerts show as banners when a nearby or watched site moves up a level or goes over the limit.

The whole site is built in 3D, in black and neon green. Each tab has its own 3D transition that fits where you're going:

| Going to | Transition |
|---|---|
| My Water | the old screen sinks and the new one surfaces through a ripple, like water |
| Map | the old screen lies down like the ground and the map drops in from orbit |
| Learn | the old screen turns over like a page in a book |
| My Sensor | the old screen powers off into a line of light and the new one powers on |
| Settings | the screens spin like a dial |

Screens have their own transitions inside them too. On the map, switching to the 3D view tips the flat map back and raises the hologram out of it, and switching back folds the hologram down onto the map. On Learn, the topic buttons warp you through the page to that topic. On My Sensor, the sensor model switches on like an old TV and the steps fly in one by one. When a river opens, its reading, its conditions, its nitrogen load, and each graph are separate panels that split apart from a stack, one after another, and switching a graph between 30 days and a year flips it over.

Every text box is a slab with a visible edge, a green rim, and a shadow, and a scan line sweeps across it as it appears. Boxes on each screen arrive their own way: they surface from below on My Water, swing in like pages on Learn, tip up on My Sensor, and spin in from far away on Settings. With a mouse, a box tilts toward the pointer and lifts toward you on spring physics, so it wobbles slightly and settles; pressing it pushes it in. Boxes rise into place as you scroll to them, buttons press down like keys, and jumping to a topic on Learn makes its box wobble. Behind everything, a green grid stretches to a glowing horizon and water droplets float at different depths, shifting as you move the mouse or scroll.

The map has a 3D view: Iowa as glowing glass, with each sensor a pillar of light as tall as its reading and a red glass sheet at the EPA limit, so the sites over the limit stick out. You can drag to turn it and tap a pillar to open that site. There's also a spinning Iowa on the welcome screen, a 3D nitrate ion and an animated tile-drainage cutaway on Learn, and a concept model of the sensor on My Sensor. A switch in Settings turns the 3D and animations off, and they also turn off when a phone asks for reduced motion.

Demo mode runs on data saved inside the app, so everything works without internet. NiFi can be installed to a phone's home screen and keeps working offline. It uses no paid services and no API keys.

## Run it

You need [Node.js](https://nodejs.org) 20.19+ or 22.12+.

```
npm install
npm run dev        # development server at http://localhost:5173
npm test           # 55 unit tests
npm run build      # type-check + production build into dist/
npm run build:site # build, then copy it into ../street-health-website/nifi/
npm run preview    # serve the production build (offline mode works here)
```

`npm run data` refreshes the saved data from USGS, the Water Quality Portal, Open-Meteo, and the Census. Run it before a demo to pick up any lab samples published since the last build. Before a demo, `node scripts/check-live-sources.mjs` checks that the live data services are answering.

NiFi's home is The Street Health Project's website, at `thestreethealthproject.org/nifi/`. In that project's GitHub repo, this code is the `nifi-source/` folder, next to the website's `street-health-website/` folder. `npm run build:site` builds NiFi and copies it into `street-health-website/nifi/`; commit that, and Cloudflare publishes it. There NiFi shows "A program of The Street Health Project" with a link back to the site.

To publish a standalone copy free on GitHub Pages instead, push the project, run `npm run build`, and publish the `dist/` folder (the "Deploy static content to Pages" GitHub Action does this). The app uses relative paths, so it works from a project page like `username.github.io/nifi/`. It has to be served over https to install and work offline.

## Design decisions

1. The map is Leaflet with OpenStreetMap instead of Google Maps or Apple Maps. Google Maps needs a billing account with a credit card, Apple's MapKit JS needs a $99-a-year developer membership, and any key in a web app is visible to everyone. OpenStreetMap is free and needs no key. Its tile policy forbids offline use, so offline (and in embedded previews) the map draws Iowa's 99 counties from data bundled in the app.
2. The app reads from two USGS services. Water Services worked when we checked in October 2026, but USGS plans to retire it in early 2027 and has said it may start breaking down in November 2026, during judging. So NiFi tries Water Services first, then USGS's newer Water Data API (same sensors, same parameter code), then a saved copy, then the bundled data.
3. USGS parameter 99133 is "Nitrate plus nitrite, water, in situ, mg/L as N." Nitrite is normally a tiny share, so this is effectively nitrate.
4. Under 5 mg/L is green ("Low"), 5 to 10 is yellow ("Elevated"), and over 10 is red ("Above limit"). Five is half the limit, an early warning. The yellow level used to be called "Watch" and was renamed once the ☆ Watch button existed. Levels go by the one-decimal number on screen, so a 4.97 reading, shown as "5.0", is yellow.
5. The rain forecast comes from Open-Meteo, which is free and needs no key. Farmer mode's runoff check wouldn't mean much without rain.
6. Demo mode includes three made-up community sensors, clearly labeled, so judges can see how community data will look (dashed squares on the map, dashed lines on charts). There is no sensor code yet.
7. There's no router or state library. The current tab lives in the URL hash (`#map`) and settings live in React context, which keeps the code small enough to explain.
8. Town search uses the Census list of 1,026 Iowa places, bundled in the app, instead of a geocoding service that would need a key. "Use my location" uses the phone's GPS, and the location stays on the device.
9. The 3D views use plain three.js. One shared hook, `useThreeScene`, handles the renderer, camera, glow, resizing, pausing when off screen, and cleanup, so each scene file only describes what's in it. three.js is about 150 KB compressed, so it only downloads when someone opens a 3D view, and the flat map is the default.
10. River flow and current conditions are optional parts of `DataSource` (`getConditions`, `getFlow`). The USGS sources provide them. A simple nitrate-only sensor can skip them, and the app leaves those sections out.
11. The watch list is stored on the device with each river's id and name, with no account. Keeping the name means a river stays on the list while its sensor is pulled for winter.
12. A year of daily history is bundled for demo mode as a start date plus one number per day (about 40 KB). It only downloads when someone opens the 1-year view.
13. Rivers without a live sensor use lab samples from two public, documented services: the Water Quality Portal (USGS and EPA) and the USGS Samples API. Only programs that name their stations are used, so every site has a real river name and agency. Polk County Conservation's stations are labeled only with codes, so they're left out rather than guessed at. Only results reported "as N" in mg/L are kept, which matches the EPA limit. A lab station on the same spot as a live sensor (within half a kilometer) is dropped, because the live sensor is newer. The samples are saved in the app by `npm run data` instead of downloaded live, because these services are slow (5 to 40 seconds per request) and the samples only change every few weeks.
14. Lab samples never trigger alerts, and they're left out of "above the limit right now", the 3D view, the farm runoff check, and the main card on My Water. All of those are about the water today, and a sample can be more than a year old.
15. University of Iowa's IWQIS network has more live sensors, but IIHR asks people to request its data through a form, so NiFi doesn't use it. The team could ask IIHR for access.
16. The 3D site uses the browser's own tools, with no 3D library: CSS 3D transforms for the slabs and background, and the View Transitions API for the transitions. The browser takes a picture of the screen before and after a change, and `src/index.css` moves the two pictures in 3D. Each transition is a pair of keyframe animations there, picked by a class on the page (`cc-turn-dive`, `cc-turn-warp`, and so on), so adding one is a few lines of CSS. Browsers without View Transitions switch screens with a short slide instead. The springs are about 20 lines of code (`src/fx/spring.ts`). Tilt follows the mouse only, so touch scrolling isn't affected. Big boxes tilt less, so long text stays readable.
17. Anything heavy (3D scenes, the ~100 map markers) is built right after a transition instead of before it. A transition can't start until the new screen has been drawn, and building them first held transitions up by more than half a second. Every screen is also downloaded in the background after the app opens, so the first transition to it starts quickly too.
18. The black-and-green theme lives in one place: the color tokens at the top of `src/index.css`. Every pair of text and background colors meets WCAG AA contrast; text on a bright green, gold, or yellow fill uses a near-black green (`on-accent`) instead of white. Map tiles come from OpenStreetMap in light colors, so a CSS filter turns them dark green instead of switching to a dark-tile service that would need a key.

## Project layout

```
src/
  data/
    types.ts                 Site, Reading, and the DataSource interface every provider implements
    sources/
      usgsWaterServices.ts   USGS Water Services (waterservices.usgs.gov)
      usgsWaterDataApi.ts    USGS Water Data API (api.waterdata.usgs.gov), automatic backup
      bundled.ts             Saved USGS snapshot + example community sensors (demo mode)
      labSamples.ts          Lab samples from rivers with no live sensor (Iowa DNR, USGS, and others)
      resilient.ts           Tries each live source, then saved data, then bundled data
      index.ts               Picks the sources for normal vs. demo mode (add community sensors here)
    weather.ts               Open-Meteo rain outlook
    cache.ts                 Time-stamped localStorage cache
    bundled/, geo/           Data files made by scripts/build-demo-data.mjs
  lib/                       Plain logic, no React: levels, trends, history, nitrogen load, alerts, guidance, distances, town search
  state/                     React context: settings (including the watch list), data, navigation
  components/                Map, charts, site details, watch button and list, search, alerts, header/tab bar, small UI pieces
  pages/                     One file per screen
  three/                     3D views: shared scene hook, hologram shader, Iowa map, nitrate molecule, sensor concept
  fx/                        The 3D website: spring physics, slab tilt, the 3D transitions, the background world
scripts/                     Data build and live-service check
docs/HOW-IT-WORKS.md         Walkthrough for explaining the code
```

## Adding a community sensor network later

Write a class that implements `DataSource` (`getSites()` and `getReadings(siteId, range)`) with `kind: 'community'`, and add it to the list in `src/data/sources/index.ts`. The map, charts, alerts, watch list, and site details already handle community sites and draw them as dashed squares and dashed lines.

## Accessibility

- Text and colors meet WCAG AA contrast. Levels also use shapes (● ▲ ■) and words, so color is never the only signal.
- The light theme is built to be read in sunlight, in Atkinson Hyperlegible, a font the Braille Institute designed for low-vision readers.
- Buttons are at least 48 px tall. There's a visible focus ring and a skip link, map markers can be reached by keyboard and have screen-reader labels, and the full site list is an alternative to the map.
- Each 3D scene has a text description for screen readers. With reduced motion on, the 3D scenes show a still frame. If a device can't draw 3D, that box shows a short note and the rest of the app works normally.

## Data and credits

- Water data: U.S. Geological Survey, live sensors and lab samples. The live data is provisional and may be revised.
- Lab samples: Iowa Department of Natural Resources, the Meskwaki Nation's natural resources department, the Upper Mississippi River Restoration Program's long-term monitoring, and the Minnesota Pollution Control Agency, all through the Water Quality Portal (waterqualitydata.us).
- Weather: Open-Meteo, CC BY 4.0.
- Maps: © OpenStreetMap contributors. Iowa county boundaries and the town list come from the U.S. Census Bureau (via us-atlas and the Census Gazetteer).
- Libraries: React, Vite, TypeScript, Tailwind CSS, Leaflet, React Leaflet, Recharts, three.js, vite-plugin-pwa (Workbox), and Vitest. Font: Atkinson Hyperlegible (SIL Open Font License).
- Facts on the Learn tab link to their sources: EPA, Iowa DNR, Iowa State University, NIH/PubMed, and NOAA-supported Gulf hypoxia monitoring.

## AI use disclosure

This app was built with help from an AI assistant (Claude, by Anthropic). The Congressional App Challenge requires that AI use be fully disclosed and that AI not be the entirety of the technical development. Describe your team's own contributions accurately in your submission, and make sure every teammate can explain how the app works (see `docs/HOW-IT-WORKS.md`).
