import React from "react";
import { load } from "./storage";

export enum Field {
  original_BPM,
  beats_per_loop,
  count__in_beats,
  count__in_style,
  tempo_change,
  train_target,
  train_loops,
  start_time,
  end_time,
  notes,
}

export enum CountInStyle {
  track,
  silent,
  metronome,
}

export enum Action {
  start,
  stop,
  next,
  previous,
}

var refs: { [field: string]: React.RefObject<HTMLInputElement> };
export function getRefs() {
  if (!refs) {
    refs = Object.fromEntries(
      Object.keys(Field)
        .map((k) => parseInt(k))
        .filter((k) => !Number.isNaN(k))
        .map((k) => [k, React.createRef() as React.RefObject<HTMLInputElement>])
    );
  }
  return refs;
}

var state: { [f in Field]: string };
export function getState() {
  if (!state) {
    state = load() || {};
  }
  return state;
}

export function getNumberState() {
  return Object.fromEntries(
    Object.entries(getState())
      .map(([k, v]) => ({ k, v: parseFloat(v) }))
      .filter(({ v }) => !Number.isNaN(v))
      .map(({ k, v }) => [k, v])
  );
}
