/**
 * check-live-sources.mjs — asks both USGS services for Iowa nitrate data, to confirm the
 * endpoints and parameter code still work. Run before demos:  node scripts/check-live-sources.mjs
 */
const PARAM = '99133';

async function check(name, url, csv = false) {
  const t = Date.now();
  try {
    const res = await fetch(url);
    // CSV answers are counted by rows (minus the header line); JSON answers by series or features.
    const count = csv
      ? (await res.text()).trim().split('\n').length - 1
      : ((body) => body.value?.timeSeries?.length ?? body.features?.length ?? 0)(await res.json());
    console.log(`${res.ok ? 'OK  ' : 'FAIL'} ${name}: HTTP ${res.status}, ${count} records, ${Date.now() - t} ms`);
  } catch (e) {
    console.log(`FAIL ${name}: ${e.message}`);
  }
}

await check('USGS Water Services, latest (iv)', `https://waterservices.usgs.gov/nwis/iv/?format=json&stateCd=ia&parameterCd=${PARAM}&siteStatus=active`);
await check('USGS Water Services, daily (dv)', `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=05482500&parameterCd=${PARAM}&statCd=00003&period=P30D`);
await check('USGS Water Data API, latest', `https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&limit=500&parameter_code=${PARAM}&bbox=-96.64,40.37,-90.14,43.51&properties=monitoring_location_id,time,value`);
await check('USGS Water Data API, daily', `https://api.waterdata.usgs.gov/ogcapi/v0/collections/daily/items?f=json&limit=1000&monitoring_location_id=USGS-05482500&parameter_code=${PARAM}&statistic_id=00003&time=P30D&properties=time,value`);
await check('USGS Water Services, conditions now (flow, temperature...)', 'https://waterservices.usgs.gov/nwis/iv/?format=json&sites=05474500&parameterCd=00060,00065,00010,00300,63680,32316,00400,00095');
await check('USGS Water Services, 1 year of nitrate', `https://waterservices.usgs.gov/nwis/dv/?format=json&sites=05482500&parameterCd=${PARAM}&statCd=00003&period=P365D`);
await check('USGS Water Services, river flow (dv)', 'https://waterservices.usgs.gov/nwis/dv/?format=json&sites=05482500&parameterCd=00060&statCd=00003&period=P30D');
await check('USGS Water Data API, conditions now', 'https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&limit=100&monitoring_location_id=USGS-05474500&properties=parameter_code,time,value');
await check('Water Quality Portal, Iowa stream stations with lab nitrate', 'https://www.waterqualitydata.us/data/Station/search?statecode=US%3A19&siteType=Stream&characteristicName=Nitrate%20%2B%20Nitrite&startDateLo=01-01-2024&mimeType=geojson&zip=no');
await check('USGS Samples API, Iowa stream lab nitrate', 'https://api.waterdata.usgs.gov/samples-data/results/narrow?mimeType=text%2Fcsv&stateFips=US%3A19&siteTypeCode=ST&usgsPCode=00631&activityStartDateLower=2026-01-01', true);
await check('Open-Meteo forecast', 'https://api.open-meteo.com/v1/forecast?latitude=42.02&longitude=-94.38&daily=precipitation_sum&precipitation_unit=inch&timezone=auto&past_days=7&forecast_days=7');
