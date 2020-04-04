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

var form = document.getElementById("form");

function sendMessage(type) {
	var formData = new FormData(form);
	var message = {};
	formData.forEach((value, key) => {
		message[key] = value;
	});
	chrome.tabs.sendMessage(tabId, { type, message });
	return false;
}

var buttonNames = ["start", "stop", "next", "previous"];
buttonNames.forEach(type => {
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
chrome.runtime.onMessage.addListener(function(message) {
	if (message.currentTime) stInput.value = message.currentTime;
	if (state.id != message.id) alert(message.id);
	state.id = message.id;
});
