import { useEffect, useState } from "react";
import ActionButton, { Action } from "./LoopyGoopy/ActionButton";
import { Field } from "./LoopyGoopy/contentScript";
import getTab from "./LoopyGoopy/getTab";
import Input from "./LoopyGoopy/Input";
import Notes from "./LoopyGoopy/Notes";
import { setStorageKey, storageKey } from "./LoopyGoopy/storage";
import Tap from "./LoopyGoopy/Tap";
import { loadConfig } from "./LoopyGoopy/utils";

const padding = <div style={{ width: "1em" }}></div>;

export default function Main() {
  const [_storageKey, updateStorageKey] = useState(storageKey);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {
    getTab()
      .then((tab) => tab?.mediaId || "Main.tab.mediaId.empty")
      .then((storageKey) =>
        Promise.resolve()
          .then(() => setStorageKey(storageKey))
          .then(loadConfig)
          .then(() => updateStorageKey(storageKey))
      );
  }, []);
  return (
    <div
      style={{
        width: "800px", // popup.html width
        backgroundColor: "#aaaaaa",
      }}
    >
      <div
        style={{
          display: "flex",
          padding: "0.5em",
        }}
        key={_storageKey}
      >
        <div>
          <Input field={Field.original_BPM} />
          <Input field={Field.beats_per_loop} />
          <Input field={Field.count__in_beats} />
          <Input field={Field.count__in_style} />
        </div>
        {padding}
        <div>
          <Input field={Field.start_time} />
          <Input field={Field.end_time} />
          <Tap />
        </div>
        {padding}
        <div>
          <Input field={Field.tempo_change} />
          <Input field={Field.train_target} />
          <Input field={Field.train_loops} />
        </div>
        {padding}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <ActionButton action={Action.start} />
          <ActionButton action={Action.stop} />
          <ActionButton action={Action.next} />
          <ActionButton action={Action.previous} />
        </div>
        {padding}
        <div
          style={{
            flexGrow: 1,
          }}
        >
          <Notes />
        </div>
      </div>
    </div>
  );
}
