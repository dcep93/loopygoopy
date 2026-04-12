import React from "react";
import { CountInStyle, Field, type Config, type ConfigSansBookmarks } from "./shared";
import { load } from "./storage";

type InputElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
const fields = Object.keys(Field)
  .map((k) => parseInt(k, 10))
  .filter((k) => !Number.isNaN(k))
  .map((k) => k as Field);

var _refs: { [field: string]: React.RefObject<InputElement> };
export function getRefs() {
  if (!_refs) {
    _refs = Object.fromEntries(
      fields.map((field) => [
        field,
        React.createRef() as React.RefObject<InputElement>,
      ])
    );
  }
  return _refs;
}

export function loadConfig() {
  return load().then((config) => (_config = config));
}

var _config: Config;
export function getConfig(): Config {
  return _config || { bookmarks: [] };
}

export function getConfigSansBookmarks(): ConfigSansBookmarks {
  const { bookmarks: _bookmarks, ...configSansBookmarks } = getConfig();
  return configSansBookmarks;
}

export function setConfig(config: Config) {
  _config = config;
}

export function setConfigSansBookmarks(config: ConfigSansBookmarks) {
  _config = {
    ...config,
    bookmarks: getConfig().bookmarks,
  };
}

export function applyConfigSansBookmarks(config: ConfigSansBookmarks) {
  setConfigSansBookmarks(config);
  fields.forEach((field) => {
    const ref = getRefs()[field];
    if (!ref?.current) return;
    if (field === Field.count__in_style) {
      ref.current.value = config[field] ?? CountInStyle.silent.toString();
      return;
    }
    ref.current.value = config[field] ?? "";
  });
}
