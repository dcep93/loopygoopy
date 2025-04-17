const TIME_BEFORE_START = 1000;

// types: start, stop, next, previous
// fields: bpm, bpl, bpr, tc, tt, tl, st

var functions = { start, stop };
// element, value, currentTime, title, timeout, loop
var state = {};

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  console.log("receive", message);
  if (message.type === "init") {
    state.element = get();
    if (state.element) {
      var duration = state.element.duration;
      if (duration) {
        var mediaId = `${window.location.host}-${state.element.duration}`;
        sendResponse({ success: true, mediaId });
        return;
      }
    }
    sendResponse("no media element found - try starting it first");
  } else {
    state.value = message.message;
    var type = message.type;
    functions[type]();
    sendResponse(true);
  }
});

function get() {
  var video = document.getElementsByTagName("video")[0];
  if (video) return video;
  var audio = document.getElementsByTagName("audio")[0];
  if (audio) return audio;
  return false;
}

//

function start() {
  if (state.value.bpl < 0) return alert("invalid payload");
  stop();
  if (state.value.st !== undefined) state.element.currentTime = state.value.st;
  state.currentTime = state.element.currentTime;
  state.element.playbackRate = state.value.tc;
  state.loop = 0;
  state.timeout = setTimeout(begin, TIME_BEFORE_START);
}

function stop() {
  if (state.title !== undefined) {
    document.title = state.title;
    delete state.title;
  }
  clearTimeout(state.timeout);
  state.timeout = null;
  console.log("stop pause");
  state.element.pause();
  if (state.currentTime !== undefined) {
    state.element.currentTime = state.currentTime;
  } else {
    state.currentTime = state.element.currentTime;
  }
  state.element.playbackRate = 1;
}

//

function begin() {
  state.element.currentTime = state.currentTime;
  console.log("begin play");
  state.element.play();
  if (state.title === undefined) state.title = document.title;
  var playbackPercent = state.element.playbackRate * 100;
  document.title = `${playbackPercent.toFixed(2)}% - ${state.title}`;
  var ms = getMs(state.value.bpl);
  state.timeout = setTimeout(finish, ms);
}

function finish() {
  if (state.element.paused) return stop();
  countIn();
}

function countIn() {
  state.loop += 1;
  if (state.value.tt) {
    const ratio = state.loop / state.value.tl;
    if (ratio === 1) {
      state.element.playbackRate = state.value.tt;
    } else if (ratio < 1) {
      state.element.playbackRate =
        parseFloat(state.value.tc) + (state.value.tt - state.value.tc) * ratio;
    }
  }
  var ms = getMs(state.value.bpr);
  if (ms) {
    console.log("countIn pause");
    state.element.pause();
    state.timeout = setTimeout(begin, ms);
  } else {
    begin();
  }
}

function getMs(beats) {
  var msPerMinute = 60 * 1000;
  return (beats * msPerMinute) / (state.value.bpm * state.element.playbackRate);
}
