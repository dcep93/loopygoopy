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

window.onload = function() {
	function getStoredSpeed() {
		return localStorage.getItem("speed");
	}

	var lastSpeed = getStoredSpeed() || 1.0;

	function setStoredSpeed(value) {
		lastSpeed = value;
		localStorage.setItem("speed", value);
	}

	var input = document.createElement("input");
	input.type = "number";
	input.id = "speed-extension-input";
	input.style =
		"background-color: #08080859;" +
		"border: #823333;" +
		"width: 45px;" +
		"margin: 5px;";
	input.value = lastSpeed * 100;
	input.oninput = validateAndChangeSpeed;

	function validateAndChangeSpeed() {
		var val = parseFloat(input.value / 100);
		if (!isNaN(val)) {
			changeSpeed(val);
		}
	}

	function changeSpeed(val) {
		for (var i = 0; i < elements.length; i++) {
			elements[i].playbackRate = val;
		}
		if (val != lastSpeed) {
			setStoredSpeed(val);
		}
	}

	function ensureInputExists() {
		if (document.getElementById("speed-extension-input") == null) {
			var nowPlaying = document.getElementsByClassName(
				"now-playing-bar__right"
			)[0];
			if (!nowPlaying) return false;
			nowPlaying.appendChild(input);
		}
		return true;
	}

	function timeout() {
		setTimeout(timeout, 100);
		if (ensureInputExists()) validateAndChangeSpeed();
	}

	timeout();
};
`;
var script = document.createElement("script");
script.textContent = inject;
document.head.appendChild(script);
