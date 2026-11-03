import test from 'node:test';
import assert from 'node:assert/strict';
import { advanceOverlapState, createOverlapState } from '../src/visualizer/overlapState.ts';

test('red joins an already-speaking blue agent, while blue joins an already-speaking red user', () => {
  const agentFirst = createOverlapState(false, true);
  const userFirst = createOverlapState(true, false);
  assert.equal(advanceOverlapState(agentFirst, true, true).entry, 'user');
  assert.equal(advanceOverlapState(userFirst, true, true).entry, 'agent');
  assert.equal(agentFirst.entry, null);
  assert.equal(userFirst.entry, null);
});

test('entry order stays latched throughout an overlap episode', () => {
  let state = advanceOverlapState(createOverlapState(false, true), true, true);
  const first = state;
  for (let frame = 0; frame < 100; frame++) state = advanceOverlapState(state, true, true);
  assert.equal(state, first);
  assert.equal(state.entry, 'user');
  assert.equal(advanceOverlapState(createOverlapState(true, false), true, false).entry, null);
});

test('the remaining participant becomes the predecessor when the other rejoins', () => {
  const original = advanceOverlapState(createOverlapState(false, true), true, true);
  const userRemains = advanceOverlapState(original, true, false);
  assert.equal(userRemains.entry, null);
  const agentRejoins = advanceOverlapState(userRemains, true, true);
  assert.equal(agentRejoins.entry, 'agent');
  const agentRemains = advanceOverlapState(agentRejoins, false, true);
  assert.equal(agentRemains.entry, null);
  assert.equal(advanceOverlapState(agentRemains, true, true).entry, 'user');
  assert.equal(original.entry, 'user', 'later transitions must not mutate history');
});

test('initial overlap and a joint start after silence never invent an entry order', () => {
  assert.equal(createOverlapState(true, true).entry, 'simultaneous');
  const userJoined = advanceOverlapState(createOverlapState(false, true), true, true);
  const silent = advanceOverlapState(userJoined, false, false);
  assert.equal(silent.entry, null);
  assert.equal(advanceOverlapState(silent, true, true).entry, 'simultaneous');
});

test('non-speaking activity cannot establish a predecessor, and direct handoff clears overlap', () => {
  // Thinking or a nonzero level is not an activity edge; only speaking flags enter this model.
  const thinking = { speaking: false, thinking: true, level: 0.9 };
  const quiet = { speaking: false, level: 0.8 };
  const before = createOverlapState(quiet.speaking, thinking.speaking);
  assert.equal(advanceOverlapState(before, true, true).entry, 'simultaneous');
  const userOnly = createOverlapState(true, false);
  const agentOnly = advanceOverlapState(userOnly, false, true);
  assert.equal(agentOnly.entry, null);
  assert.equal(advanceOverlapState(agentOnly, true, true).entry, 'user');
});
