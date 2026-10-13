export type LeadStyle = 'track' | 'silent' | 'metronome';
export type Lead = { beats: number; style: LeadStyle };
export type Preferences = { first: number; last: number; speed: number; weightClicks?: boolean; leadIn: Lead; leadOut: Lead };
export type WeightCue = { beat: number; duration: .25 | .5 | 1; symbol: 'R' | 'L' | 'r' | 'l' | '-' | '*' };
export type Footwork = { sourceUrl: string; cues: WeightCue[] };
export type Definition = {
  schemaVersion: 1; mediaId: string; sourceUrl: string; title: string;
  footwork?: Footwork;
  bpm: number; firstBeat: number; totalBeats: 32; revision: number; status: 'published';
};
export type Playback = { phase: 'paused' | 'seeking' | 'lead-in' | 'practice' | 'lead-out' | 'buffering' | 'error'; running: boolean; beat: number; remaining: number; cycle: number; error?: string };
export const defaults: Preferences = { first: 1, last: 8, speed: 1, weightClicks: true, leadIn: { beats: 2, style: 'track' }, leadOut: { beats: 2, style: 'track' } };
export const paused: Playback = { phase: 'paused', running: false, beat: 1, remaining: 0, cycle: 0 };
export function validDefinition(v: any, id?: string): v is Definition {
  return Boolean(v && v.schemaVersion === 1 && /^youtube:[\w-]{11}$/.test(v.mediaId) && (!id || v.mediaId === id) &&
    v.sourceUrl === `https://www.youtube.com/watch?v=${v.mediaId.slice(8)}` && typeof v.title === 'string' && v.title.length > 0 && v.title.length < 200 &&
    Number.isFinite(v.bpm) && v.bpm > 0 && v.bpm <= 400 && Number.isFinite(v.firstBeat) && v.firstBeat >= 0 && v.totalBeats === 32 &&
    Number.isSafeInteger(v.revision) && v.revision > 0 && v.status === 'published' && (v.footwork === undefined || validFootwork(v.footwork)));
}
export function validPreferences(v: any): v is Preferences {
  const lead = (l: any) => l && Number.isInteger(l.beats) && l.beats >= 0 && l.beats <= 32 && ['track', 'silent', 'metronome'].includes(l.style);
  return Boolean(v && Number.isInteger(v.first) && Number.isInteger(v.last) && v.first >= 1 && v.last <= 32 && v.first <= v.last &&
    (v.first - 1) % 4 === 0 && v.last % 4 === 0 && Number.isFinite(v.speed) && v.speed >= .25 && v.speed <= 1.5 && (v.weightClicks === undefined || typeof v.weightClicks === 'boolean') && lead(v.leadIn) && lead(v.leadOut));
}
export function range(a: number, b: number) { return { first: Math.min(a, b) * 4 + 1, last: Math.max(a, b) * 4 + 4 }; }
export function interval(d: Definition, p: Preferences) {
  const beatSeconds = 60 / d.bpm;
  return { start: d.firstBeat + (p.first - 1) * beatSeconds, end: d.firstBeat + p.last * beatSeconds, beatSeconds };
}
export type Catalog = { schemaVersion: 1; videos: Definition[] };
export function validCatalog(value: any): value is Catalog {
  return Boolean(value && value.schemaVersion === 1 && Array.isArray(value.videos) && value.videos.length <= 1000 &&
    value.videos.every((video: any) => validDefinition(video)) && new Set(value.videos.map((video: Definition) => video.mediaId)).size === value.videos.length);
}

export function validFootwork(value: any): value is Footwork {
  if (!value || typeof value.sourceUrl !== 'string') return false;
  try { if (new URL(value.sourceUrl).protocol !== 'https:') return false; } catch { return false; }
  if (!Array.isArray(value.cues) || !value.cues.length || value.cues.length > 130) return false;
  let end = .5;
  return value.cues.every((cue: any) => {
    if (!cue || !Number.isFinite(cue.beat) || !Number.isInteger(cue.beat * 4) || cue.beat < end ||
      ![.25, .5, 1].includes(cue.duration) || cue.beat + cue.duration > 33 || !['R', 'L', 'r', 'l', '-', '*'].includes(cue.symbol) ||
      (['R', 'L', '-'].includes(cue.symbol) && cue.duration !== .5) ||
      (['r', 'l'].includes(cue.symbol) && cue.duration !== .25)) return false;
    end = cue.beat + cue.duration;
    return true;
  });
}
