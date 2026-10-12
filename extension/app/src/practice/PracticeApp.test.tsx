import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import PracticeApp from './PracticeApp';
import { transferRecords } from './recordStore';
import golden from './golden.json';
import { defaults, paused } from './model';
jest.mock('./recordStore', () => ({ transferRecords: jest.fn() }));
jest.mock('../app/Main', () => () => <div>Original popup controls</div>);
beforeEach(() => {
  window.history.replaceState({}, '', '/');
  (globalThis as any).ResizeObserver=class { observe() {} disconnect() {} };
  (transferRecords as jest.Mock).mockResolvedValue(undefined);
});
afterEach(() => { delete window.chrome; jest.resetAllMocks(); });
function setupConnection(definition: any = golden, prefs = defaults, echoPreferences = false) {
  let receive: (message: any) => void;
  const port={postMessage:jest.fn((message:any)=>{
    if(message.type==='attach')receive({type:'snapshot',definition,prefs,playback:paused,mediaId:definition?.mediaId,loading:false});
    if(echoPreferences && message.type==='preferences')receive({type:'snapshot',definition,prefs:message.prefs,playback:paused,mediaId:definition?.mediaId,loading:false});
  }),onMessage:{addListener:(handler:any)=>{receive=handler;}},onDisconnect:{addListener:jest.fn()},disconnect:jest.fn()};
  window.chrome={runtime:{connect:jest.fn(()=>port)},tabs:{query:jest.fn((_query:any,callback:any)=>callback([{id:12}]))}};
  return port;
}
test.each([
  ['prepared video', golden], ['unprepared video', null],
])('the extension button opens the original popup for a %s', async (_name, definition) => {
  setupConnection(definition);
  render(<PracticeApp/>);
  expect(await screen.findByText('Original popup controls')).toBeInTheDocument();
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
  expect(screen.queryByText('One part at a time.')).not.toBeInTheDocument();
  expect(screen.queryByRole('group',{name:'Practice beat range'})).not.toBeInTheDocument();
});
test('only the explicitly embedded frame renders prepared practice controls', async () => {
  window.history.replaceState({}, '', '/?practice=1&session=frame-token');
  const port=setupConnection();render(<PracticeApp/>);
  expect(await screen.findByRole('button',{name:'▶ Play'})).toBeInTheDocument();
  expect(screen.queryByText('Original popup controls')).not.toBeInTheDocument();
  expect(port.postMessage).toHaveBeenCalledWith({type:'attach',token:'frame-token'});
});
test('compact controls retain playback, speed and independent lead settings', async () => {
  window.history.replaceState({}, '', '/?practice=1&session=frame-token');
  const port=setupConnection(); render(<PracticeApp/>);
  fireEvent.click(await screen.findByRole('button',{name:'▶ Play'}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'play',mediaId:golden.mediaId});
  fireEvent.click(screen.getByRole('button',{name:'Slower'}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs:{...defaults,speed:.95}});
  fireEvent.click(screen.getByRole('button',{name:'Faster'}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs:{...defaults,speed:1.05}});
  fireEvent.change(screen.getByRole('spinbutton',{name:'Lead-in beats'}),{target:{value:'4'}});
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs:{...defaults,leadIn:{...defaults.leadIn,beats:4}}});
  fireEvent.click(within(screen.getByRole('group',{name:'Lead-out sound'})).getByRole('button',{name:'metronome'}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs:{...defaults,leadOut:{...defaults.leadOut,style:'metronome'}}});
});
test('Retry reruns failed storage initialization before opening the original popup', async () => {
  (transferRecords as jest.Mock).mockReset().mockRejectedValueOnce(Error('Could not verify saved settings. Original records are intact.')).mockResolvedValue(undefined);
  setupConnection();render(<PracticeApp/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify saved settings. Original records are intact.');
  expect(screen.getByRole('alert')).not.toHaveTextContent('Error: Error:');
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));
  expect(await screen.findByText('Original popup controls')).toBeInTheDocument();
  await waitFor(()=>expect(transferRecords).toHaveBeenCalledTimes(2));
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
});
test.each([
  [1, 8, 'Next', 5, 12],
  [5, 12, 'Prev', 1, 8],
  [13, 16, 'Next', 17, 20],
  [13, 16, 'Prev', 9, 12],
])('transport shifts %s–%s with %s and keeps other preferences', async (first, last, direction, nextFirst, nextLast) => {
  window.history.replaceState({}, '', '/?practice=1&session=frame-token');
  const prefs={...defaults,first,last,speed:.75,leadIn:{beats:4,style:'silent' as const}};
  const port=setupConnection(golden,prefs,true); render(<PracticeApp/>);
  const play=await screen.findByRole('button',{name:'▶ Play'});
  expect(play.nextElementSibling).toHaveTextContent('Prev');
  expect(play.nextElementSibling?.nextElementSibling).toHaveTextContent('Next');
  fireEvent.click(screen.getByRole('button',{name:direction}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs:{...prefs,first:nextFirst,last:nextLast}});
  const selected=within(screen.getByRole('group',{name:'Practice beat range'})).getAllByRole('button',{pressed:true});
  expect(selected[0]).toHaveAccessibleName(`Beats ${nextFirst} to ${nextFirst+3}`);
  expect(selected[selected.length-1]).toHaveAccessibleName(`Beats ${nextLast-3} to ${nextLast}`);
  fireEvent.click(screen.getByRole('button',{name:direction==='Next'?'Prev':'Next'}));
  expect(port.postMessage).toHaveBeenLastCalledWith({type:'preferences',mediaId:golden.mediaId,prefs});
});
test.each([
  [1,4,true,false], [29,32,false,true], [1,32,true,true],
])('transport disables shifts outside %s–%s', async (first,last,prevDisabled,nextDisabled) => {
  window.history.replaceState({}, '', '/?practice=1&session=frame-token');
  const port=setupConnection(golden,{...defaults,first,last},true); render(<PracticeApp/>);
  const prev=await screen.findByRole('button',{name:'Prev'}),next=screen.getByRole('button',{name:'Next'});
  expect((prev as HTMLButtonElement).disabled).toBe(prevDisabled);
  expect((next as HTMLButtonElement).disabled).toBe(nextDisabled);
  port.postMessage.mockClear();
  if(prevDisabled)fireEvent.click(prev);
  if(nextDisabled)fireEvent.click(next);
  expect(port.postMessage).not.toHaveBeenCalled();
});
