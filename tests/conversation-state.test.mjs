import test from 'node:test';
import assert from 'node:assert/strict';
import {
  channelMode,
  conversationMode,
  conversationSignal,
  layerSources,
  primarySource,
} from '../src/visualizer/conversationState.ts';

test('simultaneous speech has a distinct state without changing channel ownership', () => {
  const user = { level: 0.4, speaking: true };
  const agent = { level: 0.8, speaking: true, thinking: true };
  assert.equal(channelMode(user, 'user'), 'user');
  assert.equal(channelMode(agent, 'agent'), 'agent');
  assert.equal(primarySource(user, agent), 'user');
  assert.equal(conversationMode(user, agent), 'overlap');
  assert.deepEqual(layerSources('user'), { inner: 'user', outer: 'agent' });
  assert.deepEqual(layerSources('agent'), { inner: 'agent', outer: 'user' });
});

test('both active envelopes contribute without clipping or mutating source channels', () => {
  const user = { level: 0.4, speaking: true, bands: [0.2, 0.3, 0.4] };
  const agent = { level: 0.8, speaking: true, bands: [0.5, 0.6, 0.7] };
  const signal = conversationSignal(user, agent);
  assert.equal(signal.speaking, true);
  assert(Math.abs(signal.level - 0.88) < 1e-9);
  assert(signal.bands.every((v, i) => v > Math.max(user.bands[i], agent.bands[i]) && v <= 1));
  assert.deepEqual(user.bands, [0.2, 0.3, 0.4]);
  assert.equal(conversationSignal(user, { ...agent, speaking: false }), user);
  assert.equal(conversationMode(user, { ...agent, speaking: false }), 'user');
  assert.equal(conversationSignal({ ...user, speaking: false }, agent), agent);
  assert.equal(conversationMode({ ...user, speaking: false }, agent), 'agent');
  const bounded = conversationSignal(
    { level: Infinity, speaking: true, bands: [NaN, -1, 2] },
    agent,
  );
  assert(bounded.level <= 1 && Number.isFinite(bounded.level));
  assert(bounded.bands.every((v) => Number.isFinite(v) && v >= 0 && v <= 1));
});

test('agent thinking never turns the user input into speech and idle levels are not speech', () => {
  const idle = { level: 1, speaking: false };
  const thinking = { level: 0.8, speaking: false, thinking: true };
  assert.equal(channelMode(idle, 'user'), 'waiting');
  assert.equal(channelMode(thinking, 'user'), 'waiting');
  assert.equal(channelMode(thinking, 'agent'), 'thinking');
  assert.equal(primarySource(idle, thinking), 'agent');
  assert.equal(primarySource(idle, idle), 'user');
  assert.equal(conversationMode(idle, thinking), 'thinking');
  assert.equal(conversationMode(idle, idle), 'waiting');
});

test('shared palette follows the speaking participant while layer ownership stays positional', () => {
  const quiet = { level: 0.9, speaking: false };
  const speaking = { level: 0.2, speaking: true };
  assert.equal(conversationMode(speaking, quiet), 'user');
  assert.equal(conversationMode(quiet, speaking), 'agent');
  assert.deepEqual(layerSources('agent'), { inner: 'agent', outer: 'user' });
  assert.equal(quiet.speaking, false);
});
