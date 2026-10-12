import { requestDefinition } from './tabCatalog';
import golden from './golden.json';
beforeEach(()=>{window.chrome={runtime:{sendMessage:jest.fn()},storage:{local:{get:jest.fn(async()=>({}))}}};});
afterEach(()=>{delete window.chrome;jest.useRealTimers();});
test('worker shutdown during startup falls back to bundled timing',async()=>{
  window.chrome.runtime.sendMessage.mockRejectedValue(Error('Worker stopped'));expect((await requestDefinition(golden.mediaId)).definition).toEqual(golden);
});
test('bounded request timeout uses the last validated catalog',async()=>{
  jest.useFakeTimers();window.chrome.runtime.sendMessage.mockReturnValue(new Promise(()=>{}));
  window.chrome.storage.local.get.mockResolvedValue({'practice-catalog-v1':{catalog:{schemaVersion:1,videos:[{...golden,revision:2}]}}});
  const result=requestDefinition(golden.mediaId);jest.advanceTimersByTime(4500);expect((await result).definition?.revision).toBe(2);
});
test('a successful missing entry stays missing instead of resurrecting a removed catalog video',async()=>{
  window.chrome.runtime.sendMessage.mockResolvedValue({ok:true});expect((await requestDefinition(golden.mediaId)).definition).toBeUndefined();
});
test('rejects another video definition and ignores malformed cached catalog',async()=>{
  window.chrome.runtime.sendMessage.mockResolvedValue({ok:true,definition:{...golden,mediaId:'youtube:O_vU27GXPpk'}});
  window.chrome.storage.local.get.mockResolvedValue({'practice-catalog-v1':{catalog:{schemaVersion:1,videos:[{...golden,bpm:-1}]}}});
  expect((await requestDefinition(golden.mediaId)).definition).toEqual(golden);
});
test('synchronous context invalidation still uses bundled timing when storage is also unavailable',async()=>{
  window.chrome.runtime.sendMessage.mockImplementation(()=>{throw Error('Extension context invalidated');});window.chrome.storage.local.get.mockRejectedValue(Error('Unavailable'));
  expect((await requestDefinition(golden.mediaId)).definition).toEqual(golden);
});
