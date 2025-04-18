import { MessageType } from "./contentScript";
import getTab from "./getTab";
import { getNumberState, updateInput } from "./Input";
import { Action, Field } from "./utils";

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
        payload: { state },
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

function sendMessage(data: any) {
  getTab().then((tab) => {
    if (tab.id !== null) {
      window.chrome.tabs.sendMessage(tab.id, data);
    } else {
      window.chrome.runtime.sendMessage(
        data,
        (response: any) => response.alert && alert(response.alert)
      );
    }
  });
}
