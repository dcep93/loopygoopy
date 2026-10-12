import { useSyncExternalStore } from 'react';
import { createRoot } from 'react-dom/client';
import PracticeControls, { PracticeActions } from './PracticeControls';
import { PracticeSession } from './session';
import css from './practice.css';

function Controls({ session, actions }: { session: PracticeSession; actions: PracticeActions }) {
  const snapshot = useSyncExternalStore(session.subscribe, session.getSnapshot);
  return <PracticeControls snapshot={snapshot} actions={actions} />;
}

export function mountControls(host: HTMLElement, session: PracticeSession, actions: PracticeActions, onHeight: (height: number) => void) {
  const shadow = host.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  // Shadow DOM inherits YouTube's 10px rem basis. Keep the original 16px design.
  style.textContent = ':host { all: initial; display: block; color-scheme: dark; }' + css
    .replace(/@font-face\s*\{[^}]*\}/g, '')
    .replace(/(?:html|body):has\(\.practice-panel\)\s*\{[^}]*\}/g, '')
    .replace(/([\d.]+)rem\b/g, (_, n) => `${Number(n) * 16}px`);
  const container = document.createElement('div');
  shadow.append(style, container);
  // Keyboard actions in the panel must not trigger YouTube's page shortcuts.
  for (const event of ['keydown', 'keyup', 'keypress']) shadow.addEventListener(event, e => e.stopPropagation());
  const root = createRoot(container);
  root.render(<Controls session={session} actions={actions} />);
  const measure = () => { const height = Math.ceil(container.getBoundingClientRect().height); if (height > 0) onHeight(height); };
  const observer = new ResizeObserver(measure);
  observer.observe(container);
  return () => { observer.disconnect(); root.unmount(); };
}
