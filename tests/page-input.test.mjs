import test from 'node:test';
import assert from 'node:assert/strict';
import {createWheelIntent,wheelPixels,swipeDirection} from '../src/page-input.js';

test('one long inertial wheel gesture turns exactly one page',()=>{
  const wheel=createWheelIntent();let turns=0;
  for(let i=0;i<100;i++)turns+=Math.abs(wheel.update(i<8?18:3,i*16).direction);
  assert.equal(turns,1);
  assert.equal(wheel.update(120,2000).direction,1);
});
test('a gesture that starts during a transition cannot spill into another page',()=>{
  const wheel=createWheelIntent();
  assert.equal(wheel.update(120,0,{locked:true}).direction,0);
  assert.equal(wheel.update(120,100).direction,0);
  assert.equal(wheel.update(120,400).direction,1);
});
test('scrolling a table keeps the entire gesture inside that table',()=>{
  const wheel=createWheelIntent();
  assert.equal(wheel.update(90,0,{nested:true}).allowNative,true);
  assert.equal(wheel.update(90,40,{nested:true}).allowNative,true);
  assert.deepEqual(wheel.update(90,80),{direction:0,allowNative:false});
  assert.equal(wheel.update(90,400).direction,1);
});
test('small wheel movements accumulate while a reversed intent starts cleanly',()=>{
  const wheel=createWheelIntent();
  assert.equal(wheel.update(10,0).direction,0);
  assert.equal(wheel.update(10,20).direction,0);
  assert.equal(wheel.update(-40,40).direction,-1);
  assert.equal(wheel.update(100,60).direction,0);
});
test('line and page wheel units retain their intended scale',()=>{
  assert.equal(wheelPixels(40,0,675),40);
  assert.equal(wheelPixels(3,1,675),48);
  assert.equal(wheelPixels(1,2,675),675);
});
test('horizontal or small touch gestures do not turn a page',()=>{
  assert.equal(swipeDirection(100,70),0);
  assert.equal(swipeDirection(0,30),0);
  assert.equal(swipeDirection(10,80),1);
  assert.equal(swipeDirection(10,-80),-1);
});
