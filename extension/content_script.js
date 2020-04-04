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
	console.log(message);
	if (message.type === "load") {
		delete state.state;
		return;
	}
	message.date = new Date();
	stateInput.value = JSON.stringify(message);
});

var state = {};
function loop() {
	setTimeout(loop, 100);
	var stateInputState = stateInput.getAttribute("state");
	if (!stateInputState) return;
	if (stateInputState == state.state) return;
	state.state = stateInputState;
	var parsed = JSON.parse(stateInputState);
	console.log(parsed);
	chrome.runtime.sendMessage(parsed);
}

loop();
