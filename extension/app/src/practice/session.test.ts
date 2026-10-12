import { PracticeSession } from './session';
import { defaults } from './model';
import golden from './golden.json';
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const sessions:PracticeSession[]=[];
let db:Record<string,any>;
const make=()=>{const s=new PracticeSession(golden.mediaId);sessions.push(s);return s;};
const media=()=>({duration:100,currentTime:0,paused:true,readyState:4,seeking:false,ended:false,playbackRate:1,loop:false,pause(){this.paused=true;},play:jest.fn(async function(this:any){this.paused=false;})} as any);
beforeEach(()=>{
  jest.useFakeTimers();db={};
  window.chrome={runtime:{sendMessage:jest.fn(async()=>({ok:true,definition:golden})),connect:jest.fn(()=>{throw Error('No ports allowed');})},storage:{local:{get:jest.fn(async(key:string)=>({[key]:db[key]})),set:jest.fn(async(values:any)=>{Object.assign(db,values);})}}};
});
afterEach(()=>{sessions.splice(0).forEach(s=>s.dispose());delete window.chrome;jest.useRealTimers();});
test('real engine plays, shifts, and pauses after two minutes idle with an unavailable worker',async()=>{
  const session=make();await session.load();const video=media();session.attachMedia(video);
  window.chrome.runtime.sendMessage.mockRejectedValue(Error('Worker stopped'));
  jest.advanceTimersByTime(120000);session.play();await flush();
  expect(video.play).toHaveBeenCalled();expect(session.snapshot.playback?.running).toBe(true);
  session.change({...defaults,first:5,last:12});await flush();expect(session.snapshot.prefs?.first).toBe(5);expect(session.snapshot.playback?.running).toBe(true);
  session.pause();expect(session.snapshot.playback?.running).toBe(false);
  expect(window.chrome.runtime.sendMessage).toHaveBeenCalledTimes(1);expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
  expect(db[`practice-prefs:${golden.mediaId}`].first).toBe(5);
});
test('two tab sessions keep independent selections and playback for the same video',async()=>{
  const one=make(),two=make();await Promise.all([one.load(),two.load()]);const a=media(),b=media();one.attachMedia(a);two.attachMedia(b);
  one.change({...defaults,first:17,last:24});one.play();await flush();
  expect(one.snapshot.playback?.running).toBe(true);expect(two.snapshot.playback?.running).toBe(false);expect(b.play).not.toHaveBeenCalled();expect(two.snapshot.prefs?.first).toBe(1);
  one.dispose();two.play();await flush();expect(two.snapshot.playback?.running).toBe(true);
});
test('late startup results cannot revive a disposed watch session',async()=>{
  let resolve!:(value:any)=>void;window.chrome.runtime.sendMessage.mockImplementation(()=>new Promise(r=>{resolve=r;}));
  const session=make(),listener=jest.fn();session.subscribe(listener);const loading=session.load();session.dispose();listener.mockClear();
  resolve({ok:true,definition:golden});await loading;expect(listener).not.toHaveBeenCalled();expect(session.snapshot.definition).toBeUndefined();
  session.change(defaults);expect(window.chrome.storage.local.set).not.toHaveBeenCalled();
});
test('rapid preference writes are ordered and only the latest saved state clears a warning',async()=>{
  const session=make();await session.load();let complete!:()=>void;
  window.chrome.storage.local.set.mockImplementationOnce(()=>new Promise<void>(resolve=>{complete=resolve;}));
  session.change({...defaults,first:5,last:12});await flush();session.change({...defaults,first:9,last:16});await flush();
  expect(window.chrome.storage.local.set).toHaveBeenCalledTimes(1);expect(session.snapshot.prefs?.first).toBe(9);
  complete();await flush();expect(window.chrome.storage.local.set).toHaveBeenCalledTimes(2);expect(db[`practice-prefs:${golden.mediaId}`].first).toBe(9);
  window.chrome.storage.local.set.mockRejectedValueOnce(Error('Storage unavailable'));session.change({...defaults,speed:.75});await flush();expect(session.snapshot.saveError).toMatch('could not be saved');
  session.change({...defaults,speed:.8});await flush();expect(session.snapshot.saveError).toBeUndefined();
});
test('a failed save does not stop playback or change any manual record',async()=>{
  const key='loopy-goopy:youtube:O_vU27GXPpk';const record={config:{bookmarks:[{bookmark_name:'solo 1.2'}]}};db[key]=record;
  const session=make();await session.load();session.attachMedia(media());session.play();await flush();
  window.chrome.storage.local.set.mockRejectedValueOnce(Error('Full'));session.change({...defaults,speed:.5});await flush();
  expect(session.snapshot.playback?.running).toBe(true);expect(session.snapshot.saveError).toBeDefined();expect(db[key]).toBe(record);
});
test('catalog retry preserves unsaved session preferences and does not reload during playback',async()=>{
  const session=make();await session.load();session.change({...defaults,first:17,last:24});await session.load(true);
  expect(session.snapshot.prefs?.first).toBe(17);session.attachMedia(media());session.play();await flush();
  const requests=window.chrome.runtime.sendMessage.mock.calls.length;await session.load(true);expect(window.chrome.runtime.sendMessage).toHaveBeenCalledTimes(requests);
});
test('storage read failure still loads defaults and allows practice',async()=>{
  window.chrome.storage.local.get.mockRejectedValue(Error('Storage unavailable'));const session=make();await session.load();session.attachMedia(media());session.play();await flush();
  expect(session.snapshot.prefs).toEqual(defaults);expect(session.snapshot.playback?.running).toBe(true);expect(session.snapshot.saveError).toBeDefined();
});
