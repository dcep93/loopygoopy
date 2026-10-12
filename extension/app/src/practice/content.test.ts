import { PracticeEngine } from './engine';
import golden from './golden.json';
import { defaults } from './model';
jest.mock('./engine', () => ({ PracticeEngine: jest.fn() }));
test('manual playback commands cancel an active practice cycle without touching idle media', () => {
  jest.useFakeTimers();
  const originalLocation=window.location;
  Object.defineProperty(window,'location',{configurable:true,value:{hostname:'www.youtube.com',href:golden.sourceUrl}});
  document.body.innerHTML='<div id="movie_player"><video></video></div>';
  let receive!: (message:any)=>void;
  const controller={state:{running:false},play:jest.fn(()=>{controller.state.running=true;}),pause:jest.fn(()=>{controller.state.running=false;}),dispose:jest.fn()};
  (PracticeEngine as jest.Mock).mockImplementation(()=>controller);
  const port={postMessage:jest.fn(),onMessage:{addListener:(handler:any)=>{receive=handler;}},onDisconnect:{addListener:jest.fn()},disconnect:jest.fn()};
  window.chrome={runtime:{connect:jest.fn(()=>port)}};
  try {
    require('./content');
    receive({type:'configure',definition:golden,prefs:defaults});
    window.dispatchEvent(new Event('loopy-manual-control'));
    expect(controller.pause).not.toHaveBeenCalled();
    receive({type:'play'});expect(controller.state.running).toBe(true);
    window.dispatchEvent(new Event('loopy-manual-control'));
    expect(controller.state.running).toBe(false);expect(controller.pause).toHaveBeenCalledTimes(1);
  } finally {
    window.dispatchEvent(new Event('pagehide'));
    delete window.chrome;Object.defineProperty(window,'location',{configurable:true,value:originalLocation});jest.useRealTimers();
  }
});

describe('practice URL opt-in', () => {
  const originalLocation = window.location;
  let receive: (message: any) => void;
  let pageLocation: { hostname: string; href: string };
  let replaceState: jest.SpyInstance;
  let controller: { state: { running: boolean }; play: jest.Mock; pause: jest.Mock; dispose: jest.Mock };
  const plainUrl = golden.sourceUrl;
  const panel = () => document.querySelector('#loopy-practice-panel');
  const addPlayer = () => { document.body.innerHTML = '<div id="primary-inner"><div id="movie_player"><video></video></div></div>'; };
  const navigate = (url: string) => {
    pageLocation.href = url;
    document.dispatchEvent(new Event('yt-navigate-finish'));
  };
  function start(url: string, playerReady = true) {
    pageLocation = { hostname: 'www.youtube.com', href: url };
    Object.defineProperty(window, 'location', { configurable: true, value: pageLocation });
    replaceState = jest.spyOn(history, 'replaceState').mockImplementation((_state, _unused, next) => {
      pageLocation.href = String(next);
    });
    if (playerReady) addPlayer();
    jest.isolateModules(() => {
      (require('./engine').PracticeEngine as jest.Mock).mockImplementation(() => controller);
      require('./content');
    });
    receive({ type: 'bound', token: 'practice-session' });
  }
  beforeEach(() => {
    jest.useFakeTimers();
    document.body.innerHTML = '';
    jest.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {});
    controller = { state: { running: false }, play: jest.fn(), pause: jest.fn(), dispose: jest.fn() };
    window.chrome = { runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      connect: jest.fn(() => ({
        postMessage: jest.fn(), disconnect: jest.fn(),
        onMessage: { addListener: (handler: any) => { receive = handler; } },
        onDisconnect: { addListener: jest.fn() },
      })),
    } };
  });
  afterEach(() => {
    window.dispatchEvent(new Event('pagehide'));
    delete window.chrome;
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
    jest.restoreAllMocks(); jest.useRealTimers();
    document.body.innerHTML = '';
  });
  test('captures opt-in before the player exists and survives URL cleanup during load', () => {
    start(`${plainUrl}&loopygoopy#loopygoopy`, false);
    expect(panel()).toBeNull();
    navigate(plainUrl);
    expect(new URL(pageLocation.href).searchParams.has('loopygoopy')).toBe(true);
    addPlayer(); jest.advanceTimersByTime(500);
    expect(panel()).not.toBeNull();
    expect(document.documentElement).toHaveClass('loopy-practice');
  });
  test('same-video URL cleanup keeps the existing panel and playback engine', () => {
    start(`${plainUrl}&loopygoopy`);
    receive({ type: 'configure', definition: golden, prefs: defaults });
    const mounted = panel();
    navigate(`${plainUrl}&t=20`);
    expect(panel()).toBe(mounted);
    expect(controller.dispose).not.toHaveBeenCalled();
    expect(controller.pause).not.toHaveBeenCalled();
    expect(new URL(pageLocation.href).searchParams.get('t')).toBe('20');
  });
  test('controls precede the player, resize in both directions and clear sizing on exit', () => {
    start(`${plainUrl}&loopygoopy`);
    const parent = document.querySelector('#primary-inner')!;
    expect(parent.firstElementChild).toBe(panel());
    const media = parent.querySelector('video');
    receive({ type: 'height', height: 320 });
    expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('320px');
    receive({ type: 'height', height: 180 });
    expect((panel() as HTMLElement).style.height).toBe('180px');
    expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('180px');
    receive({ type: 'height', height: NaN });
    expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('180px');
    receive({ type: 'exit' });
    expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('');
    expect(parent.querySelector('video')).toBe(media);
  });
  test('exit notifies YouTube to recalculate video geometry after restoring the page', () => {
    start(`${plainUrl}&loopygoopy`);
    receive({ type: 'height', height: 180 });
    const media = document.querySelector('video')!;
    media.currentTime = 42;
    const onResize = jest.fn(() => {
      expect(panel()).toBeNull();
      expect(document.documentElement).not.toHaveClass('loopy-practice');
      expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('');
      expect(Array.from(document.querySelectorAll('style')).some(s => s.textContent?.includes('--loopy-video-height'))).toBe(false);
    });
    window.addEventListener('resize', onResize);
    try {
      receive({ type: 'exit' });
      expect(onResize).not.toHaveBeenCalled();
      jest.advanceTimersByTime(20);
      expect(onResize).toHaveBeenCalledTimes(1);
      expect(document.querySelector('video')).toBe(media);
      expect(media.currentTime).toBe(42);
      jest.advanceTimersByTime(1000);
      expect(onResize).toHaveBeenCalledTimes(1);
    } finally { window.removeEventListener('resize', onResize); }
  });
  test('a normal visit stays normal even when the video is prepared', () => {
    start(plainUrl);
    jest.advanceTimersByTime(1000);
    expect(panel()).toBeNull();
    expect(replaceState).not.toHaveBeenCalled();
  });
  test('navigation to another video clears opt-in, including when returning without a flag', () => {
    start(`${plainUrl}&loopygoopy`);
    navigate('https://www.youtube.com/watch?v=O_vU27GXPpk');
    receive({ type: 'bound', token: 'ozzy-session' });
    expect(panel()).toBeNull();
    expect(document.documentElement).not.toHaveClass('loopy-practice');
    navigate(plainUrl); receive({ type: 'bound', token: 'back-session' });
    expect(panel()).toBeNull();
    navigate(`${plainUrl}&loopygoopy`);
    expect(panel()).not.toBeNull();
  });
  test('leaving the watch page clears opt-in', () => {
    start(`${plainUrl}&loopygoopy`);
    navigate('https://www.youtube.com/');
    expect(panel()).toBeNull();
    navigate(plainUrl); receive({ type: 'bound', token: 'back-session' });
    expect(panel()).toBeNull();
  });
  test('the fragment can opt in after loading, and Exit clears both markers for good', () => {
    start(plainUrl);
    pageLocation.href = `${plainUrl}#loopygoopy`;
    window.dispatchEvent(new Event('hashchange'));
    expect(panel()).not.toBeNull();
    receive({ type: 'exit' });
    expect(pageLocation.href).toBe(plainUrl);
    navigate(`${plainUrl}&t=30`); jest.advanceTimersByTime(1000);
    expect(panel()).toBeNull();
    expect(document.documentElement).not.toHaveClass('loopy-practice');
  });
  test('switching to manual controls also clears opt-in without remounting practice', () => {
    start(`${plainUrl}&loopygoopy#loopygoopy`);
    receive({ type: 'manual' });
    expect(pageLocation.href).toBe(plainUrl);
    expect(panel()).toBeNull();
    expect(document.querySelector('iframe')?.title).toBe('Loopy Goopy manual controls');
    jest.advanceTimersByTime(1000);
    expect(panel()).toBeNull();
  });
});
