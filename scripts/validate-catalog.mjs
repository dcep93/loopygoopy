import fs from 'node:fs/promises';
import { updateCatalogReadme } from './render-catalog.mjs';
import { validCatalog } from '../extension/runtime/model.mjs';
const path = process.argv[2] || new URL('../catalog.json', import.meta.url);
const catalog = JSON.parse(await fs.readFile(path, 'utf8'));
if (!validCatalog(catalog)) throw Error('Invalid catalog: use schemaVersion 1, published 32-beat definitions, and unique media IDs.');
console.log(`Catalog valid: ${catalog.videos.length} prepared video(s).`);

// Alternative input files are validation-only; never publish a test catalog.
if (!process.argv[2]) {
  await updateCatalogReadme(catalog);
  console.log('README practice links refreshed from catalog.json.');
}
