import { useEffect, useRef, useState } from 'react';
import Main from '../app/Main';
import { Definition, Lead, Playback, Preferences, paused, range } from './model';
import { transferRecords } from './recordStore';
import './practice.css';

type Snapshot = { definition?: Definition; prefs?: Preferences; playback?: Playback; loading?: boolean; mediaId?: string; notice?: string; error?: string };

export function RangeButtons({ first, last, onChange }: { first: number; last: number; onChange: (v: { first: number; last: number }) => void }) {
  const row = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ anchor: number; end: number; pointer: number } | undefined>(undefined);
  const keyboardAnchor = useRef<number | undefined>(undefined);
  const [preview, setPreview] = useState<{ first: number; last: number }>();
  const selected = preview || { first, last };
  const endpoint = (x: number) => {
    const buttons = Array.from(row.current!.querySelectorAll('button'));
    return buttons.reduce((best, button, i) => {
      const box = button.getBoundingClientRect(), previous = buttons[best].getBoundingClientRect();
      return Math.abs(x - (box.left + box.width / 2)) < Math.abs(x - (previous.left + previous.width / 2)) ? i : best;
    }, 0);
  };
  return <div className="beat-blocks" ref={row} role="group" aria-label="Practice beat range"
    onPointerMove={e => { const g = gesture.current; if (!g || g.pointer !== e.pointerId) return; g.end = endpoint(e.clientX); setPreview(range(g.anchor, g.end)); }}
    onPointerUp={e => { const g = gesture.current; if (!g || g.pointer !== e.pointerId) return; gesture.current = undefined; setPreview(undefined); onChange(range(g.anchor, endpoint(e.clientX))); }}
    onPointerCancel={() => { gesture.current = undefined; setPreview(undefined); }}
    onLostPointerCapture={() => { gesture.current = undefined; setPreview(undefined); }}>
    {Array.from({ length: 8 }, (_, i) => <button key={i} type="button" aria-label={`Beats ${i * 4 + 1} to ${i * 4 + 4}`}
      aria-pressed={i * 4 + 1 >= selected.first && i * 4 + 4 <= selected.last}
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); gesture.current = { anchor: i, end: i, pointer: e.pointerId }; row.current?.setPointerCapture(e.pointerId); setPreview(range(i, i)); }}
      onClick={e => { if (e.detail === 0) onChange(range(i, i)); }}
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

export default function PracticeApp() {
  const params = new URLSearchParams(window.location.search), embedded = params.has('practice'), token = params.get('session');
  const [snapshot, setSnapshot] = useState<Snapshot>({ loading: true });
  const [manual, setManual] = useState(params.has('manual'));
  const [saveError, setSaveError] = useState('');
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState(false);
  const connection = useRef<any>(undefined);
  const send = (type: string, extra: any = {}) => { try { connection.current?.postMessage({ type, mediaId: snapshot.mediaId, ...extra }); } catch { setSaveError('The page connection closed. Reload the video.'); } };
  useEffect(() => {
    let closed = false, port: any, reconnect: ReturnType<typeof setTimeout>;
    const connect = async () => {
      setConnectionError(false);
      try {
        await transferRecords(); if (closed) return;
        if (!window.chrome?.runtime?.connect) { setManual(true); return; }
        port = window.chrome.runtime.connect({ name: 'loopy-practice-view' }); connection.current = port;
        port.onMessage.addListener((m: any) => {
          if (closed) return;
          if (m.type === 'snapshot') { setSnapshot(m); if (!embedded && !m.loading && !m.definition) setManual(true); }
          if (m.type === 'unavailable') { if (!embedded) setManual(true); else setSnapshot({ loading: false, error: 'The video connection changed. Reload this page.' }); }
          if (m.type === 'stale') setSnapshot({ loading: false, error: 'This video session ended. Reload the page to reconnect.' });
          if (m.type === 'save-error') setSaveError('Settings could not be saved. Your current session is still running.');
        });
        port.onDisconnect.addListener(() => { if (!closed) { setSnapshot({ loading: true }); reconnect = setTimeout(connect, 800); } });
        if (token) port.postMessage({ type: 'attach', token });
        else window.chrome.tabs.query({ active: true, currentWindow: true }, (tabs: any[]) => { if (!closed) port.postMessage({ type: 'attach', tabId: tabs[0]?.id }); });
      } catch (e) { if (!closed) { setConnectionError(true); setSnapshot({ loading: false, error: e instanceof Error ? e.message : String(e) }); } }
    };
    void connect();
    return () => { closed = true; clearTimeout(reconnect); port?.disconnect(); };
  }, [embedded, token, connectionAttempt]);
  useEffect(() => {
    if (!embedded) return;
    const observer = new ResizeObserver(() => send('height', { height: document.getElementById('root')?.scrollHeight || 460 }));
    observer.observe(document.getElementById('root')!); return () => observer.disconnect();
    // The bound session ID changes only when the iframe is replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, snapshot.mediaId, manual]);
  // Ordinary videos retain the original popup root and layout.
  if (manual && !embedded) return <Main />;
  if (manual) return <div className="manual-shell"><button onClick={() => send('exit')}>Close controls</button><Main /></div>;
  const { definition: d, prefs: p } = snapshot, playback = snapshot.playback || paused;
  const change = (patch: Partial<Preferences>) => { if (p) send('preferences', { prefs: { ...p, ...patch } }); };
  const phase = playback.phase === 'lead-in' ? 'Get ready' : playback.phase === 'lead-out' ? 'Reset' : playback.phase === 'buffering' ? 'Buffering' : playback.phase === 'seeking' ? 'Getting ready' : playback.running ? 'Practicing' : 'Ready to practice';
  return <main className={`practice-panel ${embedded ? 'embedded' : 'popup'}`}>
    <header><a className="brand" href="https://github.com/dcep93/loopygoopy#practice" target="_blank" rel="noreferrer">loopy goopy<span> ↗</span></a>
      {embedded && <button className="text-button" onClick={() => send('exit')}>Exit practice mode</button>}</header>
    {snapshot.loading ? <div className="empty"><h1>Preparing your practice…</h1></div> : snapshot.error ?
      <div className="empty" role="alert"><h1>Let’s reconnect</h1><p>{snapshot.error}</p><button onClick={() => { if (connectionError) { setSnapshot({ loading: true }); setConnectionAttempt(n => n + 1); } else send('retry'); }}>Retry</button></div> : !d || !p ?
      <div className="empty"><h1>This video isn’t prepared yet</h1><p>{snapshot.notice || 'You can still use the manual loop controls.'}</p><button onClick={() => send('retry')}>Retry</button><button onClick={() => { send('manual'); setManual(true); }}>Manual controls</button></div> : <>
      <div className="practice-heading"><div><p className="eyebrow">{d.title}</p><h1>One part at a time.</h1></div><p className="selection" aria-live="polite">Beats <strong>{p.first}–{p.last}</strong><span> of {d.totalBeats}</span></p></div>
      <RangeButtons first={p.first} last={p.last} onChange={change} />
      <p className="hint">Click a block. Drag to practice more.</p>
      <div className="transport"><div className={`counter phase-${playback.phase}`}><span className="count">{['lead-in', 'lead-out'].includes(playback.phase) ? playback.remaining : playback.beat}</span><div><strong>{phase}</strong><span>{['lead-in', 'lead-out'].includes(playback.phase) ? 'beats remaining' : `of ${d.totalBeats} beats`}</span></div></div>
        <button className="play" onClick={() => send(playback.running ? 'pause' : 'play')}>{playback.running ? 'Ⅱ Pause' : '▶ Play'}</button>
        <div className="speed"><span>Playback speed</span><div className="segments"><button aria-label="Slower" disabled={p.speed <= .25} onClick={() => change({ speed: Math.max(.25, +(p.speed - .05).toFixed(2)) })}>−</button>{[.5, .75, 1].map(speed => <button key={speed} aria-pressed={p.speed === speed} onClick={() => change({ speed })}>{speed}×</button>)}<button aria-label="Faster" disabled={p.speed >= 1.5} onClick={() => change({ speed: Math.min(1.5, +(p.speed + .05).toFixed(2)) })}>+</button></div><small>{Math.round(p.speed * 100)}%</small></div>
      </div>
      <div className="leads"><LeadControls label="Lead-in" value={p.leadIn} onChange={leadIn => change({ leadIn })} /><LeadControls label="Lead-out" value={p.leadOut} onChange={leadOut => change({ leadOut })} /></div>
      <footer><span>Repeats until you pause{playback.cycle > 0 ? ` · Repeat ${playback.cycle}` : ''}</span><details><summary>Advanced</summary><p>Prepared tempo: {d.bpm} BPM · First beat: {d.firstBeat}s</p><p>{snapshot.notice || 'Practice guide loaded.'}</p><button onClick={() => { send('manual'); setManual(true); }}>Open manual controls</button></details></footer>
      {playback.error && <p className="error" role="alert">{playback.error}</p>}
    </>}{saveError && <p className="error" role="alert">{saveError}</p>}
  </main>;
}
