import { useEffect, useRef, useState } from 'react';
import Main from '../app/Main';
import { Definition, Lead, Playback, Preferences, paused, range } from './model';
import { transferRecords } from './recordStore';
import './practice.css';

type Snapshot = { definition?: Definition; prefs?: Preferences; playback?: Playback; loading?: boolean; mediaId?: string; notice?: string; error?: string };

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
        // The toolbar popup always uses the original controls, regardless of catalog data.
        if (!embedded || !window.chrome?.runtime?.connect) { setManual(true); return; }
        port = window.chrome.runtime.connect({ name: 'loopy-practice-view' }); connection.current = port;
        port.onMessage.addListener((m: any) => {
          if (closed) return;
          if (m.type === 'snapshot') setSnapshot(m);
          if (m.type === 'unavailable') setSnapshot({ loading: false, error: 'The video connection changed. Reload this page.' });
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
    const root = document.getElementById('root');
    if (!root) return;
    const reportHeight = () => send('height', { height: Math.ceil(root.getBoundingClientRect().height) });
    const observer = new ResizeObserver(reportHeight);
    observer.observe(root); reportHeight();
    return () => observer.disconnect();
    // The bound session ID changes only when the iframe is replaced.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [embedded, snapshot.mediaId, manual]);
  const retry = () => {
    if (connectionError) { setSnapshot({ loading: true }); setConnectionAttempt(n => n + 1); }
    else send('retry');
  };
  if (!embedded) {
    if (manual) return <Main />;
    return <div style={{ width: '800px', padding: '.5em', backgroundColor: '#aaaaaa' }}>
      {snapshot.error ? <div role="alert">{snapshot.error} <button onClick={retry}>Retry</button></div> : 'Loading settings…'}
    </div>;
  }
  if (manual) return <div className="manual-shell"><button onClick={() => send('exit')}>Close controls</button><Main /></div>;
  const { definition: d, prefs: p } = snapshot, playback = snapshot.playback || paused;
  const change = (patch: Partial<Preferences>) => { if (p) send('preferences', { prefs: { ...p, ...patch } }); };
  const phase = playback.phase === 'buffering' ? 'Buffering' : '';
  const brand = <a className="brand" href="https://github.com/dcep93/loopygoopy#practice" target="_blank" rel="noreferrer">loopy goopy</a>;
  return <main className="practice-panel embedded">
    <header className="practice-header">{(!d || !p) && brand}
      {d && p && <>
        <div className="practice-title"><h1>{d.title}</h1></div>
        <div className="transport">{brand}<div className={`counter phase-${playback.phase}`}><span className="count">{['lead-in', 'lead-out'].includes(playback.phase) ? playback.remaining : playback.beat}</span>{phase && <span className="phase">{phase}</span>}</div>
          <button className="play" onClick={() => send(playback.running ? 'pause' : 'play')}>{playback.running ? 'Ⅱ Pause' : '▶ Play'}</button>
        </div>
      </>}
      <button className="text-button exit" onClick={() => send('exit')}>Exit practice mode</button>
    </header>
    {snapshot.loading ? <div className="empty"><h1>Preparing your practice…</h1></div> : snapshot.error ?
      <div className="empty" role="alert"><h1>Let’s reconnect</h1><p>{snapshot.error}</p><button onClick={retry}>Retry</button></div> : !d || !p ?
      <div className="empty"><h1>This video isn’t prepared yet</h1><p>{snapshot.notice || 'You can still use the manual loop controls.'}</p><button onClick={() => send('retry')}>Retry</button><button onClick={() => { send('manual'); setManual(true); }}>Manual controls</button></div> : <>
      <RangeButtons first={p.first} last={p.last} onChange={change} />
      <div className="practice-settings">
        <div className="speed segments" role="group" aria-label="Playback speed"><button aria-label="Slower" disabled={p.speed <= .25} onClick={() => change({ speed: Math.max(.25, +(p.speed - .05).toFixed(2)) })}>−</button><output aria-label="Current speed" aria-live="polite">{Math.round(p.speed * 100)}%</output><button aria-label="Faster" disabled={p.speed >= 1.5} onClick={() => change({ speed: Math.min(1.5, +(p.speed + .05).toFixed(2)) })}>+</button></div>
        <LeadControls label="Lead-in" value={p.leadIn} onChange={leadIn => change({ leadIn })} />
        <LeadControls label="Lead-out" value={p.leadOut} onChange={leadOut => change({ leadOut })} />
      </div>
      {playback.error && <p className="error" role="alert">{playback.error}</p>}
    </>}{saveError && <p className="error" role="alert">{saveError}</p>}
  </main>;
}
