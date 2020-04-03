var tabId;
chrome.tabs.query({ currentWindow: true, active: true }, function(tabs) {
	tabId = tabs[0].id;
});

var submitInput = document.createElement("input");
submitInput.type = "submit";
submitInput.style = "display: none";
var inputsRaw = document.getElementsByTagName("input");
var inputs = Array.from(inputsRaw);
for (var i = 0; i < inputs.length; i++) {
	var element = inputs[i];
	element.parentElement.insertBefore(
		submitInput.cloneNode(),
		element.nextSibling
	);
}

var form = document.getElementById("submit");

function submit() {
	var formData = new FormData(form);
	var message = {};
	formData.forEach((value, key) => {
		message[key] = value;
	});
	sendMessage("submit", message);
	return false;
}

var buttonNames = ["start", "stop", "next", "previous"];
buttonNames.forEach(name => {
	document.getElementById(name).onclick = () => sendMessage(name);
});

function sendMessage(type, message) {
	chrome.tabs.sendMessage(tabId, { type, message });
}

form.onsubmit = submit;
