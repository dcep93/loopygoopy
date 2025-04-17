import { Field, updateInput } from "./Brain";

export default function Tap() {
  return (
    <div>
      <div>determine BPM:</div>
      <button
        onClick={() =>
          Promise.resolve(tapAndGetBpm().toFixed(2)).then((bpm) =>
            Promise.resolve()
              .then(() => updateInput(Field.original_BPM, bpm, false))
              .then(() => updateInput(Field.original_BPM, bpm, true))
          )
        }
      >
        tap
      </button>
    </div>
  );
}

function tapAndGetBpm(): number {
  // todo
  return 102.7;
}
