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
const DEFAULT_BPM = 60;

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
      .then(loop),
  [MessageType.stop]: () =>
    Promise.resolve()
      .then(() => (_state.config = undefined))
      .then(() => clearTimeout(_state.timeout))
      .then(() =>
        _state.element === null
          ? null
          : Promise.resolve()
              .then(() => _state.element!.pause())
              .then(() => (_state.element!.playbackRate = 1))
      )
      .then(() => (document.title = initialTitle)),
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

var initialTitle: string;

function activate() {
  initialTitle = document.title;
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
  if (!(sleepMs > 0)) return Promise.resolve();
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

function loop() {
  const config = _state.config;
  if (config === undefined) throw new Error("loop.config.undefined");
  if (_state.element === null) throw new Error("loop.element.null");
  const startTime = Math.max(
    0,
    parseFloat(config[Field.start_time]) || Number.NEGATIVE_INFINITY
  );
  const endTime = Math.min(
    _state.element.duration,
    parseFloat(config[Field.start_time]) || Number.POSITIVE_INFINITY
  );
  if (endTime <= startTime) throw new Error("loop.startTime.endTime");
  const rawOriginalBPM = parseFloat(config[Field.original_BPM]);
  const playbackRate = 1; // todo
  _state.element.playbackRate = playbackRate;
  const countInMs =
    (parseFloat(config[Field.count__in_beats]) * 60 * 1000) / rawOriginalBPM > 0
      ? rawOriginalBPM
      : DEFAULT_BPM / playbackRate;
  document.title = `${(playbackRate * 100).toFixed(2)}% - ${initialTitle}`;
  return Promise.resolve().then(() =>
    ({
      [CountInStyle.metronome]: () => {
        throw new Error("loop.CountInStyle.metronome");
      },
      [CountInStyle.track]: () => sleepPromise(countInMs - startTime * 1000),
      [CountInStyle.silent]: () => sleepPromise(countInMs),
    }[parseInt(config[Field.count__in_style]) as CountInStyle]())
  ); // todo
}
