import { loadDefinition } from './catalog';
import golden from './golden.json';
let db: Record<string, any>;
beforeEach(() => {
  db = {};
  window.chrome = { storage: { local: { get: jest.fn(async (key: string) => ({ [key]: db[key] })), set: jest.fn(async (values: any) => Object.assign(db, values)) } } };
  global.fetch = jest.fn();
});
afterEach(() => { delete window.chrome; });
const response = (definition: any) => ({ ok: true, json: async () => ({ fields: Object.fromEntries(Object.entries(definition).map(([key, value]) => [key, typeof value === 'string' ? { stringValue: value } : { doubleValue: value }])) }) });
test('published remote definitions are validated and cached', async () => {
  (fetch as jest.Mock).mockResolvedValue(response({ ...golden, revision: 2, firstBeat: 13 }));
  const result = await loadDefinition(golden.mediaId);
  expect(result.definition?.revision).toBe(2);
  expect(db[`practice-catalog:${golden.mediaId}`].firstBeat).toBe(13);
});
test('offline sessions use the validated cache', async () => {
  db[`practice-catalog:${golden.mediaId}`] = { ...golden, revision: 3 };
  (fetch as jest.Mock).mockRejectedValue(Error('Offline'));
  expect((await loadDefinition(golden.mediaId)).definition?.revision).toBe(3);
});
test('mismatched or unpublished remote records cannot replace a valid guide', async () => {
  for (const patch of [{ mediaId: 'youtube:O_vU27GXPpk' }, { status: 'draft' }, { bpm: 0 }]) {
    (fetch as jest.Mock).mockResolvedValue(response({ ...golden, ...patch }));
    expect((await loadDefinition(golden.mediaId)).definition).toEqual(golden);
    expect(window.chrome.storage.local.set).not.toHaveBeenCalled();
  }
});
test('missing unprepared videos never borrow the golden video timing', async () => {
  (fetch as jest.Mock).mockResolvedValue({ status: 404 });
  expect((await loadDefinition('youtube:O_vU27GXPpk')).definition).toBeUndefined();
});
