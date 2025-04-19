// todo remote work
var tab;
console.log("background");
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log({ tab, message, sender });
  if (message === null) return sendResponse(tab);
  if (message.id !== undefined) {
    tab = message;
  } else if (tab === undefined) {
    sendResponse(false);
  } else {
    chrome.tabs.sendMessage(tab.id, message, sendResponse);
    return true;
  }
});
