import { defaults, interval, range, validDefinition, validPreferences } from './model';
import golden from './golden.json';
test('four-beat selection has inclusive contiguous bounds in either direction', () => {
  expect(range(4,5)).toEqual({first:17,last:24});
  expect(range(5,4)).toEqual({first:17,last:24});
  expect(range(2,2)).toEqual({first:9,last:12});
  expect(range(0,7)).toEqual({first:1,last:32});
});
test('only published, correctly identified definitions can become executable timing data', () => {
  expect(validDefinition(golden)).toBe(true);
  for(const patch of [{bpm:0},{bpm:Infinity},{firstBeat:-1},{status:'draft'},{schemaVersion:2},{revision:0},{sourceUrl:'javascript:alert(1)'},{mediaId:'youtube:other'}]) expect(validDefinition({...golden,...patch})).toBe(false);
  expect(validDefinition(golden,'youtube:O_vU27GXPpk')).toBe(false);
});
test('the whole example is 32 counts at 81 BPM, not the doubled subdivisions', () => {
  if(!validDefinition(golden)) throw Error('invalid fixture');
  const {start,end} = interval(golden,{...defaults,last:32});
  expect(start).toBe(12.64); expect(end-start).toBeCloseTo(23.703704);
  const part = interval(golden,{...defaults,first:17,last:24});
  expect(part.start).toBeCloseTo(24.491852); expect(part.end).toBeCloseTo(30.417778);
});
test('rejects broken ranges and unbounded scheduling settings', () => {
  expect(validPreferences(defaults)).toBe(true);
  for(const patch of [{first:2},{last:7},{first:17,last:8},{speed:0},{speed:Infinity},{leadIn:{beats:1.5,style:'silent'}},{leadOut:{beats:2,style:'noise'}}]) expect(validPreferences({...defaults,...patch})).toBe(false);
});
test('weight clicks default on while older preferences remain valid',()=>{
  expect(defaults.weightClicks).toBe(true);
  const {weightClicks,...old}=defaults;expect(validPreferences(old)).toBe(true);
  expect(validPreferences({...old,weightClicks:false})).toBe(true);
  expect(validPreferences({...old,weightClicks:'false'})).toBe(false);
});
