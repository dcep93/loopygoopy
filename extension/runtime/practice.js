"use strict";
(() => {
  // src/practice/model.ts
  var paused = { phase: "paused", running: false, beat: 1, remaining: 0, cycle: 0 };
  function validDefinition(v, id) {
    return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) && v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === "string" && v.title.length > 0 && v.title.length < 200 && Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 && Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === "published");
  }
  function validPreferences(v) {
    const lead = (l) => l && Number.isInteger(l.beats) && l.beats >= 0 && l.beats <= 32 && ["track", "silent", "metronome"].includes(l.style);
    return Boolean(v && Number.isInteger(v.first) && Number.isInteger(v.last) && v.first >= 1 && v.last <= 32 && v.first <= v.last && (v.first - 1) % 4 === 0 && v.last % 4 === 0 && Number.isFinite(v.speed) && v.speed >= 0.25 && v.speed <= 1.5 && lead(v.leadIn) && lead(v.leadOut));
  }
  function interval(d, p) {
    const beatSeconds = 60 / d.bpm;
    return { start: d.firstBeat + (p.first - 1) * beatSeconds, end: d.firstBeat + p.last * beatSeconds, beatSeconds };
  }

  // src/practice/engine.ts
  var PracticeEngine = class {
    constructor(media, definition, prefs, publish, now = () => performance.now()) {
      this.media = media;
      this.definition = definition;
      this.prefs = prefs;
      this.publish = publish;
      this.now = now;
      this.generation = 0;
      this.tones = /* @__PURE__ */ new Set();
      this.controlled = false;
      this.state = { ...paused };
      this.originalRate = media.playbackRate;
      this.originalLoop = media.loop;
    }
    emit(patch) {
      this.state = { ...this.state, ...patch };
      this.publish(this.state);
    }
    alive(g) {
      return this.generation === g;
    }
    wait(ms, g) {
      if (!this.alive(g)) return Promise.resolve();
      return new Promise((resolve) => {
        this.cancelWait = resolve;
        this.timer = setTimeout(() => {
          this.cancelWait = void 0;
          resolve();
        }, ms);
      });
    }
    pause() {
      this.generation++;
      clearTimeout(this.timer);
      this.cancelWait?.();
      this.cancelWait = void 0;
      this.tones.forEach((t) => {
        try {
          t.stop();
        } catch {
        }
      });
      this.tones.clear();
      this.media.pause();
      this.emit({ running: false, phase: "paused", remaining: 0 });
    }
    dispose() {
      if (this.controlled) {
        this.pause();
        this.media.playbackRate = this.originalRate;
        this.media.loop = this.originalLoop;
      }
      void this.audio?.close();
    }
    async update(p) {
      if (!validPreferences(p)) throw Error("Invalid practice settings.");
      this.controlled = true;
      const running = this.state.running;
      this.pause();
      this.prefs = p;
      if (running) return this.play();
      const g = this.generation;
      try {
        await this.seek(interval(this.definition, p).start, g);
      } catch (e) {
        if (this.alive(g)) this.emit({ phase: "error", error: String(e) });
      }
      if (this.alive(g) && !this.state.running) this.emit({ beat: p.first });
    }
    async seek(time, g) {
      if (!this.alive(g)) return;
      this.media.pause();
      this.media.currentTime = Math.max(0, Math.min(time, this.media.duration));
      const deadline = this.now() + 15e3;
      while (this.alive(g) && (this.media.seeking || this.media.readyState < 2)) {
        if (this.now() > deadline) throw Error("The video is taking too long to seek. Try Play again.");
        await this.wait(25, g);
      }
    }
    click(accent) {
      const context = this.audio;
      if (!context || context.state !== "running") return;
      const oscillator = context.createOscillator(), gain = context.createGain(), at = context.currentTime;
      oscillator.frequency.value = accent ? 1e3 : 760;
      gain.gain.setValueAtTime(1e-4, at);
      gain.gain.exponentialRampToValueAtTime(0.12, at + 4e-3);
      gain.gain.exponentialRampToValueAtTime(1e-4, at + 0.055);
      oscillator.connect(gain);
      gain.connect(context.destination);
      this.tones.add(oscillator);
      oscillator.onended = () => {
        this.tones.delete(oscillator);
        oscillator.disconnect();
        gain.disconnect();
      };
      oscillator.start(at);
      oscillator.stop(at + 0.06);
    }
    async frozen(beats, phase, sound, g) {
      if (!(beats > 0) || !this.alive(g)) return;
      const ms = 6e4 / this.definition.bpm / this.prefs.speed, start = this.now();
      let clicked = -1;
      this.media.pause();
      while (this.alive(g)) {
        const elapsed = this.now() - start;
        if (elapsed >= beats * ms) break;
        const index = Math.floor(elapsed / ms);
        this.emit({ phase, remaining: Math.ceil(beats - elapsed / ms) });
        if (sound && index !== clicked) {
          this.click(index === 0);
          clicked = index;
        }
        await this.wait(16, g);
      }
    }
    async moving(from, to, phase, g) {
      if (!this.alive(g) || to <= from) return;
      this.emit({ phase: "seeking" });
      await this.seek(from, g);
      if (!this.alive(g)) return;
      this.media.playbackRate = this.prefs.speed;
      this.media.loop = false;
      await this.media.play();
      if (!this.alive(g)) return;
      let previous = this.media.currentTime, movedAt = this.now();
      while (this.alive(g)) {
        const time = this.media.currentTime;
        if (time >= to - 0.012 || this.media.ended) break;
        if (this.media.paused) {
          this.pause();
          return;
        }
        if (time !== previous) {
          previous = time;
          movedAt = this.now();
        }
        const buffering = this.media.readyState < 3 || this.media.seeking || this.now() - movedAt > 300;
        this.emit({
          phase: buffering ? "buffering" : phase,
          beat: phase === "practice" ? Math.max(this.prefs.first, Math.min(this.prefs.last, Math.floor((time - this.definition.firstBeat) * this.definition.bpm / 60) + 1)) : this.state.beat,
          remaining: phase === "practice" ? 0 : Math.max(1, Math.ceil((to - time) * this.definition.bpm / 60))
        });
        await this.wait(16, g);
      }
      if (this.alive(g)) this.media.pause();
    }
    async lead(lead, before, g) {
      if (!lead.beats || !this.alive(g)) return;
      const { start, end, beatSeconds } = interval(this.definition, this.prefs);
      const phase = before ? "lead-in" : "lead-out";
      if (lead.style !== "track") {
        await this.seek(before ? start : Math.max(start, end - 0.035), g);
        await this.frozen(lead.beats, phase, lead.style === "metronome", g);
        return;
      }
      const from = before ? Math.max(0, start - lead.beats * beatSeconds) : end;
      const to = before ? start : Math.min(this.media.duration, end + lead.beats * beatSeconds);
      const missing = Math.max(0, lead.beats - (to - from) / beatSeconds);
      if (before && missing) {
        await this.seek(0, g);
        await this.frozen(missing, phase, false, g);
      }
      await this.moving(from, to, phase, g);
      if (!before && missing) await this.frozen(missing, phase, false, g);
    }
    async play() {
      this.controlled = true;
      this.pause();
      const g = this.generation;
      const { end } = interval(this.definition, this.prefs);
      if (!Number.isFinite(this.media.duration) || end > this.media.duration) {
        this.emit({ phase: "error", error: "The prepared section does not fit this video, or the video is still loading." });
        return;
      }
      if ([this.prefs.leadIn.style, this.prefs.leadOut.style].includes("metronome")) {
        let timeout;
        try {
          this.audio ||= new AudioContext();
          await Promise.race([this.audio.resume(), new Promise((_, reject) => {
            timeout = setTimeout(() => reject(Error("Audio blocked")), 2e3);
          })]);
        } catch {
          if (this.alive(g)) this.emit({ phase: "error", error: "Click the video once to enable metronome audio, then try Play again." });
          return;
        } finally {
          clearTimeout(timeout);
        }
      }
      if (!this.alive(g)) return;
      this.emit({ running: true, phase: "seeking", error: void 0, cycle: 0 });
      try {
        while (this.alive(g)) {
          this.emit({ cycle: this.state.cycle + 1, beat: this.prefs.first });
          await this.lead(this.prefs.leadIn, true, g);
          const { start, end: end2 } = interval(this.definition, this.prefs);
          await this.moving(start, end2, "practice", g);
          await this.lead(this.prefs.leadOut, false, g);
        }
      } catch (e) {
        if (this.alive(g)) {
          this.pause();
          this.emit({ phase: "error", error: e instanceof Error ? e.message : String(e) });
        }
      }
    }
  };

  // src/practice/pageLayout.ts
  var practicePageCSS = `
html.loopy-practice {
  --loopy-controls-height: 224px;
  --loopy-video-height: max(192px, calc(100dvh - var(--loopy-controls-height) - 34px));
  background: #0c0907 !important;
}
html.loopy-practice body {
  background: radial-gradient(circle at top left, rgba(255,123,195,.12), transparent 24%),
    radial-gradient(circle at top right, rgba(201,156,107,.14), transparent 32%),
    linear-gradient(180deg, #1a1411, #0c0907) !important;
}
html.loopy-practice :is(ytd-masthead, #secondary, #below, #comments, ytd-miniplayer, ytd-guide-renderer) { display: none !important; }
/* YouTube's ambient canvases extend beyond the player and paint over siblings. */
html.loopy-practice #cinematics { display: none !important; }
html.loopy-practice ytd-app { background: transparent !important; }
html.loopy-practice ytd-page-manager { margin: 0 !important; }
html.loopy-practice ytd-watch-flexy { --ytd-watch-flexy-masthead-height: 0px; }
html.loopy-practice #columns { padding: 12px !important; max-width: none !important; margin: 0 !important; display: block !important; }
html.loopy-practice #primary { padding: 0 !important; margin: 0 !important; max-width: none !important; width: 100% !important; }
html.loopy-practice #primary-inner { display: flex !important; flex-direction: column !important; gap: 10px; width: 100% !important; }
html.loopy-practice #loopy-practice-panel { position: relative; z-index: 1; order: -1; display: block; flex: none; width: 100%; max-width: 1248px; height: var(--loopy-controls-height); margin: 0 auto; border: 0; border-radius: 16px; color-scheme: dark; }
html.loopy-practice #player { isolation: isolate; flex: none !important; width: 100% !important; height: var(--loopy-video-height) !important; margin: 0 !important; }
html.loopy-practice :is(#player-container-outer, #player-container-inner, #player-container, ytd-player, #container.ytd-player) {
  width: 100% !important; height: 100% !important; min-height: 0 !important; max-height: none !important;
  max-width: none !important; padding: 0 !important; margin: 0 !important;
}
html.loopy-practice #movie_player { width: 100% !important; height: 100% !important; background: transparent !important; }
html.loopy-practice #movie_player .html5-video-container { width: 100% !important; height: 100% !important; }
html.loopy-practice #movie_player video { object-fit: contain !important; width: 100% !important; height: 100% !important; left: 0 !important; top: 0 !important; }
`;

  // src/practice/content.ts
  if (window === window.top && location.hostname === "www.youtube.com") {
    let restore2 = function() {
      const wasPractice = document.documentElement.classList.contains("loopy-practice");
      frame?.remove();
      style?.remove();
      frame = void 0;
      style = void 0;
      document.documentElement.classList.remove("loopy-practice");
      document.documentElement.style.removeProperty("--loopy-controls-height");
      if (wasPractice && !disposed) requestAnimationFrame(() => {
        if (!disposed && !document.documentElement.classList.contains("loopy-practice")) {
          window.dispatchEvent(new Event("resize"));
        }
      });
    }, teardown2 = function() {
      engine?.dispose();
      engine = void 0;
      observedVideo = void 0;
      configuration = void 0;
      restore2();
      token = "";
    }, exit2 = function(manual = false) {
      practiceRequested = false;
      engine?.dispose();
      engine = void 0;
      restore2();
      const url = new URL(location.href);
      url.searchParams.delete("loopygoopy");
      if (url.hash === "#loopygoopy") url.hash = "";
      history.replaceState(history.state, "", url.href);
      href = location.href;
      if (manual) {
        frame = document.createElement("iframe");
        frame.title = "Loopy Goopy manual controls";
        frame.src = chrome.runtime.getURL(`app/build/index.html?practice=1&session=${token}&manual=1`);
        frame.style.cssText = "width:100%;height:680px;border:0";
        document.querySelector("#primary-inner")?.appendChild(frame);
      }
    }, configure2 = function() {
      if (document.querySelector("#movie_player.ad-showing")) {
        if (engine?.state.running) engine.pause();
        return;
      }
      const media = document.querySelector("#movie_player video");
      if (!media || !configuration || !validDefinition(configuration.definition, videoId) || !validPreferences(configuration.prefs)) return;
      if (engine && observedVideo === media) return;
      engine?.dispose();
      observedVideo = media;
      engine = new PracticeEngine(media, configuration.definition, configuration.prefs, (playback) => {
        const now = performance.now();
        if (now - lastReport > 80 || !playback.running || playback.phase === "error") {
          post({ type: "playback", playback });
          lastReport = now;
        }
      });
    }, mount2 = function() {
      if (!token || frame || !practiceRequested) return;
      const parent = document.querySelector("#primary-inner");
      if (!parent || !document.head || !document.querySelector("#movie_player video")) return;
      observedVideo?.pause();
      document.querySelector("#movie_player video")?.pause();
      style = document.createElement("style");
      style.textContent = practicePageCSS;
      document.head.appendChild(style);
      document.documentElement.classList.add("loopy-practice");
      frame = document.createElement("iframe");
      frame.id = "loopy-practice-panel";
      frame.title = "Loopy Goopy practice controls";
      frame.src = chrome.runtime.getURL(`app/build/index.html?practice=1&session=${token}`);
      parent.prepend(frame);
    }, connect2 = function() {
      if (disposed || !videoId) return;
      try {
        const currentPort = chrome.runtime.connect({ name: "loopy-practice-host" });
        port = currentPort;
        currentPort.onMessage.addListener((m) => {
          if (port !== currentPort) return;
          if (m.type === "bound") {
            if (token && token !== m.token) restore2();
            token = m.token;
            mount2();
          }
          if (m.type === "configure") {
            engine?.dispose();
            engine = void 0;
            configuration = m;
            configure2();
          }
          if (m.type === "preferences" && validPreferences(m.prefs)) {
            if (configuration) configuration.prefs = m.prefs;
            void engine?.update(m.prefs);
          }
          if (m.type === "play") {
            if (document.querySelector("#movie_player.ad-showing")) {
              post({ type: "playback", playback: { phase: "error", running: false, beat: 1, remaining: 0, cycle: 0, error: "Wait for the ad to finish, then press Play." } });
              return;
            }
            configure2();
            window.dispatchEvent(new Event("loopy-practice-start"));
            void engine?.play();
          }
          if (m.type === "pause") engine?.pause();
          if (m.type === "exit") exit2();
          if (m.type === "manual") exit2(true);
          if (m.type === "height" && frame && Number.isFinite(m.height) && m.height > 0) {
            frame.style.height = `${m.height}px`;
            if (practiceRequested) document.documentElement.style.setProperty("--loopy-controls-height", `${m.height}px`);
          }
        });
        currentPort.onDisconnect.addListener(() => {
          if (port !== currentPort) return;
          engine?.pause();
          if (!disposed && videoId) setTimeout(connect2, 750);
        });
        post({ type: "hello", mediaId: videoId, url: location.href });
      } catch {
        engine?.pause();
      }
    }, inspect2 = function() {
      if (disposed) return;
      if (href !== location.href) {
        href = location.href;
        const url = new URL(href), id = url.pathname === "/watch" ? url.searchParams.get("v") : null;
        const nextVideoId = id && /^[\w-]{11}$/.test(id) ? `youtube:${id}` : "";
        const requested = url.searchParams.has("loopygoopy") || url.hash === "#loopygoopy";
        const changedVideo = nextVideoId !== videoId;
        practiceRequested = !!nextVideoId && (requested || !changedVideo && practiceRequested);
        if (practiceRequested && !url.searchParams.has("loopygoopy")) {
          url.searchParams.set("loopygoopy", "");
          history.replaceState(history.state, "", url.href);
          href = location.href;
        }
        if (changedVideo) {
          videoId = "";
          const oldPort = port;
          port = void 0;
          oldPort?.disconnect();
          teardown2();
          videoId = nextVideoId;
          connect2();
        }
      }
      configure2();
      mount2();
    };
    restore = restore2, teardown = teardown2, exit = exit2, configure = configure2, mount = mount2, connect = connect2, inspect = inspect2;
    let port, engine, token = "", href = "", videoId = "";
    let frame, style, observedVideo;
    let configuration, disposed = false, lastReport = 0, practiceRequested = false;
    const post = (message) => {
      try {
        port?.postMessage(message);
      } catch {
      }
    };
    const manualControl = () => {
      if (engine?.state.running) engine.pause();
    };
    window.addEventListener("loopy-manual-control", manualControl);
    const timer = setInterval(inspect2, 500);
    inspect2();
    document.addEventListener("yt-navigate-start", inspect2);
    document.addEventListener("yt-navigate-finish", inspect2);
    window.addEventListener("popstate", inspect2);
    window.addEventListener("hashchange", inspect2);
    window.addEventListener("pagehide", () => {
      disposed = true;
      window.removeEventListener("loopy-manual-control", manualControl);
      document.removeEventListener("yt-navigate-start", inspect2);
      document.removeEventListener("yt-navigate-finish", inspect2);
      window.removeEventListener("popstate", inspect2);
      window.removeEventListener("hashchange", inspect2);
      clearInterval(timer);
      teardown2();
      port?.disconnect();
    }, { once: true });
  }
  var restore;
  var teardown;
  var exit;
  var configure;
  var mount;
  var connect;
  var inspect;
})();
