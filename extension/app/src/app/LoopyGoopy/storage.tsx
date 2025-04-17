// todo
// initialize listener
// get tabid, mediaid
// fetch from storage
export const storageKey = "loopygoopy";
const version = "v0.0.1";

export function save(state: any) {
  localStorage.setItem(storageKey, JSON.stringify({ version, state }));
}

export function load() {
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
