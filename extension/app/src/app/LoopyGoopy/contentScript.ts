export enum MessageType {
  start,
  stop,
  init,
}

export enum Field {
  original_BPM,
  beats_per_loop,
  count__in_beats,
  count__in_style,
  tempo_change,
  train_target,
  train_loops,
  start_time,
  end_time,
  notes,
}

export enum CountInStyle {
  track,
  silent,
  metronome,
}

export type ConfigType = { [f in Field]: string };

const START_SLEEP_MS = 1000;

var _state: {
  element: HTMLVideoElement | HTMLAudioElement | null;
  timeout: NodeJS.Timeout | undefined;
  config: ConfigType | undefined;
  iter: number;
};

declare global {
  interface Window {
    chrome: any;
  }
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: (payload: { config: ConfigType }) =>
    Promise.resolve()
      .then(() => (_state.config = payload.config))
      .then(() => sleepPromise(START_SLEEP_MS))
      .then(countIn),
  [MessageType.stop]: () =>
    Promise.resolve()
      .then(() => (_state.config = undefined))
      .then(() => clearTimeout(_state.timeout)),
  [MessageType.init]: () => Promise.resolve().then(init),
};

function listenForMessage(
  f: (data: any, sendResponse: (sendData: any) => void) => void
) {
  window.chrome.runtime.onMessage.addListener(
    (data: any, _sender: any, sendResponse: (sendData: any) => void) => {
      f(data, sendResponse);
    }
  );
}

function activate() {
  listenForMessage((data: { mType: MessageType; payload: any }, sendResponse) =>
    Promise.resolve(data.payload)
      .then(messageTasks[data.mType])
      .then(sendResponse)
      .catch((e) => {
        alert(e);
        throw e;
      })
  );
}

function sleepPromise(sleepMs: number) {
  return new Promise((resolve) => setTimeout(resolve, sleepMs));
}

if (window.exports) activate();

//

function init() {
  return Promise.resolve()
    .then(() =>
      _state?.config !== undefined
        ? null
        : Promise.resolve().then(() => {
            _state = {
              element:
                document.getElementsByTagName("video")[0] ||
                document.getElementsByTagName("audio")[0] ||
                null,
              timeout: undefined,
              config: undefined,
              iter: 0,
            };
          })
    )
    .then(() =>
      _state.element === null
        ? undefined
        : {
            success: true,
            mediaId: `${document.title}-${
              window.location.host ||
              (Array.from(_state.element.children)[0] as HTMLSourceElement).src
            }-${_state.element.duration}`,
          }
    );
}

function countIn() {
  const config = _state.config;
  if (config === undefined) throw new Error("countIn.config.undefined");
  const bpm = getBpm();
  if (!(bpm > 0)) throw new Error("countIn.bpm.zero");
  const countInBeats = parseFloat(config[Field.count__in_beats]);
  return Promise.resolve()
    .then(() =>
      !(countInBeats > 0) ||
      parseFloat(config[Field.count__in_style]) === CountInStyle.track
        ? null
        : {
            [CountInStyle.silent]: () =>
              sleepPromise((countInBeats * 60 * 1000) / bpm),
          }
    )
    .then(start);
}

function getBpm(): number {
  return 0; // todo
}

function start() {
  // todo
}
