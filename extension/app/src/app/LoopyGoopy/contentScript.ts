enum MessageType {
  start,
  stop,
  init,
}

enum Field {
  original_BPM,
  beats_per_loop,
  count__in_beats,
  count__in_style,
  tempo_change,
  train_target,
  train_loops,
  start_time,
  end_time,
  notes,
  pitch_shift,
}

enum CountInStyle {
  silent,
  track,
  metronome,
}

type NumberConfigType = { [f in Field]?: number };

const START_SLEEP_MS = 1000;
const DEFAULT_BPM = 60;
const PAGE_PLAYBACK_SCRIPT_PATH = "app/src/app/LoopyGoopy/pagePlaybackBridge.js";
const PAGE_PLAYBACK_SCRIPT_ID = "loopy-goopy-page-playback-bridge";
const PAGE_PLAYBACK_REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
const PAGE_PLAYBACK_RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";
const FRAME_MESSAGE_SOURCE = "LoopyGoopy.frameMessage";
const PARENT_MESSAGE_SOURCE = "LoopyGoopy.parentMessage";
const DRIVE_FOLDER_PATH_RE = /^\/drive\/folders\/([^/?#]+)/;
const DRIVE_ID_RE = /^[A-Za-z0-9_-]{20,}$/;
const DRIVE_ID_IN_TEXT_RE = /[A-Za-z0-9_-]{20,}/g;
const YOUTUBE_IFRAME_SELECTOR =
  'iframe[src*="youtube.googleapis.com/embed"], iframe[src*="youtube.com/embed"], iframe[src*="youtube-nocookie.com/embed"]';

type MediaElement = HTMLVideoElement | HTMLAudioElement;
type MediaTarget = {
  root: Element;
  getDuration: () => number;
  isPaused: () => boolean;
  setCurrentTime: (time: number) => void;
  play: () => Promise<unknown>;
  pause: () => Promise<unknown> | void;
  setPlaybackRate: (playbackRate: number) => void;
  setPitchShift: (semitones: number) => void;
  setOnPause: (handler: (() => void) | null) => void;
  getMediaFingerprint: () => string;
};

var _state: {
  media?: MediaTarget;
  iframe?: HTMLIFrameElement;
  config: NumberConfigType | undefined;
  iter: number;
  loopId: number;
  isPaused: boolean;
};

interface Window {
  chrome: any;
  __loopyGoopyPagePlaybackBridgePromise?: Promise<boolean>;
}

function isYouTubePage() {
  return (
    window.location.host === "www.youtube.com" ||
    window.location.host === "youtube.googleapis.com" ||
    window.location.host === "www.youtube-nocookie.com" ||
    window.location.host === "www.instagram.com" ||
    window.location.protocol === "file:"
  );
}

function ensureYouTubePlaybackBridge() {
  if (!isYouTubePage()) return Promise.resolve(false);
  if (window.__loopyGoopyPagePlaybackBridgePromise) {
    return window.__loopyGoopyPagePlaybackBridgePromise;
  }
  window.__loopyGoopyPagePlaybackBridgePromise = new Promise<boolean>(
    (resolve) => {
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
    }
  );
  return window.__loopyGoopyPagePlaybackBridgePromise;
}

function runYouTubePlaybackAction(
  action: "lock" | "unlock" | "pitch",
  payload: { playbackRate?: number; semitones?: number }
) {
  return ensureYouTubePlaybackBridge().then((isBridgeLoaded) => {
    if (!isBridgeLoaded) return false;
    return new Promise<boolean>((resolve) => {
      const requestId = `LoopyGoopy.playbackRate.${Math.random()}`;
      let isSettled = false;
      const settle = (success: boolean) => {
        if (isSettled) return;
        isSettled = true;
        document.removeEventListener(
          PAGE_PLAYBACK_RESPONSE_EVENT,
          onResponse as EventListener
        );
        resolve(success);
      };
      const onResponse = (event: Event) => {
        const { detail } = event as CustomEvent<{
          requestId?: string;
          success?: boolean;
        }>;
        if (detail?.requestId !== requestId) return;
        settle(detail?.success === true);
      };
      document.addEventListener(
        PAGE_PLAYBACK_RESPONSE_EVENT,
        onResponse as EventListener
      );
      document.dispatchEvent(
        new CustomEvent(PAGE_PLAYBACK_REQUEST_EVENT, {
          detail: { action, ...payload, requestId },
        })
      );
      window.setTimeout(() => settle(false), 250);
    });
  });
}

function lockYouTubePlaybackRate(playbackRate: number) {
  return runYouTubePlaybackAction("lock", { playbackRate });
}

function unlockYouTubePlaybackRate(playbackRate: number) {
  return runYouTubePlaybackAction("unlock", { playbackRate });
}

function setPlaybackRate(playbackRate: number) {
  return lockYouTubePlaybackRate(playbackRate).then((didUseYouTubeLock) => {
    if (!didUseYouTubeLock && _state.media) {
      _state.media.setPlaybackRate(playbackRate);
    }
  });
}

function setPitchShift(semitones: number) {
  return runYouTubePlaybackAction("pitch", { semitones }).then(
    (didUseYouTubePitchShift) => {
      if (!didUseYouTubePitchShift && _state.media) {
        _state.media.setPitchShift(semitones);
      }
    }
  );
}

function pause() {
  const media = _state.media;
  if (!media) return Promise.resolve();
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

const messageTasks: { [mType in MessageType]: (payload: any) => any } = {
  [MessageType.start]: (payload: { config: NumberConfigType }) => {
    ensureState();
    if (_state.iframe && !_state.media) {
      return Promise.resolve().then(() =>
        sendFrameMessage(_state.iframe!, MessageType.start, payload)
      );
    }
    return _state.media === undefined
      ? Promise.resolve().then(() => {
          alert("Loopy Goopy could not find playable audio/video on this page.");
        })
      : Promise.resolve(Math.random()).then((loopId) => {
        const media = _state.media!;
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
          .then(() =>
            Object.assign(_state, {
              ...payload,
              loopId,
              iter: 0,
            })
          )
          .then(() => loop(loopId))
      });
  },
  [MessageType.stop]: () => {
    ensureState();
    if (_state.iframe && !_state.media) {
      return Promise.resolve()
        .then(() => sendFrameMessage(_state.iframe!, MessageType.stop, {}))
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
      .then(() =>
        Promise.all([unlockYouTubePlaybackRate(1), setPitchShift(0)])
      )
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
};

function listenForMessage(
  f: (data: any, sendResponse: (sendData: any) => void) => void
) {
  window.chrome.runtime.onMessage.addListener(
    (data: any, _sender: any, sendResponse: (sendData: any) => void) => {
      f(data, sendResponse);
      return true;
    }
  );
}

function sendFrameMessage(
  iframe: HTMLIFrameElement,
  mType: MessageType,
  payload: any
) {
  iframe.contentWindow?.postMessage(
    {
      source: FRAME_MESSAGE_SOURCE,
      mType,
      payload,
    },
    "*"
  );
}

function sendParentTitle(title: string) {
  if (!isEmbeddedFrame()) return;
  window.parent.postMessage(
    {
      source: PARENT_MESSAGE_SOURCE,
      title,
    },
    "*"
  );
}

function listenForParentMessage() {
  window.addEventListener("message", (event) => {
    if (event.source !== _state?.iframe?.contentWindow) return;
    const data = event.data;
    if (!data || data.source !== PARENT_MESSAGE_SOURCE) return;
    if (typeof data.title === "string") {
      document.title = data.title;
    }
  });
}

function listenForFrameMessage() {
  window.addEventListener("message", (event) => {
    if (event.source !== window.parent) return;
    const data = event.data;
    if (!data || data.source !== FRAME_MESSAGE_SOURCE) return;
    Promise.resolve(data.payload)
      .then(messageTasks[data.mType as MessageType])
      .catch((e) => {
        console.error(e);
      });
  });
}

function isEmbeddedFrame() {
  return window.self !== window.top;
}

var initialTitle: string;

function activate() {
  console.log("LoopyGoopy.activate")
  initialTitle = document.title;
  if (isEmbeddedFrame()) {
    listenForFrameMessage();
    return;
  }
  ensureState();
  listenForParentMessage();
  listenForMessage((data: { mType: MessageType; payload: any }, sendResponse) =>
    Promise.resolve(data.payload)
      .then(messageTasks[data.mType])
      .then(sendResponse)
      .catch((e) => {
        alert(e);
        throw e;
      })
  );
}

function sleepPromise(sleepMs: number) {
  if (!(sleepMs > 0)) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, sleepMs));
}

activate();

//

function init() {
  return Promise.resolve().then(() => {
    ensureState();
    if (_state.media) {
      return {
        success: true,
        mediaId: getMediaId(_state.media),
      };
    }
    if (_state.iframe) {
      return {
        success: true,
        mediaId: getIframeMediaId(_state.iframe),
      };
    }
    return {
      success: false,
      alert: "Loopy Goopy could not find playable audio/video on this page yet.",
    };
  });
}

function ensureState() {
  if (!_state) {
    _state = {
      config: undefined,
      iter: -1,
      loopId: -1,
      isPaused: false,
    };
  }
  if (!_state.media) {
    _state.media = findMediaTarget();
  }
  if (!_state.iframe) {
    _state.iframe = findYouTubeIframe();
  }
}

function findMediaTarget(): MediaTarget | undefined {
  const mediaElement =
    document.getElementsByTagName("video")[0] ||
    document.getElementsByTagName("audio")[0];
  return mediaElement ? createNativeMediaTarget(mediaElement) : undefined;
}

function createNativeMediaTarget(element: MediaElement): MediaTarget {
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
    getMediaFingerprint: () =>
      `${initialTitle || document.title}-${window.location.host ||
      (Array.from(element.children)[0] as HTMLSourceElement | undefined)?.src ||
      element.currentSrc ||
      element.src
      }-${element.duration}`,
  };
}

function findYouTubeIframe() {
  if (window.self !== window.top) return undefined;
  return (
    document.querySelector<HTMLIFrameElement>(YOUTUBE_IFRAME_SELECTOR) ||
    undefined
  );
}

function getMediaId(media: MediaTarget) {
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

function getIframeMediaId(iframe: HTMLIFrameElement) {
  const driveFolderId = getDriveFolderId();
  if (driveFolderId) {
    const driveFileId = findDriveFileId(driveFolderId, iframe);
    if (driveFileId) {
      return `drive-folder:${driveFolderId}:file:${driveFileId}`;
    }
    return `drive-folder:${driveFolderId}:iframe:${iframe.id || iframe.src}`;
  }
  return `${initialTitle || document.title}-${iframe.src || iframe.title}`;
}

function getDriveFolderId() {
  if (window.location.host !== "drive.google.com") return undefined;
  const match = window.location.pathname.match(DRIVE_FOLDER_PATH_RE);
  return match?.[1];
}

function findDriveFileId(folderId: string, rootElement: Element) {
  const roots: Array<Element | Document> = [rootElement];
  let ancestor: Element | null = rootElement.parentElement;
  for (let depth = 0; ancestor && depth < 8; depth += 1) {
    roots.push(ancestor);
    ancestor = ancestor.parentElement;
  }
  const activeElement = document.activeElement;
  if (activeElement) roots.push(activeElement);
  document
    .querySelectorAll(
      [
        '[aria-selected="true"]',
        '[aria-checked="true"]',
        '[data-selected="true"]',
        '[role="dialog"]',
        '[aria-modal="true"]',
        'iframe[src*="/file/d/"]',
        'iframe[src*="id="]',
        'a[href*="/file/d/"]',
        'a[href*="id="]',
      ].join(",")
    )
    .forEach((root) => roots.push(root));

  for (const root of roots) {
    const id = findDriveFileIdInRoot(root, folderId);
    if (id) return id;
  }

  const documentIds = collectDriveFileIds(document, folderId);
  return documentIds.length === 1 ? documentIds[0] : undefined;
}

function findDriveFileIdInRoot(root: Element | Document, folderId: string) {
  const ids = collectDriveFileIds(root, folderId);
  return ids[0];
}

function collectDriveFileIds(root: Element | Document, folderId: string) {
  const ids: string[] = [];
  const pushId = (id: string | undefined) => {
    if (!id || id === folderId || ids.includes(id)) return;
    ids.push(id);
  };
  const inspectValue = (value: string | undefined | null) => {
    if (!value) return;
    const decodedValues = [value];
    try {
      const decodedValue = decodeURIComponent(value);
      if (decodedValue !== value) decodedValues.push(decodedValue);
    } catch {
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
  const inspectElement = (element: Element) => {
    Array.from(element.attributes).forEach((attribute) =>
      inspectValue(attribute.value)
    );
  };
  if (root instanceof Element) inspectElement(root);
  root.querySelectorAll("*").forEach(inspectElement);
  return ids;
}

function loop(loopId: number): Promise<void> {
  if (_state.loopId !== loopId) return Promise.resolve();
  if (!_state.media) return Promise.resolve();
  const media = _state.media;
  const config = _state.config!;
  const rawOriginalBPM = config[Field.original_BPM];
  const bpm = rawOriginalBPM! > 0 ? rawOriginalBPM! : DEFAULT_BPM;
  const tempoChange = config[Field.tempo_change] || 1;
  const trainTarget = config[Field.train_target] || tempoChange;
  const playbackRate =
    _state.iter < (config[Field.train_loops] || 1)
      ? tempoChange +
      (_state.iter++ / (config[Field.train_loops] || 1)) *
      (trainTarget - tempoChange)
      : trainTarget;
  const countInS =
    ((config[Field.count__in_beats] || 0) * 60) / bpm / playbackRate;
  const rawStartTime = Math.max(
    0,
    config[Field.start_time] || Number.NEGATIVE_INFINITY
  );
  const startTime =
    config[Field.count__in_style] === CountInStyle.track
      ? Math.max(0, rawStartTime - countInS)
      : rawStartTime;
  media.setCurrentTime(startTime);
  const mediaDuration = media.getDuration();
  const rawEndTime = config[Field.end_time] || mediaDuration;
  const endTime =
    rawEndTime > rawStartTime ? rawEndTime : mediaDuration;
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
    .then(() =>
    ({
      [CountInStyle.silent]: () => countInS * 1000,
      [CountInStyle.track]: () => (countInS - rawStartTime) * 1000,
      [CountInStyle.metronome]: () => {
        throw new Error("loop.CountInStyle.metronome");
      },
    }[(config[Field.count__in_style] || 0) as CountInStyle]())
    )
    .then((sleepMs) =>
      sleepMs > 0 ? pause().then(() => sleepPromise(sleepMs)) : null
    )
    .then(() =>
      _state.loopId !== loopId
        ? undefined
        : media
          .play()
          .then(() =>
            sleepPromise(((endTime - startTime) * 1000) / playbackRate)
          )
          .then(() => {
            if (_state.loopId !== loopId) return undefined;
            return media.isPaused()
              ? messageTasks[MessageType.stop]("loop.iterComplete.paused")
              : loop(loopId);
          })
    );
}
