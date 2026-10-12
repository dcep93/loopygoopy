import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PracticeApp from './PracticeApp';
import { transferRecords } from './recordStore';
import golden from './golden.json';
import { defaults, paused } from './model';
jest.mock('./recordStore', () => ({ transferRecords: jest.fn() }));
jest.mock('../app/Main', () => () => <div>Manual controls</div>);
afterEach(() => { delete window.chrome; jest.resetAllMocks(); });
test('Retry reruns failed storage initialization and connects the popup', async () => {
  (transferRecords as jest.Mock).mockRejectedValueOnce(Error('Could not verify saved settings. Original records are intact.')).mockResolvedValue(undefined);
  let receive: (message: any) => void;
  const port={postMessage:jest.fn((message:any)=>{
    if(message.type==='attach')receive({type:'snapshot',definition:golden,prefs:defaults,playback:paused,mediaId:golden.mediaId,loading:false});
  }),onMessage:{addListener:(handler:any)=>{receive=handler;}},onDisconnect:{addListener:jest.fn()},disconnect:jest.fn()};
  window.chrome={runtime:{connect:jest.fn(()=>port)},tabs:{query:jest.fn((_query:any,callback:any)=>callback([{id:12}]))}};
  render(<PracticeApp/>);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not verify saved settings. Original records are intact.');
  expect(screen.getByRole('alert')).not.toHaveTextContent('Error: Error:');
  expect(window.chrome.runtime.connect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Retry'}));
  expect(await screen.findByRole('button',{name:'▶ Play'})).toBeInTheDocument();
  await waitFor(()=>expect(transferRecords).toHaveBeenCalledTimes(2));
  expect(port.postMessage).toHaveBeenCalledWith({type:'attach',tabId:12});
});
