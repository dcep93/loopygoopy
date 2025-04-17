import ActionButton from "./LoopyGoopy/ActionButton";
import { Action, Field } from "./LoopyGoopy/Brain";
import Input from "./LoopyGoopy/Input";
import Notes from "./LoopyGoopy/Notes";
import Tap from "./LoopyGoopy/Tap";

const padding = <div style={{ width: "2em" }}></div>;

export default function Main() {
  return (
    <div
      style={{
        display: "inline-flex",
        backgroundColor: "#aaaaaa",
        padding: "0.5em",
      }}
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
      <div>
        <Notes />
      </div>
    </div>
  );
}
