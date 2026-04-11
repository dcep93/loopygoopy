enum MessageType {
  start,
  stop,
  init,
}

enum Field {
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

enum CountInStyle {
  silent,
  track,
  metronome,
}

type NumberConfigType = { [f in Field]?: number };

const START_SLEEP_MS = 1000;
const DEFAULT_BPM = 60;
const PAGE_PLAYBACK_SCRIPT_PATH = "app/src/app/LoopyGoopy/pagePlaybackBridge.js";
const PAGE_PLAYBACK_SCRIPT_ID = "loopy-goopy-page-playback-bridge";
const PAGE_PLAYBACK_REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
const PAGE_PLAYBACK_RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";

var _state: {
  element: HTMLVideoElement | HTMLAudioElement;
  config: NumberConfigType | undefined;
  iter: number;
  loopId: number;
  isPaused: boolean;
};

interface Window {
  chrome: any;
  __loopyGoopyPagePlaybackBridgePromise?: Promise<boolean>;
}

function isYouTubePage() {
  return window.location.host === "www.youtube.com";
}

function ensureYouTubePlaybackBridge() {
  if (!isYouTubePage()) return Promise.resolve(false);
  if (window.__loopyGoopyPagePlaybackBridgePromise) {
    return window.__loopyGoopyPagePlaybackBridgePromise;
  }
  window.__loopyGoopyPagePlaybackBridgePromise = new Promise<boolean>(
    (resolve) => {
      if (document.getElementById(PAGE_PLAYBACK_SCRIPT_ID)) {
        resolve(true);
        return;
      }

      const scriptUrl = window.chrome.runtime.getURL(PAGE_PLAYBACK_SCRIPT_PATH);
      const script = document.createElement("script");
      script.id = PAGE_PLAYBACK_SCRIPT_ID;
      script.src = scriptUrl;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      (document.head || document.documentElement).appendChild(script);
    }
  );
  return window.__loopyGoopyPagePlaybackBridgePromise;
}

function runYouTubePlaybackAction(
  action: "lock" | "unlock",
  playbackRate: number
) {
  return ensureYouTubePlaybackBridge().then((isBridgeLoaded) => {
    if (!isBridgeLoaded) return false;
    return new Promise<boolean>((resolve) => {
      const requestId = `LoopyGoopy.playbackRate.${Math.random()}`;
      let isSettled = false;
      const settle = (success: boolean) => {
        if (isSettled) return;
        isSettled = true;
        document.removeEventListener(
          PAGE_PLAYBACK_RESPONSE_EVENT,
          onResponse as EventListener
        );
        resolve(success);
      };
      const onResponse = (event: Event) => {
        const { detail } = event as CustomEvent<{
          requestId?: string;
          success?: boolean;
        }>;
        if (detail?.requestId !== requestId) return;
        settle(detail?.success === true);
      };
      document.addEventListener(
        PAGE_PLAYBACK_RESPONSE_EVENT,
        onResponse as EventListener
      );
      document.dispatchEvent(
        new CustomEvent(PAGE_PLAYBACK_REQUEST_EVENT, {
          detail: { action, playbackRate, requestId },
        })
      );
      window.setTimeout(() => settle(false), 250);
    });
  });
}

function lockYouTubePlaybackRate(playbackRate: number) {
  return runYouTubePlaybackAction("lock", playbackRate);
}

function unlockYouTubePlaybackRate(playbackRate: number) {
  return runYouTubePlaybackAction("unlock", playbackRate);
}

function setPlaybackRate(playbackRate: number) {
  return lockYouTubePlaybackRate(playbackRate).then((didUseYouTubeLock) => {
    if (!didUseYouTubeLock) {
      _state.element.playbackRate = playbackRate;
    }
  });
}

function pause() {
  return Promise.resolve()
    .then(() => (_state.isPaused = true))
    .then(() => _state.element.paused || _state.element.pause())
    .then(() => (_state.isPaused = false));
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: (payload: { config: NumberConfigType }) =>
    _state === undefined
      ? Promise.resolve().then(() => {
        alert("messageTasks.start._state.undefined"); // todo
      })
      : Promise.resolve(Math.random()).then((loopId) =>
        Promise.resolve()
          .then(() => console.log("messageTasks.start"))
          .then(
            () =>
            (_state.element.onpause = () => {
              _state.element.paused &&
                !_state.isPaused &&
                messageTasks[MessageType.stop]("messageTasks.start.pause");
            })
          )
          .then(pause)
          .then(() => sleepPromise(START_SLEEP_MS))
          .then(() =>
            Object.assign(_state, {
              ...payload,
              loopId,
              iter: 0,
            })
          )
          .then(() => loop(loopId))
      ),
  [MessageType.stop]: () =>
    Promise.resolve()
      .then(() => console.log("messageTasks.stop"))
      .then(() => (_state.element.onpause = () => null))
      .then(() => (_state.loopId = -1))
      .then(() => _state.element.pause())
      .then(() => unlockYouTubePlaybackRate(1))
      .then((didUnlockYouTubePlaybackRate) => {
        if (!didUnlockYouTubePlaybackRate) {
          _state.element.playbackRate = 1;
        }
      })
      .then(() => (document.title = initialTitle)),
  [MessageType.init]: () => Promise.resolve().then(init),
};

function listenForMessage(
  f: (data: any, sendResponse: (sendData: any) => void) => void
) {
  window.chrome.runtime.onMessage.addListener(
    (data: any, _sender: any, sendResponse: (sendData: any) => void) => {
      f(data, sendResponse);
      return true;
    }
  );
}

var initialTitle: string;

function activate() {
  console.log("LoopyGoopy.activate")
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

activate();

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
            isPaused: false,
          };
        })
    )
    .then(() =>
      !_state.element
        ? undefined
        : {
          success: true,
          mediaId: `${initialTitle || document.title}-${window.location.host ||
            (Array.from(_state.element.children)[0] as HTMLSourceElement).src
            }-${_state.element.duration}`,
        }
    );
}

function loop(loopId: number): Promise<void> {
  if (_state.loopId !== loopId) return Promise.resolve();
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
    .then(() => setPlaybackRate(playbackRate))
    .then(() =>
    ({
      [CountInStyle.silent]: () => countInS * 1000,
      [CountInStyle.track]: () => (countInS - rawStartTime) * 1000,
      [CountInStyle.metronome]: () => {
        throw new Error("loop.CountInStyle.metronome");
      },
    }[(config[Field.count__in_style] || 0) as CountInStyle]())
    )
    .then((sleepMs) =>
      sleepMs > 0 ? pause().then(() => sleepPromise(sleepMs)) : null
    )
    .then(() =>
      _state.loopId !== loopId
        ? undefined
        : _state.element
          .play()
          .then(() =>
            sleepPromise(((endTime - startTime) * 1000) / playbackRate)
          )
          .then(() => loop(loopId))
    );
}
