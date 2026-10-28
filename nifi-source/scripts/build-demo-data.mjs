/**
 * build-demo-data.mjs
 *
 * Downloads real public data once and saves it inside the app, so demo mode
 * (and the offline fallback) always has realistic data to show.
 *
 *   npm run data
 *
 * Creates:
 *   src/data/bundled/usgs-snapshot.json      Iowa stream nitrate sensors + 30 days of daily nitrate and river flow,
 *                                            + current conditions (flow, temperature, oxygen...) (USGS)
 *   src/data/bundled/usgs-history.json       A year of daily nitrate and river flow, stored compactly (USGS)
 *   src/data/bundled/lab-samples.json        Lab nitrate samples from rivers with no live sensor (Iowa DNR and others,
 *                                            via the Water Quality Portal; USGS via its Samples API)
 *   src/data/bundled/weather-demo.json       Rain history and forecast for the demo location (Open-Meteo)
 *   src/data/bundled/community-example.json  Three clearly labeled EXAMPLE community sensors (not real data)
 *   src/data/geo/iowa-counties.json          County outlines for the offline map (U.S. Census via us-atlas)
 *   src/data/geo/iowa-places.json            Iowa cities and towns for offline search (U.S. Census Gazetteer)
 *   src/data/geo/iowa-outline.ts             An SVG outline of Iowa for the logo and onboarding
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { feature, merge } from 'topojson-client';

const OUT = new URL('../src/data/', import.meta.url);
const PARAM = '99133'; // USGS parameter code: nitrate plus nitrite, water, in situ, mg/L as N
const DAY = 86400000;

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'NiFi student project (data build)' } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.json();
}

async function save(path, data) {
  const file = new URL(path, OUT);
  await mkdir(new URL('.', file), { recursive: true });
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  await writeFile(file, text);
  console.log(`  wrote src/data/${path} (${Math.round(text.length / 1024)} KB)`);
}

const round = (n, d = 2) => Math.round(n * 10 ** d) / 10 ** d;

/* ---------- 1. USGS: Iowa stream nitrate sensors ---------- */

console.log('USGS Water Services: latest readings for Iowa...');
const iv = await getJson(`https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=ia&parameterCd=${PARAM}&siteStatus=active`);

const now = Date.now();
const sites = [];
for (const ts of iv.value.timeSeries) {
  const info = ts.sourceInfo;
  const type = (info.siteProperty.find((p) => p.name === 'siteTypeCd') || {}).value || '';
  if (!type.startsWith('ST')) continue; // streams and rivers only (skip wells)
  const values = ts.values[0].value.filter((v) => v.value !== '' && Number(v.value) >= 0);
  const last = values[values.length - 1];
  if (!last || now - Date.parse(last.dateTime) > 14 * DAY) continue; // skip sensors that stopped reporting
  const code = info.siteCode[0].value;
  sites.push({
    id: `USGS-${code}`,
    code,
    name: info.siteName,
    lat: round(info.geoLocation.geogLocation.latitude, 5),
    lon: round(info.geoLocation.geogLocation.longitude, 5),
    latest: { time: new Date(last.dateTime).toISOString(), value: round(Number(last.value)) },
  });
}
console.log(`  ${sites.length} active stream sensors`);

console.log('USGS Water Services: 30 days of daily averages...');
const dv = await getJson(`https://waterservices.usgs.gov/nwis/dv/?format=json&stateCd=ia&parameterCd=${PARAM}&statCd=00003&period=P30D`);
const readings = {};
for (const ts of dv.value.timeSeries) {
  const id = `USGS-${ts.sourceInfo.siteCode[0].value}`;
  const list = ts.values[0].value
    .filter((v) => v.value !== '' && Number(v.value) >= 0)
    .map((v) => ({ time: `${v.dateTime.slice(0, 10)}T12:00:00.000Z`, value: round(Number(v.value)) }));
  if (list.length) readings[id] = list;
}

// Some sensors only publish 15-minute values. Average those into daily values.
const missing = sites.filter((s) => !readings[s.id]);
if (missing.length) {
  console.log(`  averaging 15-minute readings for ${missing.length} sensors without daily averages...`);
  const ivLong = await getJson(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${missing.map((s) => s.code).join(',')}&parameterCd=${PARAM}&period=P30D`);
  for (const ts of ivLong.value.timeSeries) {
    const id = `USGS-${ts.sourceInfo.siteCode[0].value}`;
    const byDay = new Map();
    for (const v of ts.values[0].value) {
      const n = Number(v.value);
      if (v.value === '' || !(n >= 0)) continue;
      const day = v.dateTime.slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, []);
      byDay.get(day).push(n);
    }
    readings[id] = [...byDay.entries()].sort().map(([day, vals]) => ({
      time: `${day}T12:00:00.000Z`,
      value: round(vals.reduce((a, b) => a + b, 0) / vals.length),
    }));
  }
}
for (const s of sites) if (!readings[s.id]) readings[s.id] = [];

const codes = sites.map((s) => s.code).join(',');

// Daily averages from a USGS "dv" response, by site. Some sites send two lists (two sensors): the first wins.
function dailyBySite(json) {
  const out = {};
  for (const ts of json.value.timeSeries) {
    const id = `USGS-${ts.sourceInfo.siteCode[0].value}`;
    const byDay = new Map((out[id] || []).map((r) => [r.time, r.value]));
    for (const list of ts.values) {
      for (const v of list.value) {
        const n = Number(v.value);
        const time = `${v.dateTime.slice(0, 10)}T12:00:00.000Z`;
        if (v.value === '' || !(n >= 0) || byDay.has(time)) continue;
        byDay.set(time, round(n));
      }
    }
    out[id] = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([time, value]) => ({ time, value }));
  }
  return out;
}

// A year of daily values stored compactly: a start date and one number (or null) per day.
function compact(list) {
  if (!list || !list.length) return undefined;
  const start = Date.parse(list[0].time);
  const values = new Array(Math.round((Date.parse(list[list.length - 1].time) - start) / DAY) + 1).fill(null);
  for (const r of list) values[Math.round((Date.parse(r.time) - start) / DAY)] = r.value;
  return { start: list[0].time.slice(0, 10), values };
}

console.log('USGS Water Services: a year of daily nitrate and river flow...');
const yearNitrate = dailyBySite(await getJson(`https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${codes}&parameterCd=${PARAM}&statCd=00003&period=P365D`));
const yearFlow = dailyBySite(await getJson(`https://waterservices.usgs.gov/nwis/dv/?format=json&sites=${codes}&parameterCd=00060&statCd=00003&period=P365D`));
const flow = {};
for (const s of sites) if (yearFlow[s.id]) flow[s.id] = yearFlow[s.id].filter((r) => Date.parse(yearFlow[s.id].at(-1).time) - Date.parse(r.time) < 30 * DAY);

// The same parameter codes as src/lib/parameters.ts: flow, level, temperature, oxygen, turbidity, algae, pH, conductance.
const EXTRA = ['00060', '00065', '00010', '00300', '63680', '32316', '00400', '00095'];
console.log('USGS Water Services: river flow, temperature, and other conditions right now...');
const cond = await getJson(`https://waterservices.usgs.gov/nwis/iv/?format=json&sites=${codes}&parameterCd=${EXTRA.join(',')}`);
const latestByCode = {};
for (const ts of cond.value.timeSeries) {
  const id = `USGS-${ts.sourceInfo.siteCode[0].value}`;
  const code = ts.variable.variableCode[0].value;
  for (const list of ts.values) {
    for (const v of list.value) {
      const n = Number(v.value);
      if (v.value === '' || !Number.isFinite(n) || n <= -999) continue; // -999999 means "no data"
      const time = new Date(v.dateTime).toISOString();
      if (now - Date.parse(time) > 3 * DAY) continue; // only what's measured right now
      latestByCode[id] ??= {};
      if (!latestByCode[id][code] || time > latestByCode[id][code].time) latestByCode[id][code] = { code, value: n, time };
    }
  }
}
const conditions = {};
for (const [id, byCode] of Object.entries(latestByCode)) conditions[id] = EXTRA.filter((c) => byCode[c]).map((c) => byCode[c]);

await save('bundled/usgs-snapshot.json', {
  source: 'USGS Water Services (waterservices.usgs.gov), parameter 99133 (nitrate) plus river flow and other conditions',
  generatedAt: new Date().toISOString(),
  sites,
  readings,
  flow,
  conditions,
});

const history = { readings: {}, flow: {} };
for (const s of sites) {
  const n = compact(yearNitrate[s.id]);
  const f = compact(yearFlow[s.id]);
  if (n) history.readings[s.id] = n;
  if (f) history.flow[s.id] = f;
}
await save('bundled/usgs-history.json', history);

/* ---------- 1b. Lab samples: rivers with no live sensor ---------- */

// Only 12 Iowa streams have a live USGS nitrate sensor. Many more are sampled by hand, usually
// once a month in the warm season, and tested in a lab. Those results come from two public services:
//   - the Water Quality Portal (waterqualitydata.us, run by USGS and EPA), which holds Iowa DNR's
//     river monitoring and a few other programs
//   - the USGS Samples API (api.waterdata.usgs.gov/samples-data), USGS's own lab samples
// Only programs listed here are used, so every site has a known agency name. (Some programs, like
// Polk County's, name their stations only with codes, so the river can't be named without guessing.)
const LAB_AGENCIES = {
  '21IOWA_WQX': 'Iowa DNR',
  UMRR_LTRM: 'Upper Mississippi River Restoration Program',
  MESKWAKI_DNR: 'Meskwaki Nation',
  MNPCA: 'Minnesota Pollution Control Agency',
};
const LAB_SINCE = '2024-01-01';
// Two stations closer than this are the same spot on the river. (Kept small: a creek can join a
// river a kilometer from another station, and that's a different stream.)
const SAME_PLACE_KM = 0.5;

async function getText(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'NiFi student project (data build)' } });
  if (!res.ok) throw new Error(`${res.status} from ${url}`);
  return res.text();
}

// A small CSV reader that handles quoted fields (some station names contain commas).
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') quoted = false;
      else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += ch;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])));
}

const km = (a, b) => {
  const toRad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * toRad) / 2) ** 2 + Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(((b.lon - a.lon) * toRad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
};
// "LITTLE ROCK RIVER ON 340TH ST" -> "Little Rock River on 340th St" (only for names written in all capitals)
const tidyName = (name) =>
  name === name.toUpperCase()
    ? name.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).replace(/\b(On|Of|At|Near|And|The)\b/g, (w) => w.toLowerCase()).replace(/\b(\d+)(St|Nd|Rd|Th)\b/g, (m, n, s) => n + s.toLowerCase())
    : name;

console.log('Water Quality Portal: lab nitrate samples from Iowa streams...');
const wqpFilter = `statecode=US%3A19&siteType=Stream&characteristicName=Nitrate%20%2B%20Nitrite&startDateLo=${LAB_SINCE.slice(5, 7)}-${LAB_SINCE.slice(8)}-${LAB_SINCE.slice(0, 4)}&mimeType=csv&zip=no`;
const wqpStations = parseCsv(await getText(`https://www.waterqualitydata.us/data/Station/search?${wqpFilter}`));
const wqpResults = parseCsv(await getText(`https://www.waterqualitydata.us/data/Result/search?${wqpFilter}&dataProfile=narrowResult`));

const labSites = new Map();
for (const s of wqpStations) {
  const agency = LAB_AGENCIES[s.OrganizationIdentifier];
  const lat = Number(s.LatitudeMeasure);
  const lon = Number(s.LongitudeMeasure);
  // "Duplicate" stations are quality-control repeats of another station's sample.
  if (!agency || /duplicate/i.test(s.MonitoringLocationIdentifier) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
  labSites.set(s.MonitoringLocationIdentifier, {
    id: `LAB-${s.MonitoringLocationIdentifier}`,
    name: tidyName(s.MonitoringLocationName.trim()),
    lat: round(lat, 5),
    lon: round(lon, 5),
    agency,
    samples: new Map(),
  });
}
// One value per site per day. If a sample was reported both as "Total" and "Dissolved", use Total.
const addSample = (site, day, value, rank) => {
  const current = site.samples.get(day);
  if (!current || rank < current.rank) site.samples.set(day, { value, rank });
};
for (const r of wqpResults) {
  const site = labSites.get(r.MonitoringLocationIdentifier);
  const value = Number(r.ResultMeasureValue);
  if (!site || r.ResultMeasureValue === '' || !Number.isFinite(value) || value < 0) continue; // "not detected" results have no value
  if (r.MethodSpecificationName !== 'as N' || r['ResultMeasure/MeasureUnitCode'].toLowerCase() !== 'mg/l') continue; // same unit as EPA's limit only
  if (r.ResultStatusIdentifier === 'Rejected') continue;
  addSample(site, r.ActivityStartDate, round(value), r.ResultSampleFractionText === 'Total' ? 0 : 1);
}

console.log('USGS Samples API: lab nitrate samples from Iowa streams...');
const usgsSamples = parseCsv(
  await getText(
    `https://api.waterdata.usgs.gov/samples-data/results/narrow?mimeType=text%2Fcsv&stateFips=US%3A19&siteTypeCode=ST&usgsPCode=00631&activityStartDateLower=${LAB_SINCE}`,
  ),
);
for (const r of usgsSamples) {
  const value = Number(r.Result_Measure);
  if (r.Result_Measure === '' || !Number.isFinite(value) || value < 0 || r.Result_ResultDetectionCondition) continue;
  if (r.Result_MethodSpeciation !== 'as N' || r.Result_MeasureUnit !== 'mg/L') continue;
  const key = r.Location_Identifier;
  if (!labSites.has(key)) {
    labSites.set(key, {
      id: `LAB-${key}`,
      name: r.Location_Name,
      lat: round(Number(r.Location_Latitude), 5),
      lon: round(Number(r.Location_Longitude), 5),
      agency: 'USGS',
      samples: new Map(),
    });
  }
  addSample(labSites.get(key), r.Activity_StartDate, round(value), 0);
}

// Keep sites with samples, skip spots that already have a live sensor, and where two different
// programs sample the same spot, keep the one with the newest sample.
const labList = [...labSites.values()]
  .filter((s) => s.samples.size && Number.isFinite(s.lat) && Number.isFinite(s.lon))
  .map((s) => {
    const readings = [...s.samples.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, { value }]) => ({ time: `${day}T12:00:00.000Z`, value }));
    return { ...s, readings, latest: readings[readings.length - 1] };
  })
  .filter((s) => !sites.some((live) => km(live, s) < SAME_PLACE_KM))
  .sort((a, b) => b.latest.time.localeCompare(a.latest.time));
const labKept = [];
for (const s of labList) if (!labKept.some((k) => k.agency !== s.agency && km(k, s) < SAME_PLACE_KM)) labKept.push(s);
labKept.sort((a, b) => a.name.localeCompare(b.name));

const labUrl = (s) => {
  const raw = s.id.replace(/^LAB-/, '');
  return raw.startsWith('USGS-') ? `https://waterdata.usgs.gov/monitoring-location/${raw.slice(5)}/` : undefined;
};
await save('bundled/lab-samples.json', {
  source: 'Water Quality Portal (waterqualitydata.us) and USGS Samples API (api.waterdata.usgs.gov/samples-data); nitrate + nitrite, mg/L as N',
  generatedAt: new Date().toISOString(),
  since: LAB_SINCE,
  sites: labKept.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lon: s.lon, agency: s.agency, url: labUrl(s), latest: s.latest })),
  readings: Object.fromEntries(labKept.map((s) => [s.id, s.readings])),
});
console.log(`  ${labKept.length} sites with lab samples (${labList.length - labKept.length} duplicates of the same spot skipped)`);
const byAgency = {};
for (const s of labKept) byAgency[s.agency] = (byAgency[s.agency] ?? 0) + 1;
console.log('  ' + Object.entries(byAgency).map(([a, n]) => `${a}: ${n}`).join(', '));

/* ---------- 2. Example community sensors (clearly labeled, not real) ---------- */

// Three made-up sensors placed near real USGS sites, with values loosely based on them,
// so judges can see how community data will look next to official data.
const examples = [
  { id: 'EX-1', name: 'Example community sensor near Ames', lat: 42.035, lon: -93.633, near: 'USGS-05481000', scale: 0.85 },
  { id: 'EX-2', name: 'Example community sensor near Jefferson', lat: 42.058, lon: -94.298, near: 'USGS-05482500', scale: 1.12 },
  { id: 'EX-3', name: 'Example community sensor near Cedar Rapids', lat: 42.02, lon: -91.71, near: 'USGS-05464420', scale: 0.92 },
];
const nearestReal = (lat, lon) => sites.reduce((best, s) => {
  const d = Math.hypot(s.lat - lat, s.lon - lon);
  return !best || d < best.d ? { s, d } : best;
}, null).s;
const community = { note: 'EXAMPLE DATA ONLY. These sensors do not exist; they show how community readings will appear.', sites: [], readings: {} };
let seed = 7;
const rand = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280) - 0.5;
for (const ex of examples) {
  const base = sites.find((s) => s.id === ex.near) || nearestReal(ex.lat, ex.lon);
  const series = readings[base.id].map((r) => ({ time: r.time, value: round(Math.max(0, r.value * ex.scale + rand() * 0.8), 1) }));
  const last = series[series.length - 1] || { time: base.latest.time, value: round(base.latest.value * ex.scale, 1) };
  community.sites.push({ id: ex.id, name: ex.name, lat: ex.lat, lon: ex.lon, latest: last });
  community.readings[ex.id] = series;
}
await save('bundled/community-example.json', community);

/* ---------- 3. Weather for the demo location ---------- */

console.log('Open-Meteo: rain for the demo location (Jefferson, Iowa)...');
const demo = { name: 'Jefferson, Iowa', lat: 42.0158, lon: -94.3772 };
const wx = await getJson(`https://api.open-meteo.com/v1/forecast?latitude=${demo.lat}&longitude=${demo.lon}` +
  '&daily=precipitation_sum&precipitation_unit=inch&timezone=America%2FChicago&past_days=14&forecast_days=7');
await save('bundled/weather-demo.json', {
  source: 'Open-Meteo (CC BY 4.0)',
  generatedAt: new Date().toISOString(),
  location: demo,
  daily: wx.daily.time.map((date, i) => ({ date, rainIn: round(wx.daily.precipitation_sum[i] ?? 0) })),
});

/* ---------- 4. Iowa map shapes ---------- */

console.log('U.S. Census (us-atlas): Iowa counties...');
const topo = await getJson('https://cdn.jsdelivr.net/npm/us-atlas@3.0.1/counties-10m.json');
const iowaGeoms = topo.objects.counties.geometries.filter((g) => String(g.id).startsWith('19'));
const counties = feature(topo, { type: 'GeometryCollection', geometries: iowaGeoms });
counties.features = counties.features.map((f) => ({
  type: 'Feature',
  properties: { name: f.properties.name },
  geometry: {
    type: f.geometry.type,
    // 4 decimal places (~10 m) is plenty for a statewide map.
    coordinates: JSON.parse(JSON.stringify(f.geometry.coordinates, (k, v) => (typeof v === 'number' ? round(v, 4) : v))),
  },
}));
await save('geo/iowa-counties.json', counties);

// Outline of the whole state, drawn as an SVG path for the logo and onboarding screen.
const outline = merge(topo, iowaGeoms);
const lonLat = outline.coordinates.flat(2);
const minLon = Math.min(...lonLat.map((p) => p[0]));
const maxLon = Math.max(...lonLat.map((p) => p[0]));
const minLat = Math.min(...lonLat.map((p) => p[1]));
const maxLat = Math.max(...lonLat.map((p) => p[1]));
const kx = Math.cos((42 * Math.PI) / 180); // shrink longitude so Iowa isn't stretched
const width = 300;
const scale = width / ((maxLon - minLon) * kx);
const height = Math.round((maxLat - minLat) * scale);
const d = outline.coordinates.map((poly) => poly.map((ring) => 'M' + ring.map(([lon, lat]) =>
  `${round((lon - minLon) * kx * scale, 1)},${round((maxLat - lat) * scale, 1)}`).join('L') + 'Z').join('')).join('');
await save('geo/iowa-outline.ts',
  `// Generated by scripts/build-demo-data.mjs from U.S. Census boundaries (us-atlas). Do not edit by hand.\n` +
  `export const IOWA_VIEWBOX = '0 0 ${width} ${height}';\nexport const IOWA_PATH = '${d}';\n`);

console.log('U.S. Census Gazetteer: Iowa cities and towns...');
const gaz = await (await fetch('https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_gaz_place_19.txt')).text();
const lines = gaz.trim().split(/\r?\n/);
const head = lines[0].split('\t').map((h) => h.trim());
const col = (name) => head.indexOf(name);
const places = lines.slice(1).map((line) => {
  const c = line.split('\t').map((x) => x.trim());
  return {
    name: c[col('NAME')].replace(/ (city|CDP|town)$/i, ''),
    lat: round(Number(c[col('INTPTLAT')]), 4),
    lon: round(Number(c[col('INTPTLONG')]), 4),
  };
}).filter((p) => p.name && Number.isFinite(p.lat) && Number.isFinite(p.lon))
  .sort((a, b) => a.name.localeCompare(b.name));
await save('geo/iowa-places.json', places);

console.log('Done.');
