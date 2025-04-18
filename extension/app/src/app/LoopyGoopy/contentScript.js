"use strict";
exports.__esModule = true;
exports.listenForMessage = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
function listenForMessage(f) {
    window.chrome.runtime.onMessage.addListener(function (data, _sender, sendResponse) {
        f(data, sendResponse);
    });
}
exports.listenForMessage = listenForMessage;
function activate() {
    listenForMessage(function () { return alert("acc"); });
}
if (window.exports)
    activate();
