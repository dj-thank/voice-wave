import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { AgentVoiceController } from './agentController';
import type { AgentVoiceFactory } from './agentController';
import { analyseVoiceFrame, smoothBands } from './spectrum';
import type { AudioBands } from './spectrum';

/** Plays a labelled sample, not an LLM response. Analysis follows the audible output. */
const playSample: AgentVoiceFactory = async (url, callbacks, signal) => {
  const context = new AudioContext();
  const resume = context.resume();
  let source: AudioBufferSourceNode | null = null;
  let frameId = 0;
  let disposed = false;
  let cleanup: Promise<void> | null = null;
  let thinkingTimer: ReturnType<typeof setTimeout> | null = null;
  let rejectThinking: ((reason: Error) => void) | null = null;
  const dispose = () => {
    if (cleanup) return cleanup;
    disposed = true;
    signal.removeEventListener('abort', abort);
    cancelAnimationFrame(frameId);
    if (thinkingTimer !== null) clearTimeout(thinkingTimer);
    rejectThinking?.(new DOMException('Aborted', 'AbortError'));
    rejectThinking = null;
    if (source) {
      source.onended = null;
      try {
        source.stop();
      } catch {
        /* not yet started / already ended */
      }
      source.disconnect();
    }
    cleanup = context.state === 'closed' ? Promise.resolve() : context.close().catch(() => {});
    return cleanup;
  };
  function abort() {
    void dispose();
  }
  const check = () => {
    if (signal.aborted || disposed) throw new DOMException('Aborted', 'AbortError');
  };
  signal.addEventListener('abort', abort, { once: true });
  try {
    check();
    await resume;
    const resolved = new URL(url, location.href);
    if (resolved.origin !== location.origin)
      throw new Error('表示:AIサンプル音声はこのデモと同じサイト内のファイルを指定してください。');
    const thinking = new Promise<void>((resolve, reject) => {
      rejectThinking = reject;
      thinkingTimer = setTimeout(() => {
        thinkingTimer = null;
        rejectThinking = null;
        resolve();
      }, 900);
    });
    // Attach a handler immediately: fetch/decode and the thinking delay run concurrently.
    const audio = (async () => {
      const response = await fetch(resolved, { signal });
      if (!response.ok) throw new Error('表示:AIサンプル音声を読み込めませんでした。');
      return context.decodeAudioData(await response.arrayBuffer());
    })();
    const [buffer] = await Promise.all([audio, thinking]);
    check();
    const analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0;
    source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(analyser);
    analyser.connect(context.destination);
    source.onended = () => {
      if (!disposed && !signal.aborted) callbacks.ended();
    };
    let level = 0;
    let bands: AudioBands = [0, 0, 0];
    const frame = new Float32Array(analyser.fftSize);
    const tick = () => {
      if (disposed || signal.aborted) return;
      analyser.getFloatTimeDomainData(frame);
      const features = analyseVoiceFrame(frame, context.sampleRate);
      level += (features.level - level) * (features.level > level ? 0.72 : 0.4);
      bands = smoothBands(bands, features.bands);
      if (features.level === 0 && level < 0.01) {
        level = 0;
        bands = [0, 0, 0];
      }
      callbacks.frame(level, bands);
      frameId = requestAnimationFrame(tick);
    };
    callbacks.playing();
    source.start();
    tick();
    return { dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
};

export function useAgentVoice() {
  const controller = useMemo(() => new AgentVoiceController(playSample), []);
  const state = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  useEffect(
    () => () => {
      void controller.stop();
    },
    [controller],
  );
  return { ...state, start: controller.start, stop: controller.stop };
}
