import { useState } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import PracticeControls from './PracticeControls';
import golden from './golden.json';
import { defaults, paused, Preferences } from './model';

function setup(initial: Preferences = defaults) {
  const actions={change:jest.fn(),play:jest.fn(),pause:jest.fn(),exit:jest.fn(),retry:jest.fn()};
  function View() {
    const [prefs,setPrefs]=useState(initial);
    return <PracticeControls snapshot={{definition:golden as any,prefs,playback:paused}} actions={{...actions,change:p=>{actions.change(p);setPrefs(p);}}}/>;
  }
  render(<View/>);return actions;
}
test('compact controls call playback, speed, independent leads and exit directly',()=>{
  const actions=setup();fireEvent.click(screen.getByRole('button',{name:'▶ Play'}));expect(actions.play).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button',{name:'Slower'}));expect(actions.change).toHaveBeenLastCalledWith({...defaults,speed:.95});
  fireEvent.click(screen.getByRole('button',{name:'Faster'}));expect(actions.change).toHaveBeenLastCalledWith(defaults);
  fireEvent.change(screen.getByRole('spinbutton',{name:'Lead-in beats'}),{target:{value:'4'}});
  expect(actions.change).toHaveBeenLastCalledWith({...defaults,leadIn:{...defaults.leadIn,beats:4}});
  fireEvent.click(within(screen.getByRole('group',{name:'Lead-out sound'})).getByRole('button',{name:'metronome'}));
  expect(actions.change).toHaveBeenLastCalledWith({...defaults,leadIn:{...defaults.leadIn,beats:4},leadOut:{...defaults.leadOut,style:'metronome'}});
  fireEvent.click(screen.getByRole('button',{name:'Exit practice mode'}));expect(actions.exit).toHaveBeenCalledTimes(1);
});
test.each([[1,8,'Next',5,12],[5,12,'Prev',1,8],[13,16,'Next',17,20],[13,16,'Prev',9,12]])('shifts %s–%s with %s and keeps other preferences',(first,last,direction,nextFirst,nextLast)=>{
  const prefs={...defaults,first,last,speed:.75,leadIn:{beats:4,style:'silent' as const}};
  const actions=setup(prefs);
  const play=screen.getByRole('button',{name:'▶ Play'});
  expect(play.nextElementSibling).toHaveTextContent('Prev');expect(play.nextElementSibling?.nextElementSibling).toHaveTextContent('Next');
  fireEvent.click(screen.getByRole('button',{name:direction}));
  expect(actions.change).toHaveBeenLastCalledWith({...prefs,first:nextFirst,last:nextLast});
  const selected=within(screen.getByRole('group',{name:'Practice beat range'})).getAllByRole('button',{pressed:true});
  expect(selected[0]).toHaveAccessibleName(`Beats ${nextFirst} to ${nextFirst+3}`);
  expect(selected[selected.length-1]).toHaveAccessibleName(`Beats ${nextLast-3} to ${nextLast}`);
  fireEvent.click(screen.getByRole('button',{name:direction==='Next'?'Prev':'Next'}));expect(actions.change).toHaveBeenLastCalledWith(prefs);
});
test.each([[1,4,true,false],[29,32,false,true],[1,32,true,true]])('disables shifts outside %s–%s',(first,last,prevDisabled,nextDisabled)=>{
  const actions=setup({...defaults,first,last});
  const prev=screen.getByRole('button',{name:'Prev'}),next=screen.getByRole('button',{name:'Next'});
  expect((prev as HTMLButtonElement).disabled).toBe(prevDisabled);expect((next as HTMLButtonElement).disabled).toBe(nextDisabled);
  if(prevDisabled)fireEvent.click(prev);if(nextDisabled)fireEvent.click(next);expect(actions.change).not.toHaveBeenCalled();
});
