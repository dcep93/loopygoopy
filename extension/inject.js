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

// types: submit, start, stop, next, previous
// fields: bpm, bpl, bpr, pc, pt, pl, tc, tt, tl

var stateId = "chrome_extension_content_script";
var stateInput = document.getElementById(stateId);
var state = {};
function loop() {
	setTimeout(loop, 100);
	if (!stateInput.value) return;
	if (state.lastValue != stateInput.value) {
		var value = JSON.parse(state.value);
		functions[value.type](value.message);
		state.lastValue = stateInput.value;
	}
}

var timeout = null;
function start(value) {
	state.value = value;
	stop();
	// todo
}
function stop() {
	clearTimeout(timeout);
	timeout = null;
	element.pause();
}
function next() {
	move(True);
}
function previous() {
	move(False);
}

function move(forward) {
	// todo
}

var functions = { submit, start, stop, next, previous };

loop();
