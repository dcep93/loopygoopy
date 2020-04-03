// // this needs to be run immediately, so this is included in content_script.js

// // spotify hides the audio tag from document.getElementBy getters
// // we can inject this code before any spotify code runs to capture the created elements
// // by overriding document.createElement

// var defaultCreateElement = document.createElement;
// var element;

// document.createElement = function(tag) {
// 	var thisElement = defaultCreateElement.apply(this, arguments);
// 	if (tag == "video" || tag == "audio") {
// 		element = thisElement;
// 	}
// 	return thisElement;
// };

var stateId = "chrome_extension_content_script";
var state;
function loop() {
	setTimeout(loop, 100);
	if (!state) {
		state = document.getElementById(stateId);
	} else {
		if (state.lastValue != state.value) {
			if (state.value) handle(state.value);
			state.lastValue = state.value;
		}
	}
}

function handle(value) {
	alert(value);
}

loop();
