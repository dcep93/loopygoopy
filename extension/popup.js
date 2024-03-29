const DEFAULT = "default";

// chrome seems to size the popup strangely
var documentHeight = document.getElementById("form").offsetHeight;
document.getElementsByTagName("html")[0].style.height = documentHeight;
//

var tabId;
var mediaId;
chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
  var tabId_ = tabs[0].id;
  chrome.tabs.sendMessage(tabId_, { type: "init", tabId }, (response) => {
    if (response === undefined) {
      allowNonValidPage();
      chrome.runtime.sendMessage(null, function (response) {
        mediaId = response.mediaId;
        loadForm(mediaId);
      });
    } else if (response === null) {
      alert("uh oh something went wrong");
    } else if (response.success) {
      tabId = tabId_;
      init(response);
    } else {
      window.close();
      return alert(response);
    }
  });
});

function init(response) {
  mediaId = response.mediaId;
  loadForm(mediaId);
  // send message to background
  chrome.runtime.sendMessage({ tabId, mediaId });
}

function allowNonValidPage() {
  // means this is an invalid page domain
  // this is fine as we can also connect through background
  // to the recently initialzed valid page
  chrome.runtime.lastError;
}

//

var form = document.getElementById("form");
function saveForm(id) {
  var formData = new FormData(form);
  var message = {};
  formData.forEach((value, key) => {
    message[key] = value;
  });
  if (id) chrome.storage.sync.set({ [id]: message });
  console.log("save", id, message);
  return message;
}

function loadForm(id) {
  console.log("load", id);
  chrome.storage.sync.get(id, function (result) {
    var object = result[id];
    console.log("set", id, object);
    for (var name in object) form[name].value = object[name];
  });
  loadProfiles();
}

loadForm(DEFAULT);

//

// you can hit 'enter' while focused on any input
var submitInput = document.createElement("input");
submitInput.type = "submit";
submitInput.style = "display: none";
var inputsRaw = document.getElementsByTagName("input");
Array.from(inputsRaw).forEach((element) => {
  if (element.parentElement.id == "profile_parent") return;
  element.parentElement.insertBefore(
    submitInput.cloneNode(),
    element.nextSibling
  );
  // when the input changes, save the state as
  // the last thing opened, 'default'
  element.oninput = element.onchange = calculateAndSaveDefault;
});

function calculateAndSaveDefault() {
  calculate();
  saveForm(DEFAULT);
}

//

var startTime = document.getElementById("st");
var endTime = document.getElementById("et");
function move(direction) {
  var magnitude = getDuration();
  var shift = magnitude * direction;
  startTime.value = (parseFloat(startTime.value) + shift).toFixed(2);
  endTime.value = (parseFloat(endTime.value) + shift).toFixed(2);
}

function getDuration() {
  return endTime.value - startTime.value;
}

//

function sendMessage(type) {
  if (document.activeElement === profileInput) {
    saveProfile();
    return false;
  }
  var message = saveForm(mediaId);
  var data = { type, message };
  if (tabId !== undefined) {
    chrome.tabs.sendMessage(tabId, data);
  } else {
    chrome.runtime.sendMessage(data, function (response) {
      if (!response)
        alert("Need to initialize on either youtube.com or open.spotify.com");
    });
  }
  return false;
}

document.getElementById("start").onclick = form.onsubmit = () =>
  sendMessage("start");
document.getElementById("stop").onclick = () => sendMessage("stop");
document.getElementById("next").onclick = () => move(1);
document.getElementById("previous").onclick = () => move(-1);

//

var taps = [];
var numTaps = 10;
var msPM = 1000 * 60;
var bpmInput = document.getElementById("bpm");
var bplInput = document.getElementById("bpl");
function tap() {
  var now = new Date();
  taps.push(now);
  if (taps.length > numTaps) taps.shift();
  var ms = now - taps[0];
  var bpm = (msPM * (taps.length - 1)) / ms;
  if (bpm && bpm !== Infinity) {
    bpmInput.value = bpm.toFixed(2);
    calculateEndTime();
  }
}
document.getElementById("tap").onclick = tap;

//

function calculate() {
  switch (document.activeElement) {
    case startTime:
    case endTime:
      calculateBPL();
      return;
    case bpmInput:
    case bplInput:
      calculateEndTime();
      return;
    default:
      return;
  }
}

function calculateBPL() {
  var bpl = (parseFloat(bpmInput.value) * getDuration()) / 60;
  if (bpl <= 0.01 || !isFinite(bpl)) return;
  bplInput.value = bpl.toFixed(2);
}

function calculateEndTime() {
  var duration = (60 * bplInput.value) / bpmInput.value;
  if (duration <= 0.01 || !isFinite(duration)) return;
  var endTimeValue = parseFloat(startTime.value) + duration;
  endTime.value = endTimeValue.toFixed(2);
}

//

var profiles = {};
var profileInput = document.getElementById("profile");
var profilesSelect = document.getElementById("profiles");
document.getElementById("save_profile").onclick = saveProfile;
document.getElementById("delete_profile").onclick = deleteProfile;
function saveProfile() {
  if (!mediaId) return alert("cannot save for unknown media");
  var profileName = profileInput.value;
  var data = saveForm(mediaId);
  profiles[profileName] = data;
  saveProfileHelper();
  alert(`saved ${profileName}`);
}

function saveProfileHelper() {
  var id = `profile-${mediaId}`;
  chrome.storage.sync.set({ [id]: profiles });
  loadProfiles();
}

function loadProfiles() {
  if (!mediaId) {
    profiles = {};
    displayProfiles();
    return;
  }
  var id = `profile-${mediaId}`;
  chrome.storage.sync.get([id], function (result) {
    profiles = result[id];
    if (!profiles) profiles = {};
    displayProfiles();
  });
}

function displayProfiles() {
  // uhh idk
  if (!profilesSelect) return;
  profilesSelect.innerHTML = "";
  for (p in profiles) {
    var option = document.createElement("option");
    option.text = p;
    profilesSelect.add(option);
  }
  profilesSelect.value = profileInput.value;
  profilesSelect.onchange = loadFromProfile.bind(profilesSelect);
}

function loadFromProfile() {
  var selected = profilesSelect.options[profilesSelect.selectedIndex].value;
  var profileValues = profiles[selected];
  for (var name in profileValues) form[name].value = profileValues[name];
  profileInput.value = selected;
}

function deleteProfile() {
  var selected = profilesSelect.options[profilesSelect.selectedIndex].value;
  delete profiles[selected];
  saveProfileHelper();
  alert(`deleted ${selected}`);
}
