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
};

function getState(): Promise<typeof _state> {
  return Promise.resolve().then(() => ({
    element:
      document.getElementsByTagName("video")[0] ||
      document.getElementsByTagName("audio")[0] ||
      null,
    timeout: undefined,
  }));
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: () => alert("start"),
  [MessageType.stop]: (payload) => {
    const timeout = _state.timeout;
    _state.timeout = undefined;
    clearTimeout(timeout);
  },
  [MessageType.init]: (payload: { tabId: number }) =>
    Promise.resolve()
      .then(getState)
      .then((state) => {
        _state = state;
        return state;
      })
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

if (window.exports) activate();
