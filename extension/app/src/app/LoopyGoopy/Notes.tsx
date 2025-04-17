import { Field, getRefs, getState, updateInput } from "./brain";
import { storageKey } from "./storage";

// @ts-ignore
import { debounce } from "lodash"; // todo

export default function Notes() {
  const debouncer = debounce(
    () => updateInput(Field.notes, getRefs()[Field.notes].current.value, false),
    100,
    { leading: true, trailing: true }
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div>notes: {storageKey}</div>
      <textarea
        ref={
          getRefs()[
            Field.notes
          ] as unknown as React.RefObject<HTMLTextAreaElement>
        }
        defaultValue={getState()[Field.notes]}
        style={{ flexGrow: 1 }}
        onChange={debouncer}
      ></textarea>
    </div>
  );
}
