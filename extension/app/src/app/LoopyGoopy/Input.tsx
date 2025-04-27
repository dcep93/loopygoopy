import { Action, actionButtonF } from "./ActionButton";
import { CountInStyle, Field } from "./contentScript";
import { save } from "./storage";
import { getConfig, getRefs } from "./utils";

export default function Input(props: { field: Field }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div>
        {Field[props.field].replaceAll("__", "-").replaceAll("_", " ")}:
      </div>
      <div style={{ width: "6em", paddingLeft: "0.5em" }}>
        {props.field === Field.count__in_style ? (
          <select
            style={{ width: "100%" }}
            defaultValue={getConfig()[props.field]}
            onChange={(e) =>
              updateInput(
                props.field,
                CountInStyle[e.target.value as unknown as number].toString(),
                false
              )
            }
          >
            {Object.keys(CountInStyle)
              .map((k) => parseInt(k))
              .filter((k) => !Number.isNaN(k))
              .filter((k) => k !== CountInStyle.metronome) // todo
              .map((k) => (
                <option key={k}>{CountInStyle[k]}</option>
              ))}
          </select>
        ) : (
          <input
            ref={getRefs()[props.field]}
            style={{ width: "100%" }}
            onChange={(e) => updateInput(props.field, e.target.value, false)}
            defaultValue={getConfig()[props.field]}
            onSubmit={() => actionButtonF(Action.start)}
          ></input>
        )}
      </div>
    </div>
  );
}

export function updateInput(
  field: Field,
  valueStr: string,
  isRecursive: boolean
) {
  const config = getConfig();
  if (config[field] === valueStr) return;
  if (!(parseFloat(valueStr) < Number.POSITIVE_INFINITY)) {
    if (valueStr === "") {
      delete config[field];
      save(config);
    }
    if (![Field.count__in_style, Field.notes].includes(field)) return;
  }
  config[field] = valueStr;
  save(config);
  if (isRecursive) {
    getRefs()[field].current.value = valueStr;
    return;
  }
  const numberConfig = getNumberConfig();
  switch (field) {
    case Field.original_BPM:
    case Field.beats_per_loop:
      updateInput(
        Field.end_time,
        (
          (numberConfig[Field.beats_per_loop] * 60) /
            numberConfig[Field.original_BPM] +
          (numberConfig[Field.start_time] || 0)
        ).toFixed(2),
        true
      );
      break;
    case Field.start_time:
      updateInput(
        Field.end_time,
        (
          (numberConfig[Field.beats_per_loop] * 60) /
            numberConfig[Field.original_BPM] +
          (numberConfig[Field.start_time] || 0)
        ).toFixed(2),
        true
      );
      break;
    case Field.end_time:
      updateInput(
        Field.beats_per_loop,
        (
          ((numberConfig[Field.end_time] -
            (numberConfig[Field.start_time] || 0)) *
            numberConfig[Field.original_BPM]) /
          60
        ).toFixed(2),
        true
      );
      break;
  }
}

export function getNumberConfig() {
  return Object.fromEntries(
    Object.entries(getConfig())
      .map(([k, v]) => ({ k, v: parseFloat(v) }))
      .filter(({ v }) => !Number.isNaN(v))
      .map(({ k, v }) => [k, v])
  );
}
