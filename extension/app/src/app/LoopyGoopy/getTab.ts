import { MessageType } from "./shared";

type TabState = { id?: number; mediaId?: string; currentTime?: number };
type InitResponse = {
  success?: boolean;
  mediaId?: string;
  currentTime?: number;
  alert?: string;
};

var _tab: TabState;
export default function getTab(options: { suppressAlert?: boolean } = {}): Promise<typeof _tab> {
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
                  (response: InitResponse | null | undefined) => {
                    if (response === undefined) {
                      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                      window.chrome.runtime.lastError;
                      window.chrome.runtime.sendMessage(
                        null,
                        (bkResponse: typeof _tab) =>
                          bkResponse === null || bkResponse === undefined
                            ? reject("Loopy Goopy could not find an active media tab.")
                            : resolve(bkResponse)
                      );
                    } else if (response === null) {
                      reject("Loopy Goopy could not read media from this tab yet.");
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
                      reject(
                        response.alert ||
                          "Loopy Goopy could not find playable audio/video on this page yet."
                      );
                    }
                  }
                );
              }
            );
          })
            .then((__tab) => (_tab = __tab))
            .catch((e) => {
              if (!options.suppressAlert) alert(e);
              throw e;
            })
    )
    .then(() => _tab);
}
