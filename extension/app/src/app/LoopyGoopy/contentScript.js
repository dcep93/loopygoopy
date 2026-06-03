"use strict";
var MessageType;
(function (MessageType) {
    MessageType[MessageType["start"] = 0] = "start";
    MessageType[MessageType["stop"] = 1] = "stop";
    MessageType[MessageType["init"] = 2] = "init";
    MessageType[MessageType["debug"] = 3] = "debug";
    MessageType[MessageType["seek"] = 4] = "seek";
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
const START_SLEEP_MS = 1000;
const DEFAULT_BPM = 60;
const PAGE_PLAYBACK_SCRIPT_PATH = "app/src/app/LoopyGoopy/pagePlaybackBridge.js";
const PAGE_PLAYBACK_SCRIPT_ID = "loopy-goopy-page-playback-bridge";
const PAGE_PLAYBACK_REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
const PAGE_PLAYBACK_RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";
const FRAME_MESSAGE_SOURCE = "LoopyGoopy.frameMessage";
const FRAME_RESPONSE_SOURCE = "LoopyGoopy.frameResponse";
const PARENT_MESSAGE_SOURCE = "LoopyGoopy.parentMessage";
const LOG_PREFIX = "[LoopyGoopy]";
const DEFAULT_COUNT_IN_STYLE = CountInStyle.track;
const DRIVE_FOLDER_PATH_RE = /^\/drive\/folders\/([^/?#]+)/;
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,}$/;
const DRIVE_ID_IN_TEXT_RE = /[A-Za-z0-9_-]{20,}/g;
const YOUTUBE_IFRAME_SELECTOR = 'iframe[src*="youtube.googleapis.com/embed"], iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]';
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
    window.__loopyGoopyPagePlaybackBridgePromise = new Promise((resolve) => {
        if (document.getElementById(PAGE_PLAYBACK_SCRIPT_ID)) {
            resolve(true);
            return;
        }
        const scriptUrl = window.chrome.runtime.getURL(PAGE_PLAYBACK_SCRIPT_PATH);
        const script = document.createElement("script");
        script.id = PAGE_PLAYBACK_SCRIPT_ID;
        script.src = scriptUrl;
        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);
        (document.head || document.documentElement).appendChild(script);
    });
    return window.__loopyGoopyPagePlaybackBridgePromise;
}
function runYouTubePlaybackAction(action, payload) {
    return ensureYouTubePlaybackBridge().then((isBridgeLoaded) => {
        if (!isBridgeLoaded)
            return false;
        return new Promise((resolve) => {
            const requestId = `LoopyGoopy.playbackRate.${Math.random()}`;
            let isSettled = false;
            const settle = (success) => {
                if (isSettled)
                    return;
                isSettled = true;
                document.removeEventListener(PAGE_PLAYBACK_RESPONSE_EVENT, onResponse);
                resolve(success);
            };
            const onResponse = (event) => {
                const { detail } = event;
                if (detail?.requestId !== requestId)
                    return;
                settle(detail?.success === true);
            };
            document.addEventListener(PAGE_PLAYBACK_RESPONSE_EVENT, onResponse);
            document.dispatchEvent(new CustomEvent(PAGE_PLAYBACK_REQUEST_EVENT, {
                detail: { action, ...payload, requestId },
            }));
            window.setTimeout(() => settle(false), 250);
        });
    });
}
function lockYouTubePlaybackRate(playbackRate) {
    return runYouTubePlaybackAction("lock", { playbackRate });
}
function unlockYouTubePlaybackRate(playbackRate) {
    return runYouTubePlaybackAction("unlock", { playbackRate });
}
function setPlaybackRate(playbackRate) {
    return lockYouTubePlaybackRate(playbackRate).then((didUseYouTubeLock) => {
        if (!didUseYouTubeLock && _state.media) {
            _state.media.setPlaybackRate(playbackRate);
        }
    });
}
function setPitchShift(semitones) {
    return runYouTubePlaybackAction("pitch", { semitones }).then((didUseYouTubePitchShift) => {
        if (!didUseYouTubePitchShift && _state.media) {
            _state.media.setPitchShift(semitones);
        }
    });
}
function pause() {
    const media = _state.media;
    if (!media)
        return Promise.resolve();
    return Promise.resolve()
        .then(() => (_state.isPaused = true))
        .then(() => {
        if (!media.isPaused()) {
            return media.pause();
        }
    })
        .then(() => {
        _state.isPaused = false;
    });
}
const messageTasks = {
    [MessageType.start]: (payload) => {
        ensureState({ refreshTargets: true, reason: "start" });
        if (_state.iframe && !_state.media) {
            return Promise.resolve().then(() => sendFrameMessage(_state.iframe, MessageType.start, payload));
        }
        return _state.media === undefined
            ? Promise.resolve().then(() => {
                alert("Loopy Goopy could not find playable audio/video on this page.");
            })
            : Promise.resolve(Math.random()).then((loopId) => {
                const media = _state.media;
                return Promise.resolve()
                    .then(() => console.log("messageTasks.start"))
                    .then(() => {
                    media.setOnPause(() => {
                        if (media.isPaused() && !_state.isPaused) {
                            messageTasks[MessageType.stop]("messageTasks.start.pause");
                        }
                    });
                })
                    .then(pause)
                    .then(() => sleepPromise(START_SLEEP_MS))
                    .then(() => Object.assign(_state, {
                    ...payload,
                    loopId,
                    iter: 0,
                }))
                    .then(() => loop(loopId));
            });
    },
    [MessageType.stop]: () => {
        ensureState();
        if (_state.iframe && !_state.media) {
            return Promise.resolve()
                .then(() => sendFrameMessage(_state.iframe, MessageType.stop, {}))
                .then(() => {
                document.title = initialTitle;
            });
        }
        const media = _state.media;
        return Promise.resolve()
            .then(() => console.log("messageTasks.stop"))
            .then(() => {
            media?.setOnPause(null);
        })
            .then(() => (_state.loopId = -1))
            .then(() => media?.pause())
            .then(() => Promise.all([unlockYouTubePlaybackRate(1), setPitchShift(0)]))
            .then((didUnlockYouTubePlaybackRate) => {
            if (!didUnlockYouTubePlaybackRate[0] && media) {
                media.setPlaybackRate(1);
            }
        })
            .then(() => {
            document.title = initialTitle;
            sendParentTitle(initialTitle);
        });
    },
    [MessageType.init]: () => Promise.resolve().then(init),
    [MessageType.debug]: (payload) => {
        const prefix = `[LoopyGoopy ${payload?.source || "popup"}]`;
        const message = payload?.message || "debug";
        const details = payload?.details || "";
        if (payload?.level === "warn") {
            console.warn(prefix, message, details);
        }
        else {
            console.log(prefix, message, details);
        }
        return Promise.resolve({ success: true });
    },
    [MessageType.seek]: (payload) => {
        ensureState({ refreshTargets: true, reason: "seek" });
        if (_state.iframe && !_state.media) {
            return Promise.resolve().then(() => sendFrameMessage(_state.iframe, MessageType.seek, payload));
        }
        const time = Number(payload?.time);
        if (!Number.isFinite(time))
            return Promise.resolve({ success: false });
        if (!_state.media) {
            console.info(LOG_PREFIX, "seek skipped: no media target", { time });
            return Promise.resolve({ success: false });
        }
        _state.media.setCurrentTime(Math.max(0, time));
        return Promise.resolve({ success: true });
    },
};
function listenForMessage(f) {
    window.chrome.runtime.onMessage.addListener((data, _sender, sendResponse) => {
        f(data, sendResponse);
        return true;
    });
}
function sendFrameMessage(iframe, mType, payload) {
    iframe.contentWindow?.postMessage({
        source: FRAME_MESSAGE_SOURCE,
        mType,
        payload,
    }, "*");
}
function sendFrameRequest(iframe, mType, payload) {
    const requestId = `LoopyGoopy.frameRequest.${Math.random()}`;
    return new Promise((resolve) => {
        let isSettled = false;
        const settle = (response) => {
            if (isSettled)
                return;
            isSettled = true;
            window.removeEventListener("message", onResponse);
            resolve(response);
        };
        const onResponse = (event) => {
            if (event.source !== iframe.contentWindow)
                return;
            const data = event.data;
            if (!data ||
                data.source !== FRAME_RESPONSE_SOURCE ||
                data.requestId !== requestId) {
                return;
            }
            settle(data.payload);
        };
        window.addEventListener("message", onResponse);
        iframe.contentWindow?.postMessage({
            source: FRAME_MESSAGE_SOURCE,
            mType,
            payload,
            requestId,
        }, "*");
        window.setTimeout(() => settle(undefined), 500);
    });
}
function sendParentTitle(title) {
    if (!isEmbeddedFrame())
        return;
    window.parent.postMessage({
        source: PARENT_MESSAGE_SOURCE,
        title,
    }, "*");
}
function listenForParentMessage() {
    window.addEventListener("message", (event) => {
        if (event.source !== _state?.iframe?.contentWindow)
            return;
        const data = event.data;
        if (!data || data.source !== PARENT_MESSAGE_SOURCE)
            return;
        if (typeof data.title === "string") {
            document.title = data.title;
        }
    });
}
function listenForFrameMessage() {
    window.addEventListener("message", (event) => {
        if (event.source !== window.parent)
            return;
        const data = event.data;
        if (!data || data.source !== FRAME_MESSAGE_SOURCE)
            return;
        Promise.resolve(data.payload)
            .then(messageTasks[data.mType])
            .then((payload) => {
            sendFrameResponse(data.requestId, payload);
        })
            .catch((e) => {
            if (isPlayRequestInterruptedByPause(e)) {
                console.info(LOG_PREFIX, "suppressed play/pause interruption", {
                    error: errorToMessage(e),
                });
                sendFrameResponse(data.requestId, {
                    success: false,
                    suppressed: true,
                });
                return;
            }
            sendFrameResponse(data.requestId, {
                success: false,
                alert: errorToMessage(e),
            });
        });
    });
}
function sendFrameResponse(requestId, payload) {
    if (!requestId)
        return;
    try {
        window.parent.postMessage({
            source: FRAME_RESPONSE_SOURCE,
            requestId,
            payload: makePostMessageSafe(payload),
        }, "*");
    }
    catch (e) {
        console.info(LOG_PREFIX, "could not send frame response", {
            requestId,
            error: errorToMessage(e),
        });
    }
}
function makePostMessageSafe(payload) {
    if (payload === undefined)
        return undefined;
    try {
        return JSON.parse(JSON.stringify(payload));
    }
    catch {
        return {
            success: false,
            alert: "Loopy Goopy could not serialize the embedded media response.",
        };
    }
}
function errorToMessage(error) {
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
}
function isPlayRequestInterruptedByPause(error) {
    const message = errorToMessage(error);
    return (message.includes("play() request was interrupted by a call to pause()") ||
        message.includes("play request was interrupted by a call to pause"));
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
    listenForMessage((data, sendResponse) => Promise.resolve(data.payload)
        .then(messageTasks[data.mType])
        .then(sendResponse)
        .catch((e) => {
        if (isPlayRequestInterruptedByPause(e)) {
            console.info(LOG_PREFIX, "suppressed play/pause interruption", {
                error: errorToMessage(e),
            });
            sendResponse({ success: false, suppressed: true });
            return;
        }
        alert(e);
        throw e;
    }));
}
function sleepPromise(sleepMs) {
    if (!(sleepMs > 0))
        return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, sleepMs));
}
activate();
//
function init() {
    return Promise.resolve().then(() => {
        ensureState({ refreshTargets: true, reason: "init" });
        if (_state.media) {
            return {
                success: true,
                mediaId: getMediaId(_state.media),
                currentTime: _state.media.getCurrentTime(),
            };
        }
        if (_state.iframe) {
            const mediaId = getIframeMediaId(_state.iframe);
            return sendFrameRequest(_state.iframe, MessageType.init, {}).then((frameResponse) => ({
                success: true,
                mediaId,
                currentTime: frameResponse?.currentTime,
            }));
        }
        return {
            success: false,
            alert: "Loopy Goopy could not find playable audio/video on this page yet.",
        };
    });
}
function ensureState(options = {}) {
    if (!_state) {
        _state = {
            config: undefined,
            iter: -1,
            loopId: -1,
            isPaused: false,
        };
    }
    if (options.refreshTargets) {
        refreshCachedTargets(options.reason || "refresh");
    }
    if (!_state.media) {
        _state.media = findMediaTarget();
    }
    if (!_state.iframe) {
        _state.iframe = findYouTubeIframe();
    }
}
function refreshCachedTargets(reason) {
    let didReplaceTarget = false;
    const previousMedia = _state.media;
    const nextMedia = findMediaTarget();
    if (previousMedia?.root !== nextMedia?.root) {
        previousMedia?.setOnPause(null);
        _state.media = nextMedia;
        didReplaceTarget = true;
    }
    const previousIframe = _state.iframe;
    const nextIframe = findYouTubeIframe();
    if (previousIframe !== nextIframe) {
        _state.iframe = nextIframe;
        didReplaceTarget = true;
    }
    if (didReplaceTarget) {
        _state.loopId = -1;
    }
    logTargetRefresh(reason, previousMedia, nextMedia, previousIframe, nextIframe);
}
function findMediaTarget() {
    const mediaElement = chooseBestMediaElement();
    return mediaElement ? createNativeMediaTarget(mediaElement) : undefined;
}
function chooseBestMediaElement() {
    const mediaElements = Array.from(document.querySelectorAll("video, audio")).filter((element) => element.isConnected);
    if (!mediaElements.length)
        return undefined;
    return mediaElements
        .map((element, index) => ({
        element,
        score: mediaElementScore(element, index),
    }))
        .sort((a, b) => b.score - a.score)[0]?.element;
}
function mediaElementScore(element, index) {
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    const hasSource = Boolean(Array.from(element.children)[0]?.src ||
        element.currentSrc ||
        element.src);
    const hasDuration = Number.isFinite(element.duration) && element.duration > 0;
    return (area * 1000 +
        (hasSource ? 100 : 0) +
        (hasDuration ? 10 : 0) +
        index);
}
function createNativeMediaTarget(element) {
    return {
        root: element,
        getDuration: () => element.duration,
        isPaused: () => element.paused,
        setCurrentTime: (time) => {
            element.currentTime = time;
        },
        play: () => element.play(),
        pause: () => element.pause(),
        setPlaybackRate: (playbackRate) => {
            element.playbackRate = playbackRate;
        },
        setPitchShift: () => null,
        setOnPause: (handler) => {
            element.onpause = handler;
        },
        getCurrentTime: () => element.currentTime,
        getMediaFingerprint: () => `${getMediaElementSource(element)}-${getStableDuration(element.duration)}`,
    };
}
function getMediaElementSource(element) {
    const mediaSource = Array.from(element.children)[0]?.src ||
        element.currentSrc ||
        element.src;
    if (mediaSource && !mediaSource.startsWith("blob:")) {
        return mediaSource;
    }
    return getStablePageMediaSource();
}
function getStablePageMediaSource() {
    try {
        const url = new URL(window.location.href);
        if (url.hostname.endsWith("youtube.com")) {
            const videoId = url.searchParams.get("v");
            if (videoId)
                return `${url.origin}/watch?v=${videoId}`;
            const shortsId = url.pathname.match(/^\/shorts\/([^/?#]+)/)?.[1];
            if (shortsId)
                return `${url.origin}/shorts/${shortsId}`;
            const embedId = url.pathname.match(/^\/embed\/([^/?#]+)/)?.[1];
            if (embedId)
                return `${url.origin}/embed/${embedId}`;
        }
        if (url.hostname === "youtu.be") {
            const videoId = url.pathname.match(/^\/([^/?#]+)/)?.[1];
            if (videoId)
                return `${url.origin}/${videoId}`;
        }
        url.hash = "";
        return url.toString();
    }
    catch {
        return window.location.href || window.location.host;
    }
}
function getStableDuration(duration) {
    return Number.isFinite(duration) ? duration.toFixed(3) : "unknown-duration";
}
function findYouTubeIframe() {
    if (window.self !== window.top)
        return undefined;
    const iframes = Array.from(document.querySelectorAll(YOUTUBE_IFRAME_SELECTOR)).filter((iframe) => iframe.isConnected);
    if (!iframes.length)
        return undefined;
    return iframes
        .map((iframe, index) => ({
        iframe,
        score: iframeElementScore(iframe, index),
    }))
        .sort((a, b) => b.score - a.score)[0]?.iframe;
}
function iframeElementScore(iframe, index) {
    const rect = iframe.getBoundingClientRect();
    return rect.width * rect.height * 1000 + index;
}
function getMediaId(media) {
    const driveFolderId = getDriveFolderId();
    if (driveFolderId) {
        const driveFileId = findDriveFileId(driveFolderId, media.root);
        if (driveFileId) {
            return `drive-folder:${driveFolderId}:file:${driveFileId}`;
        }
        return `drive-folder:${driveFolderId}:media:${media.getMediaFingerprint()}`;
    }
    return media.getMediaFingerprint();
}
function getIframeMediaId(iframe) {
    const driveFolderId = getDriveFolderId();
    if (driveFolderId) {
        const driveFileId = findDriveFileId(driveFolderId, iframe);
        if (driveFileId) {
            return `drive-folder:${driveFolderId}:file:${driveFileId}`;
        }
        return `drive-folder:${driveFolderId}:iframe:${iframe.id || iframe.src}`;
    }
    return iframe.src || iframe.title || `${initialTitle || document.title}:iframe`;
}
function logTargetRefresh(reason, previousMedia, nextMedia, previousIframe, nextIframe) {
    console.info(LOG_PREFIX, "target refresh", {
        reason,
        previousMedia: describeMediaTarget(previousMedia),
        nextMedia: describeMediaTarget(nextMedia),
        previousIframe: describeIframe(previousIframe),
        nextIframe: describeIframe(nextIframe),
    });
}
function describeMediaTarget(media) {
    if (!media)
        return undefined;
    const rect = media.root.getBoundingClientRect();
    return {
        tag: media.root.tagName.toLowerCase(),
        connected: media.root.isConnected,
        source: getMediaElementSource(media.root),
        duration: media.getDuration(),
        currentTime: media.getCurrentTime(),
        area: Math.round(rect.width * rect.height),
        id: getMediaId(media),
    };
}
function describeIframe(iframe) {
    if (!iframe)
        return undefined;
    const rect = iframe.getBoundingClientRect();
    return {
        connected: iframe.isConnected,
        src: iframe.src,
        title: iframe.title,
        area: Math.round(rect.width * rect.height),
        id: getIframeMediaId(iframe),
    };
}
function getDriveFolderId() {
    if (window.location.host !== "drive.google.com")
        return undefined;
    const match = window.location.pathname.match(DRIVE_FOLDER_PATH_RE);
    return match?.[1];
}
function findDriveFileId(folderId, rootElement) {
    const roots = [rootElement];
    let ancestor = rootElement.parentElement;
    for (let depth = 0; ancestor && depth < 8; depth += 1) {
        roots.push(ancestor);
        ancestor = ancestor.parentElement;
    }
    const activeElement = document.activeElement;
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
        .forEach((root) => roots.push(root));
    for (const root of roots) {
        const id = findDriveFileIdInRoot(root, folderId);
        if (id)
            return id;
    }
    const documentIds = collectDriveFileIds(document, folderId);
    return documentIds.length === 1 ? documentIds[0] : undefined;
}
function findDriveFileIdInRoot(root, folderId) {
    const ids = collectDriveFileIds(root, folderId);
    return ids[0];
}
function collectDriveFileIds(root, folderId) {
    const ids = [];
    const pushId = (id) => {
        if (!id || id === folderId || ids.includes(id))
            return;
        ids.push(id);
    };
    const inspectValue = (value) => {
        if (!value)
            return;
        const decodedValues = [value];
        try {
            const decodedValue = decodeURIComponent(value);
            if (decodedValue !== value)
                decodedValues.push(decodedValue);
        }
        catch {
            // Some Google-generated attribute values are not valid URI components.
        }
        decodedValues.forEach((candidateValue) => {
            pushId(candidateValue.match(/\/file\/d\/([^/?#]+)/)?.[1]);
            pushId(candidateValue.match(/[?&]id=([^&#]+)/)?.[1]);
            const trimmedCandidateValue = candidateValue.trim();
            if (DRIVE_ID_RE.test(trimmedCandidateValue)) {
                pushId(trimmedCandidateValue);
            }
            candidateValue.match(DRIVE_ID_IN_TEXT_RE)?.forEach(pushId);
        });
    };
    const inspectElement = (element) => {
        Array.from(element.attributes).forEach((attribute) => inspectValue(attribute.value));
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
    const media = _state.media;
    const config = _state.config;
    const rawOriginalBPM = config[Field.original_BPM];
    const bpm = rawOriginalBPM > 0 ? rawOriginalBPM : DEFAULT_BPM;
    const tempoChange = config[Field.tempo_change] || 1;
    const trainTarget = config[Field.train_target] || tempoChange;
    const trainLoops = config[Field.train_loops] || 1;
    const loopIter = _state.iter;
    const countInBeats = loopIter === 0 ? config[Field.count__in_beats] || 0 : 0;
    const playbackRate = _state.iter < trainLoops
        ? tempoChange +
            (_state.iter++ / trainLoops) *
                (trainTarget - tempoChange)
        : trainTarget;
    const countInS = (countInBeats * 60) / bpm;
    const countInStyle = (config[Field.count__in_style] ?? DEFAULT_COUNT_IN_STYLE);
    const rawStartTime = Math.max(0, config[Field.start_time] || Number.NEGATIVE_INFINITY);
    const startTime = countInStyle === CountInStyle.track
        ? Math.max(0, rawStartTime - countInS)
        : rawStartTime;
    media.setCurrentTime(startTime);
    const mediaDuration = media.getDuration();
    const rawEndTime = config[Field.end_time] || mediaDuration;
    const endTime = rawEndTime > rawStartTime ? rawEndTime : mediaDuration;
    if (!Number.isFinite(endTime)) {
        alert("Loopy Goopy needs an end time for this embedded player.");
        return messageTasks[MessageType.stop]("loop.endTime.missing");
    }
    const title = `${(bpm * playbackRate).toFixed(2)} BPM - ${(playbackRate * 100).toFixed(2)}% - ${initialTitle}`;
    document.title = title;
    sendParentTitle(title);
    return Promise.resolve()
        .then(() => setPlaybackRate(playbackRate))
        .then(() => setPitchShift(config[Field.pitch_shift] || 0))
        .then(() => runCountIn(countInStyle, {
        bpm,
        countInBeats,
        countInS,
        rawStartTime,
    }))
        .then(() => _state.loopId !== loopId
        ? undefined
        : media
            .play()
            .then(() => sleepPromise(((endTime - startTime) * 1000) / playbackRate))
            .then(() => {
            if (_state.loopId !== loopId)
                return undefined;
            return media.isPaused()
                ? messageTasks[MessageType.stop]("loop.iterComplete.paused")
                : loop(loopId);
        }));
}
function runCountIn(countInStyle, options) {
    const sleepMsByStyle = {
        [CountInStyle.silent]: () => options.countInS * 1000,
        [CountInStyle.track]: () => (options.countInS - options.rawStartTime) * 1000,
        [CountInStyle.metronome]: () => 0,
    };
    const sleepMs = sleepMsByStyle[countInStyle]();
    if (countInStyle === CountInStyle.metronome) {
        return pause().then(() => playMetronomeCountIn(options.countInBeats, options.bpm));
    }
    return sleepMs > 0 ? pause().then(() => sleepPromise(sleepMs)) : undefined;
}
function playMetronomeCountIn(countInBeats, bpm) {
    if (!(countInBeats > 0) || !(bpm > 0))
        return Promise.resolve();
    const beatMs = (60 / bpm) * 1000;
    return new Promise((resolve) => {
        let beat = 0;
        const tick = () => {
            playMetronomeClick(beat === 0);
            beat += 1;
            if (beat >= countInBeats) {
                window.setTimeout(resolve, beatMs);
                return;
            }
            window.setTimeout(tick, beatMs);
        };
        tick();
    });
}
function playMetronomeClick(isAccent) {
    const AudioContextCtor = window.AudioContext ||
        window.webkitAudioContext;
    if (!AudioContextCtor)
        return;
    const audioContext = new AudioContextCtor();
    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.frequency.value = isAccent ? 1200 : 900;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.055);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.06);
}
