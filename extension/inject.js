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
// todo remember state
var state = {};
function loop() {
	setTimeout(loop, 100);
	if (!stateInput.value) return;
	if (state.lastValue != stateInput.value) {
		state.lastValue = stateInput.value;
		if (!element) alert("need to start a track first");
		var value = JSON.parse(stateInput.value);
		functions[value.type](value.message);
	}
}

var timeout = null;
function start(value) {
	state.value = value;
	state.currentTime = element.currentTime;
	stop();
	begin();
}

function stop() {
	clearTimeout(timeout);
	element.pause();
	element.currentTime = state.currentTime;
	timeout = null;
}
function next() {
	move(true);
}
function previous() {
	move(false);
}

function countIn() {
	var ms = getMs(state.value.bpr);
	timeout = setTimeout(begin, ms);
}

function begin() {
	element.play();
	var ms = getMs(state.value.bpl);
	timeout = setTimeout(finish, ms);
}

function finish() {
	element.pause();
	element.currentTime = state.currentTime;
	countIn();
}

function getMs(beats) {
	var msPerMinute = 60 * 1000;
	return (beats * msPerMinute) / state.value.bpm;
}

function move(forward) {
	var ms = getMs(state.value.bpl);
	var s = ms / 1000;
	var toMove = forward ? s : -s;
	state.currentTime += s;
	stop();
	begin();
}

var functions = { start, stop, next, previous };

loop();
