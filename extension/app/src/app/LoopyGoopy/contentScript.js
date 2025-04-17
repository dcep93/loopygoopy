"use strict";
exports.__esModule = true;
exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
function activate() {
    alert("activated");
}
if (window.exports)
    activate();
