var tabId;
chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
	tabId = tabs[0].id;
	chrome.tabs.sendMessage(tabId, { type: "load" });
});

var submitInput = document.createElement("input");
submitInput.type = "submit";
submitInput.style = "display: none";
var inputsRaw = document.getElementsByTagName("input");
var inputs = Array.from(inputsRaw);
for (var i = 0; i < inputs.length; i++) {
	var element = inputs[i];
	element.onchange = saveDefault;
	element.parentElement.insertBefore(
		submitInput.cloneNode(),
		element.nextSibling
	);
}

var form = document.getElementById("form");

function sendMessage(type) {
	var message = saveForm(state.id);
	chrome.tabs.sendMessage(tabId, { type, message });
	return false;
}

var buttonNames = ["start", "stop", "next", "previous"];
buttonNames.forEach((type) => {
	document.getElementById(type).onclick = () => sendMessage(type);
});

form.onsubmit = () => sendMessage("start");

var taps = [];
var numTaps = 10;
var msPM = 1000 * 60;
var bpmInput = document.getElementById("bpm");
function tap() {
	var now = new Date();
	taps.push(now);
	if (taps.length > numTaps) taps.shift();
	var ms = now - taps[0];
	var bpm = (msPM * (taps.length - 1)) / ms;
	if (bpm && bpm !== Infinity) {
		bpmInput.value = bpm.toFixed(2);
	}
}

document.getElementById("tap").onclick = tap;

document.getElementsByTagName("html")[0].style.height = form.offsetHeight;

var state = {};
var stInput = document.getElementById("st");
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	if (message.currentTime) stInput.value = message.currentTime;
	if (state.id != message.id) {
		setForm(message.id);
	}
	state.id = message.id;
	sendResponse(true);
});

function saveDefault() {
	saveForm("default");
}

function saveForm(id) {
	var formData = new FormData(form);
	var message = {};
	formData.forEach((value, key) => {
		message[key] = value;
	});
	chrome.storage.sync.set({ [id]: message });
	console.log("save", id, message);
	return message;
}

function setForm(id) {
	console.log("set", id);
	chrome.storage.sync.get([id], function (result) {
		var object = result[id];
		console.log("set", id, object);
		for (var name in object) form[name].value = object[name];
	});
}

if (!state.id) {
	setForm("default");
}
