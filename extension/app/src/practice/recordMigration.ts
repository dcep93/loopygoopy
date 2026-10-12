declare const chrome: any;
export const migrationMarker = 'loopy-record-port-v1';
let pending: Promise<void> | undefined;
export function ensureRecordTransfer(): Promise<void> {
  if (pending) return pending;
  pending = transfer().catch(error => { pending = undefined; throw error; });
  return pending;
}
async function transfer() {
  const store = chrome.storage.local;
  const existing = await store.get(null);
  if (existing[migrationMarker]?.completed) return;
  const url = chrome.runtime.getURL('runtime/migrate.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'], documentUrls: [url] });
  if (!contexts.length) await chrome.offscreen.createDocument({ url: 'runtime/migrate.html', reasons: ['LOCAL_STORAGE'], justification: 'Preserve existing saved video configurations in shared extension storage.' });
  try {
    const response = await chrome.runtime.sendMessage({ target: 'record-migration', type: 'read-legacy-records' });
    if (!response?.records || response.error) throw Error('Could not read original settings. Original records are intact.');
    const additions: Record<string, any> = {};
    for (const [key, record] of Object.entries(response.records) as [string, any][]) {
      if (record?.version === 'v0.0.2' && key === `loopy-goopy:${record.media?.id}` && existing[key] === undefined) additions[key] = record;
    }
    await store.set(additions);
    const check = await store.get(Object.keys(additions));
    for (const key of Object.keys(additions)) {
      if (JSON.stringify(check[key]) !== JSON.stringify(additions[key])) throw Error('Could not verify saved settings. Original records are intact.');
    }
    await store.set({ [migrationMarker]: { completed: true, records: Object.keys(additions).length } });
  } finally { await chrome.offscreen.closeDocument(); }
}
