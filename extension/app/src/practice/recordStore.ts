const backend = () => window.chrome?.storage?.local;
export async function readRecord(key: string): Promise<string | null> {
  if (!backend()) return localStorage.getItem(key);
  const value = (await backend().get(key))[key];
  return value ? JSON.stringify(value) : null;
}
export function writeRecord(key: string, serialized: string): Promise<void> {
  if (!backend()) { localStorage.setItem(key, serialized); return Promise.resolve(); }
  const value = JSON.parse(serialized);
  return backend().set({ [key]: value });
}
