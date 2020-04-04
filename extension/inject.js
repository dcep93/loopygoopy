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
// fields: bpm, bpl, bpr, tc, tt, tl, st

var stateId = "chrome_extension_content_script";
var stateInput = document.getElementById(stateId);
// todo remember state
var state = {};
function loop() {
	setTimeout(loop, 100);
	if (element) setId();
	if (!stateInput.value) return;
	if (state.lastValue == stateInput.value) return;
	state.lastValue = stateInput.value;
	findElement();
	if (!element) return alert("need to start a track first");
	var json = JSON.parse(stateInput.value);
	state.value = json.message;
	functions[json.type](json.message);
}

function setId() {
	var id = `${window.location.host}-${element.duration}`;
	sendMessage({ id });
}

function sendMessage(attrs) {
	var currentState = stateInput.getAttribute("state");
	var parsed = currentState ? JSON.parse(currentState) : {};
	Object.assign(parsed, attrs);
	stateInput.setAttribute("state", JSON.stringify(parsed));
}

function findElement() {
	if (element) return;
	element = document.getElementsByTagName("video")[0];
	if (element) return;
	element = document.getElementsByTagName("audio")[0];
}

var timeout = null;
function start() {
	if (state.value.st) {
		element.currentTime = state.value.st;
	} else {
		sendMessage({ currentTime: element.currentTime });
	}
	state.currentTime = element.currentTime;
	stop();
	begin();
}

function stop() {
	clearTimeout(timeout);
	element.pause();
	if (state.currentTime !== undefined) {
		element.currentTime = state.currentTime;
	} else {
		state.currentTime = element.currentTime;
	}
	element.playbackRate = state.value.tc;
	state.loop = 0;
	timeout = null;
}
function next() {
	move(true);
}
function previous() {
	move(false);
}

function countIn() {
	state.loop += 1;
	speedUp();
	var ms = getMs(state.value.bpr);
	timeout = setTimeout(begin, ms);
}

function begin() {
	element.play();
	var ms = getMs(state.value.bpl);
	timeout = setTimeout(finish, ms);
}

function finish() {
	if (element.paused) return stop();
	if (state.value.bpr != 0) element.pause();
	element.currentTime = state.currentTime;
	countIn();
}

function getMs(beats) {
	var msPerMinute = 60 * 1000;
	var ms = (beats * msPerMinute) / state.value.bpm;
	return ms / element.playbackRate;
}

function move(forward) {
	stop();
	var ms = getMs(state.value.bpl);
	var s = ms / 1000;
	var toMove = forward ? s : -s;
	state.currentTime += toMove;
	element.currentTime = state.currentTime;
	sendMessage({ currentTime: element.currentTime });
	begin();
}

function speedUp() {
	element.playbackRate += getDiff(
		state.value.tc,
		state.value.tt,
		state.value.tl
	);
}

function getDiff(start, target, loops) {
	if (state.loop > loops) return 0;
	var range = target - start;
	return range / loops;
}

var functions = { start, stop, next, previous };

loop();
