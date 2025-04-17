import { Field, refs, state, updateInput } from "./brain";
import { storageKey } from "./storage";

// @ts-ignore
import { debounce } from "lodash"; // todo

export default function Notes() {
  const debouncer = debounce(
    () => updateInput(Field.notes, refs[Field.notes].current.value, false),
    100,
    { leading: true, trailing: true }
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div>notes: {storageKey}</div>
      <textarea
        ref={
          refs[Field.notes] as unknown as React.RefObject<HTMLTextAreaElement>
        }
        defaultValue={state[Field.notes]}
        style={{ flexGrow: 1 }}
        onChange={debouncer}
      ></textarea>
    </div>
  );
}
