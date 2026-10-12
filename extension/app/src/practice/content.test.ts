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
