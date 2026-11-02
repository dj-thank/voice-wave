import test from 'node:test';
import assert from 'node:assert/strict';
import { analyseVoiceFrame, smoothBands } from '../src/audio/spectrum.ts';
import { AgentVoiceController } from '../src/audio/agentController.ts';

function sine(frequency, rate = 16000) {
  return Float32Array.from({ length: 1024 }, (_, i) => 0.1 * Math.sin(2 * Math.PI * frequency * i / rate));
}
test('spectral envelopes separate low, middle and high voice-frequency energy', () => {
  for (const [frequency, expected] of [[300, 0], [1100, 1], [3400, 2]]) {
    for (const rate of [16000, 48000]) {
      const { bands, level } = analyseVoiceFrame(sine(frequency, rate), rate);
      assert.equal(bands.indexOf(Math.max(...bands)), expected);
      assert.ok(level > 0 && level <= 1);
      assert.ok(bands.every(value => value >= 0 && value <= 1));
    }
  }
});
test('digital silence and constant DC offset do not animate', () => {
  for (const frame of [new Float32Array(512), new Float32Array(512).fill(0.5)]) {
    assert.deepEqual(analyseVoiceFrame(frame), { level: 0, bands: [0, 0, 0] });
  }
  assert.deepEqual(smoothBands([0, 0, 0], [1, 0, 0]), [0.7, 0, 0]);
});
test('stopping thinking cancels the pending voice and rejects late callbacks', async () => {
  let complete;
  let callbacks;
  let signal;
  let disposals = 0;
  const controller = new AgentVoiceController((_, cb, abort) => {
    callbacks = cb; signal = abort;
    return new Promise(resolve => { complete = resolve; });
  });
  const start = controller.start('/voice.wav');
  assert.equal(controller.getSnapshot().status, 'thinking');
  await controller.stop();
  assert.equal(signal.aborted, true);
  callbacks.playing();
  callbacks.frame(1, [1, 1, 1]);
  complete({ dispose: async () => { disposals++; } });
  await start;
  assert.equal(disposals, 1);
  assert.deepEqual(controller.getSnapshot(), { status: 'idle', level: 0, bands: [0, 0, 0], error: null });
});
test('sample playback updates envelopes and resets when ended', async () => {
  let callbacks;
  let disposed = 0;
  const controller = new AgentVoiceController(async (_, cb) => {
    callbacks = cb;
    cb.playing();
    return { dispose: async () => { disposed++; } };
  });
  await controller.start('/voice.wav');
  callbacks.frame(0.7, [0.1, 0.7, 0.2]);
  assert.equal(controller.getSnapshot().status, 'speaking');
  assert.deepEqual(controller.getSnapshot().bands, [0.1, 0.7, 0.2]);
  callbacks.ended();
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(disposed, 1);
});
