import { Action, actionButton } from "./brain";

export default function ActionButton(props: { action: Action }) {
  return (
    <div>
      <button onClick={() => actionButton(props.action)}>
        {Action[props.action]}
      </button>
    </div>
  );
}
