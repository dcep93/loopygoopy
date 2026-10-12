import fs from 'node:fs/promises';
import { validCatalog } from '../extension/runtime/model.mjs';
const path = process.argv[2] || new URL('../catalog.json', import.meta.url);
const catalog = JSON.parse(await fs.readFile(path, 'utf8'));
if (!validCatalog(catalog)) throw Error('Invalid catalog: use schemaVersion 1, published 32-beat definitions, and unique media IDs.');
console.log(`Catalog valid: ${catalog.videos.length} prepared video(s).`);
