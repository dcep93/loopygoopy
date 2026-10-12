import { useRef, useState } from 'react';
import { Lead, Preferences, paused, range } from './model';
import { PracticeSnapshot } from './session';

export type PracticeActions = { change: (prefs: Preferences) => void; play: () => void; pause: () => void; exit: () => void; retry: () => void };

export function RangeButtons({ first, last, onChange }: { first: number; last: number; onChange: (v: { first: number; last: number }) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ anchor: number; dragged: boolean; pointer: number } | undefined>(undefined);
  const keyboardAnchor = useRef<number | undefined>(undefined);
  const [preview, setPreview] = useState<{ first: number; last: number }>();
  const selected = preview || { first, last };
  const clickedRange = (index: number) => {
    const start = (first - 1) / 4, end = last / 4 - 1;
    if (index === start - 1) return range(index, end);
    if (index === end + 1) return range(start, index);
    if (start !== end && index === start) return range(start + 1, end);
    if (start !== end && index === end) return range(start, end - 1);
    return range(index, index);
  };
  const commit = (next: { first: number; last: number }) => {
    if (next.first !== first || next.last !== last) onChange(next);
  };
  const endpoint = (x: number) => {
    const buttons = Array.from(row.current!.querySelectorAll('button'));
    return buttons.reduce((best, button, i) => {
      const box = button.getBoundingClientRect(), previous = buttons[best].getBoundingClientRect();
      return Math.abs(x - (box.left + box.width / 2)) < Math.abs(x - (previous.left + previous.width / 2)) ? i : best;
    }, 0);
  };
  return <div className="beat-blocks" ref={row} role="group" aria-label="Practice beat range"
    onPointerMove={e => { const g = gesture.current; if (!g || g.pointer !== e.pointerId) return; const end = endpoint(e.clientX); g.dragged ||= end !== g.anchor; setPreview(g.dragged ? range(g.anchor, end) : clickedRange(g.anchor)); }}
    onPointerUp={e => { const g = gesture.current; if (!g || g.pointer !== e.pointerId) return; const end = endpoint(e.clientX); gesture.current = undefined; setPreview(undefined); commit(g.dragged || end !== g.anchor ? range(g.anchor, end) : clickedRange(g.anchor)); }}
    onPointerCancel={() => { gesture.current = undefined; setPreview(undefined); }}
    onLostPointerCapture={() => { gesture.current = undefined; setPreview(undefined); }}>
    {Array.from({ length: 8 }, (_, i) => <button key={i} type="button" aria-label={`Beats ${i * 4 + 1} to ${i * 4 + 4}`}
      aria-pressed={i * 4 + 1 >= selected.first && i * 4 + 4 <= selected.last}
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); gesture.current = { anchor: i, dragged: false, pointer: e.pointerId }; row.current?.setPointerCapture(e.pointerId); setPreview(clickedRange(i)); }}
      onClick={e => { if (e.detail === 0) commit(clickedRange(i)); }}
      onKeyUp={e => { if (e.key === 'Shift') keyboardAnchor.current = undefined; }}
      onKeyDown={e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        const next = e.key === 'Home' ? 0 : e.key === 'End' ? 7 : Math.max(0, Math.min(7, i + (e.key === 'ArrowRight' ? 1 : -1)));
        if (e.shiftKey) { keyboardAnchor.current ??= i; onChange(range(keyboardAnchor.current, next)); } else keyboardAnchor.current = undefined;
        row.current?.querySelectorAll('button')[next].focus();
      }}>{i * 4 + 1}<span>–</span>{i * 4 + 4}</button>)}
  </div>;
}

function LeadControls({ label, value, onChange }: { label: string; value: Lead; onChange: (v: Lead) => void }) {
  return <fieldset className="lead-row"><legend>{label}</legend><label className="duration"><input type="number" min="0" max="32" step="1" value={value.beats} aria-label={`${label} beats`}
    onChange={e => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 0 && n <= 32) onChange({ ...value, beats: n }); }} /> beats</label>
    <div className="segments" role="group" aria-label={`${label} sound`}>{(['track', 'silent', 'metronome'] as const).map(style =>
      <button type="button" key={style} aria-pressed={value.style === style} onClick={() => onChange({ ...value, style })}>{style}</button>)}</div>
  </fieldset>;
}

export default function PracticeControls({ snapshot, actions }: { snapshot: PracticeSnapshot; actions: PracticeActions }) {
  const { definition: d, prefs: p } = snapshot, playback = snapshot.playback || paused;
  const change = (patch: Partial<Preferences>) => { if (p) actions.change({ ...p, ...patch }); };
  const phase = playback.phase === 'buffering' ? 'Buffering' : '';
  const brand = <a className="brand" href="https://github.com/dcep93/loopygoopy#practice" target="_blank" rel="noreferrer">loopy goopy</a>;
  return <main className="practice-panel embedded">
    <header className="practice-header">
      {d && p && <>
        <div className="practice-title"><h1>{d.title}</h1></div>
        <div className="transport"><div className={`counter phase-${playback.phase}`}><span className="count">{['lead-in', 'lead-out'].includes(playback.phase) ? playback.remaining : playback.beat}</span>{phase && <span className="phase">{phase}</span>}</div>
          <button className="play" onClick={() => playback.running ? actions.pause() : actions.play()}>{playback.running ? 'Ⅱ Pause' : '▶ Play'}</button>
          <button disabled={p.first <= 1} onClick={() => change({ first: p.first - 4, last: p.last - 4 })}>Prev</button>
          <button disabled={p.last >= d.totalBeats} onClick={() => change({ first: p.first + 4, last: p.last + 4 })}>Next</button>
        </div>
      </>}
      <button className="text-button exit" onClick={() => actions.exit()}>Exit practice mode</button>
      {brand}
    </header>
    {snapshot.loading ? <div className="empty"><h1>Preparing your practice…</h1></div> : snapshot.error ?
      <div className="empty" role="alert"><h1>Practice unavailable</h1><p>{snapshot.error}</p><button onClick={actions.retry}>Retry</button></div> : !d || !p ?
      <div className="empty"><h1>This video isn’t prepared yet</h1><p>{snapshot.notice || 'Use the extension toolbar icon for manual loop controls.'}</p><button onClick={actions.retry}>Retry</button></div> : <>
      <RangeButtons first={p.first} last={p.last} onChange={change} />
      <div className="practice-settings">
        <div className="speed segments" role="group" aria-label="Playback speed"><span>Speed</span><button aria-label="Slower" disabled={p.speed <= .25} onClick={() => change({ speed: Math.max(.25, +(p.speed - .05).toFixed(2)) })}>−</button><output aria-label="Current speed" aria-live="polite">{Math.round(p.speed * 100)}%</output><button aria-label="Faster" disabled={p.speed >= 1.5} onClick={() => change({ speed: Math.min(1.5, +(p.speed + .05).toFixed(2)) })}>+</button></div>
        <LeadControls label="Lead-in" value={p.leadIn} onChange={leadIn => change({ leadIn })} />
        <LeadControls label="Lead-out" value={p.leadOut} onChange={leadOut => change({ leadOut })} />
      </div>
      {playback.error && <p className="error" role="alert">{playback.error}</p>}
    </>}{snapshot.saveError && <p className="error" role="alert">{snapshot.saveError}</p>}
  </main>;
}
