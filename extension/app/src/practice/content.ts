import { PracticeSession } from './session';
import { mountControls } from './mountControls';
import { practicePageCSS } from './pageLayout';
import { createPracticeEntry } from './entryLink';
import { validDefinition } from './model';
declare const chrome: any;

export function startPracticePage() {
  let session: PracticeSession | undefined, unsubscribe: (() => void) | undefined, href = '', videoId = '';
  let panel: HTMLDivElement | undefined, unmount: (() => void) | undefined, style: HTMLStyleElement | undefined;
  let disposed = false, practiceRequested = false;
  let entry: HTMLDivElement | undefined;
  function removeEntry() { entry?.remove(); entry = undefined; }
  function updateEntry() {
    const parent = document.querySelector('ytd-masthead #center');
    if (disposed || practiceRequested || !session || !parent || !document.querySelector('#movie_player video') ||
        !validDefinition(session?.snapshot.definition, videoId)) { removeEntry(); return; }
    const url = new URL(location.href);
    if (url.pathname !== '/watch' || `youtube:${url.searchParams.get('v')}` !== videoId) { removeEntry(); return; }
    const entryVideoId = videoId;
    if (!entry) entry = createPracticeEntry(() => {
      // Navigation can happen between our periodic inspection and a click.
      inspect();
      if (videoId !== entryVideoId || !entry?.isConnected || !validDefinition(session?.snapshot.definition, videoId)) return;
      const target = new URL(location.href); target.searchParams.set('loopygoopy', '');
      restore(); practiceRequested = true; removeEntry();
      history.replaceState(history.state, '', target.href); href = location.href;
      configure(); mount();
    });
    url.searchParams.set('loopygoopy', '');
    entry.querySelector('a')!.href = url.href;
    if (parent.firstElementChild !== entry) parent.prepend(entry);
  }
  function restore() {
    const wasPractice = document.documentElement.classList.contains('loopy-practice');
    unmount?.(); unmount = undefined; panel?.remove(); style?.remove(); panel = undefined; style = undefined;
    document.documentElement.classList.remove('loopy-practice', 'loopy-practice-lead');
    document.documentElement.style.removeProperty('--loopy-controls-height');
    if (wasPractice && !disposed) requestAnimationFrame(() => {
      // YouTube caches inline video dimensions/offsets. Removing our CSS alone
      // leaves those sized for practice until its next window resize.
      if (!disposed && !document.documentElement.classList.contains('loopy-practice')) {
        window.dispatchEvent(new Event('resize'));
      }
    });
  }
  function teardown() { unsubscribe?.(); unsubscribe = undefined; session?.dispose(); session = undefined; removeEntry(); restore(); }
  function exit() {
    practiceRequested = false;
    session?.releaseMedia(); restore();
    const url = new URL(location.href); url.searchParams.delete('loopygoopy');
    if (url.hash === '#loopygoopy') url.hash = '';
    history.replaceState(history.state, '', url.href); href = location.href;
    updateEntry();
  }
  function configure() {
    if (!practiceRequested) return;
    if (document.querySelector('#movie_player.ad-showing')) { session?.pause(); return; }
    const media = document.querySelector<HTMLVideoElement>('#movie_player video');
    if (media) session?.attachMedia(media);
    else session?.releaseMedia();
  }
  function mount() {
    if (!session || !practiceRequested) return;
    if (panel?.isConnected) return;
    if (panel) restore();
    const parent = document.querySelector('#primary-inner');
    if (!parent || !document.head || !document.querySelector('#movie_player video')) return;
    removeEntry();
    if (!session.snapshot.playback?.running) document.querySelector<HTMLVideoElement>('#movie_player video')?.pause();
    style = document.createElement('style');
    // Font faces must be registered in the document for use inside a shadow root.
    style.textContent = `@font-face { font-family: "Loopy Comic Relief"; src: url("${chrome.runtime.getURL('runtime/ComicRelief-Regular.ttf')}") format("truetype"); font-weight: 400; font-style: normal; font-display: swap; }` + practicePageCSS;
    document.head.appendChild(style); document.documentElement.classList.add('loopy-practice');
    panel = document.createElement('div'); panel.id = 'loopy-practice-panel';
    parent.prepend(panel);
    const boundSession = session;
    unmount = mountControls(panel, boundSession, {
      change: boundSession.change, pause: boundSession.pause, exit,
      play: () => {
        if (session !== boundSession) return;
        if (document.querySelector('#movie_player.ad-showing')) { boundSession.reportError('Wait for the ad to finish, then press Play.'); return; }
        configure(); window.dispatchEvent(new Event('loopy-practice-start')); boundSession.play();
      },
      retry: () => { void boundSession.load(true); },
    }, height => {
      if (session !== boundSession || !panel || !Number.isFinite(height) || height <= 0) return;
      document.documentElement.style.setProperty('--loopy-controls-height', `${Math.ceil(height)}px`);
    });
  }
  function startSession() {
    if (!videoId) return;
    const current = new PracticeSession(videoId); session = current;
    unsubscribe = current.subscribe(() => {
      if (session !== current) return;
      const playback = current.snapshot.playback;
      document.documentElement.classList.toggle('loopy-practice-lead', !!(practiceRequested && playback?.running &&
        (playback.phase === 'lead-in' || playback.phase === 'lead-out')));
      configure(); updateEntry();
    });
    void current.load();
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
        teardown(); videoId = nextVideoId; startSession();
      }
    }
    configure(); mount(); updateEntry();
  }
  // Explicit manual actions take control; merely opening the popup does not.
  const manualControl = () => session?.pause();
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
    clearInterval(timer); teardown();
  }, { once: true });
}

if (window === window.top && location.hostname === 'www.youtube.com') startPracticePage();
