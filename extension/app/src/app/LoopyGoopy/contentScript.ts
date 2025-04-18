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

declare global {
  interface Window {
    chrome: any;
  }
}

function listenForMessage(
  f: (data: any, sendResponse: (sendData: any) => void) => void
) {
  window.chrome.runtime.onMessage.addListener(
    (data: any, _sender: any, sendResponse: (sendData: any) => void) => {
      f(data, sendResponse);
    }
  );
}

var _state: {
  element: HTMLVideoElement | HTMLAudioElement | null;
  timeout: NodeJS.Timeout | undefined;
  config: ConfigType | undefined;
};

function getState(): Promise<typeof _state> {
  return Promise.resolve().then(() => ({
    element:
      document.getElementsByTagName("video")[0] ||
      document.getElementsByTagName("audio")[0] ||
      null,
    timeout: undefined,
    config: undefined,
  }));
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: (payload: { config: ConfigType }) =>
    Promise.resolve()
      .then(() => (_state.config = payload.config))
      .then(countIn),
  [MessageType.stop]: (payload) =>
    Promise.resolve()
      .then(() => (_state.config = undefined))
      .then(() => clearTimeout(_state.timeout)),
  [MessageType.init]: (payload: { tabId: number }) =>
    Promise.resolve()
      .then(() =>
        _state?.config !== undefined
          ? _state
          : Promise.resolve()
              .then(getState)
              .then((state) => {
                _state = state;
                return state;
              })
      )
      .then((state) =>
        state.element === null
          ? undefined
          : {
              success: true,
              mediaId: `${document.title}-${
                window.location.host ||
                (Array.from(state.element.children)[0] as HTMLSourceElement).src
              }-${state.element.duration}`,
            }
      ),
};

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

function countIn() {
  const config = _state.config;
  if (config === undefined) return;
  const bpm = getBpm();
  if (bpm === 0) {
    return;
  }
  const countInBeats = parseFloat(config[Field.count__in_beats]);
  if (countInBeats > 0) {
    _state.timeout = setTimeout(start, (countInBeats * 60 * 1000) / bpm);
  } else {
    start();
  }
}

function getBpm(): number {
  return 0; // todo
}

function start() {
  // todo
}

if (window.exports) activate();
