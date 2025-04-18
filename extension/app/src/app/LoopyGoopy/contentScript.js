"use strict";
var _a;
exports.__esModule = true;
exports.MessageType = void 0;
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
var _state;
function getState() {
    return Promise.resolve().then(function () { return ({
        element: document.getElementsByTagName("video")[0] ||
            document.getElementsByTagName("audio")[0] ||
            null
    }); });
}
var messageTasks = (_a = {},
    _a[MessageType.start] = function () { return alert("start"); },
    _a[MessageType.stop] = function () { return alert("stop"); },
    _a[MessageType.init] = function (payload) {
        return Promise.resolve()
            .then(getState)
            .then(function (state) {
            _state = state;
            return state;
        })
            .then(function (state) {
            return state.element === null
                ? undefined
                : {
                    success: true,
                    mediaId: "".concat(document.title, "-").concat(window.location.host ||
                        Array.from(state.element.children)[0].src, "-").concat(state.element.duration)
                };
        });
    },
    _a);
function activate() {
    listenForMessage(function (data, sendResponse) {
        return Promise.resolve(data.payload)
            .then(messageTasks[data.mType])
            .then(sendResponse)["catch"](function (e) {
            alert(e);
            throw e;
        });
    });
}
if (window.exports)
    activate();
