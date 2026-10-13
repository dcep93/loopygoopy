import { installTestAudio } from './testAudio';
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
beforeEach(()=>{installTestAudio();jest.useFakeTimers();time=0;setup();});
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
test('fractional stream position follows media through speed, buffering, pause, selection and repeat',async()=>{
  setup({speed:.5,last:4,leadIn:{beats:0,style:'track'},leadOut:{beats:0,style:'track'}});
  expect(engine.readBeat()).toBe(1);
  void engine.play();await flush();await advance(500);
  expect(engine.readBeat()).toBeCloseTo(1.5);
  await advance(1000,false);expect(engine.readBeat()).toBeCloseTo(1.5);
  engine.pause();await advance(1000);expect(engine.readBeat()).toBeCloseTo(1.5);
  await engine.update({...engine.prefs,first:9,last:12,speed:1});expect(engine.readBeat()).toBeCloseTo(9);
  void engine.play();await flush();await advance(500);expect(engine.readBeat()).toBeCloseTo(10);
  await advance(1600);expect(engine.state.cycle).toBe(2);expect(engine.readBeat()).toBeGreaterThanOrEqual(9);expect(engine.readBeat()).toBeLessThan(10);
});
test('fractional stream follows track pickup and holds with frozen leads',async()=>{
  void engine.play();await flush();expect(engine.readBeat()).toBeCloseTo(-1);
  await advance(750);expect(engine.readBeat()).toBeCloseTo(.5);
  engine.pause();await engine.update({...defaults,leadIn:{beats:2,style:'silent'}});
  void engine.play();await flush();const position=engine.readBeat();await advance(500);expect(engine.readBeat()).toBe(position);
});
const clickDefinition: Definition = { ...definition, footwork: { sourceUrl: golden.footwork.sourceUrl, cues: [
  {beat:.5,duration:.5,symbol:'R'}, {beat:1,duration:.5,symbol:'L'}, {beat:1.5,duration:.5,symbol:'-'},
  {beat:2,duration:.5,symbol:'L'}, {beat:2.5,duration:.5,symbol:'*'}, {beat:3,duration:.25,symbol:'r'},
  {beat:3.25,duration:.25,symbol:'l'}, {beat:3.5,duration:.5,symbol:'R'}, {beat:4,duration:.5,symbol:'*'},
  {beat:4.5,duration:.5,symbol:'L'}, {beat:5,duration:.5,symbol:'R'}, {beat:5.5,duration:.5,symbol:'L'},
] } };
function clickSetup(patch:Partial<Preferences>={}) {
  const clicks:number[]=[];
  const audio=installTestAudio(()=>clicks.push(media.currentTime));
  engine=new PracticeEngine(media,clickDefinition,{...defaults,last:4,leadIn:{beats:0,style:'track'},leadOut:{beats:0,style:'track'},...patch},()=>{},()=>time);
  return {clicks,...audio};
}
test.each([.5,1,1.5])('weight clicks follow pickup, transfers, track leads and repeats at %s speed',async(speed)=>{
  const {clicks}=clickSetup({speed,weightClicks:undefined,leadIn:{beats:1,style:'track'},leadOut:{beats:1,style:'track'}});
  expect(clicks).toEqual([]);void engine.play();await flush();await advance(2900/speed);
  const expected=[9.75,10,11,11.125,11.25,11.75,12,12.25];
  expect(clicks).toHaveLength(expected.length);
  clicks.forEach((value,i)=>expect(Math.abs(value-expected[i])).toBeLessThan(.03*speed));
  await advance(1000/speed);expect(engine.state.cycle).toBe(2);
  expect(clicks).toHaveLength(10);expect(clicks[8]).toBeCloseTo(9.75,1);expect(clicks[9]).toBeCloseTo(10,1);
});
test('weight clicks stop during buffering, discard skipped transfers on seek and cancel with pause',async()=>{
  const {clicks,tones}=clickSetup();void engine.play();await flush();expect(clicks).toHaveLength(1);
  await advance(300);media.readyState=2;await advance(500,false);expect(clicks).toHaveLength(1);
  media.readyState=4;await advance(720);expect(clicks).toHaveLength(2);
  media.currentTime=11.7;await advance(20,false);expect(clicks).toHaveLength(2);
  await advance(100);expect(clicks).toHaveLength(3);expect(clicks[2]).toBeCloseTo(11.75,1);
  engine.pause();await advance(2000);expect(clicks).toHaveLength(3);expect(tones.every(t=>t.stop.mock.calls.length===2)).toBe(true);
});
test('live weight toggle preserves playback position and does not replay muted cues',async()=>{
  const {clicks}=clickSetup();void engine.play();await flush();expect(clicks).toHaveLength(1);
  const position=media.currentTime;
  await engine.update({...engine.prefs,weightClicks:false});expect(media.currentTime).toBe(position);expect(media.paused).toBe(false);
  await advance(1020);expect(clicks).toHaveLength(1);
  await engine.update({...engine.prefs,weightClicks:true});await advance(120);expect(clicks).toHaveLength(2);expect(clicks[1]).toBeCloseTo(11.125,1);
  expect(media.play).toHaveBeenCalledTimes(1);expect(engine.state.cycle).toBe(1);
});
test('unchecking weight clicks needs no audio context and frozen leads keep their own sound',async()=>{
  const {clicks,tones}=clickSetup({weightClicks:false});void engine.play();await flush();await advance(1800);
  expect(clicks).toHaveLength(0);expect(AudioContext).not.toHaveBeenCalled();engine.pause();
  await engine.update({...engine.prefs,weightClicks:true,leadIn:{beats:2,style:'metronome'},leadOut:{beats:2,style:'silent'}});
  void engine.play();await flush();expect(clicks).toHaveLength(1);expect(tones[0].frequency.value).toBe(1000);
  await advance(600);expect(clicks).toHaveLength(2);expect(media.paused).toBe(true);
  await advance(450);expect(engine.state.phase).toBe('practice');expect(clicks).toHaveLength(3);
  await advance(2050);expect(engine.state.phase).toBe('lead-out');const count=clicks.length;
  await advance(600);expect(clicks).toHaveLength(count);
});
test('a paused toggle neither starts audio nor seeks the video',async()=>{
  clickSetup();media.currentTime=42;await engine.update({...engine.prefs,weightClicks:false});await engine.update({...engine.prefs,weightClicks:true});
  expect(media.currentTime).toBe(42);expect(media.play).not.toHaveBeenCalled();expect(AudioContext).not.toHaveBeenCalled();
});
test('turning weight clicks back off cancels an obsolete audio-enable failure',async()=>{
  const {context}=clickSetup({weightClicks:false});void engine.play();await flush();
  let reject!:(error:Error)=>void;context.resume.mockImplementation(()=>new Promise<void>((_,fail)=>{reject=fail;}));
  const pending=engine.update({...engine.prefs,weightClicks:true});
  await engine.update({...engine.prefs,weightClicks:false});reject(Error('Audio blocked'));await pending;
  expect(engine.state.running).toBe(true);expect(engine.state.error).toBeUndefined();
});

test('extending 9–12 to 9–16 at count 10 continues to the new end before leading out',async()=>{
  setup({first:9,last:12,leadIn:{beats:0,style:'track'},leadOut:{beats:2,style:'silent'}});
  void engine.play();await flush();await advance(600);
  const position=media.currentTime, pause=jest.spyOn(media,'pause');
  expect(engine.state.beat).toBe(10);
  await engine.update({...engine.prefs,last:16});
  expect(media.currentTime).toBe(position);expect(pause).not.toHaveBeenCalled();expect(media.play).toHaveBeenCalledTimes(1);
  await advance(1500);expect(engine.state.phase).toBe('practice');expect(engine.state.cycle).toBe(1);
  await advance(1950);expect(engine.state.phase).toBe('lead-out');expect(media.currentTime).toBeCloseTo(17.965);
  await advance(1050);expect(engine.state.cycle).toBe(2);expect(engine.readBeat()).toBeGreaterThanOrEqual(9);expect(engine.readBeat()).toBeLessThan(10);
});
test.each([{first:5,last:12},{first:9,last:12}])('expanding left or trimming a range around count 10 preserves the picture: %j',async(range)=>{
  setup({first:9,last:16,leadIn:{beats:0,style:'track'},leadOut:{beats:0,style:'track'}});
  void engine.play();await flush();await advance(600);const position=media.currentTime;
  await engine.update({...engine.prefs,...range});
  expect(media.currentTime).toBe(position);expect(media.play).toHaveBeenCalledTimes(1);
  await advance(1450);expect(engine.state.cycle).toBe(2);expect(engine.readBeat()).toBeGreaterThanOrEqual(range.first);expect(engine.readBeat()).toBeLessThan(range.first+1);
});
test('excluding the current count restarts at the new lead-in and cancels the old loop',async()=>{
  setup({first:9,last:16,leadIn:{beats:2,style:'silent'},leadOut:{beats:0,style:'track'}});
  void engine.play();await flush();await advance(1600);expect(engine.state.beat).toBe(10);
  void engine.update({...engine.prefs,first:13});await flush();
  expect(engine.state.phase).toBe('lead-in');expect(media.currentTime).toBe(16);expect(media.paused).toBe(true);
  await advance(1050);expect(engine.state.phase).toBe('practice');expect(media.play).toHaveBeenCalledTimes(2);expect(engine.state.beat).toBe(13);
});
test('selection changes during buffering keep the active range and resume without seeking',async()=>{
  setup({first:9,last:12,leadIn:{beats:0,style:'track'},leadOut:{beats:0,style:'track'}});
  void engine.play();await flush();await advance(600);await advance(500,false);expect(engine.state.phase).toBe('buffering');
  const position=media.currentTime;
  await engine.update({...engine.prefs,last:16});expect(media.currentTime).toBe(position);
  await advance(1600);expect(engine.state.phase).toBe('practice');expect(engine.state.cycle).toBe(1);expect(media.play).toHaveBeenCalledTimes(1);
});
test('paused selection changes retain a valid position and seek only when excluded',async()=>{
  setup({first:9,last:12,leadIn:{beats:0,style:'track'}});
  void engine.play();await flush();await advance(600);engine.pause();const position=media.currentTime;
  await engine.update({...engine.prefs,first:5,last:16});expect(media.currentTime).toBe(position);expect(engine.state.beat).toBe(10);
  await engine.update({...engine.prefs,first:13});expect(media.currentTime).toBe(16);expect(engine.state.beat).toBe(13);
  expect(media.paused).toBe(true);expect(media.play).toHaveBeenCalledTimes(1);
});
test.each(['track','silent','metronome'] as const)('range edits preserve %s leads when their anchor stays put',async(style)=>{
  setup({first:9,last:12,leadIn:{beats:2,style},leadOut:{beats:2,style}});
  void engine.play();await flush();await advance(600);
  let position=media.currentTime;
  await engine.update({...engine.prefs,last:16});expect(media.currentTime).toBe(position);
  await advance(500);expect(engine.state.phase).toBe('practice');
  await advance(4100);expect(engine.state.phase).toBe('lead-out');position=media.currentTime;
  await engine.update({...engine.prefs,first:5});expect(media.currentTime).toBe(position);
  await advance(850);expect(engine.state.cycle).toBe(2);expect(engine.state.phase).toBe('lead-in');
  expect(engine.state.beat).toBe(5);
});
test('extending a selection keeps future weight clicks and plays a boundary cue only once',async()=>{
  const {clicks}=clickSetup({leadOut:{beats:1,style:'track'}});
  void engine.play();await flush();await advance(600);
  await engine.update({...engine.prefs,last:8});await advance(2100);
  const expected=[10,11,11.125,11.25,11.75,12,12.25];
  expect(clicks).toHaveLength(expected.length);clicks.forEach((value,i)=>expect(Math.abs(value-expected[i])).toBeLessThan(.03));
  expect(media.play).toHaveBeenCalledTimes(1);expect(engine.state.cycle).toBe(1);
});
