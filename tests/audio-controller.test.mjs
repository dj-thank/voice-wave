import test from 'node:test';
import assert from 'node:assert/strict';
import { MicrophoneController, microphoneError } from '../src/audio/controller.ts';
import { AgentVoiceController } from '../src/audio/agentController.ts';

test('stop during permission/model preparation rejects stale session and callbacks', async () => {
  let resolve;
  let callbacks;
  let signal;
  let disposed = 0;
  const controller = new MicrophoneController((_, cb, abort) => {
    callbacks = cb;
    signal = abort;
    return new Promise((done) => {
      resolve = done;
    });
  });
  const pending = controller.start();
  assert.equal(controller.getSnapshot().status, 'loading');
  await controller.stop();
  assert.equal(signal.aborted, true);
  callbacks.speech(true);
  callbacks.frame(1, 1);
  resolve({
    dispose: async () => {
      disposed++;
    },
  });
  await pending;
  assert.equal(disposed, 1);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.getSnapshot().level, 0);
});

test('speech callbacks, pause and resume maintain separate input ownership', async () => {
  const sessions = [];
  const controller = new MicrophoneController(async (source, callbacks, signal) => {
    const session = {
      source,
      callbacks,
      signal,
      disposed: 0,
      dispose: async () => {
        session.disposed++;
      },
    };
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
  const controller = new MicrophoneController(async (source) => {
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
    const session = {
      callbacks,
      signal,
      disposed: 0,
      dispose: async () => {
        session.disposed++;
      },
    };
    sessions.push(session);
    return session;
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

test('playback activity follows real energy with a continuous 180ms quiet release', async () => {
  let callbacks;
  let now = 0;
  const controller = new AgentVoiceController(
    async (_, cb) => {
      callbacks = cb;
      return { dispose: async () => {} };
    },
    () => now,
  );
  await controller.start('/sample.wav');
  callbacks.frame(0.5, [0.5, 0.5, 0.5]);
  assert.equal(controller.getSnapshot().audible, false);
  callbacks.playing();
  assert.equal(controller.getSnapshot().status, 'speaking');
  assert.equal(controller.getSnapshot().audible, false);
  callbacks.frame(0.02, [0.02, 0.02, 0.02]);
  assert.equal(controller.getSnapshot().audible, false);
  callbacks.frame(0.025, [0.02, 0.03, 0.01]);
  assert.equal(controller.getSnapshot().audible, true);

  now = 40;
  callbacks.frame(0.012, [0, 0, 0]);
  now = 219;
  callbacks.frame(0, [0, 0, 0]);
  assert.equal(controller.getSnapshot().audible, true);
  now = 220;
  callbacks.frame(0, [0, 0, 0]);
  assert.equal(controller.getSnapshot().audible, false);
  assert.equal(controller.getSnapshot().status, 'speaking');

  now = 300;
  callbacks.frame(0.04, [0.04, 0.03, 0.02]);
  now = 350;
  callbacks.frame(0, [0, 0, 0]);
  now = 500;
  callbacks.frame(0.02, [0.01, 0.02, 0.01]);
  assert.equal(controller.getSnapshot().audible, true);
  now = 600;
  callbacks.frame(0, [0, 0, 0]);
  now = 779;
  callbacks.frame(0, [0, 0, 0]);
  assert.equal(controller.getSnapshot().audible, true);
  now = 780;
  callbacks.frame(0, [0, 0, 0]);
  assert.equal(controller.getSnapshot().audible, false);

  callbacks.frame(0.8, [0.6, 0.7, 0.8]);
  await controller.stop();
  callbacks.playing();
  callbacks.frame(1, [1, 1, 1]);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.getSnapshot().audible, false);
  assert.equal(controller.getSnapshot().level, 0);
});

test('replacing, ending or failing playback clears audible and rejects stale activity', async () => {
  const sessions = [];
  let shouldFail = false;
  const controller = new AgentVoiceController(
    async (_, callbacks) => {
      sessions.push(callbacks);
      if (shouldFail) throw new Error('decode failed');
      return { dispose: async () => {} };
    },
    () => 0,
  );
  await controller.start('/first.wav');
  sessions[0].playing();
  sessions[0].frame(0.5, [0.5, 0.5, 0.5]);
  assert.equal(controller.getSnapshot().audible, true);

  await controller.start('/second.wav');
  sessions[0].frame(1, [1, 1, 1]);
  sessions[0].ended();
  assert.equal(controller.getSnapshot().status, 'thinking');
  assert.equal(controller.getSnapshot().audible, false);
  sessions[1].playing();
  sessions[1].frame(0.4, [0.4, 0.4, 0.4]);
  sessions[1].ended();
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.getSnapshot().audible, false);

  await controller.start('/third.wav');
  sessions[2].playing();
  sessions[2].frame(0.7, [0.7, 0.7, 0.7]);
  shouldFail = true;
  await controller.start('/broken.wav');
  sessions[2].frame(1, [1, 1, 1]);
  sessions[3].playing();
  sessions[3].frame(1, [1, 1, 1]);
  assert.equal(controller.getSnapshot().status, 'idle');
  assert.equal(controller.getSnapshot().audible, false);
  assert.equal(controller.getSnapshot().level, 0);
  assert.match(controller.getSnapshot().error, /再生できません/);
});
