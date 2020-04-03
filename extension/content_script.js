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

function injectScript(code) {
	var script = document.createElement("script");
	script.textContent = code;
	document.head.appendChild(script);
}

injectScript(inject);

var stateId = "chrome_extension_content_script";
var state = document.createElement("input");
state.id = stateId;
document.head.append(state);

const url = chrome.runtime.getURL("inject.js");
fetch(url)
	.then(response => response.text())
	.then(injectScript);

chrome.runtime.onMessage.addListener(function(message) {
	message.date = new Date();
	console.log(message);
	state.value = JSON.stringify(message);
});
