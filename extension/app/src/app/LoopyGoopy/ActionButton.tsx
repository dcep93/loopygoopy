import { Action, actionButton } from "./Brain";

export default function ActionButton(props: { action: Action }) {
  return (
    <div>
      <button onClick={() => actionButton(props.action)}>
        {Action[props.action]}
      </button>
    </div>
  );
}
