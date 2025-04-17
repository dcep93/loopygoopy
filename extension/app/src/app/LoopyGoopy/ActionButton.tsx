import { MessageType } from "./contentScript";
import { updateInput } from "./Input";
import { sendMessage } from "./message";
import { Action, Field, getNumberState } from "./utils";

export default function ActionButton(props: { action: Action }) {
  return (
    <div>
      <button onClick={() => actionButton(props.action)}>
        {Action[props.action]}
      </button>
    </div>
  );
}

function actionButton(action: Action) {
  const state = getNumberState();
  switch (action) {
    case Action.start:
    case Action.stop:
      sendMessage({
        mType: action === Action.start ? MessageType.start : MessageType.stop,
        state,
      });
      break;
    case Action.previous:
    case Action.next:
      const diff =
        (state[Field.beats_per_loop] * 60) / state[Field.original_BPM];
      const newStart =
        state[Field.start_time] + diff * (action === Action.previous ? -1 : 1);
      updateInput(Field.start_time, newStart.toFixed(2), true);
      updateInput(Field.end_time, (newStart + diff).toFixed(2), true);
      break;
  }
}
