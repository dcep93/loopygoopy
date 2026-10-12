import { act, render, screen } from '@testing-library/react';
import WeightStream, { weightAt } from './WeightStream';
import { Footwork, WeightCue, validFootwork, validDefinition } from './model';
import golden from './golden.json';
const footwork = golden.footwork as Footwork;
const sequence = (symbols: string): WeightCue[] => {
  let beat = 1;
  return symbols.split(' ').map(symbol => { const duration = /[rl]/.test(symbol) ? .25 : .5; const cue = { beat, duration, symbol } as WeightCue; beat += duration; return cue; });
};
test.each([
  ['R L R L', [1,1.5,2,2.5]],
  ['R L R - L R L -', [1,1.5,2,2.5,3,3.5,4,4.5]],
  ['R L r l R -', [1,1.5,2,2.25,2.5,3]],
])('duration determines density for %s', (symbols, beats) => {
  const cues = sequence(symbols);
  expect(cues.map(c=>c.beat)).toEqual(beats);
  expect(validFootwork({...footwork,cues})).toBe(true);
  const {container}=render(<WeightStream footwork={{...footwork,cues}} first={1} last={8}/>);
  expect(Array.from(container.querySelectorAll<HTMLElement>('.weight-cue')).map(c=>parseFloat(c.style.left))).toEqual(beats.map(b=>b*64));
});
test('special and hold symbols retain the preceding weight',()=>{
  const cues=sequence('R L r * - L');
  expect(weightAt(cues,.5)).toBeUndefined();
  expect(weightAt(cues,1.5)).toBe('L');
  expect(weightAt(cues,2.5)).toBe('R');
  expect(weightAt(cues,3)).toBe('R');
  expect(weightAt(cues,3.25)).toBe('L');
});
test('main example includes pickup, kick, press until transfer and two full-count walks',()=>{
  expect(validDefinition(golden)).toBe(true);
  const at=(beat:number)=>footwork.cues.find(c=>c.beat===beat);
  expect(at(.5)).toEqual({beat:.5,symbol:'R',duration:.5});
  expect(at(32.5)).toEqual({beat:32.5,symbol:'R',duration:.5});
  expect(at(4)?.symbol).toBe('L');expect(at(4.5)?.symbol).toBe('*');expect(weightAt(footwork.cues,4.75)).toBe('L');
  for (const beat of [23,23.5,24]) {expect(at(beat)?.symbol).toBe('*');expect(weightAt(footwork.cues,beat)).toBe('L');}
  expect(at(24.5)?.symbol).toBe('R');expect(weightAt(footwork.cues,24.5)).toBe('R');
  expect(at(15)).toEqual({beat:15,symbol:'R',duration:.5});expect(at(16)).toEqual({beat:16,symbol:'L',duration:.5});
  for(const beat of [1.5,2.5,6.5,12.5,15.5,16.5,20.5]) expect(at(beat)).toEqual({beat,symbol:'-',duration:.5});
  expect(footwork.cues.some(c=>/[rl]/.test(c.symbol))).toBe(false);
  for(const beat of [10,14.5,22.5,26.5,29,30,31,31.5,32]) expect(at(beat)?.symbol).toBe('*');
  expect(footwork.cues.reduce((n,c)=>n+c.duration,0)).toBe(32.5);
});
test('invalid remote cues cannot reach the renderer; ordinary definitions remain valid',()=>{
  for(const patch of [{beat:0},{beat:1.125},{beat:NaN},{beat:33},{duration:2},{symbol:'<script>'},{symbol:'L',duration:1}]) {
    expect(validFootwork({...footwork,cues:[{beat:1,symbol:'R',duration:.5,...patch}]})).toBe(false);
  }
  expect(validFootwork({...footwork,cues:[{beat:1,symbol:'R',duration:.5},{beat:1.25,symbol:'l',duration:.25}]})).toBe(false);
  expect(validFootwork({...footwork,sourceUrl:'javascript:alert(1)'})).toBe(false);
  expect(validDefinition({...golden,footwork:{}})).toBe(false);
  expect(validDefinition({...golden,footwork:undefined})).toBe(true);
});
test('animation reads the media clock, handles seeks and stops on unmount',()=>{
  let beat=1, tick:FrameRequestCallback=()=>{};
  const request=jest.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{tick=cb;return 42;});
  const cancel=jest.spyOn(window,'cancelAnimationFrame');
  const view=render(<WeightStream footwork={footwork} first={1} last={8} readBeat={()=>beat}/>);
  const strip=view.container.querySelector<HTMLElement>('.weight-strip')!;
  const frame=()=>act(()=>tick(1000));
  expect(strip.style.transform).toBe('translate3d(-64px, 0, 0)');
  beat=1.5;frame();expect(strip.style.transform).toBe('translate3d(-96px, 0, 0)');
  frame();expect(strip.style.transform).toBe('translate3d(-96px, 0, 0)');
  beat=24;frame();expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining('left foot weighted'));
  beat=24.5;frame();expect(screen.getByRole('img')).toHaveAccessibleName(expect.stringContaining('right foot weighted'));
  beat=.5;frame();expect(strip.style.transform).toBe('translate3d(-32px, 0, 0)');
  view.unmount();expect(cancel).toHaveBeenLastCalledWith(42);request.mockRestore();cancel.mockRestore();
});
