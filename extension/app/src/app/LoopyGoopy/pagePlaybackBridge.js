(() => {
  if (window.__loopyGoopyPlaybackBridgeActivated) return;
  window.__loopyGoopyPlaybackBridgeActivated = true;

  const REQUEST_EVENT = "LoopyGoopy.pagePlayback.request";
  const RESPONSE_EVENT = "LoopyGoopy.pagePlayback.response";

  function getVideo() {
    return document.querySelector("video");
  }

  function lockPlaybackRate(playbackRate) {
    const v = getVideo();
    if (!v) return false;
    Object.defineProperty(v, "playbackRate", {
      configurable: true,
      set(_) {
        return playbackRate;
      },
      get() {
        return playbackRate;
      },
    });
    v.playbackRate = playbackRate;
    return true;
  }

  function unlockPlaybackRate(playbackRate) {
    const v = getVideo();
    if (!v) return false;
    delete v.playbackRate;
    v.playbackRate = playbackRate;
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
