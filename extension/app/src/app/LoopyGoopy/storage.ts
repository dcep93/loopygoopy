// todo
// initialize listener
// get tabid, mediaid
// fetch from storage
const version = "v0.0.1";

export var storageKey: string;
export function setStorageKey(_storageKey: string) {
  storageKey = _storageKey;
}

export function save(state: any) {
  if (storageKey === undefined) return;
  localStorage.setItem(storageKey, JSON.stringify({ version, state }));
}

export function load() {
  if (storageKey === undefined) return null;
  try {
    const s = localStorage.getItem(storageKey);
    if (s === null) return null;
    const loaded = JSON.parse(s);
    if (loaded.version === version) return loaded.state;
    return null;
  } catch (e) {
    console.error(e);
    return null;
  }
}
