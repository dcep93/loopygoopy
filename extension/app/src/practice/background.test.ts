import golden from './golden.json';
jest.mock('./catalog',()=>({loadDefinition:jest.fn()}));
jest.mock('./recordMigration',()=>({ensureRecordTransfer:jest.fn(async()=>{})}));
let receive:Function;
beforeEach(()=>{
  window.chrome={runtime:{getURL:(s:string)=>`chrome-extension://test/${s}`,onMessage:{addListener:(f:Function)=>{receive=f;}},onConnect:{addListener:jest.fn()}}};
  jest.isolateModules(()=>{require('./catalog').loadDefinition.mockResolvedValue({definition:golden});require('./background');});
});
afterEach(()=>{delete window.chrome;jest.clearAllMocks();});
const sender={tab:{id:12},frameId:0,url:golden.sourceUrl};
test('serves catalog requests without registering any playback ports',async()=>{
  const reply=jest.fn();expect(receive({type:'practice-definition',mediaId:golden.mediaId},sender,reply)).toBe(true);
  await Promise.resolve();expect(reply).toHaveBeenCalledWith({ok:true,definition:golden});
  expect(window.chrome.runtime.onConnect.addListener).not.toHaveBeenCalled();
});
test.each([{...sender,frameId:1},{...sender,url:'https://example.com/'},{...sender,tab:undefined},{...sender,url:'https://www.youtube.com/watch?v=O_vU27GXPpk'}])('rejects a catalog request outside its current top-level video',async(from)=>{
  const reply=jest.fn();receive({type:'practice-definition',mediaId:golden.mediaId},from,reply);expect(reply).toHaveBeenCalledWith({ok:false});
});
test('does not accept obsolete practice commands or sessions',()=>{
  const reply=jest.fn();receive({type:'play',mediaId:golden.mediaId},sender,reply);expect(reply).toHaveBeenCalledWith(false);
});
