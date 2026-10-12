import golden from './golden.json';
import { defaults } from './model';
jest.mock('./catalog',()=>({loadDefinition:jest.fn(async()=>({definition:require('./golden.json')}))}));
const flush=async()=>{for(let i=0;i<15;i++)await Promise.resolve();};
function port(name:string,sender:any){
  const messages:Function[]=[],disconnects:Function[]=[];
  return {name,sender,postMessage:jest.fn(),disconnect:jest.fn(),onMessage:{addListener:(f:Function)=>messages.push(f)},onDisconnect:{addListener:(f:Function)=>disconnects.push(f)},receive:(m:any)=>messages.forEach(f=>f(m))};
}
test('two tabs share saved preferences but commands and live sessions remain bound to their own tab',async()=>{
  const connects:Function[]=[];
  (globalThis as any).structuredClone=(v:any)=>JSON.parse(JSON.stringify(v));
  (globalThis as any).crypto={randomUUID:jest.fn().mockReturnValueOnce('token-1').mockReturnValueOnce('token-2')};
  const local={get:jest.fn(async()=>({})),set:jest.fn(async()=>{})};
  window.chrome={runtime:{getURL:(s:string)=>`chrome-extension://test/${s}`,onConnect:{addListener:(f:Function)=>connects.push(f)},onMessage:{addListener:jest.fn()}},storage:{local}};
  jest.isolateModules(()=>require('./background'));
  const connect=(p:any)=>connects[0](p);
  const one=port('loopy-practice-host',{tab:{id:1},frameId:0,url:golden.sourceUrl}),two=port('loopy-practice-host',{tab:{id:2},frameId:0,url:golden.sourceUrl});
  connect(one);connect(two);one.receive({type:'hello',mediaId:golden.mediaId,url:golden.sourceUrl});two.receive({type:'hello',mediaId:golden.mediaId,url:golden.sourceUrl});await flush();
  const popup=port('loopy-practice-view',{url:'chrome-extension://test/app/build/index.html'});connect(popup);popup.receive({type:'attach',tabId:1});
  const embedded=port('loopy-practice-view',{url:'chrome-extension://test/app/build/index.html?practice=1',tab:{id:1}});connect(embedded);embedded.receive({type:'attach',token:'token-1'});
  one.postMessage.mockClear();two.postMessage.mockClear();popup.postMessage.mockClear();embedded.postMessage.mockClear();
  popup.receive({type:'preferences',mediaId:golden.mediaId,prefs:{...defaults,first:17,last:24}});await flush();
  expect(one.postMessage).toHaveBeenCalledWith(expect.objectContaining({type:'preferences'}));expect(two.postMessage).not.toHaveBeenCalled();
  expect(embedded.postMessage).toHaveBeenCalledWith(expect.objectContaining({prefs:expect.objectContaining({first:17,last:24})}));
  expect(local.set).toHaveBeenCalledWith({[`practice-prefs:${golden.mediaId}`]:{...defaults,first:17,last:24}});
  one.postMessage.mockClear();popup.receive({type:'play',mediaId:'youtube:O_vU27GXPpk'});expect(one.postMessage).not.toHaveBeenCalled();
  popup.receive({type:'play',mediaId:golden.mediaId});expect(one.postMessage).toHaveBeenCalledWith({type:'play'});
  one.postMessage.mockClear();
  embedded.receive({type:'height',mediaId:golden.mediaId,height:181.2});
  expect(one.postMessage).toHaveBeenCalledWith({type:'height',height:182});
  one.postMessage.mockClear();
  embedded.receive({type:'height',mediaId:golden.mediaId,height:NaN});
  expect(one.postMessage).not.toHaveBeenCalled();
  const wrong=port('loopy-practice-view',{url:'chrome-extension://test/app/build/index.html?practice=1',tab:{id:2}});connect(wrong);wrong.receive({type:'attach',token:'token-1'});expect(wrong.postMessage).toHaveBeenCalledWith({type:'unavailable'});
  delete window.chrome;
});
