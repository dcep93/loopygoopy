import { Catalog, Definition, validCatalog } from './model';
import bundled from './bundled-catalog.json';
declare const chrome: any;
export const catalogUrl = 'https://raw.githubusercontent.com/dcep93/loopygoopy/master/catalog.json';
export const catalogKey = 'practice-catalog-v1';
export const refreshInterval = 60 * 60 * 1000;
type Result = { catalog?: Catalog; notice?: string };
let pending: Promise<Result> | undefined;
async function readCatalog(refresh: boolean): Promise<Result> {
  const saved = (await chrome.storage.local.get(catalogKey))[catalogKey];
  const cached = validCatalog(saved?.catalog) ? saved.catalog : undefined;
  const age = Date.now() - saved?.fetchedAt;
  if (!refresh && cached && Number.isFinite(age) && age >= 0 && age < refreshInterval) return { catalog: cached };
  const fallback = cached || (validCatalog(bundled) ? bundled : undefined);
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 4000);
  try {
    // Every video uses exactly this URL: matching happens only on this computer.
    const response = await fetch(catalogUrl, { signal: abort.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache' });
    if (!response.ok) throw Error('Catalog unavailable');
    const catalog = await response.json();
    if (!validCatalog(catalog)) throw Error('Invalid practice catalog');
    try { await chrome.storage.local.set({ [catalogKey]: { catalog, fetchedAt: Date.now() } }); }
    catch { return { catalog, notice: 'Practice guides loaded, but could not be cached for offline use.' }; }
    return { catalog };
  } catch {
    return { catalog: fallback, notice: fallback ? 'Using the saved practice catalog.' : 'Could not load practice guides. Retry when connected.' };
  } finally { clearTimeout(timer); }
}
export async function loadDefinition(id: string, refresh = false): Promise<{ definition?: Definition; notice?: string }> {
  // A single download can serve multiple videos and simultaneous popup/page sessions.
  const request = pending || (pending = readCatalog(refresh));
  try {
    const result = await request;
    return { definition: result.catalog?.videos.find(video => video.mediaId === id), notice: result.notice };
  } finally { if (pending === request) pending = undefined; }
}
