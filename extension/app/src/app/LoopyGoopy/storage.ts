const version = "v0.0.1";

export var storageKey: string;
export function setStorageKey(_storageKey: string) {
  storageKey = _storageKey;
}

export function save(config: any) {
  if (storageKey === undefined || !window.chrome.storage) return;
  window.chrome.storage.sync.set({
    [storageKey]: { version, config },
  });
}

export function load() {
  if (!window.chrome.storage) return Promise.resolve();
  return new Promise((resolve) =>
    window.chrome.storage.sync.get(storageKey, (result: any) => {
      const loaded = result[storageKey];
      if (loaded.version === version)
        resolve(loaded.version === version ? loaded.config : {});
    })
  );
}
