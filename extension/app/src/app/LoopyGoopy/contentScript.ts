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
  silent,
  track,
  metronome,
}

export type NumberConfigType = { [f in Field]?: number };

const START_SLEEP_MS = 1000;
const DEFAULT_BPM = 60;

var _state: {
  element: HTMLVideoElement | HTMLAudioElement;
  config: NumberConfigType | undefined;
  iter: number;
  loopId: number;
};

declare global {
  interface Window {
    chrome: any;
  }
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: (payload: { config: NumberConfigType }) =>
    _state === undefined
      ? Promise.resolve().then(() => {
          alert("messageTasks.start._state.undefined"); // todo
        })
      : Promise.resolve(Math.random()).then((loopId) =>
          Promise.resolve()
            .then(() => Object.assign(_state, { ...payload, loopId, iter: 0 }))
            .then(() => _state.element.pause())
            .then(() => sleepPromise(START_SLEEP_MS))
            .then(() => loop(loopId))
        ),
  [MessageType.stop]: () =>
    Promise.resolve()
      .then(() => (_state.loopId = -1))
      .then(() =>
        Promise.resolve()
          .then(() => _state.element.pause())
          .then(() => (_state.element.playbackRate = 1))
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
                document.getElementsByTagName("audio")[0],
              config: undefined,
              iter: -1,
              loopId: -1,
            };
          })
    )
    .then(() =>
      !_state.element
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

function loop(loopId: number): Promise<void> {
  if (_state.loopId !== loopId) return Promise.resolve();
  _state.element.pause();
  const config = _state.config!;
  const rawOriginalBPM = config[Field.original_BPM];
  const bpm = rawOriginalBPM! > 0 ? rawOriginalBPM! : DEFAULT_BPM;
  const tempoChange = config[Field.tempo_change] || 1;
  const trainTarget = config[Field.train_target] || tempoChange;
  const playbackRate =
    _state.iter < (config[Field.train_loops] || 1)
      ? tempoChange +
        (_state.iter++ / (config[Field.train_loops] || 1)) *
          (trainTarget - tempoChange)
      : trainTarget;
  _state.element.playbackRate = playbackRate;
  const countInS =
    ((config[Field.count__in_beats] || 0) * 60) / bpm / playbackRate;
  const rawStartTime = Math.max(
    0,
    config[Field.start_time] || Number.NEGATIVE_INFINITY
  );
  const startTime =
    config[Field.count__in_style] === CountInStyle.track
      ? Math.max(0, rawStartTime - countInS)
      : rawStartTime;
  _state.element.currentTime = startTime;
  const rawEndTime = config[Field.end_time] || _state.element.duration;
  const endTime =
    rawEndTime > rawStartTime ? rawEndTime : _state.element.duration;
  document.title = `${(playbackRate * 100).toFixed(2)}% - ${initialTitle}`;
  return Promise.resolve()
    .then(() =>
      ({
        [CountInStyle.silent]: () => sleepPromise(countInS * 1000),
        [CountInStyle.track]: () =>
          sleepPromise((countInS - rawStartTime) * 1000),
        [CountInStyle.metronome]: () => {
          throw new Error("loop.CountInStyle.metronome");
        },
      }[(config[Field.count__in_style] || 0) as CountInStyle]())
    )
    .then(() => _state.element.play())
    .then(() => sleepPromise(((endTime - startTime) * 1000) / playbackRate))
    .then(() => loop(loopId));
}
