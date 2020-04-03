// this needs to be run immediately, so this is included in content_script.js

// spotify hides the audio tag from document.getElementBy getters
// we can inject this code before any spotify code runs to capture the created elements
// by overriding document.createElement

var inject = `
var defaultCreateElement = document.createElement;
var element;

document.createElement = function(tag) {
	var thisElement = defaultCreateElement.apply(this, arguments);
	if (tag == "video" || tag == "audio") {
		element = thisElement;
	}
	return thisElement;
};
`;

// use this object to communicate with the page
var stateId = "chrome_extension_content_script";
// use this attr to receive data from the injected code
var currentTimeAttr = "current-time";

function injectScript(code) {
	var script = document.createElement("script");
	script.textContent = code;
	document.head.appendChild(script);
}

injectScript(inject);

var stateInput = document.createElement("input");
stateInput.id = stateId;
document.head.append(stateInput);

const url = chrome.runtime.getURL("inject.js");
fetch(url)
	.then(response => response.text())
	.then(injectScript);

chrome.runtime.onMessage.addListener(function(message) {
	message.date = new Date();
	console.log(message);
	stateInput.value = JSON.stringify(message);
});

var state = {};
function loop() {
	setTimeout(loop, 100);
	var currentTime = stateInput.getAttribute(currentTimeAttr);
	if (!currentTime) return;
	if (currentTime == state.currentTime) return;
	state.currentTime = currentTime;
	chrome.runtime.sendMessage(state);
}

loop();
