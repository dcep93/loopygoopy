import { Definition, validDefinition, decodeDocument } from './model';
import golden from './golden.json';
declare const chrome: any;
export const projectId = 'loopygoopy';
export async function loadDefinition(id: string): Promise<{ definition?: Definition; notice?: string }> {
  const key = `practice-catalog:${id}`;
  const saved = (await chrome.storage.local.get(key))[key];
  const fallback = validDefinition(saved, id) ? saved : validDefinition(golden, id) ? golden : undefined;
  const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 4000);
  try {
    const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/practiceVideos/${encodeURIComponent(id)}`, { signal: abort.signal });
    if (response.status === 404) return fallback ? { definition: fallback, notice: 'Using the saved practice guide.' } : {};
    if (!response.ok) throw Error('Catalog unavailable');
    const definition = decodeDocument(await response.json());
    if (!validDefinition(definition, id)) throw Error('Invalid practice guide');
    await chrome.storage.local.set({ [key]: definition });
    return { definition };
  } catch {
    return fallback ? { definition: fallback, notice: 'Using the saved practice guide.' } : { notice: 'Could not load a practice guide. Retry when connected.' };
  } finally { clearTimeout(timer); }
}
