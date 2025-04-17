import ActionButton from "./LoopyGoopy/ActionButton";
import { Action, Field } from "./LoopyGoopy/Brain";
import Notes from "./LoopyGoopy/Notes";
import NumberInput from "./LoopyGoopy/NumberInput";
import Tap from "./LoopyGoopy/Tap";

const padding = <div style={{ width: "2em" }}></div>;

export default function Main() {
  return (
    <div
      style={{
        display: "inline-flex",
        backgroundColor: "#aaaaaa",
      }}
    >
      <div>
        <NumberInput field={Field.original_BPM} />
        <NumberInput field={Field.beats_per_loop} />
        <NumberInput field={Field.count__in_beats} />
        <NumberInput field={Field.count__in_style} />
      </div>
      {padding}
      <div>
        <NumberInput field={Field.start_time} />
        <NumberInput field={Field.end_time} />
        <Tap />
      </div>
      {padding}
      <div>
        <NumberInput field={Field.tempo_change} />
        <NumberInput field={Field.train_target} />
        <NumberInput field={Field.train_loops} />
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
