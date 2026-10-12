import { useEffect, useRef } from 'react';
import { Footwork, WeightCue } from './model';

export const pixelsPerBeat = 64;
export function weightAt(cues: WeightCue[], beat: number): 'R' | 'L' | undefined {
  let weight: 'R' | 'L' | undefined;
  for (const cue of cues) {
    if (cue.beat > beat) break;
    if (/[rl]/i.test(cue.symbol)) weight = cue.symbol.toUpperCase() as 'R' | 'L';
  }
  return weight;
}

export default function WeightStream({ footwork, first, last, readBeat }: {
  footwork: Footwork; first: number; last: number; readBeat?: () => number;
}) {
  const strip = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let frame: number, previous = -2;
    strip.current!.querySelectorAll('[data-current]').forEach(cue => cue.removeAttribute('data-current'));
    const tick = () => {
      const position = readBeat?.() ?? first;
      const beat = Number.isFinite(position) ? position : first;
      strip.current!.style.transform = `translate3d(${-beat * pixelsPerBeat}px, 0, 0)`;
      const current = footwork.cues.findIndex(c => beat >= c.beat && beat < c.beat + c.duration);
      if (current !== previous) {
        if (previous >= 0) strip.current!.children[previous].removeAttribute('data-current');
        if (current >= 0) strip.current!.children[current].setAttribute('data-current', 'true');
        const weight = weightAt(footwork.cues, beat);
        viewport.current!.setAttribute('aria-label', `Weight stream${current >= 0 ? `: ${footwork.cues[current].symbol}${weight ? `, ${weight === 'R' ? 'right' : 'left'} foot weighted` : ''}` : ''}. Uppercase: quick, half a count. Lowercase: super-quick, quarter-count. Letter then dash: slow, one count. Star: special action, retain weight.`);
        previous = current;
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, [footwork, first, readBeat]);
  return <div className="weight-stream" ref={viewport} role="img" aria-label="Weight stream">
    <div className="weight-now" aria-hidden="true" />
    <div className="weight-strip" ref={strip} aria-hidden="true">
      {footwork.cues.map(cue => <span key={cue.beat} className="weight-cue"
        data-selected={cue.beat >= first && cue.beat < last + 1}
        style={{ left: cue.beat * pixelsPerBeat }} title={`Count ${cue.beat}: ${cue.symbol}`}>{cue.symbol}</span>)}
    </div>
  </div>;
}
