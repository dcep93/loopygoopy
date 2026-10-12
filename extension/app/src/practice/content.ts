import { PracticeEngine } from './engine';
import { validDefinition, validPreferences } from './model';
declare const chrome: any;

if (window === window.top && location.hostname === 'www.youtube.com') {
  let port: any, engine: PracticeEngine | undefined, token = '', href = '', videoId = '';
  let frame: HTMLIFrameElement | undefined, style: HTMLStyleElement | undefined, observedVideo: HTMLVideoElement | undefined;
  let configuration: any, disposed = false, lastReport = 0, practiceRequested = false;
  const post = (message: any) => { try { port?.postMessage(message); } catch {} };
  function restore() { frame?.remove(); style?.remove(); frame = undefined; style = undefined; document.documentElement?.classList.remove('loopy-practice'); }
  function teardown() { engine?.dispose(); engine = undefined; observedVideo = undefined; configuration = undefined; restore(); token = ''; }
  function exit(manual = false) {
    practiceRequested = false;
    engine?.dispose(); engine = undefined; restore();
    const url = new URL(location.href); url.searchParams.delete('loopygoopy');
    if (url.hash === '#loopygoopy') url.hash = '';
    history.replaceState(history.state, '', url.href); href = location.href;
    if (manual) { frame = document.createElement('iframe'); frame.title = 'Loopy Goopy manual controls'; frame.src = chrome.runtime.getURL(`app/build/index.html?practice=1&session=${token}&manual=1`); frame.style.cssText = 'width:100%;height:680px;border:0'; document.querySelector('#primary-inner')?.appendChild(frame); }
  }
  function configure() {
    if (document.querySelector('#movie_player.ad-showing')) { if (engine?.state.running) engine.pause(); return; }
    const media = document.querySelector<HTMLVideoElement>('#movie_player video');
    if (!media || !configuration || !validDefinition(configuration.definition, videoId) || !validPreferences(configuration.prefs)) return;
    if (engine && observedVideo === media) return;
    engine?.dispose(); observedVideo = media;
    engine = new PracticeEngine(media, configuration.definition, configuration.prefs, playback => {
      // Bound outbound updates while keeping playback scheduling independent of UI.
      const now = performance.now();
      if (now - lastReport > 80 || !playback.running || playback.phase === 'error') { post({ type: 'playback', playback }); lastReport = now; }
    });
  }
  function mount() {
    if (!token || frame || !practiceRequested) return;
    const parent = document.querySelector('#primary-inner');
    if (!parent || !document.head || !document.querySelector('#movie_player video')) return;
    observedVideo?.pause(); document.querySelector<HTMLVideoElement>('#movie_player video')?.pause();
    style = document.createElement('style');
    style.textContent = `html.loopy-practice{background:#101619!important}html.loopy-practice ytd-masthead,html.loopy-practice #secondary,html.loopy-practice #below,html.loopy-practice #comments,html.loopy-practice ytd-miniplayer,html.loopy-practice ytd-guide-renderer{display:none!important}html.loopy-practice ytd-page-manager{margin:0!important}html.loopy-practice ytd-watch-flexy{--ytd-watch-flexy-masthead-height:0px;--ytd-watch-flexy-max-player-width:1040px}html.loopy-practice #columns{padding:20px!important;max-width:1120px!important;margin:auto!important}html.loopy-practice #primary{padding:0!important;margin:0!important;max-width:100%!important;width:100%!important}html.loopy-practice #primary-inner{width:100%!important}html.loopy-practice #player-container-outer{max-height:58vh!important}html.loopy-practice #player-container-inner{padding-top:56.25%!important}#loopy-practice-panel{display:block;width:100%;height:460px;border:0;border-radius:0 0 20px 20px;color-scheme:dark}`;
    document.head.appendChild(style); document.documentElement.classList.add('loopy-practice');
    frame = document.createElement('iframe'); frame.id = 'loopy-practice-panel'; frame.title = 'Loopy Goopy practice controls';
    frame.src = chrome.runtime.getURL(`app/build/index.html?practice=1&session=${token}`);
    parent.appendChild(frame);
  }
  function connect() {
    if (disposed || !videoId) return;
    try {
      const currentPort = chrome.runtime.connect({ name: 'loopy-practice-host' });
      port = currentPort;
      currentPort.onMessage.addListener((m: any) => {
        if (port !== currentPort) return;
        if (m.type === 'bound') { if (token && token !== m.token) restore(); token = m.token; mount(); }
        if (m.type === 'configure') { engine?.dispose(); engine = undefined; configuration = m; configure(); }
        if (m.type === 'preferences' && validPreferences(m.prefs)) { if (configuration) configuration.prefs = m.prefs; void engine?.update(m.prefs); }
        if (m.type === 'play') {
          if (document.querySelector('#movie_player.ad-showing')) { post({ type: 'playback', playback: { phase: 'error', running: false, beat: 1, remaining: 0, cycle: 0, error: 'Wait for the ad to finish, then press Play.' } }); return; }
          configure();
          // Stop the legacy loop before using its existing media element.
          window.dispatchEvent(new Event('loopy-practice-start'));
          void engine?.play();
        }
        if (m.type === 'pause') engine?.pause();
        if (m.type === 'exit') exit();
        if (m.type === 'manual') exit(true);
        if (m.type === 'height' && frame) frame.style.height = `${m.height}px`;
      });
      currentPort.onDisconnect.addListener(() => { if (port !== currentPort) return; engine?.pause(); if (!disposed && videoId) setTimeout(connect, 750); });
      post({ type: 'hello', mediaId: videoId, url: location.href });
    } catch { engine?.pause(); }
  }
  function inspect() {
    if (disposed) return;
    if (href !== location.href) {
      href = location.href;
      const url = new URL(href), id = url.pathname === '/watch' ? url.searchParams.get('v') : null;
      const nextVideoId = id && /^[\w-]{11}$/.test(id) ? `youtube:${id}` : '';
      const requested = url.searchParams.has('loopygoopy') || url.hash === '#loopygoopy';
      const changedVideo = nextVideoId !== videoId;
      // Capture opt-in at document_start, before YouTube normalizes its URL.
      // Keep it only for this video; navigation to another video starts fresh.
      practiceRequested = !!nextVideoId && (requested || (!changedVideo && practiceRequested));
      if (practiceRequested && !url.searchParams.has('loopygoopy')) {
        url.searchParams.set('loopygoopy', '');
        history.replaceState(history.state, '', url.href); href = location.href;
      }
      if (changedVideo) {
        videoId = ''; const oldPort = port; port = undefined; oldPort?.disconnect(); teardown();
        videoId = nextVideoId; connect();
      }
    }
    configure(); mount();
  }
  // Explicit manual actions take control; merely opening the popup does not.
  const manualControl = () => { if (engine?.state.running) engine.pause(); };
  window.addEventListener('loopy-manual-control', manualControl);
  const timer = setInterval(inspect, 500); inspect();
  document.addEventListener('yt-navigate-start', inspect);
  document.addEventListener('yt-navigate-finish', inspect);
  window.addEventListener('popstate', inspect);
  window.addEventListener('hashchange', inspect);
  window.addEventListener('pagehide', () => {
    disposed = true; window.removeEventListener('loopy-manual-control', manualControl);
    document.removeEventListener('yt-navigate-start', inspect); document.removeEventListener('yt-navigate-finish', inspect);
    window.removeEventListener('popstate', inspect); window.removeEventListener('hashchange', inspect);
    clearInterval(timer); teardown(); port?.disconnect();
  }, { once: true });
}
