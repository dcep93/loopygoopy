"use strict";
var _a;
exports.__esModule = true;
exports.CountInStyle = exports.Field = exports.MessageType = void 0;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType = exports.MessageType || (exports.MessageType = {}));
var Field;
(function (Field) {
    Field[Field["original_BPM"] = 0] = "original_BPM";
    Field[Field["beats_per_loop"] = 1] = "beats_per_loop";
    Field[Field["count__in_beats"] = 2] = "count__in_beats";
    Field[Field["count__in_style"] = 3] = "count__in_style";
    Field[Field["tempo_change"] = 4] = "tempo_change";
    Field[Field["train_target"] = 5] = "train_target";
    Field[Field["train_loops"] = 6] = "train_loops";
    Field[Field["start_time"] = 7] = "start_time";
    Field[Field["end_time"] = 8] = "end_time";
    Field[Field["notes"] = 9] = "notes";
})(Field = exports.Field || (exports.Field = {}));
var CountInStyle;
(function (CountInStyle) {
    CountInStyle[CountInStyle["track"] = 0] = "track";
    CountInStyle[CountInStyle["silent"] = 1] = "silent";
    CountInStyle[CountInStyle["metronome"] = 2] = "metronome";
})(CountInStyle = exports.CountInStyle || (exports.CountInStyle = {}));
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
            null,
        timeout: undefined
    }); });
}
var messageTasks = (_a = {},
    _a[MessageType.start] = function () { return alert("start"); },
    _a[MessageType.stop] = function (payload) {
        var timeout = _state.timeout;
        _state.timeout = undefined;
        clearTimeout(timeout);
    },
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
