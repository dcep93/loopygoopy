export function sendMessage(data: any) {
  if (tabId !== undefined) {
    chrome.tabs.sendMessage(tabId, data);
  } else {
    chrome.runtime.sendMessage(
      data,
      (response) => response.alert && alert(response.alert)
    );
  }
}

export function listenForMessage(
  f: (mType: MessageType, payload: any) => void
) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("receive", message);
    if (message.type === "init") {
      state.element = get();
      if (state.element) {
        var duration = state.element.duration;
        if (duration) {
          var mediaId = `${window.location.host}-${state.element.duration}`;
          sendResponse({ success: true, mediaId });
          return;
        }
      }
      sendResponse("no media element found - try starting it first");
    } else {
      state.value = message.message;
      var type = message.type;
      functions[type]();
      sendResponse(true);
    }
  });
}
