import { MessageType } from "./shared";

type TabState = { id?: number; mediaId?: string; currentTime?: number; sourceUrl?: string; title?: string };
type InitResponse = {
  success?: boolean;
  mediaId?: string;
  currentTime?: number;
  sourceUrl?: string;
  title?: string;
  alert?: string;
};

var _tab: TabState;
function queryBoundTab(callback: (tabs: { id?: number }[]) => void) {
  window.chrome.tabs.query({ currentWindow: true, active: true }, callback);
}
export default function getTab(options: { suppressAlert?: boolean } = {}): Promise<typeof _tab> {
  if (window.chrome?.tabs === undefined) {
    _tab = { mediaId: `url:${window.location.href}`, sourceUrl: window.location.href, title: document.title };
  }
  return Promise.resolve()
    .then(() =>
      _tab !== undefined
        ? null
        : new Promise<TabState>((resolve, reject) => {
            queryBoundTab(
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
                      reject("Loopy Goopy could not read media from this tab yet. Reload this page and try again.");
                    } else if (response === null) {
                      reject("Loopy Goopy could not read media from this tab yet.");
                    } else if (response.success) {
                      if (!response.sourceUrl || !response.mediaId ||
                          !/^(youtube|instagram|drive|file|url):/.test(response.mediaId)) {
                        reject("Loopy Goopy needs this page reloaded to identify the video with the updated extension.");
                        return;
                      }
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
