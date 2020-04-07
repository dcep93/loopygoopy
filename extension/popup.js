var tabId;
chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
	tabId = tabs[0].id;
	chrome.tabs.sendMessage(tabId, { type: "init" }, (response) => {
		if (!response) return alert("Cannot use on this page");
		if (response !== true) {
			window.close();
			return alert(response);
		}
	});
});

//

var mediaId;

var stInput = document.getElementById("st");
chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
	console.log(message);
	// write start time based on state on the page
	if (message.startTime) stInput.value = message.startTime.toFixed(2);
	// load saved form data
	if (mediaId !== message.mediaId) {
		mediaId = message.mediaId;
		loadForm(mediaId);
	}
	sendResponse(true);
});

//

var form = document.getElementById("form");

function saveForm(id) {
	var formData = new FormData(form);
	var message = {};
	formData.forEach((value, key) => {
		message[key] = value;
	});
	if (id) chrome.storage.sync.set({ [id]: message });
	console.log("save", id, message);
	return message;
}

function loadForm(id) {
	console.log("load", id);
	chrome.storage.sync.get([id], function (result) {
		var object = result[id];
		console.log("set", id, object);
		for (var name in object) form[name].value = object[name];
	});
}

function saveDefault() {
	saveForm("default");
}

loadForm("default");

//

// you can hit 'enter' while focused on any input
var submitInput = document.createElement("input");
submitInput.type = "submit";
submitInput.style = "display: none";
var inputsRaw = document.getElementsByTagName("input");
var inputs = Array.from(inputsRaw);
for (var i = 0; i < inputs.length; i++) {
	var element = inputs[i];
	// when the input changes, save the state as
	// the last thing opened, 'default'
	element.onchange = saveDefault;
	element.parentElement.insertBefore(
		submitInput.cloneNode(),
		element.nextSibling
	);
}
// chrome seems to size the popup strangely
document.getElementsByTagName("html")[0].style.height = form.offsetHeight;

//

function sendMessage(type) {
	var message = saveForm(mediaId);
	chrome.tabs.sendMessage(tabId, { type, message });
	return false;
}

var buttonNames = ["start", "stop", "next", "previous"];
buttonNames.forEach((type) => {
	document.getElementById(type).onclick = () => sendMessage(type);
});

form.onsubmit = () => sendMessage("start");

//

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
