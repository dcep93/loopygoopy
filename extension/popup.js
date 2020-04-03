var tabId;
chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
	tabId = tabs[0].id;
});
var input = document.getElementById("input");
function submit() {
	chrome.tabs.sendMessage(tabId, { message: input.value });
}
document.getElementById("submit").onsubmit = submit;
