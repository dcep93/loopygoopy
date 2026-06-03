import { CountInStyle, Field, type Config, type ConfigSansBookmarks } from "./shared";
import { debugLog, debugWarn } from "./debug";

const version = "v0.0.1";
const storageKeyPrefix = "loopy-goopy:";
const configStorageKey = `${storageKeyPrefix}last-config`;
const LOG_SOURCE = "storage";

export var storageKey: string;
export function setStorageKey(_storageKey: string) {
  storageKey = _storageKey;
  logStorage("setStorageKey", {
    storageKey,
    localStorageKey: getLocalStorageKey(),
    legacyMediaStorageKey: getLegacyMediaStorageKey(),
  });
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
  const { bookmarks, selected_bookmark, ...configSansBookmarks } = loadedConfig;
  const normalizedBookmarks = Array.isArray(bookmarks)
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
    : [];
  const normalizedSelectedBookmark =
    typeof selected_bookmark === "string" &&
    selected_bookmark !== "" &&
    Number.isInteger(parseInt(selected_bookmark, 10)) &&
    normalizedBookmarks[parseInt(selected_bookmark, 10)] !== undefined
      ? selected_bookmark
      : "";
  return {
    ...normalizeConfigSansBookmarks(configSansBookmarks),
    bookmarks: normalizedBookmarks,
    selected_bookmark: normalizedSelectedBookmark,
  };
}

export function save(config: Config) {
  if (storageKey === undefined) {
    warnStorage("save skipped: storage key is undefined");
    return;
  }
  if (!hasLocalStorage()) {
    warnStorage("save skipped: localStorage is unavailable", { storageKey });
    return;
  }
  const normalizedConfig = normalizeConfig(config);
  const serialized = JSON.stringify({ version, config: normalizedConfig });
  try {
    window.localStorage.setItem(getLocalStorageKey(), serialized);
    logStorage("save ok", {
      storageKey,
      localStorageKey: getLocalStorageKey(),
      valueLength: serialized.length,
      config: describeConfig(normalizedConfig),
    });
  } catch (error) {
    // Browsers may deny localStorage in restricted contexts. Saving is best-effort.
    warnStorage("save failed", {
      storageKey,
      localStorageKey: getLocalStorageKey(),
      error: errorToMessage(error),
    });
  }
}

export function load(): Promise<Config> {
  if (storageKey === undefined) {
    warnStorage("load skipped: storage key is undefined");
    return Promise.resolve(normalizeConfig({}));
  }
  if (!hasLocalStorage()) {
    warnStorage("load skipped: localStorage is unavailable", { storageKey });
    return Promise.resolve(normalizeConfig({}));
  }
  const rawValue = readLocalStorageValue();
  logStorage("load raw", {
    storageKey,
    localStorageKey: getLocalStorageKey(),
    valueLength: rawValue?.length ?? 0,
    hasValue: rawValue !== null,
  });
  if (rawValue === null) {
    logStorage("load missing entry; trying legacy media key", {
      storageKey,
      localStorageKey: getLocalStorageKey(),
      legacyMediaStorageKey: getLegacyMediaStorageKey(),
      expectedVersion: version,
    });
    return loadFromRawValue(
      readLegacyMediaStorageValue(),
      getLegacyMediaStorageKey(),
      "legacy-media"
    );
  }
  return loadFromRawValue(rawValue, getLocalStorageKey(), "config");
}

function loadFromRawValue(
  rawValue: string | null,
  loadedFromStorageKey: string,
  source: "config" | "legacy-media"
): Promise<Config> {
  if (rawValue === null) {
    logStorage("load missing entry", {
      storageKey,
      loadedFromStorageKey,
      source,
      expectedVersion: version,
    });
    return Promise.resolve(normalizeConfig({}));
  }
  const storedEntry = parseStoredEntry(rawValue);
  if (storedEntry?.version !== version) {
    warnStorage("load version mismatch", {
      storageKey,
      loadedFromStorageKey,
      source,
      expectedVersion: version,
      actualVersion: storedEntry?.version,
    });
    return Promise.resolve(normalizeConfig({}));
  }
  const normalizedConfig = normalizeConfig(storedEntry.config);
  logStorage("load ok", {
    storageKey,
    loadedFromStorageKey,
    source,
    config: describeConfig(normalizedConfig),
  });
  return Promise.resolve(normalizedConfig);
}

function getLocalStorageKey() {
  return configStorageKey;
}

function getLegacyMediaStorageKey() {
  return `${storageKeyPrefix}${storageKey}`;
}

function parseStoredEntry(rawValue: string | null) {
  if (!rawValue) return undefined;
  try {
    const loaded = JSON.parse(rawValue);
    return loaded && typeof loaded === "object"
      ? (loaded as { version?: string; config?: unknown })
      : undefined;
  } catch (error) {
    warnStorage("parse failed", { error: errorToMessage(error) });
    return undefined;
  }
}

function hasLocalStorage() {
  try {
    return typeof window.localStorage !== "undefined";
  } catch (error) {
    warnStorage("localStorage access failed", { error: errorToMessage(error) });
    return false;
  }
}

function readLocalStorageValue() {
  try {
    return window.localStorage.getItem(getLocalStorageKey());
  } catch (error) {
    warnStorage("read failed", {
      storageKey,
      localStorageKey: getLocalStorageKey(),
      error: errorToMessage(error),
    });
    return null;
  }
}

function readLegacyMediaStorageValue() {
  try {
    return window.localStorage.getItem(getLegacyMediaStorageKey());
  } catch (error) {
    warnStorage("read legacy media key failed", {
      storageKey,
      legacyMediaStorageKey: getLegacyMediaStorageKey(),
      error: errorToMessage(error),
    });
    return null;
  }
}

function describeConfig(config: Config) {
  const {
    bookmarks,
    selected_bookmark: selectedBookmark,
    ...configSansBookmarks
  } = config;
  return {
    fieldCount: Object.keys(configSansBookmarks).length,
    fields: Object.keys(configSansBookmarks).map((key) => Field[parseInt(key, 10)] ?? key),
    bookmarkCount: bookmarks.length,
    selectedBookmark,
  };
}

function logStorage(message: string, details?: Record<string, unknown>) {
  debugLog(LOG_SOURCE, message, details);
}

function warnStorage(message: string, details?: Record<string, unknown>) {
  debugWarn(LOG_SOURCE, message, details);
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}
