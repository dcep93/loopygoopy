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
    getRefs()[field].current.value = valueStr;
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
