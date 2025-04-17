import { MessageType } from "./contentScript";

declare global {
  interface Window {
    chrome: any;
  }
}

var _tab: { id?: string; mediaId?: string };
export function getTab(): Promise<typeof _tab> {
  if (window.chrome?.tabs === undefined) {
    _tab = { mediaId: "localhost" };
  }
  return Promise.resolve()
    .then(() =>
      _tab !== undefined
        ? null
        : new Promise<{}>((resolve, reject) => {
            window.chrome.tabs.query(
              { currentWindow: true, active: true },
              (tabs: { id: string }[]) => {
                const tabId = tabs[0].id;
                window.chrome.tabs.sendMessage(
                  tabId,
                  { mType: MessageType.init, tabId },
                  (response: any) => {
                    if (response === undefined) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                      window.chrome.runtime.lastError;
                      window.chrome.runtime.sendMessage(
                        null,
                        (bkResponse: typeof _tab) => resolve(bkResponse)
                      );
                    } else if (response === null) {
                      reject("message.response.null");
                    } else if (response.success) {
                      window.chrome.runtime.sendMessage(_tab);
                      resolve({ id: tabId, ...response });
                    } else {
                      window.close();
                      reject(JSON.stringify(response));
                    }
                  }
                );
              }
            );
          })
            .then((__tab) => (_tab = __tab))
            .catch((e) => {
              alert(e);
              throw e;
            })
    )
    .then(() => _tab);
}

export function sendMessage(data: any) {
  getTab().then((tab) => {
    if (tab.id !== null) {
      window.chrome.tabs.sendMessage(tab.id, data);
    } else {
      window.chrome.runtime.sendMessage(
        data,
        (response: any) => response.alert && alert(response.alert)
      );
    }
  });
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
