import { readRecord, writeRecord } from './recordStore';

afterEach(() => { delete window.chrome; localStorage.clear(); });

test('reads and updates current bookmarks without importing old storage or contacting the worker', async () => {
  const key = 'loopy-goopy:youtube:O_vU27GXPpk';
  const record = { version: 'v0.0.2', config: { bookmarks: [{ bookmark_name: 'solo', config: { '7': '150' } }] } };
  const db: Record<string, any> = { [key]: record };
  localStorage.setItem(key, JSON.stringify({ old: true }));
  localStorage.setItem('old-only', JSON.stringify({ old: true }));
  window.chrome = {
    runtime: { sendMessage: jest.fn(() => { throw Error('Worker asleep'); }) },
    storage: { local: {
      get: jest.fn(async (k: string) => ({ [k]: db[k] })),
      set: jest.fn(async (values: any) => { Object.assign(db, values); }),
    } },
  };
  expect(JSON.parse((await readRecord(key))!)).toEqual(record);
  expect(await readRecord('old-only')).toBeNull();
  const updated = { ...record, config: { ...record.config, selected_bookmark: '0' } };
  await writeRecord(key, JSON.stringify(updated));
  expect(JSON.parse((await readRecord(key))!)).toEqual(updated);
  expect(localStorage.getItem(key)).toBe(JSON.stringify({ old: true }));
  expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
});

test('uses browser storage for the standalone development popup', async () => {
  const serialized = JSON.stringify({ config: { bookmarks: [] } });
  await writeRecord('test-record', serialized);
  expect(await readRecord('test-record')).toBe(serialized);
  expect(await readRecord('missing')).toBeNull();
});
