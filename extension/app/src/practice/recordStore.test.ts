export {};
test('ports complete media records exactly once and preserves newer destination records',async()=>{
  jest.resetModules();localStorage.clear();
  const old={version:'v0.0.2',media:{id:'youtube:O_vU27GXPpk',sourceUrl:'https://www.youtube.com/watch?v=O_vU27GXPpk',title:'Ozzy'},config:{'7':'147.55',bookmarks:[{bookmark_name:'solo 1.2',config:{'7':'147.55'}}],selected_bookmark:'0'}};
  localStorage.setItem('loopy-goopy:youtube:O_vU27GXPpk',JSON.stringify(old));
  localStorage.setItem('loopy-goopy:last-config',JSON.stringify({version:'v0.0.1',config:{}}));
  const db:Record<string,any>={'loopy-goopy:youtube:xzeGxm72GOo':{newer:true}};
  window.chrome={storage:{local:{get:jest.fn(async(keys:any)=>keys===null?{...db}:Object.fromEntries((Array.isArray(keys)?keys:[keys]).filter((k:string)=>k in db).map((k:string)=>[k,db[k]]))),set:jest.fn(async(values:any)=>{Object.assign(db,JSON.parse(JSON.stringify(values)));})}}};
  const {ensureRecordTransfer}=await import('./recordMigration');
  window.chrome.runtime={getURL:(path:string)=>`chrome-extension://test/${path}`,getContexts:jest.fn(async()=>[]),sendMessage:jest.fn(async(message:any)=>{
    if(message.target==='record-migration')return {records:{'loopy-goopy:youtube:O_vU27GXPpk':old,'loopy-goopy:last-config':{version:'v0.0.1'}}};
    await ensureRecordTransfer();return {ok:true};
  })};
  window.chrome.offscreen={createDocument:jest.fn(async()=>{}),closeDocument:jest.fn(async()=>{})};
  const {transferRecords,readRecord,writeRecord}=await import('./recordStore');
  await Promise.all([transferRecords(),transferRecords()]);
  expect(db['loopy-goopy:youtube:O_vU27GXPpk']).toEqual(old);expect(db['loopy-goopy:youtube:xzeGxm72GOo']).toEqual({newer:true});expect(db['loopy-goopy:last-config']).toBeUndefined();
  expect(db['loopy-record-port-v1'].records).toBe(1);
  expect(localStorage.getItem('loopy-goopy:youtube:O_vU27GXPpk')).toBe(JSON.stringify(old));
  await writeRecord('loopy-goopy:youtube:O_vU27GXPpk',JSON.stringify({...old,config:{...old.config,'7':'150'}}));
  expect(JSON.parse((await readRecord('loopy-goopy:youtube:O_vU27GXPpk'))!).config['7']).toBe('150');
  expect(JSON.parse(localStorage.getItem('loopy-goopy:youtube:O_vU27GXPpk')!).config['7']).toBe('147.55');
  delete window.chrome;
});

test('failed reads do not mark migration complete and can be retried',async()=>{
  jest.resetModules();const db:Record<string,any>={};
  const sendMessage=jest.fn().mockResolvedValueOnce({error:'unavailable'}).mockResolvedValueOnce({records:{}});
  window.chrome={runtime:{getURL:(p:string)=>p,getContexts:jest.fn(async()=>[]),sendMessage},offscreen:{createDocument:jest.fn(async()=>{}),closeDocument:jest.fn(async()=>{})},storage:{local:{get:jest.fn(async()=>({...db})),set:jest.fn(async(v:any)=>Object.assign(db,v))}}};
  const {ensureRecordTransfer}=await import('./recordMigration');
  await expect(ensureRecordTransfer()).rejects.toThrow('Original records are intact');
  expect(db['loopy-record-port-v1']).toBeUndefined();
  await ensureRecordTransfer();expect(db['loopy-record-port-v1'].completed).toBe(true);
  expect(window.chrome.offscreen.closeDocument).toHaveBeenCalledTimes(2);delete window.chrome;
});
