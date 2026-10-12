import assert from 'node:assert/strict';
const host=process.env.FIRESTORE_EMULATOR_HOST;
assert(host && /^(127\.0\.0\.1|localhost):\d+$/.test(host),'Set FIRESTORE_EMULATOR_HOST to a local emulator; this test must never target production.');
const base=`http://${host}/v1/projects/demo-loopygoopy/databases/(default)/documents`;
const entry=status=>({fields:{status:{stringValue:status},schemaVersion:{integerValue:'1'},title:{stringValue:'Test'}}});
for(const status of ['published','draft']) {
  const r=await fetch(`${base}/practiceVideos/test-${status}`,{method:'PATCH',headers:{Authorization:'Bearer owner','Content-Type':'application/json'},body:JSON.stringify(entry(status))});assert.equal(r.status,200);
}
assert.equal((await fetch(`${base}/practiceVideos/test-published`)).status,200,'Published definitions must be readable');
assert.equal((await fetch(`${base}/practiceVideos/test-draft`)).status,403,'Drafts must be private');
assert.equal((await fetch(`${base}/practiceVideos/test-published`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(entry('published'))})).status,403,'Anonymous writes must fail');
assert.equal((await fetch(`${base}/practiceVideos/test-published`,{method:'DELETE'})).status,403,'Anonymous deletes must fail');
assert.equal((await fetch(`${base}/privateConfigs/test`)).status,403,'Other collections must be private');
const query={structuredQuery:{from:[{collectionId:'practiceVideos'}],where:{compositeFilter:{op:'AND',filters:[{fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'published'}}},{fieldFilter:{field:{fieldPath:'schemaVersion'},op:'EQUAL',value:{integerValue:'1'}}}]}},limit:100}};
const listed=await fetch(`${base}:runQuery`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(query)});
assert.equal(listed.status,200,'Library query must satisfy public-read rules');
const results=await listed.json();assert.equal(results.filter(x=>x.document).length,1);assert.equal(results[0].document.fields.status.stringValue,'published');
console.log('6 Firestore access checks passed: published read/query, private drafts, denied writes/deletes/other collections.');
