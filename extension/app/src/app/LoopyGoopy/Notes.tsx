import { updateInput } from "./Input";
import { storageKey } from "./storage";
import { Field, getRefs, getState } from "./utils";

// @ts-ignore
import { debounce } from "lodash"; // todo

export default function Notes() {
  const ref = getRefs()[
    Field.notes
  ] as unknown as React.RefObject<HTMLTextAreaElement>;
  const debouncer = debounce(
    () => updateInput(Field.notes, ref.current.value, false),
    100,
    { leading: true, trailing: true }
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div>notes: {storageKey}</div>
      <textarea
        ref={ref}
        defaultValue={getState()[Field.notes]}
        style={{ flexGrow: 1 }}
        onChange={debouncer}
      ></textarea>
    </div>
  );
}
