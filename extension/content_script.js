// this needs to be run immediately, so this is included in content_script.js

// spotify hides the audio tag from document.getElementBy getters
// we can inject this code before any spotify code runs to capture the created elements
// by overriding document.createElement

var inject = `
var defaultCreateElement = document.createElement;
var elements = [];

document.createElement = function(domType) {
	var element = defaultCreateElement.apply(this, arguments);
	if (domType == "video" || domType == "audio") {
		elements.push(element);
	}
	return element;
};
`;

function injectScript(code) {
	var script = document.createElement("script");
	script.textContent = code;
	document.head.appendChild(script);
}

injectScript(inject);

const url = chrome.runtime.getURL("inject.js");
fetch(url)
	.then(response => response.text())
	.then(injectScript);

var stateId = "chrome_extension_content_script";
var state = document.createElement("input");
state.id = stateId;
document.head.append(state);

chrome.runtime.onMessage.addListener(function(request) {
	state.value = request.message;
});
