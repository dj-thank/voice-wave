import test from 'node:test';
import assert from 'node:assert/strict';
import { MicrophoneController, microphoneError } from '../src/audio/controller.ts';

test('stop during permission/model preparation rejects stale session and callbacks', async () => {
  let resolve;
  let callbacks;
  let signal;
  let disposed = 0;
  const controller = new MicrophoneController((_, cb, abort) => {
    callbacks = cb; signal = abort;
    return new Promise(done => { resolve = done; });
  });
  const pending = controller.start();
  assert.equal(controller.getSnapshot().status, 'loading');
  await controller.stop();
  assert.equal(signal.aborted, true);
  callbacks.speech(true);
  callbacks.frame(1, 1);
  resolve({ dispose: async () => { disposed++; } });
  await pending;
  assert.equal(disposed, 1);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.getSnapshot().level, 0);
});

test('speech callbacks, pause and resume maintain separate input ownership', async () => {
  const sessions = [];
  const controller = new MicrophoneController(async (source, callbacks, signal) => {
    const session = { source, callbacks, signal, disposed: 0, dispose: async () => { session.disposed++; } };
    sessions.push(session);
    return session;
  });
  await controller.start();
  assert.equal(controller.getSnapshot().status, 'listening');
  sessions[0].callbacks.speech(true);
  assert.equal(controller.getSnapshot().status, 'speaking');
  sessions[0].callbacks.speech(false);
  assert.equal(controller.getSnapshot().status, 'listening');
  await controller.toggleMute();
  assert.equal(controller.getSnapshot().status, 'muted');
  assert.equal(sessions[0].signal.aborted, true);
  assert.equal(sessions[0].disposed, 1);
  await controller.toggleMute();
  assert.equal(sessions.length, 2);
  assert.equal(controller.getSnapshot().status, 'listening');
  await controller.stop();
});

test('permission error does not claim listening and is recoverable', async () => {
  let fail = true;
  const controller = new MicrophoneController(async () => {
    if (fail) throw new DOMException('denied', 'NotAllowedError');
    return { dispose: async () => {} };
  });
  await controller.start();
  assert.equal(controller.getSnapshot().status, 'error');
  assert.match(controller.getSnapshot().error, /許可/);
  fail = false;
  await controller.start();
  assert.equal(controller.getSnapshot().status, 'listening');
  await controller.stop();
});

test('sample mode is explicit and muted sample resumes the same source', async () => {
  const sources = [];
  const controller = new MicrophoneController(async source => {
    sources.push(source);
    return { dispose: async () => {} };
  });
  await controller.startSample('/samples/voice.wav');
  assert.equal(controller.getSnapshot().source, 'sample');
  await controller.toggleMute();
  await controller.toggleMute();
  assert.deepEqual(sources, [
    { kind: 'sample', url: '/samples/voice.wav' },
    { kind: 'sample', url: '/samples/voice.wav' },
  ]);
  await controller.stop();
});

test('a replaced session cannot update or end the new session', async () => {
  const sessions = [];
  const controller = new MicrophoneController(async (source, callbacks, signal) => {
    const session = { callbacks, signal, disposed: 0, dispose: async () => { session.disposed++; } };
    sessions.push(session); return session;
  });
  await controller.start();
  await controller.startSample('/samples/test.wav');
  sessions[0].callbacks.speech(true);
  sessions[0].callbacks.ended();
  assert.equal(controller.getSnapshot().source, 'sample');
  assert.equal(controller.getSnapshot().speaking, false);
  assert.equal(sessions[0].disposed, 1);
  await controller.stop();
  assert.match(microphoneError(new Error('unexpected')), /準備ができません/);
});
