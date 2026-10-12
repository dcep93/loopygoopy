import { render,screen,fireEvent } from '@testing-library/react';
import { RangeButtons } from './PracticeControls';
test('a distant click selects a new block and a selected end click trims the range',()=>{
  const change=jest.fn();render(<RangeButtons first={1} last={8} onChange={change}/>);
  fireEvent.click(screen.getByRole('button',{name:'Beats 17 to 20'}),{detail:0});expect(change).toHaveBeenLastCalledWith({first:17,last:20});
  fireEvent.click(screen.getByRole('button',{name:'Beats 5 to 8'}),{detail:0});expect(change).toHaveBeenLastCalledWith({first:1,last:4});
});
test.each([
  [9,16,1,{first:5,last:16}],
  [9,16,4,{first:9,last:20}],
  [5,20,1,{first:9,last:20}],
  [5,20,4,{first:5,last:16}],
  [1,16,1,{first:5,last:8}],
  [1,8,5,{first:21,last:24}],
])('click selection from %s–%s on block index %s works by keyboard and pointer',(first,last,index,expected)=>{
  const change=jest.fn();render(<RangeButtons first={first as number} last={last as number} onChange={change}/>);
  const buttons=screen.getAllByRole('button'),row=screen.getByRole('group');
  const i=index as number;
  fireEvent.click(buttons[i],{detail:0});expect(change).toHaveBeenLastCalledWith(expected);
  change.mockClear();
  (row as any).setPointerCapture=jest.fn();
  buttons.forEach((b,j)=>{b.getBoundingClientRect=()=>({left:j*100,width:100} as DOMRect);});
  const pointer=(target:Element,type:string)=>fireEvent(target,new MouseEvent(type,{bubbles:true,button:0,clientX:i*100+50}));
  pointer(buttons[i],'pointerdown');pointer(row,'pointerup');
  fireEvent.click(buttons[i],{detail:1});
  expect(change).toHaveBeenCalledTimes(1);expect(change).toHaveBeenLastCalledWith(expected);
});
test('clicking the only selected block does not restart or clear the loop',()=>{
  const change=jest.fn();render(<RangeButtons first={9} last={12} onChange={change}/>);
  fireEvent.click(screen.getByRole('button',{name:'Beats 9 to 12'}),{detail:0});
  expect(change).not.toHaveBeenCalled();
});
test('Shift-arrow extends a contiguous range and announces its selected blocks',()=>{
  const change=jest.fn();render(<RangeButtons first={17} last={24} onChange={change}/>);
  const first=screen.getByRole('button',{name:'Beats 17 to 20'}),last=screen.getByRole('button',{name:'Beats 21 to 24'});
  expect(first).toHaveAttribute('aria-pressed','true');expect(last).toHaveAttribute('aria-pressed','true');
  fireEvent.keyDown(first,{key:'ArrowRight',shiftKey:true});expect(change).toHaveBeenLastCalledWith({first:17,last:24});expect(last).toHaveFocus();
  fireEvent.keyUp(last,{key:'Shift'});fireEvent.keyDown(last,{key:'ArrowLeft'});expect(first).toHaveFocus();
});
test('pointer drags preview then commit in either direction; canceled gestures preserve the old range',()=>{
  const change=jest.fn();render(<RangeButtons first={1} last={8} onChange={change}/>);
  const row=screen.getByRole('group'),buttons=screen.getAllByRole('button');
  (row as any).setPointerCapture=jest.fn();
  buttons.forEach((b,i)=>{b.getBoundingClientRect=()=>({left:i*100,width:100} as DOMRect);});
  const pointer=(target:Element,type:string,x:number)=>fireEvent(target,new MouseEvent(type,{bubbles:true,button:0,clientX:x}));
  pointer(buttons[5],'pointerdown',550);pointer(row,'pointermove',450);
  expect(buttons[4]).toHaveAttribute('aria-pressed','true');expect(buttons[5]).toHaveAttribute('aria-pressed','true');expect(change).not.toHaveBeenCalled();
  pointer(row,'pointerup',450);expect(change).toHaveBeenLastCalledWith({first:17,last:24});
  change.mockClear();pointer(buttons[7],'pointerdown',750);pointer(row,'pointercancel',750);expect(change).not.toHaveBeenCalled();expect(buttons[0]).toHaveAttribute('aria-pressed','true');
  pointer(buttons[2],'pointerdown',250);pointer(row,'pointerup',1200);expect(change).toHaveBeenLastCalledWith({first:9,last:32});
});
