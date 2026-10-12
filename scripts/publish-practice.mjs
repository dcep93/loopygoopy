import fs from 'node:fs/promises';
// Use a Google OAuth access token for an IAM-authorized project owner/editor.
// Firebase client ID tokens cannot publish; the rules deny all client writes.
const [projectId, filename] = process.argv.slice(2);
if (!projectId || !filename || !process.env.GOOGLE_OAUTH_ACCESS_TOKEN) {
  throw Error('Usage: GOOGLE_OAUTH_ACCESS_TOKEN=<owner token> node scripts/publish-practice.mjs <project-id> <entry.json>');
}
const d = JSON.parse(await fs.readFile(filename, 'utf8'));
const { validDefinition } = await import('../extension/runtime/model.mjs');
if (!validDefinition(d)) throw Error('Invalid or unpublished definition. Verify timing and set status to published before publishing.');
const fields = Object.fromEntries(Object.entries(d).map(([key,value]) => [key, typeof value === 'string' ? {stringValue:value} : Number.isInteger(value) ? {integerValue:String(value)} : {doubleValue:value}]));
const endpoint = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/practiceVideos/${encodeURIComponent(d.mediaId)}`;
const headers = { Authorization: `Bearer ${process.env.GOOGLE_OAUTH_ACCESS_TOKEN}`, 'Content-Type': 'application/json' };
const current = await fetch(endpoint, { headers });
let precondition = 'currentDocument.exists=false';
if (current.ok) {
  const document = await current.json();
  const revision = Number(document.fields?.revision?.integerValue ?? document.fields?.revision?.doubleValue ?? 0);
  if (revision >= d.revision) throw Error(`Revision must exceed the published revision (${revision}).`);
  precondition = `currentDocument.updateTime=${encodeURIComponent(document.updateTime)}`;
} else if (current.status !== 404) throw Error(`Could not inspect existing definition (${current.status}).`);
const response = await fetch(`${endpoint}?${precondition}`, { method: 'PATCH', headers, body: JSON.stringify({ fields }) });
if (!response.ok) throw Error(`Publishing failed (${response.status}): ${await response.text()}`);
console.log(`Published ${d.mediaId}, revision ${d.revision}`);
