import { CountInStyle, Field, getRefs, getState, updateInput } from "./utils";

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
