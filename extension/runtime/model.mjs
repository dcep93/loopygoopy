// src/practice/model.ts
var defaults = { first: 1, last: 8, speed: 1, leadIn: { beats: 2, style: "track" }, leadOut: { beats: 2, style: "track" } };
var paused = { phase: "paused", running: false, beat: 1, remaining: 0, cycle: 0 };
function validDefinition(v, id) {
  return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) && v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === "string" && v.title.length > 0 && v.title.length < 200 && Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 && Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === "published");
}
function validPreferences(v) {
  const lead = (l) => l && Number.isInteger(l.beats) && l.beats >= 0 && l.beats <= 32 && ["track", "silent", "metronome"].includes(l.style);
  return Boolean(v && Number.isInteger(v.first) && Number.isInteger(v.last) && v.first >= 1 && v.last <= 32 && v.first <= v.last && (v.first - 1) % 4 === 0 && v.last % 4 === 0 && Number.isFinite(v.speed) && v.speed >= 0.25 && v.speed <= 1.5 && lead(v.leadIn) && lead(v.leadOut));
}
function range(a, b) {
  return { first: Math.min(a, b) * 4 + 1, last: Math.max(a, b) * 4 + 4 };
}
function interval(d, p) {
  const beatSeconds = 60 / d.bpm;
  return { start: d.firstBeat + (p.first - 1) * beatSeconds, end: d.firstBeat + p.last * beatSeconds, beatSeconds };
}
function decodeDocument(doc) {
  if (!doc?.fields) return void 0;
  return Object.fromEntries(Object.entries(doc.fields).map(([k, v]) => [
    k,
    v.stringValue ?? (v.integerValue !== void 0 ? Number(v.integerValue) : v.doubleValue)
  ]));
}
export {
  decodeDocument,
  defaults,
  interval,
  paused,
  range,
  validDefinition,
  validPreferences
};
