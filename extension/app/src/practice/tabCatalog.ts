import { Definition, validCatalog, validDefinition } from './model';
import bundled from './bundled-catalog.json';

export type DefinitionResult = { definition?: Definition; notice?: string };
// Only startup/retry uses the worker. A dead worker cannot affect a loaded session.
export async function requestDefinition(mediaId: string, refresh = false): Promise<DefinitionResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response: any = await Promise.race([
      window.chrome.runtime.sendMessage({ type: 'practice-definition', mediaId, refresh }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Catalog timeout')), 4500); }),
    ]);
    if (!response?.ok || (response.definition && !validDefinition(response.definition, mediaId))) throw Error('Catalog unavailable');
    return { definition: response.definition, notice: response.notice };
  } catch {
    let saved: any;
    try { saved = (await window.chrome.storage.local.get('practice-catalog-v3'))['practice-catalog-v3']; } catch {}
    const catalog = validCatalog(saved?.catalog) ? saved.catalog : bundled;
    return { definition: catalog.videos.find((v: Definition) => v.mediaId === mediaId), notice: 'Using the saved practice catalog.' };
  } finally { clearTimeout(timer); }
}
