"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var _a;
var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
})(MessageType || (MessageType = {}));
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
    Field[Field["pitch_shift"] = 10] = "pitch_shift";
})(Field || (Field = {}));
var CountInStyle;
(function (CountInStyle) {
    CountInStyle[CountInStyle["silent"] = 0] = "silent";
    CountInStyle[CountInStyle["track"] = 1] = "track";
    CountInStyle[CountInStyle["metronome"] = 2] = "metronome";
})(CountInStyle || (CountInStyle = {}));
var START_SLEEP_MS = 1000;
var DEFAULT_BPM = 60;
var PAGE_PLAYBACK_SCRIPT_PATH = "app/src/app/LoopyGoopy/pagePlaybackBridge.js";
var PAGE_PLAYBACK_SCRIPT_ID = "loopy-goopy-page-playback-bridge";
var PAGE_PLAYBACK_REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
var PAGE_PLAYBACK_RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";
var FRAME_MESSAGE_SOURCE = "LoopyGoopy.frameMessage";
var PARENT_MESSAGE_SOURCE = "LoopyGoopy.parentMessage";
var DRIVE_FOLDER_PATH_RE = /^\/drive\/folders\/([^/?#]+)/;
var DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,}$/;
var DRIVE_ID_IN_TEXT_RE = /[A-Za-z0-9_-]{20,}/g;
var YOUTUBE_IFRAME_SELECTOR = 'iframe[src*="youtube.googleapis.com/embed"], iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]';
var _state;
function isYouTubePage() {
    return (window.location.host === "www.youtube.com" ||
        window.location.host === "youtube.googleapis.com" ||
        window.location.host === "www.youtube-nocookie.com" ||
        window.location.host === "www.instagram.com" ||
        window.location.protocol === "file:");
}
function ensureYouTubePlaybackBridge() {
    if (!isYouTubePage())
        return Promise.resolve(false);
    if (window.__loopyGoopyPagePlaybackBridgePromise) {
        return window.__loopyGoopyPagePlaybackBridgePromise;
    }
    window.__loopyGoopyPagePlaybackBridgePromise = new Promise(function (resolve) {
        if (document.getElementById(PAGE_PLAYBACK_SCRIPT_ID)) {
            resolve(true);
            return;
        }
        var scriptUrl = window.chrome.runtime.getURL(PAGE_PLAYBACK_SCRIPT_PATH);
        var script = document.createElement("script");
        script.id = PAGE_PLAYBACK_SCRIPT_ID;
        script.src = scriptUrl;
        script.onload = function () { return resolve(true); };
        script.onerror = function () { return resolve(false); };
        (document.head || document.documentElement).appendChild(script);
    });
    return window.__loopyGoopyPagePlaybackBridgePromise;
}
function runYouTubePlaybackAction(action, payload) {
    return ensureYouTubePlaybackBridge().then(function (isBridgeLoaded) {
        if (!isBridgeLoaded)
            return false;
        return new Promise(function (resolve) {
            var requestId = "LoopyGoopy.playbackRate.".concat(Math.random());
            var isSettled = false;
            var settle = function (success) {
                if (isSettled)
                    return;
                isSettled = true;
                document.removeEventListener(PAGE_PLAYBACK_RESPONSE_EVENT, onResponse);
                resolve(success);
            };
            var onResponse = function (event) {
                var detail = event.detail;
                if ((detail === null || detail === void 0 ? void 0 : detail.requestId) !== requestId)
                    return;
                settle((detail === null || detail === void 0 ? void 0 : detail.success) === true);
            };
            document.addEventListener(PAGE_PLAYBACK_RESPONSE_EVENT, onResponse);
            document.dispatchEvent(new CustomEvent(PAGE_PLAYBACK_REQUEST_EVENT, {
                detail: __assign(__assign({ action: action }, payload), { requestId: requestId })
            }));
            window.setTimeout(function () { return settle(false); }, 250);
        });
    });
}
function lockYouTubePlaybackRate(playbackRate) {
    return runYouTubePlaybackAction("lock", { playbackRate: playbackRate });
}
function unlockYouTubePlaybackRate(playbackRate) {
    return runYouTubePlaybackAction("unlock", { playbackRate: playbackRate });
}
function setPlaybackRate(playbackRate) {
    return lockYouTubePlaybackRate(playbackRate).then(function (didUseYouTubeLock) {
        if (!didUseYouTubeLock && _state.media) {
            _state.media.setPlaybackRate(playbackRate);
        }
    });
}
function setPitchShift(semitones) {
    return runYouTubePlaybackAction("pitch", { semitones: semitones }).then(function (didUseYouTubePitchShift) {
        if (!didUseYouTubePitchShift && _state.media) {
            _state.media.setPitchShift(semitones);
        }
    });
}
function pause() {
    var media = _state.media;
    if (!media)
        return Promise.resolve();
    return Promise.resolve()
        .then(function () { return (_state.isPaused = true); })
        .then(function () {
        if (!media.isPaused()) {
            return media.pause();
        }
    })
        .then(function () {
        _state.isPaused = false;
    });
}
var messageTasks = (_a = {},
    _a[MessageType.start] = function (payload) {
        ensureState();
        if (_state.iframe && !_state.media) {
            return Promise.resolve().then(function () {
                return sendFrameMessage(_state.iframe, MessageType.start, payload);
            });
        }
        return _state.media === undefined
            ? Promise.resolve().then(function () {
                alert("Loopy Goopy could not find playable audio/video on this page.");
            })
            : Promise.resolve(Math.random()).then(function (loopId) {
                var media = _state.media;
                return Promise.resolve()
                    .then(function () { return console.log("messageTasks.start"); })
                    .then(function () {
                    media.setOnPause(function () {
                        if (media.isPaused() && !_state.isPaused) {
                            messageTasks[MessageType.stop]("messageTasks.start.pause");
                        }
                    });
                })
                    .then(pause)
                    .then(function () { return sleepPromise(START_SLEEP_MS); })
                    .then(function () {
                    return Object.assign(_state, __assign(__assign({}, payload), { loopId: loopId, iter: 0 }));
                })
                    .then(function () { return loop(loopId); });
            });
    },
    _a[MessageType.stop] = function () {
        ensureState();
        if (_state.iframe && !_state.media) {
            return Promise.resolve()
                .then(function () { return sendFrameMessage(_state.iframe, MessageType.stop, {}); })
                .then(function () {
                document.title = initialTitle;
            });
        }
        var media = _state.media;
        return Promise.resolve()
            .then(function () { return console.log("messageTasks.stop"); })
            .then(function () {
            media === null || media === void 0 ? void 0 : media.setOnPause(null);
        })
            .then(function () { return (_state.loopId = -1); })
            .then(function () { return media === null || media === void 0 ? void 0 : media.pause(); })
            .then(function () {
            return Promise.all([unlockYouTubePlaybackRate(1), setPitchShift(0)]);
        })
            .then(function (didUnlockYouTubePlaybackRate) {
            if (!didUnlockYouTubePlaybackRate[0] && media) {
                media.setPlaybackRate(1);
            }
        })
            .then(function () {
            document.title = initialTitle;
            sendParentTitle(initialTitle);
        });
    },
    _a[MessageType.init] = function () { return Promise.resolve().then(init); },
    _a);
function listenForMessage(f) {
    window.chrome.runtime.onMessage.addListener(function (data, _sender, sendResponse) {
        f(data, sendResponse);
        return true;
    });
}
function sendFrameMessage(iframe, mType, payload) {
    var _a;
    (_a = iframe.contentWindow) === null || _a === void 0 ? void 0 : _a.postMessage({
        source: FRAME_MESSAGE_SOURCE,
        mType: mType,
        payload: payload
    }, "*");
}
function sendParentTitle(title) {
    if (!isEmbeddedFrame())
        return;
    window.parent.postMessage({
        source: PARENT_MESSAGE_SOURCE,
        title: title
    }, "*");
}
function listenForParentMessage() {
    window.addEventListener("message", function (event) {
        var _a;
        if (event.source !== ((_a = _state === null || _state === void 0 ? void 0 : _state.iframe) === null || _a === void 0 ? void 0 : _a.contentWindow))
            return;
        var data = event.data;
        if (!data || data.source !== PARENT_MESSAGE_SOURCE)
            return;
        if (typeof data.title === "string") {
            document.title = data.title;
        }
    });
}
function listenForFrameMessage() {
    window.addEventListener("message", function (event) {
        if (event.source !== window.parent)
            return;
        var data = event.data;
        if (!data || data.source !== FRAME_MESSAGE_SOURCE)
            return;
        Promise.resolve(data.payload)
            .then(messageTasks[data.mType])["catch"](function (e) {
            console.error(e);
        });
    });
}
function isEmbeddedFrame() {
    return window.self !== window.top;
}
var initialTitle;
function activate() {
    console.log("LoopyGoopy.activate");
    initialTitle = document.title;
    if (isEmbeddedFrame()) {
        listenForFrameMessage();
        return;
    }
    ensureState();
    listenForParentMessage();
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
    if (!(sleepMs > 0))
        return Promise.resolve();
    return new Promise(function (resolve) { return setTimeout(resolve, sleepMs); });
}
activate();
//
function init() {
    return Promise.resolve().then(function () {
        ensureState();
        if (_state.media) {
            return {
                success: true,
                mediaId: getMediaId(_state.media)
            };
        }
        if (_state.iframe) {
            return {
                success: true,
                mediaId: getIframeMediaId(_state.iframe)
            };
        }
        return {
            success: false,
            alert: "Loopy Goopy could not find playable audio/video on this page yet."
        };
    });
}
function ensureState() {
    if (!_state) {
        _state = {
            config: undefined,
            iter: -1,
            loopId: -1,
            isPaused: false
        };
    }
    if (!_state.media) {
        _state.media = findMediaTarget();
    }
    if (!_state.iframe) {
        _state.iframe = findYouTubeIframe();
    }
}
function findMediaTarget() {
    var mediaElement = document.getElementsByTagName("video")[0] ||
        document.getElementsByTagName("audio")[0];
    return mediaElement ? createNativeMediaTarget(mediaElement) : undefined;
}
function createNativeMediaTarget(element) {
    return {
        root: element,
        getDuration: function () { return element.duration; },
        isPaused: function () { return element.paused; },
        setCurrentTime: function (time) {
            element.currentTime = time;
        },
        play: function () { return element.play(); },
        pause: function () { return element.pause(); },
        setPlaybackRate: function (playbackRate) {
            element.playbackRate = playbackRate;
        },
        setPitchShift: function () { return null; },
        setOnPause: function (handler) {
            element.onpause = handler;
        },
        getMediaFingerprint: function () {
            var _a;
            return "".concat(initialTitle || document.title, "-").concat(window.location.host ||
                ((_a = Array.from(element.children)[0]) === null || _a === void 0 ? void 0 : _a.src) ||
                element.currentSrc ||
                element.src, "-").concat(element.duration);
        }
    };
}
function findYouTubeIframe() {
    if (window.self !== window.top)
        return undefined;
    return (document.querySelector(YOUTUBE_IFRAME_SELECTOR) ||
        undefined);
}
function getMediaId(media) {
    var driveFolderId = getDriveFolderId();
    if (driveFolderId) {
        var driveFileId = findDriveFileId(driveFolderId, media.root);
        if (driveFileId) {
            return "drive-folder:".concat(driveFolderId, ":file:").concat(driveFileId);
        }
        return "drive-folder:".concat(driveFolderId, ":media:").concat(media.getMediaFingerprint());
    }
    return media.getMediaFingerprint();
}
function getIframeMediaId(iframe) {
    var driveFolderId = getDriveFolderId();
    if (driveFolderId) {
        var driveFileId = findDriveFileId(driveFolderId, iframe);
        if (driveFileId) {
            return "drive-folder:".concat(driveFolderId, ":file:").concat(driveFileId);
        }
        return "drive-folder:".concat(driveFolderId, ":iframe:").concat(iframe.id || iframe.src);
    }
    return "".concat(initialTitle || document.title, "-").concat(iframe.src || iframe.title);
}
function getDriveFolderId() {
    if (window.location.host !== "drive.google.com")
        return undefined;
    var match = window.location.pathname.match(DRIVE_FOLDER_PATH_RE);
    return match === null || match === void 0 ? void 0 : match[1];
}
function findDriveFileId(folderId, rootElement) {
    var roots = [rootElement];
    var ancestor = rootElement.parentElement;
    for (var depth = 0; ancestor && depth < 8; depth += 1) {
        roots.push(ancestor);
        ancestor = ancestor.parentElement;
    }
    var activeElement = document.activeElement;
    if (activeElement)
        roots.push(activeElement);
    document
        .querySelectorAll([
        '[aria-selected="true"]',
        '[aria-checked="true"]',
        '[data-selected="true"]',
        '[role="dialog"]',
        '[aria-modal="true"]',
        'iframe[src*="/file/d/"]',
        'iframe[src*="id="]',
        'a[href*="/file/d/"]',
        'a[href*="id="]',
    ].join(","))
        .forEach(function (root) { return roots.push(root); });
    for (var _i = 0, roots_1 = roots; _i < roots_1.length; _i++) {
        var root = roots_1[_i];
        var id = findDriveFileIdInRoot(root, folderId);
        if (id)
            return id;
    }
    var documentIds = collectDriveFileIds(document, folderId);
    return documentIds.length === 1 ? documentIds[0] : undefined;
}
function findDriveFileIdInRoot(root, folderId) {
    var ids = collectDriveFileIds(root, folderId);
    return ids[0];
}
function collectDriveFileIds(root, folderId) {
    var ids = [];
    var pushId = function (id) {
        if (!id || id === folderId || ids.includes(id))
            return;
        ids.push(id);
    };
    var inspectValue = function (value) {
        if (!value)
            return;
        var decodedValues = [value];
        try {
            var decodedValue = decodeURIComponent(value);
            if (decodedValue !== value)
                decodedValues.push(decodedValue);
        }
        catch (_a) {
            // Some Google-generated attribute values are not valid URI components.
        }
        decodedValues.forEach(function (candidateValue) {
            var _a, _b, _c;
            pushId((_a = candidateValue.match(/\/file\/d\/([^/?#]+)/)) === null || _a === void 0 ? void 0 : _a[1]);
            pushId((_b = candidateValue.match(/[?&]id=([^&#]+)/)) === null || _b === void 0 ? void 0 : _b[1]);
            var trimmedCandidateValue = candidateValue.trim();
            if (DRIVE_ID_RE.test(trimmedCandidateValue)) {
                pushId(trimmedCandidateValue);
            }
            (_c = candidateValue.match(DRIVE_ID_IN_TEXT_RE)) === null || _c === void 0 ? void 0 : _c.forEach(pushId);
        });
    };
    var inspectElement = function (element) {
        Array.from(element.attributes).forEach(function (attribute) {
            return inspectValue(attribute.value);
        });
    };
    if (root instanceof Element)
        inspectElement(root);
    root.querySelectorAll("*").forEach(inspectElement);
    return ids;
}
function loop(loopId) {
    if (_state.loopId !== loopId)
        return Promise.resolve();
    if (!_state.media)
        return Promise.resolve();
    var media = _state.media;
    var config = _state.config;
    var rawOriginalBPM = config[Field.original_BPM];
    var bpm = rawOriginalBPM > 0 ? rawOriginalBPM : DEFAULT_BPM;
    var tempoChange = config[Field.tempo_change] || 1;
    var trainTarget = config[Field.train_target] || tempoChange;
    var playbackRate = _state.iter < (config[Field.train_loops] || 1)
        ? tempoChange +
            (_state.iter++ / (config[Field.train_loops] || 1)) *
                (trainTarget - tempoChange)
        : trainTarget;
    var countInS = ((config[Field.count__in_beats] || 0) * 60) / bpm / playbackRate;
    var rawStartTime = Math.max(0, config[Field.start_time] || Number.NEGATIVE_INFINITY);
    var startTime = config[Field.count__in_style] === CountInStyle.track
        ? Math.max(0, rawStartTime - countInS)
        : rawStartTime;
    media.setCurrentTime(startTime);
    var mediaDuration = media.getDuration();
    var rawEndTime = config[Field.end_time] || mediaDuration;
    var endTime = rawEndTime > rawStartTime ? rawEndTime : mediaDuration;
    if (!Number.isFinite(endTime)) {
        alert("Loopy Goopy needs an end time for this embedded player.");
        return messageTasks[MessageType.stop]("loop.endTime.missing");
    }
    var title = "".concat((playbackRate * 100).toFixed(2), "% - ").concat(initialTitle);
    document.title = title;
    sendParentTitle(title);
    return Promise.resolve()
        .then(function () { return setPlaybackRate(playbackRate); })
        .then(function () { return setPitchShift(config[Field.pitch_shift] || 0); })
        .then(function () {
        var _a;
        return ((_a = {},
            _a[CountInStyle.silent] = function () { return countInS * 1000; },
            _a[CountInStyle.track] = function () { return (countInS - rawStartTime) * 1000; },
            _a[CountInStyle.metronome] = function () {
                throw new Error("loop.CountInStyle.metronome");
            },
            _a)[(config[Field.count__in_style] || 0)]());
    })
        .then(function (sleepMs) {
        return sleepMs > 0 ? pause().then(function () { return sleepPromise(sleepMs); }) : null;
    })
        .then(function () {
        return _state.loopId !== loopId
            ? undefined
            : media
                .play()
                .then(function () {
                return sleepPromise(((endTime - startTime) * 1000) / playbackRate);
            })
                .then(function () {
                if (_state.loopId !== loopId)
                    return undefined;
                return media.isPaused()
                    ? messageTasks[MessageType.stop]("loop.iterComplete.paused")
                    : loop(loopId);
            });
    });
}
