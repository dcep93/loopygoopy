import React from "react";
import { load, save } from "./storage";

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

export function updateInput(
  field: Field,
  valueStr: string,
  isRecursive: boolean
) {
  if (state[field] === valueStr) return;
  const value = parseFloat(valueStr);
  if (!(value < Number.POSITIVE_INFINITY)) {
    if (valueStr === "") {
      delete state[field];
      save(state);
    }
    if (![Field.count__in_style, Field.notes].includes(field)) return;
  }
  state[field] = valueStr;
  save(state);
  if (isRecursive) {
    refs[field].current.value = valueStr;
    return;
  }
  switch (field) {
    case Field.original_BPM:
    case Field.beats_per_loop:
      updateInput(
        Field.end_time,
        (
          (parseFloat(state[Field.beats_per_loop]) * 60) /
            parseFloat(state[Field.original_BPM]) +
          parseFloat(state[Field.start_time])
        ).toFixed(2),
        true
      );
      break;
    case Field.end_time:
      updateInput(
        Field.beats_per_loop,
        (
          ((parseFloat(state[Field.end_time]) -
            parseFloat(state[Field.start_time])) *
            parseFloat(state[Field.original_BPM])) /
          60
        ).toFixed(2),
        true
      );
      break;
  }
}

export function actionButton(action: Action) {} // todo
