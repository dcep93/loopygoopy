let migration: Promise<void> | undefined;
const backend = () => window.chrome?.storage?.local;
export function transferRecords(): Promise<void> {
  if (!backend()) return Promise.resolve();
  if (migration) return migration;
  migration = Promise.resolve(window.chrome.runtime.sendMessage({ type: 'ensure-record-transfer' })).then((response: any) => {
    if (!response?.ok) throw Error(response?.error || 'Could not preserve saved settings. Original records are intact.');
  }).catch((error: unknown) => { migration = undefined; throw error; });
  return migration;
}
export async function readRecord(key: string): Promise<string | null> {
  if (!backend()) return localStorage.getItem(key);
  await transferRecords();
  const value = (await backend().get(key))[key];
  return value ? JSON.stringify(value) : null;
}
export function writeRecord(key: string, serialized: string): Promise<void> {
  if (!backend()) { localStorage.setItem(key, serialized); return Promise.resolve(); }
  const value = JSON.parse(serialized);
  return transferRecords().then(() => backend().set({ [key]: value }));
}
