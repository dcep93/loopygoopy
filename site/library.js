/* Catalog data is text only: never interpolate remote titles into HTML. */
const statusElement = document.getElementById('status');
const listElement = document.getElementById('videos');
function decode(doc) { return Object.fromEntries(Object.entries(doc.fields || {}).map(([k,v]) => [k,v.stringValue ?? Number(v.integerValue ?? v.doubleValue)])); }
function valid(d) { return d && d.schemaVersion === 1 && d.status === 'published' && /^youtube:[\w-]{11}$/.test(d.mediaId) && d.sourceUrl === `https://www.youtube.com/watch?v=${d.mediaId.slice(8)}` && typeof d.title === 'string' && d.title.length < 200 && d.bpm > 0 && d.bpm <= 400 && d.firstBeat >= 0 && d.totalBeats === 32 && Number.isSafeInteger(d.revision) && d.revision > 0; }
function render(entries) {
  listElement.replaceChildren();
  for (const [index,d] of entries.entries()) {
    const card = document.createElement('a'); card.className = 'card'; card.href = `${d.sourceUrl}&loopygoopy`;
    for (const [tag,cls,text] of [['span','number',String(index+1).padStart(2,'0')],['h3','',d.title],['p','',`${d.totalBeats} beats · Choose your pace`],['span','cta','Start practicing →']]) {
      const child = document.createElement(tag); child.className = cls; child.textContent = text; card.appendChild(child);
    }
    listElement.appendChild(card);
  }
}
async function load() {
  const fallback = await fetch('golden.json').then(r => r.json()).catch(() => null);
  if (valid(fallback)) render([fallback]);
  try {
    const response = await fetch('https://firestore.googleapis.com/v1/projects/loopygoopy/databases/(default)/documents:runQuery', {
      method:'POST',headers:{'Content-Type':'application/json'},signal:AbortSignal.timeout(5000),
      body:JSON.stringify({structuredQuery:{from:[{collectionId:'practiceVideos'}],where:{compositeFilter:{op:'AND',filters:[
        {fieldFilter:{field:{fieldPath:'status'},op:'EQUAL',value:{stringValue:'published'}}},
        {fieldFilter:{field:{fieldPath:'schemaVersion'},op:'EQUAL',value:{integerValue:'1'}}}
      ]}},limit:100}})
    });
    if (!response.ok) throw Error('Catalog unavailable');
    const entries = (await response.json()).filter(x => x.document).map(x => decode(x.document)).filter(valid);
    if (entries.length) render(entries.sort((a,b) => a.title.localeCompare(b.title)));
  } catch { statusElement.textContent = 'Showing the saved practice collection.'; }
}
load();
