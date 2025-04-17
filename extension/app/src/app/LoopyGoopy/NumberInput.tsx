import { CountInStyle, Field, fields, updateInput } from "./Brain";

export default function NumberInput(props: { field: Field }) {
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
            defaultValue={CountInStyle[fields[props.field].value]}
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
            ref={fields[props.field].ref}
            style={{ width: "100%" }}
            onChange={(e) => updateInput(props.field, e.target.value, false)}
            defaultValue={fields[props.field].value}
          ></input>
        )}
      </div>
    </div>
  );
}
