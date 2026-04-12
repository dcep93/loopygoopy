import { CountInStyle, Field, type Config, type ConfigSansBookmarks } from "./shared";

const version = "v0.0.1";

export var storageKey: string;
export function setStorageKey(_storageKey: string) {
  storageKey = _storageKey;
}

function normalizeConfigSansBookmarks(config: Record<string, unknown>): ConfigSansBookmarks {
  const normalizedConfig: ConfigSansBookmarks = {};
  const resolveFieldKey = (key: string): Field | undefined => {
    const keyAsNumber = parseInt(key, 10);
    if (!Number.isNaN(keyAsNumber) && Field[keyAsNumber] !== undefined) {
      return keyAsNumber as Field;
    }
    const namedField = (Field as unknown as Record<string, number>)[key];
    return namedField === undefined ? undefined : (namedField as Field);
  };
  Object.entries(config).forEach(([key, value]) => {
    if (key === "bookmarks" || typeof value !== "string") return;
    const field = resolveFieldKey(key);
    if (field === undefined) return;
    if (
      field === Field.count__in_style &&
      CountInStyle[value as keyof typeof CountInStyle] !== undefined
    ) {
      normalizedConfig[field] = CountInStyle[
        value as keyof typeof CountInStyle
      ].toString();
      return;
    }
    normalizedConfig[field] = value;
  });
  return normalizedConfig;
}

export function normalizeConfig(config: unknown): Config {
  const loadedConfig =
    config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  const { bookmarks, ...configSansBookmarks } = loadedConfig;
  return {
    ...normalizeConfigSansBookmarks(configSansBookmarks),
    bookmarks: Array.isArray(bookmarks)
      ? bookmarks
          .filter(
            (bookmark): bookmark is { bookmark_name: unknown; config: unknown } =>
              Boolean(bookmark) && typeof bookmark === "object"
          )
          .map((bookmark) => ({
            bookmark_name:
              typeof bookmark.bookmark_name === "string" ? bookmark.bookmark_name : "",
            config:
              bookmark.config && typeof bookmark.config === "object"
                ? normalizeConfigSansBookmarks(
                    bookmark.config as Record<string, unknown>
                  )
                : {},
          }))
      : [],
  };
}

export function save(config: Config) {
  if (storageKey === undefined || !window.chrome.storage) return;
  window.chrome.storage.sync.set({
    [storageKey]: { version, config: normalizeConfig(config) },
  });
}

export function load(): Promise<Config> {
  if (!window.chrome.storage) return Promise.resolve(normalizeConfig({}));
  return new Promise((resolve) =>
    window.chrome.storage.sync.get(storageKey, (result: any) => {
      const loaded = result[storageKey];
      resolve(loaded?.version === version ? normalizeConfig(loaded.config) : normalizeConfig({}));
    })
  );
}
