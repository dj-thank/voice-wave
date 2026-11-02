import test from 'node:test';
import assert from 'node:assert/strict';
import { channelMode, conversationMode, layerSources, primarySource } from '../src/visualizer/conversationState.ts';

test('simultaneous speech remains independent while the single Wave gives the user priority', () => {
  const user = { level: .4, speaking: true };
  const agent = { level: .8, speaking: true, thinking: true };
  assert.equal(channelMode(user, 'user'), 'user');
  assert.equal(channelMode(agent, 'agent'), 'agent');
  assert.equal(primarySource(user, agent), 'user');
  assert.equal(conversationMode(user, agent), 'user');
  assert.deepEqual(layerSources('user'), { inner: 'user', outer: 'agent' });
  assert.deepEqual(layerSources('agent'), { inner: 'agent', outer: 'user' });
});

test('agent thinking never turns the user input into speech and idle levels are not speech', () => {
  const idle = { level: 1, speaking: false };
  const thinking = { level: .8, speaking: false, thinking: true };
  assert.equal(channelMode(idle, 'user'), 'waiting');
  assert.equal(channelMode(thinking, 'user'), 'waiting');
  assert.equal(channelMode(thinking, 'agent'), 'thinking');
  assert.equal(primarySource(idle, thinking), 'agent');
  assert.equal(primarySource(idle, idle), 'user');
  assert.equal(conversationMode(idle, thinking), 'thinking');
  assert.equal(conversationMode(idle, idle), 'waiting');
});

test('shared palette follows the speaking participant while layer ownership stays positional', () => {
  const quiet = { level: .9, speaking: false };
  const speaking = { level: .2, speaking: true };
  assert.equal(conversationMode(speaking, quiet), 'user');
  assert.equal(conversationMode(quiet, speaking), 'agent');
  assert.deepEqual(layerSources('agent'), { inner: 'agent', outer: 'user' });
  assert.equal(quiet.speaking, false);
});
