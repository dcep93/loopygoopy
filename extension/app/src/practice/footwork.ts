import { WeightCue } from './model';

// Case encodes duration, not a different foot. Holds/specials never transfer weight.
export function weightChangeBeats(cues: WeightCue[]): number[] {
  let previous: string | undefined;
  const beats: number[] = [];
  for (const cue of cues) {
    if (!['R', 'L', 'r', 'l'].includes(cue.symbol)) continue;
    const foot = cue.symbol.toUpperCase();
    if (foot !== previous) beats.push(cue.beat);
    previous = foot;
  }
  return beats;
}
