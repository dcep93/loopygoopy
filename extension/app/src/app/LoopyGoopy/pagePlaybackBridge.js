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
  let audioContext = null;
  let audioSource = null;
  let audioSourceVideo = null;
  let pitchGraph = null;
  let activePitchSemitones = null;

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

  function getAudioContext() {
    if (!audioContext) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return null;
      audioContext = new AudioContextCtor();
    }
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    return audioContext;
  }

  function getAudioSource(v) {
    const ctx = getAudioContext();
    if (!ctx || !v) return null;
    if (audioSource && audioSourceVideo === v) return audioSource;
    if (audioSource) {
      try {
        audioSource.disconnect();
      } catch (_error) {}
    }
    audioSource = ctx.createMediaElementSource(v);
    audioSourceVideo = v;
    return audioSource;
  }

  function createLoopingControlSource(ctx, values) {
    const buffer = ctx.createBuffer(1, values.length, ctx.sampleRate);
    buffer.getChannelData(0).set(values);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return source;
  }

  function createPitchShiftGraph(ctx, pitchRatio) {
    const input = ctx.createGain();
    const output = ctx.createGain();
    const delaySeconds = 0.1;
    const periodSeconds = Math.max(
      0.05,
      Math.min(2, delaySeconds / Math.abs(pitchRatio - 1))
    );
    const sampleCount = Math.max(1, Math.round(periodSeconds * ctx.sampleRate));
    const isPitchUp = pitchRatio > 1;

    const makeDelayValues = (offset) => {
      const values = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i += 1) {
        const phase = (i / sampleCount + offset) % 1;
        values[i] = delaySeconds * (isPitchUp ? 1 - phase : phase);
      }
      return values;
    };
    const makeFadeValues = (offset) => {
      const values = new Float32Array(sampleCount);
      for (let i = 0; i < sampleCount; i += 1) {
        const phase = (i / sampleCount + offset) % 1;
        values[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
      }
      return values;
    };

    const delay1 = ctx.createDelay(delaySeconds);
    const delay2 = ctx.createDelay(delaySeconds);
    const gain1 = ctx.createGain();
    const gain2 = ctx.createGain();
    delay1.delayTime.value = 0;
    delay2.delayTime.value = 0;
    gain1.gain.value = 0;
    gain2.gain.value = 0;

    const delayMod1 = createLoopingControlSource(ctx, makeDelayValues(0));
    const delayMod2 = createLoopingControlSource(ctx, makeDelayValues(0.5));
    const fadeMod1 = createLoopingControlSource(ctx, makeFadeValues(0));
    const fadeMod2 = createLoopingControlSource(ctx, makeFadeValues(0.5));

    input.connect(delay1);
    input.connect(delay2);
    delay1.connect(gain1);
    delay2.connect(gain2);
    gain1.connect(output);
    gain2.connect(output);
    delayMod1.connect(delay1.delayTime);
    delayMod2.connect(delay2.delayTime);
    fadeMod1.connect(gain1.gain);
    fadeMod2.connect(gain2.gain);

    [delayMod1, delayMod2, fadeMod1, fadeMod2].forEach((source) =>
      source.start()
    );

    return {
      input,
      output,
      stop() {
        [delayMod1, delayMod2, fadeMod1, fadeMod2].forEach((source) => {
          try {
            source.stop();
          } catch (_error) {}
          try {
            source.disconnect();
          } catch (_error) {}
        });
        [input, output, delay1, delay2, gain1, gain2].forEach((node) => {
          try {
            node.disconnect();
          } catch (_error) {}
        });
      },
    };
  }

  function disconnectPitchGraph() {
    if (!pitchGraph) return;
    pitchGraph.stop();
    pitchGraph = null;
  }

  function applyPitchShift(semitones) {
    const v = getVideo();
    const ctx = getAudioContext();
    const source = getAudioSource(v);
    if (!v || !ctx || !source) return false;
    const nextPitchSemitones = Number(semitones) || 0;
    if (activePitchSemitones === nextPitchSemitones) return true;
    activePitchSemitones = nextPitchSemitones;
    const pitchRatio = Math.pow(2, nextPitchSemitones / 12);
    try {
      source.disconnect();
    } catch (_error) {}
    disconnectPitchGraph();
    if (Math.abs(pitchRatio - 1) < 0.0001) {
      source.connect(ctx.destination);
      return true;
    }
    pitchGraph = createPitchShiftGraph(ctx, pitchRatio);
    source.connect(pitchGraph.input);
    pitchGraph.output.connect(ctx.destination);
    return true;
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
    const { action, playbackRate, requestId, semitones } = detail;
    let success = false;
    try {
      if (action === "unlock") {
        success = unlockPlaybackRate(playbackRate);
      } else if (action === "pitch") {
        success = applyPitchShift(semitones);
      } else {
        success = lockPlaybackRate(playbackRate);
      }
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
