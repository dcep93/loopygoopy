import { MessageType } from "./shared";

type TabState = { id?: number; mediaId?: string };

var _tab: TabState;
export default function getTab(): Promise<typeof _tab> {
  if (window.chrome?.tabs === undefined) {
    _tab = { mediaId: "localhost" };
  }
  return Promise.resolve()
    .then(() =>
      _tab !== undefined
        ? null
        : new Promise<TabState>((resolve, reject) => {
            window.chrome.tabs.query(
              { currentWindow: true, active: true },
              (tabs: { id?: number }[]) => {
                const tabId = tabs[0]?.id;
                if (tabId === undefined) {
                  reject("getTab.activeTab.missing");
                  return;
                }
                window.chrome.tabs.sendMessage(
                  tabId,
                  { mType: MessageType.init, payload: { tabId } },
                  (response: any) => {
                    if (response === undefined) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                      window.chrome.runtime.lastError;
                      window.chrome.runtime.sendMessage(
                        null,
                        (bkResponse: typeof _tab) =>
                          bkResponse === null || bkResponse === undefined
                            ? reject("getTab.backgroundTab.missing")
                            : resolve(bkResponse)
                      );
                    } else if (response === null) {
                      reject("message.response.null");
                    } else if (response.success) {
                      Promise.resolve({ id: tabId, ...response }).then(
                        (__tab) =>
                          Promise.resolve()
                            .then(() =>
                              window.chrome.runtime.sendMessage(__tab)
                            )
                            .then(() => resolve(__tab))
                      );
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
