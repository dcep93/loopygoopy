import type { RefObject } from "react";
import { Action, actionButtonF } from "./ActionButton";
import getTab from "./getTab";
import { CountInStyle, Field, MessageType } from "./shared";
import { save } from "./storage";
import { getConfig, getConfigSansBookmarks, getRefs } from "./utils";
import { debugLog } from "./debug";

const countInStyleOptions = [
  CountInStyle.track,
  CountInStyle.silent,
  CountInStyle.metronome,
];
const LOG_SOURCE = "input";

export default function Input(props: { field: Field }) {
  const ref = getRefs()[props.field];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <div>
        {Field[props.field].replaceAll("__", "-").replaceAll("_", " ")}:
      </div>
      <div style={{ width: "6em", paddingLeft: "0.5em" }}>
        {props.field === Field.count__in_style ? (
          <select
            ref={ref as RefObject<HTMLSelectElement>}
            style={{ width: "100%" }}
            defaultValue={getConfig()[props.field] ?? CountInStyle.track.toString()}
            onChange={(e) => handleInputChange(props.field, e.target.value)}
          >
            {countInStyleOptions
              .map((k) => (
                <option key={k} value={k.toString()}>
                  {CountInStyle[k]}
                </option>
              ))}
          </select>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              actionButtonF(Action.start);
            }}
          >
            <input
              ref={ref as RefObject<HTMLInputElement>}
              style={{ width: "100%" }}
              onChange={(e) => handleInputChange(props.field, e.target.value)}
              defaultValue={getConfig()[props.field]}
            ></input>
          </form>
        )}
      </div>
    </div>
  );
}

function handleInputChange(field: Field, valueStr: string) {
  logInput("onChange", { field: Field[field], value: valueStr });
  updateInput(field, valueStr, false);
}

export function updateInput(
  field: Field,
  valueStr: string,
  isRecursive: boolean
) {
  const config = getConfig();
  if (config[field] === valueStr) {
    logInput("unchanged", { field: Field[field], value: valueStr, isRecursive });
    return;
  }
  logInput("update", {
    field: Field[field],
    previousValue: config[field],
    nextValue: valueStr,
    isRecursive,
  });
  if (!(parseFloat(valueStr) < Number.POSITIVE_INFINITY)) {
    if (valueStr === "") {
      delete config[field];
      logInput("delete empty field", { field: Field[field] });
      save(config);
    }
    if (![Field.count__in_style, Field.notes].includes(field)) {
      logInput("ignored nonnumeric field", { field: Field[field], value: valueStr });
      return;
    }
  }
  config[field] = valueStr;
  save(config);
  if (field === Field.start_time) {
    seekToStartTime(valueStr);
  }
  if (isRecursive) {
    getRefs()[field].current.value = valueStr;
    return;
  }
  const numberConfig = getNumberConfig();
  switch (field) {
    case Field.original_BPM:
    case Field.beats_per_loop:
      updateInput(
        Field.end_time,
        (
          (numberConfig[Field.beats_per_loop] * 60) /
            numberConfig[Field.original_BPM] +
          (numberConfig[Field.start_time] || 0)
        ).toFixed(2),
        true
      );
      break;
    case Field.start_time:
      updateInput(
        Field.end_time,
        (
          (numberConfig[Field.beats_per_loop] * 60) /
            numberConfig[Field.original_BPM] +
          (numberConfig[Field.start_time] || 0)
        ).toFixed(2),
        true
      );
      break;
    case Field.end_time:
      updateInput(
        Field.beats_per_loop,
        (
          ((numberConfig[Field.end_time] -
            (numberConfig[Field.start_time] || 0)) *
            numberConfig[Field.original_BPM]) /
          60
        ).toFixed(2),
        true
      );
      break;
  }
}

function logInput(message: string, details?: Record<string, unknown>) {
  debugLog(LOG_SOURCE, message, details);
}

function seekToStartTime(valueStr: string) {
  const time = parseFloat(valueStr);
  if (!Number.isFinite(time)) {
    logInput("seek skipped invalid start time", { value: valueStr });
    return;
  }
  const data = {
    mType: MessageType.seek,
    payload: { time },
  };
  getTab({ suppressAlert: true })
    .then((tab) => {
      logInput("seek start time", { time, tabId: tab?.id });
      if (tab?.id !== undefined && window.chrome?.tabs?.sendMessage) {
        window.chrome.tabs.sendMessage(tab.id, data, () => {
          void window.chrome?.runtime?.lastError;
        });
        return;
      }
      if (window.chrome?.runtime?.sendMessage) {
        window.chrome.runtime.sendMessage(data, () => {
          void window.chrome?.runtime?.lastError;
        });
      }
    })
    .catch((error) => {
      logInput("seek skipped", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
}

export function getNumberConfig() {
  return Object.fromEntries(
    Object.entries(getConfigSansBookmarks())
      .map(([k, v]) => ({ k, v: parseFloat(v) }))
      .filter(({ v }) => !Number.isNaN(v))
      .map(({ k, v }) => [k, v])
  );
}
