import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// MapLibre 6 ships an ES module worker. Serve the matching worker locally so
// bundlers do not rewrite its relative URL and CSP never needs a third party.
const dist = dirname(fileURLToPath(import.meta.resolve('maplibre-gl')));
const target = join(process.cwd(), 'public/vendor/maplibre');
await mkdir(target, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  await copyFile(join(dist, file), join(target, file));
}
await copyFile(join(dist, '../LICENSE.txt'), join(target, 'LICENSE.txt'));
