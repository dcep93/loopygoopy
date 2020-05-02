const DEFAULT = "default";

// chrome seems to size the popup strangely
var form = document.getElementById("form");
document.getElementsByTagName("html")[0].style.height = form.offsetHeight;
//

var tabId;
var mediaId;
chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
	var tabId_ = tabs[0].id;
	chrome.tabs.sendMessage(tabId_, { type: "init", tabId }, (response) => {
		if (response === undefined || response === null) {
			allowNonValidPage();
		} else if (response.success) {
			tabId = tabId_;
			init(response);
		} else {
			window.close();
			return alert(response);
		}
	});
});

function init(response) {
	mediaId = response.mediaId;
	// send message to background
	chrome.runtime.sendMessage({ tabId });
}

function allowNonValidPage() {
	// means this is an invalid page domain
	// this is fine as we can also connect through background
	// to the recently initialzed valid page
	chrome.runtime.lastError;
}

//

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

function saveDefault() {
	saveForm(DEFAULT);
}

function loadForm(id) {
	console.log("load", id);
	chrome.storage.sync.get([id], function (result) {
		var object = result[id];
		console.log("set", id, object);
		for (var name in object) form[name].value = object[name];
	});
}

loadForm(DEFAULT);

//

// you can hit 'enter' while focused on any input
var submitInput = document.createElement("input");
submitInput.type = "submit";
submitInput.style = "display: none";
var inputsRaw = document.getElementsByTagName("input");
Array.from(inputsRaw).forEach((element) => {
	// when the input changes, save the state as
	// the last thing opened, 'default'
	element.onchange = saveDefault;
	element.parentElement.insertBefore(
		submitInput.cloneNode(),
		element.nextSibling
	);
});

//

var startTime = document.getElementById("st");
var endTime = document.getElementById("et");
function move(direction) {
	var magnitude = endTime.value - startTime.value;
	var shift = magnitude * direction;
	startTime.value += shift;
	endTime.value += shift;
}

//

function sendMessage(type) {
	var message = saveForm(mediaId);
	var data = { type, message };
	if (tabId !== undefined) {
		chrome.tabs.sendMessage(tabId, data);
	} else {
		chrome.runtime.sendMessage(data, function (response) {
			if (!response)
				alert(
					"Need to initialize on either youtube.com or open.spotify.com"
				);
		});
	}
	return false;
}

document.getElementById("start").onclick = form.onsubmit = () =>
	sendMessage("start");
document.getElementById("stop").onclick = () => sendMessage("stop");
document.getElementById("next").onclick = () => move(1);
document.getElementById("previous").onclick = () => move(-1);

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

//
