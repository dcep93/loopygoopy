import React from "react";

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

export const fields = Object.fromEntries(
  Object.keys(Field)
    .map((k) => parseInt(k))
    .filter((k) => !Number.isNaN(k))
    .map((k) => [
      k,
      {
        ref: React.createRef() as React.RefObject<HTMLInputElement>,
        value: Math.random(), // todo
      },
    ])
);

export function updateInput(
  field: Field,
  _value: string,
  isRecursive: boolean
) {
  const value = parseFloat(_value);
  if (!(value < Number.POSITIVE_INFINITY)) return;
  fields[field].value = value;
  if (isRecursive) {
    fields[field].ref.current.value = _value;
    return;
  } // todo
}

export function actionButton(action: Action) {} // todo
