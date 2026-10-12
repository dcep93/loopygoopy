import { useEffect, useState } from 'react';
import Main from '../app/Main';
import { transferRecords } from './recordStore';

// The toolbar always opens the original manual editor. Practice lives in the tab.
export default function PracticeApp() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let closed = false;
    transferRecords().then(() => { if (!closed) setReady(true); }, e => {
      if (!closed) setError(e instanceof Error ? e.message : String(e));
    });
    return () => { closed = true; };
  }, [attempt]);
  if (ready) return <Main />;
  return <div style={{ width: '800px', padding: '.5em', backgroundColor: '#aaaaaa' }}>
    {error ? <div role="alert">{error} <button onClick={() => { setError(''); setAttempt(n => n + 1); }}>Retry</button></div> : 'Loading settings…'}
  </div>;
}
