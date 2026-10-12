import golden from './golden.json';
import { defaults } from './model';
jest.mock('./engine',()=>({PracticeEngine:jest.fn()}));
jest.mock('./tabCatalog',()=>({requestDefinition:jest.fn()}));
jest.mock('./mountControls',()=>({mountControls:jest.fn()}));
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const originalLocation=window.location;
let pageLocation:{hostname:string;href:string},actions:any,height:(n:number)=>void,publish:(p:any)=>void;
let controller:any,constructor:jest.Mock,request:jest.Mock,replaceState:jest.SpyInstance;
const panel=()=>document.querySelector('#loopy-practice-panel');
const entry=()=>document.querySelector<HTMLAnchorElement>('#loopy-practice-entry a');
const player=()=>{document.body.innerHTML='<ytd-masthead><div id="center"><yt-searchbox></yt-searchbox></div></ytd-masthead><div id="primary-inner"><div id="movie_player"><video></video></div></div>';};
const navigate=async(url:string)=>{pageLocation.href=url;document.dispatchEvent(new Event('yt-navigate-finish'));await flush();};
async function start(url=golden.sourceUrl,ready=true) {
  pageLocation={hostname:'www.youtube.com',href:url};Object.defineProperty(window,'location',{configurable:true,value:pageLocation});
  replaceState=jest.spyOn(history,'replaceState').mockImplementation((_state,_unused,next)=>{pageLocation.href=String(next);});
  if(ready)player();
  jest.isolateModules(()=>{
    constructor=require('./engine').PracticeEngine;
    constructor.mockImplementation((_media:any,_definition:any,_prefs:any,callback:any)=>{publish=callback;return controller;});
    request=require('./tabCatalog').requestDefinition;
    request.mockImplementation(async(id:string)=>({definition:id===golden.mediaId?golden:undefined}));
    require('./mountControls').mountControls.mockImplementation((_host:any,_session:any,commands:any,measure:any)=>{actions=commands;height=measure;return jest.fn();});
    require('./content');
  });
  await flush();
}
beforeEach(()=>{
  jest.useFakeTimers();document.body.innerHTML='';
  jest.spyOn(HTMLMediaElement.prototype,'pause').mockImplementation(()=>{});
  controller={state:{running:false},play:jest.fn(()=>{controller.state.running=true;}),pause:jest.fn(()=>{controller.state.running=false;}),dispose:jest.fn(),update:jest.fn()};
  window.chrome={runtime:{getURL:(path:string)=>`chrome-extension://test/${path}`,connect:jest.fn(()=>{throw Error('Worker stopped');}),sendMessage:jest.fn(()=>{throw Error('Worker stopped');})},storage:{local:{get:jest.fn(async()=>({})),set:jest.fn(async()=>{})}}};
});
afterEach(()=>{
  window.dispatchEvent(new Event('pagehide'));delete window.chrome;Object.defineProperty(window,'location',{configurable:true,value:originalLocation});
  jest.restoreAllMocks();jest.useRealTimers();document.body.innerHTML='';
});
test('ordinary visits show the entry beside search without pausing or creating an engine',async()=>{
  await start();expect(entry()?.textContent).toBe('loopy goopy');expect(panel()).toBeNull();
  expect(entry()!.parentElement?.nextElementSibling?.tagName).toBe('YT-SEARCHBOX');
  expect(constructor).not.toHaveBeenCalled();expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
});
test('captures opt-in before player load and survives same-video URL cleanup',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy#loopygoopy`,false);expect(panel()).toBeNull();
  await navigate(golden.sourceUrl);player();jest.advanceTimersByTime(500);
  expect(panel()).not.toBeNull();expect(document.documentElement).toHaveClass('loopy-practice');
  const mounted=panel();await navigate(`${golden.sourceUrl}&t=20`);
  expect(panel()).toBe(mounted);expect(controller.dispose).not.toHaveBeenCalled();expect(controller.pause).not.toHaveBeenCalled();
  expect(new URL(pageLocation.href).searchParams.has('loopygoopy')).toBe(true);
});
test('entry preserves the video, saved preferences, and return link on exit',async()=>{
  const prefs={...defaults,first:17,last:24,speed:.75};window.chrome.storage.local.get.mockResolvedValue({[`practice-prefs:${golden.mediaId}`]:prefs});
  await start(`${golden.sourceUrl}&t=42`);const media=document.querySelector('video')!;media.currentTime=42;
  expect(new URL(entry()!.href).searchParams.get('t')).toBe('42');entry()!.click();
  expect(panel()?.tagName).toBe('DIV');expect(document.querySelector('iframe')).toBeNull();expect(entry()).toBeNull();
  expect(document.querySelector('video')).toBe(media);expect(media.currentTime).toBe(42);
  expect(constructor.mock.calls.at(-1).slice(0,3)).toEqual([media,golden,prefs]);
  actions.exit();expect(panel()).toBeNull();expect(entry()).not.toBeNull();entry()!.click();expect(panel()).not.toBeNull();
});
test('height is measured locally and exit restores geometry without moving the video',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);const media=document.querySelector('video')!;media.currentTime=42;
  expect(document.querySelector('#primary-inner')?.firstElementChild).toBe(panel());
  height(320);height(180);height(NaN);expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('180px');
  const resize=jest.fn(()=>{expect(panel()).toBeNull();expect(document.documentElement).not.toHaveClass('loopy-practice');});window.addEventListener('resize',resize);
  actions.exit();jest.advanceTimersByTime(20);expect(resize).toHaveBeenCalledTimes(1);window.removeEventListener('resize',resize);
  expect(document.documentElement.style.getPropertyValue('--loopy-controls-height')).toBe('');expect(document.querySelector('video')).toBe(media);expect(media.currentTime).toBe(42);
});
test('idle, play, range changes and pause work with no worker connection',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);jest.advanceTimersByTime(120000);
  actions.play();expect(controller.play).toHaveBeenCalledTimes(1);
  actions.change({...defaults,first:5,last:12});expect(controller.update).toHaveBeenCalledWith({...defaults,first:5,last:12});
  actions.pause();expect(controller.pause).toHaveBeenCalledTimes(1);
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();expect(window.chrome.runtime.sendMessage).not.toHaveBeenCalled();
  expect(request).toHaveBeenCalledTimes(1);
});
test('manual playback cancels active practice but does not pause idle media',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);window.dispatchEvent(new Event('loopy-manual-control'));expect(controller.pause).not.toHaveBeenCalled();
  actions.play();window.dispatchEvent(new Event('loopy-manual-control'));expect(controller.pause).toHaveBeenCalledTimes(1);
});
test('navigation disposes the old session and requires a fresh opt-in',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);const oldActions=actions;
  await navigate('https://www.youtube.com/watch?v=O_vU27GXPpk');expect(panel()).toBeNull();expect(entry()).toBeNull();expect(controller.dispose).toHaveBeenCalled();
  oldActions.play();expect(controller.play).not.toHaveBeenCalled();
  await navigate(golden.sourceUrl);expect(panel()).toBeNull();expect(entry()).not.toBeNull();
  await navigate(`${golden.sourceUrl}&loopygoopy`);expect(panel()).not.toBeNull();
  await navigate('https://www.youtube.com/');expect(panel()).toBeNull();expect(entry()).toBeNull();
});
test('a click racing with navigation cannot start the old trainer',async()=>{
  await start();pageLocation.href='https://www.youtube.com/watch?v=O_vU27GXPpk';entry()!.click();await flush();expect(panel()).toBeNull();expect(entry()).toBeNull();
});
test('normal entry recovers when YouTube replaces the masthead and player containers',async()=>{
  await start();player();jest.advanceTimersByTime(500);expect(entry()).not.toBeNull();expect(document.querySelectorAll('#loopy-practice-entry')).toHaveLength(1);
  const center=document.querySelector('ytd-masthead #center')!;center.prepend(center.querySelector('yt-searchbox')!);jest.advanceTimersByTime(500);expect(center.firstElementChild?.id).toBe('loopy-practice-entry');
});
test('practice panel recovers after its container is replaced and binds the new video once',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);const old=panel();const calls=constructor.mock.calls.length;
  player();const media=document.querySelector('video');jest.advanceTimersByTime(500);
  expect(panel()).not.toBe(old);expect(panel()).not.toBeNull();expect(constructor).toHaveBeenCalledTimes(calls+1);
  expect(constructor.mock.calls.at(-1)[0]).toBe(media);expect(controller.dispose).toHaveBeenCalledTimes(1);
});
test('video dimming follows lead phases and ignores a disposed engine callback',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);const oldPublish=publish;
  for(const phase of ['lead-in','lead-out']) {publish({phase,running:true});expect(document.documentElement).toHaveClass('loopy-practice-lead');publish({phase:'practice',running:true});expect(document.documentElement).not.toHaveClass('loopy-practice-lead');}
  publish({phase:'lead-out',running:true});actions.exit();expect(document.documentElement).not.toHaveClass('loopy-practice-lead');
  oldPublish({phase:'lead-in',running:true});expect(document.documentElement).not.toHaveClass('loopy-practice-lead');
});
test('modified clicks remain native links, and a fragment opts in until explicit exit',async()=>{
  await start();const click=new MouseEvent('click',{bubbles:true,cancelable:true,ctrlKey:true});entry()!.dispatchEvent(click);expect(click.defaultPrevented).toBe(false);expect(panel()).toBeNull();
  pageLocation.href=`${golden.sourceUrl}#loopygoopy`;window.dispatchEvent(new Event('hashchange'));expect(panel()).not.toBeNull();
  actions.exit();expect(pageLocation.href).toBe(golden.sourceUrl);await navigate(`${golden.sourceUrl}&t=30`);expect(panel()).toBeNull();
});
test('ads cannot start practice playback',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);document.querySelector('#movie_player')!.classList.add('ad-showing');actions.play();expect(controller.play).not.toHaveBeenCalled();
});
function autoplayAttempt(event='play') {
  const media=document.querySelector('video')!;
  Object.defineProperty(media,'paused',{configurable:true,value:false});
  media.dispatchEvent(new Event(event));
  return media;
}
test('practice startup suppresses delayed and repeated autoplay after the controls mount',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);
  for(const event of ['play','playing','loadedmetadata','play']) {
    (HTMLMediaElement.prototype.pause as jest.Mock).mockClear();
    const media=autoplayAttempt(event);
    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    expect((HTMLMediaElement.prototype.pause as jest.Mock).mock.instances[0]).toBe(media);
  }
});
test('startup guard catches a late player before the next inspection',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`,false);player();
  (HTMLMediaElement.prototype.pause as jest.Mock).mockClear();autoplayAttempt();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
});
test('ordinary playback and deliberate practice Play are not blocked by the startup guard',async()=>{
  await start();autoplayAttempt();expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
  entry()!.click();actions.play();(HTMLMediaElement.prototype.pause as jest.Mock).mockClear();
  autoplayAttempt();autoplayAttempt('playing');jest.advanceTimersByTime(1000);
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();expect(controller.play).toHaveBeenCalledTimes(1);
});
test.each(['exit','navigate','manual','pagehide'])('startup guard releases on %s',async(action)=>{
  await start(`${golden.sourceUrl}&loopygoopy`);
  if(action==='exit')actions.exit();
  if(action==='navigate')pageLocation.href='https://www.youtube.com/watch?v=O_vU27GXPpk';
  if(action==='manual')window.dispatchEvent(new Event('loopy-manual-control'));
  if(action==='pagehide')window.dispatchEvent(new Event('pagehide'));
  (HTMLMediaElement.prototype.pause as jest.Mock).mockClear();autoplayAttempt();
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();
});
test('already-playing late media is paused on inspection, and ad completion is held too',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`,false);player();
  const media=document.querySelector('video')!;
  Object.defineProperty(media,'paused',{configurable:true,value:false});
  jest.advanceTimersByTime(500);expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();
  document.querySelector('#movie_player')!.classList.add('ad-showing');
  (HTMLMediaElement.prototype.pause as jest.Mock).mockClear();autoplayAttempt();actions.play();
  expect(HTMLMediaElement.prototype.pause).not.toHaveBeenCalled();expect(controller.play).not.toHaveBeenCalled();
  document.querySelector('#movie_player')!.classList.remove('ad-showing');autoplayAttempt();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
});
test('exiting and reentering practice rearms startup pause, including after URL cleanup',async()=>{
  await start(`${golden.sourceUrl}&loopygoopy`);actions.play();actions.exit();entry()!.click();
  await navigate(golden.sourceUrl);
  (HTMLMediaElement.prototype.pause as jest.Mock).mockClear();autoplayAttempt();
  expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
});
