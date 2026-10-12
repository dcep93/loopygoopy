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
function setupConnection(definition: any = golden) {
  let receive: (message: any) => void;
  const port={postMessage:jest.fn((message:any)=>{
    if(message.type==='attach')receive({type:'snapshot',definition,prefs:defaults,playback:paused,mediaId:definition?.mediaId,loading:false});
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
