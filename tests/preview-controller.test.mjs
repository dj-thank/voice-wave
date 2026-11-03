import test from 'node:test';
import assert from 'node:assert/strict';
import { PreviewController } from '../src/playground/previewController.ts';

test('both entry sequences preserve the first speaker, joining speaker and return to waiting', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  for (const entry of ['user', 'agent']) {
    const controller = new PreviewController();
    controller.startSequence(entry);
    assert.equal(controller.getSnapshot().mode, entry === 'user' ? 'agent' : 'user');
    t.mock.timers.tick(1799);
    assert.equal(controller.getSnapshot().sequence.phase, 'first');
    t.mock.timers.tick(1);
    assert.equal(controller.getSnapshot().mode, 'overlap');
    t.mock.timers.tick(2200);
    assert.equal(controller.getSnapshot().mode, entry);
    t.mock.timers.tick(1800);
    assert.deepEqual(controller.getSnapshot(), {
      enabled: true,
      mode: 'waiting',
      sequence: { entry, phase: 'complete' },
    });
    controller.stop();
  }
});

test('manual state, mode switch and stop cancel all pending sequence transitions', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new PreviewController();
  for (const cancel of [
    () => controller.selectState('thinking'),
    () => controller.setEnabled(false),
    () => controller.stop(),
  ]) {
    controller.startSequence('user');
    t.mock.timers.tick(1800);
    cancel();
    const state = controller.getSnapshot();
    assert.equal(state.sequence, null);
    t.mock.timers.tick(10000);
    assert.equal(controller.getSnapshot(), state);
  }
});

test('replacing a running sequence cannot deliver the previous sequence to subscribers', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const controller = new PreviewController();
  const states = [];
  const unsubscribe = controller.subscribe(() => states.push(controller.getSnapshot()));
  controller.startSequence('user');
  t.mock.timers.tick(1700);
  controller.startSequence('agent');
  states.length = 0;
  t.mock.timers.tick(100);
  assert.equal(states.length, 0);
  t.mock.timers.tick(5700);
  assert.deepEqual(
    states.map((state) => state.sequence.entry),
    ['agent', 'agent', 'agent'],
  );
  unsubscribe();
  controller.stop();
  assert.equal(states.length, 3);
});
