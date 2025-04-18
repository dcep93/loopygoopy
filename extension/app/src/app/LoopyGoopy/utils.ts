import React from "react";
import { Field } from "./contentScript";
import { load } from "./storage";

var _refs: { [field: string]: React.RefObject<HTMLInputElement> };
export function getRefs() {
  if (!_refs) {
    _refs = Object.fromEntries(
      Object.keys(Field)
        .map((k) => parseInt(k))
        .filter((k) => !Number.isNaN(k))
        .map((k) => [k, React.createRef() as React.RefObject<HTMLInputElement>])
    );
  }
  return _refs;
}

var _config: { [f in Field]: string };
export function getConfig(reset: boolean = false) {
  if (reset || !_config) {
    _config = load() || {};
  }
  return _config;
}
