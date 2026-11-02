import test from 'node:test';
import assert from 'node:assert/strict';
import { DiagnosticLog } from '../src/diagnostics/log.ts';
const state = { mode:'waiting', model:'v6',micStatus:'idle',source:null,inputLevel:0,probability:0,inputBands:[0,0,0],agentStatus:'idle',outputLevel:0,outputBands:[0,0,0] };
test('diagnostics retain only known entry orders and record order changes immediately', () => {
  const log = new DiagnosticLog(0);
  log.append({...state,mode:'overlap',overlapEntry:'user'},0);
  log.append({...state,mode:'overlap',overlapEntry:'agent'},1);
  log.append({...state,mode:'overlap',overlapEntry:'private'},2);
  log.append({...state,overlapEntry:'user'},3);
  assert.deepEqual(log.read().map(row=>row.overlapEntry), ['user','agent',null,null]);
  assert.equal(JSON.stringify(log.export()).includes('private'),false);
});
test('diagnostics sample active levels at 4Hz but preserve immediate state transitions', () => {
  const log = new DiagnosticLog(100);
  assert.equal(log.append(state,100),true);
  assert.equal(log.append(state,1100),false);
  const active = {...state,micStatus:'listening',source:'microphone'};
  assert.equal(log.append(active,1200),true);
  assert.equal(log.append({...active,inputLevel:.7},1300),false);
  assert.equal(log.append({...active,mode:'user',micStatus:'speaking'},1301),true);
  assert.equal(log.append({...active,mode:'user',micStatus:'speaking'},1551),true);
  assert.equal(log.read().length,4);
});
test('diagnostics are bounded and whitelist metadata, excluding audio and identifiers', () => {
  const log = new DiagnosticLog(0,3);
  for(let i=0;i<8;i++) log.append({...state,micStatus:'speaking',inputLevel:Infinity,inputBands:[NaN,-1,3],pcm:new Float32Array([.5]),deviceId:'private'},i*300);
  const exported = log.export();
  assert.equal(exported.entries.length,3); assert.equal(exported.droppedEvents,5);
  assert.equal(exported.audioIncluded,false);
  assert.deepEqual(exported.entries[0].inputBands,[0,0,1]);
  assert.equal(JSON.stringify(exported).includes('private'),false);
  assert.equal(JSON.stringify(exported).includes('pcm'),false);
  const copy=log.read();copy[0].inputBands[0]=999;
  assert.equal(log.read()[0].inputBands[0],0);
  log.clear(10000); assert.equal(log.read().length,0); assert.equal(log.export().totalEvents,0);
});
