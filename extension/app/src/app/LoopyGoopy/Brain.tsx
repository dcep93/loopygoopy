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

export const refs = Object.fromEntries(
  Object.keys(Field)
    .map((k) => parseInt(k))
    .filter((k) => !Number.isNaN(k))
    .map((k) => [k, React.createRef() as React.RefObject<HTMLInputElement>])
);

export const state: { [f in Field]: number } = load() || {};

export function updateInput(
  field: Field,
  valueStr: string,
  isRecursive: boolean
) {
  const value = parseFloat(valueStr);
  if (!(value < Number.POSITIVE_INFINITY)) return;
  state[field] = value;
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
          (state[Field.beats_per_loop] * 60) / state[Field.original_BPM] +
          state[Field.start_time]
        ).toFixed(2),
        true
      );
      break;
    case Field.end_time:
      updateInput(
        Field.beats_per_loop,
        (
          ((state[Field.end_time] - state[Field.start_time]) *
            state[Field.original_BPM]) /
          60
        ).toFixed(2),
        true
      );
      break;
  }
}

export function actionButton(action: Action) {} // todo
