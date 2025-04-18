import { Field } from "./contentScript";
import { updateInput } from "./Input";
import { storageKey } from "./storage";
import { getConfig, getRefs } from "./utils";

import { debounce } from "lodash";

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
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
      }}
    >
      <div style={{ overflow: "scroll", width: "100%" }}>
        <div style={{ textWrap: "nowrap", width: 0 }}>{storageKey}</div>
      </div>
      <textarea
        ref={ref}
        defaultValue={getConfig()[Field.notes]}
        style={{ flexGrow: 1 }}
        onChange={debouncer}
      ></textarea>
    </div>
  );
}
