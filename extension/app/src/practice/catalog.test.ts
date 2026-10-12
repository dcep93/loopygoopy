import { loadDefinition, catalogUrl, catalogKey, refreshInterval } from './catalog';
import { validCatalog } from './model';
import golden from './golden.json';
let db: Record<string, any>;
const other = { ...golden, mediaId: 'youtube:O_vU27GXPpk', sourceUrl: 'https://www.youtube.com/watch?v=O_vU27GXPpk', title: 'Test fixture' };
const catalog = (...videos: any[]) => ({ schemaVersion: 1, videos });
const response = (value: any) => ({ ok: true, json: async () => value });
beforeEach(() => {
  db = {};
  window.chrome = { storage: { local: { get: jest.fn(async (key: string) => ({ [key]: db[key] })), set: jest.fn(async (values: any) => Object.assign(db, values)) } } };
  global.fetch = jest.fn();
});
afterEach(() => { delete window.chrome; jest.useRealTimers(); });
test('downloads one catalog, matches locally, and reuses the fresh cache for another video', async () => {
  const value = catalog({ ...golden, revision: 2, firstBeat: 13 }, other);
  (fetch as jest.Mock).mockResolvedValue(response(value));
  expect((await loadDefinition(golden.mediaId)).definition?.firstBeat).toBe(13);
  expect((await loadDefinition(other.mediaId)).definition?.mediaId).toBe(other.mediaId);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(catalogUrl, expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }));
  expect(catalogUrl).not.toContain(golden.mediaId);expect(catalogUrl).not.toContain(other.mediaId);
  expect(db[catalogKey].catalog).toEqual(value);
});
test('offline sessions use the last valid cache, then bundled definitions when there is no cache', async () => {
  db[catalogKey] = { catalog: catalog({ ...golden, revision: 3 }), fetchedAt: 0 };
  (fetch as jest.Mock).mockRejectedValue(Error('Offline'));
  expect((await loadDefinition(golden.mediaId)).definition?.revision).toBe(3);
  delete db[catalogKey];
  expect((await loadDefinition(golden.mediaId)).definition).toEqual(golden);
});
test('rejects malformed catalogs atomically without overwriting a valid cache', async () => {
  const saved = { catalog: catalog({ ...golden, revision: 3 }), fetchedAt: 0 };
  db[catalogKey] = saved;
  for (const bad of [{}, { schemaVersion: 2, videos: [golden] }, catalog(golden, golden), catalog({ ...golden, bpm: 0 }), catalog({ ...golden, status: 'draft' }), catalog({ ...golden, sourceUrl: other.sourceUrl })]) {
    expect(validCatalog(bad)).toBe(false);
    (fetch as jest.Mock).mockResolvedValue(response(bad));
    expect((await loadDefinition(golden.mediaId)).definition?.revision).toBe(3);
    expect(db[catalogKey]).toBe(saved);
    expect(window.chrome.storage.local.set).not.toHaveBeenCalled();
  }
});
test('a successful catalog is authoritative for missing entries and never borrows another video timing', async () => {
  (fetch as jest.Mock).mockResolvedValue(response(catalog(other)));
  expect((await loadDefinition(golden.mediaId)).definition).toBeUndefined();
  expect((await loadDefinition('youtube:abcdefghijk')).definition).toBeUndefined();
});
test('failed HTTP responses fall back without caching the failure', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 404 });
  expect((await loadDefinition(golden.mediaId)).definition).toEqual(golden);
  expect((await loadDefinition(other.mediaId)).definition).toBeUndefined();
  expect(db[catalogKey]).toBeUndefined();
});
test('expired caches refresh and explicit retry bypasses the one-hour cache', async () => {
  db[catalogKey] = { catalog: catalog(golden), fetchedAt: Date.now() - refreshInterval - 1 };
  (fetch as jest.Mock).mockResolvedValue(response(catalog({ ...golden, revision: 2 })));
  expect((await loadDefinition(golden.mediaId)).definition?.revision).toBe(2);
  (fetch as jest.Mock).mockResolvedValue(response(catalog({ ...golden, revision: 3 })));
  expect((await loadDefinition(golden.mediaId)).definition?.revision).toBe(2);
  expect((await loadDefinition(golden.mediaId, true)).definition?.revision).toBe(3);
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('concurrent requests share one download but resolve their own video', async () => {
  let finish!: (value: any) => void;
  (fetch as jest.Mock).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const first = loadDefinition(golden.mediaId), second = loadDefinition(other.mediaId);
  await Promise.resolve();finish(response(catalog(golden, other)));
  expect((await first).definition?.mediaId).toBe(golden.mediaId);
  expect((await second).definition?.mediaId).toBe(other.mediaId);
  expect(fetch).toHaveBeenCalledTimes(1);
});
test('a timed-out request falls back and releases the pending request for retry', async () => {
  jest.useFakeTimers();
  (fetch as jest.Mock).mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(Error('Aborted')))));
  const result = loadDefinition(golden.mediaId);await Promise.resolve();jest.advanceTimersByTime(4000);
  expect((await result).definition).toEqual(golden);
  (fetch as jest.Mock).mockResolvedValue(response(catalog({ ...golden, revision: 4 })));
  expect((await loadDefinition(golden.mediaId, true)).definition?.revision).toBe(4);
});
