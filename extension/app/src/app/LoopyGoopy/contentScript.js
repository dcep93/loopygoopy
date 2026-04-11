export var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType || (MessageType = {}));
export var Field;
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
})(Field || (Field = {}));
export var CountInStyle;
(function (CountInStyle) {
    CountInStyle[CountInStyle["silent"] = 0] = "silent";
    CountInStyle[CountInStyle["track"] = 1] = "track";
    CountInStyle[CountInStyle["metronome"] = 2] = "metronome";
})(CountInStyle || (CountInStyle = {}));
const START_SLEEP_MS = 1000;
const DEFAULT_BPM = 60;
var _state;
function pause() {
    return Promise.resolve()
        .then(() => (_state.isPaused = true))
        .then(() => _state.element.paused || _state.element.pause())
        .then(() => (_state.isPaused = false));
}
const messageTasks = {
    [MessageType.start]: (payload) => _state === undefined
        ? Promise.resolve().then(() => {
            alert("messageTasks.start._state.undefined"); // todo
        })
        : Promise.resolve(Math.random()).then((loopId) => Promise.resolve()
            .then(() => console.log("messageTasks.start"))
            .then(() => (_state.element.onpause = () => {
            _state.element.paused &&
                !_state.isPaused &&
                messageTasks[MessageType.stop]("messageTasks.start.pause");
        }))
            .then(pause)
            .then(() => sleepPromise(START_SLEEP_MS))
            .then(() => Object.assign(_state, {
            ...payload,
            loopId,
            iter: 0,
        }))
            .then(() => loop(loopId))),
    [MessageType.stop]: () => Promise.resolve()
        .then(() => console.log("messageTasks.stop"))
        .then(() => (_state.element.onpause = () => null))
        .then(() => (_state.loopId = -1))
        .then(() => _state.element.pause())
        .then(() => (_state.element.playbackRate = 1))
        .then(() => (document.title = initialTitle)),
    [MessageType.init]: () => Promise.resolve().then(init),
};
function listenForMessage(f) {
    window.chrome.runtime.onMessage.addListener((data, _sender, sendResponse) => {
        f(data, sendResponse);
    });
}
var initialTitle;
function activate() {
    initialTitle = document.title;
    listenForMessage((data, sendResponse) => Promise.resolve(data.payload)
        .then(messageTasks[data.mType])
        .then(sendResponse)
        .catch((e) => {
        alert(e);
        throw e;
    }));
}
function sleepPromise(sleepMs) {
    if (!(sleepMs > 0))
        return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, sleepMs));
}
if (window.exports)
    activate();
//
function init() {
    return Promise.resolve()
        .then(() => _state?.config !== undefined
        ? null
        : Promise.resolve().then(() => {
            _state = {
                element: document.getElementsByTagName("video")[0] ||
                    document.getElementsByTagName("audio")[0],
                config: undefined,
                iter: -1,
                loopId: -1,
                isPaused: false,
            };
        }))
        .then(() => !_state.element
        ? undefined
        : {
            success: true,
            mediaId: `${document.title}-${window.location.host ||
                Array.from(_state.element.children)[0].src}-${_state.element.duration}`,
        });
}
function loop(loopId) {
    if (_state.loopId !== loopId)
        return Promise.resolve();
    const config = _state.config;
    const rawOriginalBPM = config[Field.original_BPM];
    const bpm = rawOriginalBPM > 0 ? rawOriginalBPM : DEFAULT_BPM;
    const tempoChange = config[Field.tempo_change] || 1;
    const trainTarget = config[Field.train_target] || tempoChange;
    const playbackRate = _state.iter < (config[Field.train_loops] || 1)
        ? tempoChange +
            (_state.iter++ / (config[Field.train_loops] || 1)) *
                (trainTarget - tempoChange)
        : trainTarget;
    _state.element.playbackRate = playbackRate;
    const countInS = ((config[Field.count__in_beats] || 0) * 60) / bpm / playbackRate;
    const rawStartTime = Math.max(0, config[Field.start_time] || Number.NEGATIVE_INFINITY);
    const startTime = config[Field.count__in_style] === CountInStyle.track
        ? Math.max(0, rawStartTime - countInS)
        : rawStartTime;
    _state.element.currentTime = startTime;
    const rawEndTime = config[Field.end_time] || _state.element.duration;
    const endTime = rawEndTime > rawStartTime ? rawEndTime : _state.element.duration;
    document.title = `${(playbackRate * 100).toFixed(2)}% - ${initialTitle}`;
    return Promise.resolve()
        .then(() => ({
        [CountInStyle.silent]: () => countInS * 1000,
        [CountInStyle.track]: () => (countInS - rawStartTime) * 1000,
        [CountInStyle.metronome]: () => {
            throw new Error("loop.CountInStyle.metronome");
        },
    }[(config[Field.count__in_style] || 0)]()))
        .then((sleepMs) => sleepMs > 0 ? pause().then(() => sleepPromise(sleepMs)) : null)
        .then(() => _state.loopId !== loopId
        ? undefined
        : _state.element
            .play()
            .then(() => sleepPromise(((endTime - startTime) * 1000) / playbackRate))
            .then(() => loop(loopId)));
}
