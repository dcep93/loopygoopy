(() => {
  if (window.__loopyGoopyPlaybackBridgeActivated) return;
  window.__loopyGoopyPlaybackBridgeActivated = true;

  const REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
  const RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";
  const nativePlaybackRateDescriptor = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    "playbackRate"
  );

  let lockedPlaybackRate = null;
  let lockIntervalId = null;

  function getVideo() {
    return document.querySelector("video");
  }

  function getMoviePlayer() {
    return document.getElementById("movie_player");
  }

  function preservePitch(v) {
    if (!v) return;
    if ("preservesPitch" in v) v.preservesPitch = true;
    if ("mozPreservesPitch" in v) v.mozPreservesPitch = true;
    if ("webkitPreservesPitch" in v) v.webkitPreservesPitch = true;
  }

  function applyNativePlaybackRate(v, playbackRate) {
    if (!v || !nativePlaybackRateDescriptor?.set) return false;
    nativePlaybackRateDescriptor.set.call(v, playbackRate);
    return nativePlaybackRateDescriptor.get?.call(v) === playbackRate;
  }

  function applyYouTubePlayerPlaybackRate(playbackRate) {
    const player = getMoviePlayer();
    if (!player || typeof player.setPlaybackRate !== "function") return false;
    player.setPlaybackRate(playbackRate);
    return true;
  }

  function definePlaybackRateOverride(v, playbackRate) {
    Object.defineProperty(v, "playbackRate", {
      configurable: true,
      set(_) {
        return playbackRate;
      },
      get() {
        return playbackRate;
      },
    });
  }

  function enforceLockedPlaybackRate() {
    if (!(lockedPlaybackRate > 0)) return false;
    const v = getVideo();
    if (!v) return false;
    definePlaybackRateOverride(v, lockedPlaybackRate);
    applyNativePlaybackRate(v, lockedPlaybackRate);
    applyYouTubePlayerPlaybackRate(lockedPlaybackRate);
    return true;
  }

  function startPlaybackRateLockLoop() {
    if (lockIntervalId !== null) return;
    lockIntervalId = window.setInterval(enforceLockedPlaybackRate, 100);
  }

  function stopPlaybackRateLockLoop() {
    if (lockIntervalId === null) return;
    window.clearInterval(lockIntervalId);
    lockIntervalId = null;
  }

  function lockPlaybackRate(playbackRate) {
    const v = getVideo();
    if (!v) return false;
    lockedPlaybackRate = playbackRate;
    preservePitch(v);
    definePlaybackRateOverride(v, playbackRate);
    applyNativePlaybackRate(v, playbackRate);
    applyYouTubePlayerPlaybackRate(playbackRate);
    startPlaybackRateLockLoop();
    enforceLockedPlaybackRate();
    return true;
  }

  function unlockPlaybackRate(playbackRate) {
    lockedPlaybackRate = null;
    stopPlaybackRateLockLoop();
    const v = getVideo();
    if (!v) return false;
    delete v.playbackRate;
    preservePitch(v);
    applyNativePlaybackRate(v, playbackRate);
    applyYouTubePlayerPlaybackRate(playbackRate);
    return true;
  }

  document.addEventListener(REQUEST_EVENT, (event) => {
    const detail = event.detail || {};
    const { action, playbackRate, requestId } = detail;
    let success = false;
    try {
      success =
        action === "unlock"
          ? unlockPlaybackRate(playbackRate)
          : lockPlaybackRate(playbackRate);
    } catch (_error) {
      success = false;
    }
    document.dispatchEvent(
      new CustomEvent(RESPONSE_EVENT, {
        detail: { requestId, success },
      })
    );
  });
})();
