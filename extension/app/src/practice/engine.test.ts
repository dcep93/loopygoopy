import { PracticeEngine } from './engine';
import { defaults, Definition, Preferences } from './model';
import golden from './golden.json';
const definition: Definition = { schemaVersion:1, mediaId:'youtube:xzeGxm72GOo',sourceUrl:'https://www.youtube.com/watch?v=xzeGxm72GOo',title:'Example',bpm:120,firstBeat:10,totalBeats:32,revision:1,status:'published' };
let time: number, media: any, engine: PracticeEngine;
const flush = async () => { for(let i=0;i<12;i++) await Promise.resolve(); };
const advance = async (ms:number, move=true) => {
  for(let left=ms;left>0;left-=10) { const n=Math.min(left,10); time+=n; if(move&&!media.paused) media.currentTime+=n/1000*media.playbackRate; jest.advanceTimersByTime(n); await flush(); }
};
const setup = (patch:Partial<Preferences>={}) => {
  media={duration:100,currentTime:0,paused:true,readyState:4,seeking:false,ended:false,playbackRate:1,loop:false,pause(){this.paused=true;},play:jest.fn(async function(this:any){this.paused=false;})};
  engine=new PracticeEngine(media,definition,{...defaults,...patch},()=>{},()=>time);
};
beforeEach(()=>{jest.useFakeTimers();time=0;setup();});
afterEach(()=>{engine.dispose();jest.useRealTimers();});
test('silent frozen leads repeat every cycle and follow the playback speed',async()=>{
  setup({speed:.5,last:4,leadIn:{beats:2,style:'silent'},leadOut:{beats:2,style:'silent'}});
  void engine.play();await flush();
  expect(engine.state.phase).toBe('lead-in');expect(media.currentTime).toBe(10);expect(media.paused).toBe(true);
  await advance(1900);expect(media.paused).toBe(true);
  await advance(200);expect(engine.state.phase).toBe('practice');expect(media.playbackRate).toBe(.5);
  await advance(4000);expect(engine.state.phase).toBe('lead-out');expect(media.paused).toBe(true);expect(media.currentTime).toBeCloseTo(11.965);
  await advance(2100);expect(engine.state.cycle).toBe(2);expect(engine.state.phase).toBe('lead-in');
});
test('buffering does not finish a practice section on a wall-clock timer',async()=>{
  setup({last:4,leadIn:{beats:0,style:'track'},leadOut:{beats:0,style:'track'}});
  void engine.play();await flush();await advance(1000,false);
  expect(engine.state.phase).toBe('buffering');expect(engine.state.cycle).toBe(1);expect(engine.state.beat).toBe(1);
  await advance(2100);expect(engine.state.cycle).toBe(2);
});
test('pause during a seek cannot restart playback after seek completes',async()=>{
  media.seeking=true;void engine.play();await flush();engine.pause();media.seeking=false;
  await advance(4000);expect(media.play).not.toHaveBeenCalled();expect(engine.state.running).toBe(false);
});
test('track leads play adjacent footage and zero leads skip immediately',async()=>{
  setup({last:4});void engine.play();await flush();expect(media.currentTime).toBe(9);expect(media.paused).toBe(false);
  await advance(1100);expect(engine.state.phase).toBe('practice');
  await advance(2100);expect(engine.state.phase).toBe('lead-out');expect(media.currentTime).toBeGreaterThanOrEqual(12);
  engine.pause();const plays=media.play.mock.calls.length;await advance(3000);expect(media.play).toHaveBeenCalledTimes(plays);
});
test('track lead countdown tolerates rounded seek times without phantom lead steps',async()=>{
  const seeks:number[]=[], updates:any[]=[];
  let current=0;
  Object.defineProperty(media,'currentTime',{get:()=>current,set:value=>{seeks.push(value);current=Math.floor(value*1e6)/1e6;}});
  engine=new PracticeEngine(media,golden as Definition,{...defaults,last:4},state=>updates.push({...state}),()=>time);
  void engine.play();await flush();
  expect(seeks).not.toContain(0);
  expect(engine.state.phase).toBe('lead-in');
  expect(engine.state.remaining).toBe(2);
  await advance(6200);
  for(const phase of ['lead-in','lead-out']) {
    const counts=updates.filter(s=>s.phase===phase).map(s=>s.remaining);
    expect(counts).toContain(2);expect(counts).toContain(1);
    expect(counts.every(count=>count===1||count===2)).toBe(true);
  }
});
test('track leads still pad genuinely missing footage at both video edges',async()=>{
  media.duration=2.5;
  engine=new PracticeEngine(media,{...definition,firstBeat:.25},{...defaults,last:4},()=>{},()=>time);
  void engine.play();await flush();
  expect(media.currentTime).toBe(0);expect(media.paused).toBe(true);
  await advance(700);expect(engine.state.phase).toBe('lead-in');expect(media.paused).toBe(true);
  await advance(350);expect(engine.state.phase).toBe('practice');
  await advance(2100);expect(engine.state.phase).toBe('lead-out');
  await advance(950);expect(engine.state.cycle).toBe(2);
});
test('changing a selection while paused seeks but does not play, restoring media settings on exit',async()=>{
  media.playbackRate=.8;await engine.update({...defaults,first:17,last:24});
  expect(media.currentTime).toBe(18);expect(media.paused).toBe(true);expect(engine.state.beat).toBe(17);
  engine.dispose();expect(media.playbackRate).toBe(1);
});
test('an unused practice controller does not interfere with ordinary YouTube playback',()=>{
  media.paused=false;media.playbackRate=1.25;engine.dispose();expect(media.paused).toBe(false);expect(media.playbackRate).toBe(1.25);
});
test('metronome holds the picture and cancels scheduled clicks when paused',async()=>{
  const tones:any[]=[];
  (globalThis as any).AudioContext=class {
    state='running';currentTime=0;destination={};resume=async()=>{};close=async()=>{};
    createOscillator(){const t={frequency:{value:0},connect:jest.fn(),disconnect:jest.fn(),start:jest.fn(),stop:jest.fn(),onended:null};tones.push(t);return t;}
    createGain(){return {gain:{setValueAtTime:jest.fn(),exponentialRampToValueAtTime:jest.fn()},connect:jest.fn(),disconnect:jest.fn()};}
  };
  setup({leadIn:{beats:4,style:'metronome'}});void engine.play();await flush();
  expect(media.paused).toBe(true);expect(media.currentTime).toBe(10);expect(tones).toHaveLength(1);
  await advance(510);expect(tones).toHaveLength(2);engine.pause();await advance(5000);
  expect(tones).toHaveLength(2);expect(media.play).not.toHaveBeenCalled();expect(tones.every(t=>t.stop.mock.calls.length===2)).toBe(true);
});
const combinations = ([.5, .75, 1] as const).flatMap(speed => (['track', 'silent', 'metronome'] as const).flatMap(before => (['track', 'silent', 'metronome'] as const).map(after => ({ speed, before, after }))));
test.each(combinations)('repeats $before/$after leads at $speed speed', async ({ speed, before, after }) => {
  (globalThis as any).AudioContext=class {
    state='running';currentTime=0;destination={};resume=async()=>{};close=async()=>{};
    createOscillator(){return {frequency:{value:0},connect(){},disconnect(){},start(){},stop(){},onended:null};}
    createGain(){return {gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}};}
  };
  setup({ speed, last:4, leadIn:{beats:1,style:before}, leadOut:{beats:1,style:after} });
  void engine.play();await flush();expect(engine.state.phase).toBe('lead-in');expect(media.paused).toBe(before!=='track');
  await advance(500/speed+40);expect(engine.state.phase).toBe('practice');
  await advance(2000/speed+40);expect(engine.state.phase).toBe('lead-out');expect(media.paused).toBe(after!=='track');
  await advance(500/speed+40);expect(engine.state.cycle).toBe(2);expect(engine.state.phase).toBe('lead-in');
});
test('an obsolete play promise cannot pause a newer playback cycle',async()=>{
  setup({leadIn:{beats:0,style:'track'}});
  let resolveOld!:()=>void;
  media.play.mockImplementationOnce(()=>new Promise<void>(resolve=>{resolveOld=resolve;}));
  void engine.play();await flush();
  void engine.play();await flush();expect(media.paused).toBe(false);
  resolveOld();await flush();expect(media.paused).toBe(false);expect(engine.state.running).toBe(true);
});
