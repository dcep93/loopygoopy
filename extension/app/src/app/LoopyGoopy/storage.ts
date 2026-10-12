import { CountInStyle, Field, type Config, type ConfigSansBookmarks, type MediaMetadata } from "./shared";
import { debugLog, debugWarn } from "./debug";

const version = "v0.0.2";
const storageKeyPrefix = "loopy-goopy:";
const LOG_SOURCE = "storage";

export var storageKey: string;
let mediaMetadata: MediaMetadata | undefined;
export function setStorageKey(_storageKey: string, metadata?: MediaMetadata) {
  storageKey = _storageKey;
  mediaMetadata = metadata;
  logStorage("setStorageKey", {
    storageKey,
    localStorageKey: getLocalStorageKey(),
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
  if (!mediaMetadata || mediaMetadata.id !== storageKey || !mediaMetadata.sourceUrl) {
    warnStorage("save skipped: media identity or source URL is missing", { storageKey });
    return;
  }
  if (!hasLocalStorage()) {
    warnStorage("save skipped: localStorage is unavailable", { storageKey });
    return;
  }
  const normalizedConfig = normalizeConfig(config);
  const serialized = JSON.stringify({ version, media: mediaMetadata, config: normalizedConfig });
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
  return loadFromRawValue(rawValue, getLocalStorageKey()).then((config) => {
    // Refresh source metadata without dropping a stored title or changing settings.
    const entry = parseStoredEntry(rawValue);
    if (entry?.version === version && entry.media?.id === storageKey && mediaMetadata) {
      mediaMetadata = {
        ...entry.media,
        ...mediaMetadata,
        sourceUrl: mediaMetadata.sourceUrl || entry.media.sourceUrl,
        title: mediaMetadata.title || entry.media.title,
      };
      save(config);
    }
    return config;
  });
}

function loadFromRawValue(
  rawValue: string | null,
  loadedFromStorageKey: string
): Promise<Config> {
  if (rawValue === null) {
    logStorage("load missing entry", {
      storageKey,
      loadedFromStorageKey,
      expectedVersion: version,
    });
    return Promise.resolve(normalizeConfig({}));
  }
  const storedEntry = parseStoredEntry(rawValue);
  if (storedEntry?.version !== version || storedEntry.media?.id !== storageKey) {
    warnStorage("load version mismatch", {
      storageKey,
      loadedFromStorageKey,
      expectedVersion: version,
      actualVersion: storedEntry?.version,
    });
    return Promise.resolve(normalizeConfig({}));
  }
  const normalizedConfig = normalizeConfig(storedEntry.config);
  logStorage("load ok", {
    storageKey,
    loadedFromStorageKey,
    config: describeConfig(normalizedConfig),
  });
  return Promise.resolve(normalizedConfig);
}

function getLocalStorageKey() {
  return `${storageKeyPrefix}${storageKey}`;
}

function parseStoredEntry(rawValue: string | null) {
  if (!rawValue) return undefined;
  try {
    const loaded = JSON.parse(rawValue);
    return loaded && typeof loaded === "object"
      ? (loaded as { version?: string; media?: MediaMetadata; config?: unknown })
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
