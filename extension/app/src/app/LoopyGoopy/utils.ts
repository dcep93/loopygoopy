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

var _state: { [f in Field]: string };
export function getState(reset: boolean = false) {
  if (reset || !_state) {
    _state = load() || {};
  }
  return _state;
}
