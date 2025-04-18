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

export function listenForMessage(
  f: (data: any, sendResponse: (sendData: any) => void) => void
) {
  window.chrome.runtime.onMessage.addListener(
    (data: any, _sender: any, sendResponse: (sendData: any) => void) => {
      f(data, sendResponse);
    }
  );
}

function activate() {
  listenForMessage(() => alert("acc"));
}

if (window.exports) activate();
