const version = "v0.0.1";

export var storageKey: string;
export function setStorageKey(_storageKey: string) {
  storageKey = _storageKey;
}

export function save(config: any) {
  if (storageKey === undefined) return;
  window.chrome.storage.sync.set({
    [storageKey]: JSON.stringify({ version, config }),
  });
}

export function load() {
  return new Promise((resolve) =>
    window.chrome.storage.sync.get(storageKey, (result: string) => {
      var loaded: any = {};
      try {
        loaded = JSON.parse(result);
      } catch (e) {
        console.log(e);
      }
      if (loaded.version === version)
        resolve(loaded.version === version ? loaded.config : {});
    })
  );
}
