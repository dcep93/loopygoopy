var tabId;
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log(message);
	if (message.tabId !== undefined) {
		tabId = message.tabId;
	} else if (tabId === undefined) {
		sendResponse(true);
	} else {
		console.log("proxy open");
		chrome.tabs.sendMessage(tabId, message, function (response) {
			console.log("proxy close", response);
			sendResponse(true);
		});
	}
});
