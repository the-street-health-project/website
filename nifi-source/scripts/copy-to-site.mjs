// Copies NiFi's finished build (dist/) into The Street Health Project's website, which serves it at /nifi/.
// Run it with "npm run build:site", which builds first. It expects the repo's layout:
// this folder (nifi-source/) sits next to the website folder (street-health-website/).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const site = fileURLToPath(new URL('../../street-health-website/', import.meta.url));
const target = fileURLToPath(new URL('../../street-health-website/nifi/', import.meta.url));

if (!existsSync(dist)) {
  console.error('No build found in dist/. Run "npm run build" first (or use "npm run build:site").');
  process.exit(1);
}
if (!existsSync(site)) {
  console.error(`Couldn't find the website folder at ${site}. This folder should sit next to street-health-website/.`);
  process.exit(1);
}
// Replace the old copy completely, so files from older builds don't pile up.
rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
console.log(`Copied NiFi into ${target}. Commit street-health-website/nifi/ to publish it.`);
