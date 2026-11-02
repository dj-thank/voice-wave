import test from 'node:test';
import assert from 'node:assert/strict';
import { SpeechGate, hasVariableAudio } from '../src/audio/speechGate.ts';

test('a short confident utterance is shown after two consecutive 32ms frames', () => {
  const gate = new SpeechGate();
  assert.equal(gate.update(0.94), false);
  assert.equal(gate.update(0.96), true);
});

test('normal evidence still requires three consecutive frames; separate bursts do not accumulate', () => {
  const gate = new SpeechGate();
  for (const p of [0.7, 0.01, 0.6, 0.01, 0.8, 0.01, 0.99, 0.01]) {
    assert.equal(gate.update(p), false);
  }
  assert.equal(gate.update(0.6), false);
  assert.equal(gate.update(0.6), false);
  assert.equal(gate.update(0.6), true);
});

test('short gaps stay active but ten silent frames settle the visual state', () => {
  const gate = new SpeechGate();
  gate.update(1); gate.update(1);
  for (let i = 0; i < 8; i++) assert.equal(gate.update(0.1), true);
  assert.equal(gate.update(0.45), true); // ambiguous sustained speech resets silence evidence
  for (let i = 0; i < 9; i++) assert.equal(gate.update(0.1), true);
  assert.equal(gate.update(0.1), false);
});

test('digital silence cannot keep red alive even if model state retains a speech tail', () => {
  const gate = new SpeechGate();
  gate.update(1); gate.update(1);
  for (let i = 0; i < 10; i++) gate.update(0.99, false);
  assert.equal(gate.speaking, false);
  assert.equal(gate.update(Number.NaN), false);
  gate.update(1); gate.reset();
  assert.equal(gate.update(1), false); // prior session evidence is gone
});

test('the numerical-silence filter does not impose the visual level meter floor on quiet speech', () => {
  assert.equal(hasVariableAudio(new Float32Array(512)), false);
  assert.equal(hasVariableAudio(new Float32Array(512).fill(0.4)), false);
  const quiet = Float32Array.from({length:512}, (_, i) => Math.sin(i / 4) * 0.00003);
  assert.equal(hasVariableAudio(quiet), true);
  const gate = new SpeechGate();
  gate.update(0.95, hasVariableAudio(quiet));
  assert.equal(gate.update(0.96, hasVariableAudio(quiet)), true);
});
