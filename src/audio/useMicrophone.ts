import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { MicVAD } from '@ricky0123/vad-web';
import { MicrophoneController } from './controller';
import type { SessionFactory } from './controller';
import { analyseVoiceFrame, smoothBands } from './spectrum';
import type { AudioBands } from './spectrum';
import { SpeechGate, hasVariableAudio } from './speechGate';

// Silero VAD and all ONNX/worklet assets run locally. No audio is uploaded or persisted.
const createSession =
  (model: 'v5' | 'v6'): SessionFactory =>
  async (source, callbacks, signal) => {
    if (!window.isSecureContext || !window.AudioContext)
      throw new Error(
        '表示:このブラウザでは音声を開始できません。localhost、またはHTTPSで開いてください。',
      );
    if (source.kind === 'microphone' && !navigator.mediaDevices?.getUserMedia)
      throw new Error(
        '表示:このブラウザではマイクを使用できません。別のブラウザで開いてください。',
      );
    const context = new AudioContext();
    // Resume before the first await so Safari retains the initiating user gesture.
    const resumed = context.resume();
    let stream: MediaStream | null = null;
    let vad: MicVAD | null = null;
    let bufferSource: AudioBufferSourceNode | null = null;
    let disposed = false;
    let releasing: Promise<void> | null = null;
    let initializing = true;
    let smoothed = 0;
    let bands: AudioBands = [0, 0, 0];
    let timer: ReturnType<typeof setTimeout> | null = null;
    const speechGate = new SpeechGate();
    const stopTracks = () => {
      stream?.getTracks().forEach((track) => track.stop());
      try {
        bufferSource?.stop();
      } catch {
        /* already stopped */
      }
    };
    const dispose = (): Promise<void> => {
      disposed = true;
      stopTracks();
      if (timer) clearTimeout(timer);
      signal.removeEventListener('abort', abortCapture);
      if (releasing) return releasing;
      releasing = (async () => {
        if (vad) {
          try {
            await vad.destroy();
          } catch {
            // vad-web 0.0.31 destroy() assumes initialization has completed. On a
            // failed/cancelled start, release its model explicitly after capture stops.
            const partial = vad as unknown as { model?: { release: () => Promise<void> } };
            await partial.model?.release().catch(() => {});
          }
        }
        if (context.state !== 'closed') await context.close().catch(() => {});
      })();
      return releasing;
    };
    function abortCapture() {
      stopTracks();
      if (!initializing) void dispose();
    }
    signal.addEventListener('abort', abortCapture, { once: true });
    const checkAbort = () => {
      if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    };
    try {
      checkAbort();
      await resumed;
      let sample: AudioBuffer | null = null;
      if (source.kind === 'microphone') {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        checkAbort();
        stream.getAudioTracks().forEach((track) =>
          track.addEventListener(
            'ended',
            () => {
              if (!signal.aborted && !disposed) callbacks.ended();
            },
            { once: true },
          ),
        );
      } else {
        const sampleUrl = new URL(source.url, location.href);
        if (sampleUrl.origin !== location.origin)
          throw new Error(
            '表示:サンプル音声はこのデモと同じサイト内のファイルを指定してください。',
          );
        const response = await fetch(sampleUrl, { signal });
        if (!response.ok) throw new Error('表示:サンプル音声を読み込めませんでした。');
        sample = await context.decodeAudioData(await response.arrayBuffer());
        checkAbort();
        const destination = context.createMediaStreamDestination();
        bufferSource = context.createBufferSource();
        bufferSource.buffer = sample;
        bufferSource.connect(destination);
        stream = destination.stream;
      }
      const { MicVAD } = await import('@ricky0123/vad-web');
      checkAbort();
      const assetPath = new URL(`${import.meta.env.BASE_URL}vad/`, location.href).href;
      vad = await MicVAD.new({
        model,
        startOnLoad: false,
        audioContext: context,
        baseAssetPath: assetPath,
        onnxWASMBasePath: assetPath,
        ortConfig: (ort) => {
          ort.env.wasm.numThreads = 1;
          ort.env.wasm.proxy = false;
        },
        getStream: async () => {
          checkAbort();
          return stream!;
        },
        pauseStream: async (audio) => {
          audio.getTracks().forEach((track) => track.stop());
        },
        resumeStream: async () => {
          throw new Error('Use a fresh microphone session');
        },
        positiveSpeechThreshold: 0.55,
        negativeSpeechThreshold: 0.35,
        minSpeechMs: 96,
        redemptionMs: 520,
        preSpeechPadMs: 0,
        submitUserSpeechOnPause: false,
        onFrameProcessed: (probabilities, frame) => {
          if (signal.aborted || disposed) return;
          const features = analyseVoiceFrame(frame, 16000);
          smoothed += (features.level - smoothed) * (features.level > smoothed ? 0.72 : 0.4);
          bands = smoothBands(bands, features.bands);
          callbacks.frame(probabilities.isSpeech, smoothed, bands);
          const wasSpeaking = speechGate.speaking;
          const speaking = speechGate.update(probabilities.isSpeech, hasVariableAudio(frame));
          if (wasSpeaking !== speaking) callbacks.speech(speaking);
        },
        // The segment collector's minimum speech duration counts non-consecutive
        // positive frames. It is not the gate for the immediate visual state.
        onSpeechRealStart: () => {},
        onSpeechEnd: () => {},
        onVADMisfire: () => {},
      });
      checkAbort();
      await vad.start();
      checkAbort();
      if (vad.errored || !vad.listening)
        throw new Error('VAD initialization did not enter listening');
      initializing = false;
      if (bufferSource && sample) {
        bufferSource.start();
        // Leave one second of silence so the VAD's release is visible before stop.
        timer = setTimeout(
          () => {
            if (!signal.aborted && !disposed) callbacks.ended();
          },
          (sample.duration + 1.1) * 1000,
        );
      }
      return { dispose };
    } catch (error) {
      initializing = false;
      await dispose();
      throw error;
    }
  };

export function useMicrophone(model: 'v5' | 'v6' = 'v6') {
  const controller = useMemo(() => new MicrophoneController(createSession(model)), [model]);
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
  return {
    ...state,
    start: controller.start,
    stop: controller.stop,
    toggleMute: controller.toggleMute,
    startSample: controller.startSample,
  };
}
