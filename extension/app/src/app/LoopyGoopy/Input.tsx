import { save } from "./storage";
import { CountInStyle, Field, getRefs, getState } from "./utils";

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
      <div style={{ width: "8em", paddingLeft: "0.5em" }}>
        {props.field === Field.count__in_style ? (
          <select
            style={{ width: "100%" }}
            defaultValue={getState()[props.field]}
            onChange={(e) => updateInput(props.field, e.target.value, false)}
          >
            {Object.keys(CountInStyle)
              .map((k) => parseInt(k))
              .filter((k) => !Number.isNaN(k))
              .map((k) => (
                <option key={k}>{CountInStyle[k]}</option>
              ))}
          </select>
        ) : (
          <input
            ref={getRefs()[props.field]}
            style={{ width: "100%" }}
            onChange={(e) => updateInput(props.field, e.target.value, false)}
            defaultValue={getState()[props.field]}
          ></input>
        )}
      </div>
    </div>
  );
}

// todo pink when not sent
export function updateInput(
  field: Field,
  valueStr: string,
  isRecursive: boolean
) {
  const state = getState();
  if (state[field] === valueStr) return;
  const numberState = getNumberState();
  if (!(numberState[field] < Number.POSITIVE_INFINITY)) {
    if (valueStr === "") {
      delete state[field];
      save(state);
    }
    if (![Field.count__in_style, Field.notes].includes(field)) return;
  }
  state[field] = valueStr;
  save(state);
  if (isRecursive) {
    getRefs()[field].current.value = valueStr;
    return;
  }
  switch (field) {
    case Field.original_BPM:
    case Field.beats_per_loop:
      updateInput(
        Field.end_time,
        (
          (numberState[Field.beats_per_loop] * 60) /
            numberState[Field.original_BPM] +
          numberState[Field.start_time]
        ).toFixed(2),
        true
      );
      break;
    case Field.end_time:
      updateInput(
        Field.beats_per_loop,
        (
          ((numberState[Field.end_time] - numberState[Field.start_time]) *
            numberState[Field.original_BPM]) /
          60
        ).toFixed(2),
        true
      );
      break;
  }
}

export function getNumberState() {
  return Object.fromEntries(
    Object.entries(getState())
      .map(([k, v]) => ({ k, v: parseFloat(v) }))
      .filter(({ v }) => !Number.isNaN(v))
      .map(({ k, v }) => [k, v])
  );
}
