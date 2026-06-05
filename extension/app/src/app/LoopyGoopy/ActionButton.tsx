import { Field, MessageType } from "./shared";
import getTab from "./getTab";
import { getNumberConfig, updateInput } from "./Input";

export enum Action {
  start,
  stop,
  next,
  previous,
}

export default function ActionButton(props: { action: Action }) {
  const shouldPreserveFocus =
    props.action === Action.next || props.action === Action.previous;
  const label = props.action === Action.previous ? "prev" : Action[props.action];

  return (
    <div>
      <button
        onMouseDown={shouldPreserveFocus ? (e) => e.preventDefault() : undefined}
        onPointerDown={shouldPreserveFocus ? (e) => e.preventDefault() : undefined}
        tabIndex={shouldPreserveFocus ? -1 : undefined}
        onClick={() => actionButtonF(props.action)}
      >
        {label}
      </button>
    </div>
  );
}

export function actionButtonF(action: Action) {
  const config = getNumberConfig();
  switch (action) {
    case Action.start:
    case Action.stop:
      sendMessage({
        mType: action === Action.start ? MessageType.start : MessageType.stop,
        payload: { config },
      });
      break;
    case Action.previous:
    case Action.next:
      const diff =
        (config[Field.beats_per_loop] * 60) / config[Field.original_BPM];
      const newStart =
        (config[Field.start_time] || 0) +
        diff * (action === Action.previous ? -1 : 1);
      updateInput(Field.start_time, newStart.toFixed(2), true);
      updateInput(Field.end_time, (newStart + diff).toFixed(2), true);
      break;
  }
}

function sendMessage(data: any) {
  getTab()
    .then((tab) => {
      if (tab?.id !== undefined) {
        window.chrome.tabs.sendMessage(tab.id, data);
      } else {
        window.chrome.runtime.sendMessage(
          data,
          (response: any) => response.alert && alert(response.alert)
        );
      }
    })
    .catch((e) => {
      alert(e);
      throw e;
    });
}
