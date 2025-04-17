import { Field, state, updateInput } from "./brain";
import { storageKey } from "./storage";

// @ts-ignore
import lodash from "lodash"; // todo

export default function Notes() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div>notes: {storageKey}</div>
      <textarea
        defaultValue={state[Field.notes]}
        style={{ flexGrow: 1 }}
        onChange={(e) =>
          lodash.debounce(
            () => updateInput(Field.notes, e.target.value, false),
            100
          )()
        }
      ></textarea>
    </div>
  );
}
