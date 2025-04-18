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
var START_SLEEP_MS = 1000;
var _state;
var messageTasks = (_a = {},
    _a[MessageType.start] = function (payload) {
        return Promise.resolve()
            .then(function () { return (_state.config = payload.config); })
            .then(function () { return sleepPromise(START_SLEEP_MS); })
            .then(countIn);
    },
    _a[MessageType.stop] = function () {
        return Promise.resolve()
            .then(function () { return (_state.config = undefined); })
            .then(function () { return clearTimeout(_state.timeout); });
    },
    _a[MessageType.init] = function () { return Promise.resolve().then(init); },
    _a);
function listenForMessage(f) {
    window.chrome.runtime.onMessage.addListener(function (data, _sender, sendResponse) {
        f(data, sendResponse);
    });
}
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
function sleepPromise(sleepMs) {
    return new Promise(function (resolve) { return setTimeout(resolve, sleepMs); });
}
if (window.exports)
    activate();
//
function init() {
    return Promise.resolve()
        .then(function () {
        return (_state === null || _state === void 0 ? void 0 : _state.config) !== undefined
            ? null
            : Promise.resolve().then(function () {
                _state = {
                    element: document.getElementsByTagName("video")[0] ||
                        document.getElementsByTagName("audio")[0] ||
                        null,
                    timeout: undefined,
                    config: undefined,
                    iter: 0
                };
            });
    })
        .then(function () {
        return _state.element === null
            ? undefined
            : {
                success: true,
                mediaId: "".concat(document.title, "-").concat(window.location.host ||
                    Array.from(_state.element.children)[0].src, "-").concat(_state.element.duration)
            };
    });
}
function countIn() {
    var config = _state.config;
    if (config === undefined)
        throw new Error("countIn.config.undefined");
    var bpm = getBpm();
    if (!(bpm > 0))
        throw new Error("countIn.bpm.zero");
    var countInBeats = parseFloat(config[Field.count__in_beats]);
    return Promise.resolve()
        .then(function () {
        var _a;
        return !(countInBeats > 0) ||
            parseFloat(config[Field.count__in_style]) === CountInStyle.track
            ? null
            : (_a = {},
                _a[CountInStyle.silent] = function () {
                    return sleepPromise((countInBeats * 60 * 1000) / bpm);
                },
                _a);
    })
        .then(start);
}
function getBpm() {
    return 0; // todo
}
function start() {
    // todo
}
