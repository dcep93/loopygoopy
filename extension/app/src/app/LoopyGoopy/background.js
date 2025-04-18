// todo remote work
var tab;
console.log("background");
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log(tab, message, sender);
  if (sender.tab !== undefined) return;
  if (message === null) return sendResponse(tab);
  if (message.tabId !== undefined) {
    tab = message;
  } else if (tab?.id === undefined) {
    sendResponse(false);
  } else {
    chrome.tabs.sendMessage(tab.id, message, sendResponse);
    return true;
  }
});
