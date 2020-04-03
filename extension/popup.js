var tabId;
chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
	tabId = tabs[0].id;
});
var ids = ["bpm", "bpl", "bpr"];
var elements = {};
for (var i = 0; i < ids.length; i++) {
	var id = ids[i];
	elements[id] = document.getElementById(id);
}
function submit() {
	var message = {};
	for (let key in elements) {
		message[key] = elements[key].value;
	}
	chrome.tabs.sendMessage(tabId, message);
}
document.getElementById("submit").onsubmit = submit;
