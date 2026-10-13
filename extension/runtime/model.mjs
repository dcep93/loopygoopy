// src/practice/model.ts
var defaults = { first: 1, last: 8, speed: 1, weightClicks: true, leadIn: { beats: 2, style: "track" }, leadOut: { beats: 2, style: "track" } };
var paused = { phase: "paused", running: false, beat: 1, remaining: 0, cycle: 0 };
function validDefinition(v, id) {
  return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) && v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === "string" && v.title.length > 0 && v.title.length < 200 && Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 && Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === "published" && (v.footwork === void 0 || validFootwork(v.footwork)));
}
function validPreferences(v) {
  const lead = (l) => l && Number.isInteger(l.beats) && l.beats >= 0 && l.beats <= 32 && ["track", "silent", "metronome"].includes(l.style);
  return Boolean(v && Number.isInteger(v.first) && Number.isInteger(v.last) && v.first >= 1 && v.last <= 32 && v.first <= v.last && (v.first - 1) % 4 === 0 && v.last % 4 === 0 && Number.isFinite(v.speed) && v.speed >= 0.25 && v.speed <= 1.5 && (v.weightClicks === void 0 || typeof v.weightClicks === "boolean") && lead(v.leadIn) && lead(v.leadOut));
}
function range(a, b) {
  return { first: Math.min(a, b) * 4 + 1, last: Math.max(a, b) * 4 + 4 };
}
function interval(d, p) {
  const beatSeconds = 60 / d.bpm;
  return { start: d.firstBeat + (p.first - 1) * beatSeconds, end: d.firstBeat + p.last * beatSeconds, beatSeconds };
}
function validCatalog(value) {
  return Boolean(value && value.schemaVersion === 1 && Array.isArray(value.videos) && value.videos.length <= 1e3 && value.videos.every((video) => validDefinition(video)) && new Set(value.videos.map((video) => video.mediaId)).size === value.videos.length);
}
function validFootwork(value) {
  if (!value || typeof value.sourceUrl !== "string") return false;
  try {
    if (new URL(value.sourceUrl).protocol !== "https:") return false;
  } catch {
    return false;
  }
  if (!Array.isArray(value.cues) || !value.cues.length || value.cues.length > 130) return false;
  let end = 0.5;
  return value.cues.every((cue) => {
    if (!cue || !Number.isFinite(cue.beat) || !Number.isInteger(cue.beat * 4) || cue.beat < end || ![0.25, 0.5, 1].includes(cue.duration) || cue.beat + cue.duration > 33 || !["R", "L", "r", "l", "-", "*"].includes(cue.symbol) || ["R", "L", "-"].includes(cue.symbol) && cue.duration !== 0.5 || ["r", "l"].includes(cue.symbol) && cue.duration !== 0.25) return false;
    end = cue.beat + cue.duration;
    return true;
  });
}
export {
  defaults,
  interval,
  paused,
  range,
  validCatalog,
  validDefinition,
  validFootwork,
  validPreferences
};
