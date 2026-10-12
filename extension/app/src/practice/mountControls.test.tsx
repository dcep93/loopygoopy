import { act, fireEvent, within } from '@testing-library/react';
import { mountControls } from './mountControls';
import { defaults, paused } from './model';
import golden from './golden.json';
jest.mock('./practice.css',()=>'.practice-panel {font:1rem/1.4 system-ui;padding:.75rem}');
test('shadow controls call their session and keep keyboard shortcuts inside the panel',()=>{
  const snapshot={definition:golden,prefs:defaults,playback:paused};
  const session={getSnapshot:()=>snapshot,subscribe:()=>()=>{}};
  const actions={change:jest.fn(),play:jest.fn(),pause:jest.fn(),exit:jest.fn(),retry:jest.fn()};
  (globalThis as any).ResizeObserver=class {observe(){}disconnect(){}};
  const host=document.createElement('div');document.body.append(host);let unmount!:()=>void;
  act(()=>{unmount=mountControls(host,session as any,actions,jest.fn());});
  const shadow=host.shadowRoot!;const play=within(shadow as any).getByRole('button',{name:'▶ Play'});
  const shortcut=jest.fn();document.addEventListener('keydown',shortcut);
  try {
    fireEvent.keyDown(play,{key:' ',bubbles:true,composed:true});expect(shortcut).not.toHaveBeenCalled();
    fireEvent.click(play);expect(actions.play).toHaveBeenCalledTimes(1);
    expect(shadow.querySelector('style')?.textContent).toContain('font:16px');
    expect(host.querySelector('button')).toBeNull();
  } finally {document.removeEventListener('keydown',shortcut);act(()=>unmount());host.remove();}
});
