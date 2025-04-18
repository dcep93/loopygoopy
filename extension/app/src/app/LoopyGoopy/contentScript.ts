export enum MessageType {
  start,
  stop,
  init,
}

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

var _state: { element: HTMLVideoElement | HTMLAudioElement | null };

function getState(): Promise<typeof _state> {
  return Promise.resolve().then(() => ({
    element:
      document.getElementsByTagName("video")[0] ||
      document.getElementsByTagName("audio")[0] ||
      null,
  }));
}

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: () => alert("start"),
  [MessageType.stop]: () => alert("stop"),
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
