var tabId;
var mediaId;
console.log("background");
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log(tabId, message, sender);
	if (sender.tab !== undefined) return;
	if (message === null) return sendResponse({ mediaId });
	if (message.tabId !== undefined) {
		tabId = message.tabId;
		mediaId = message.mediaId;
	} else if (tabId === undefined) {
		sendResponse(false);
	} else {
		chrome.tabs.sendMessage(tabId, message, sendResponse);
		return true;
	}
});
