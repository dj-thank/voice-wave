import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useMicrophone } from '../audio/useMicrophone';
import { useAgentVoice } from '../audio/useAgentVoice';
import { conversationMode } from '../visualizer/conversationState';
import type { VoiceChannel, VoiceSource } from '../visualizer/conversationState';
import { useOverlapEntry } from '../visualizer/useOverlapEntry';
import { PreviewController } from './previewController';
import { describeStatus } from './status';

const sampleUrl = (name: string) => `${import.meta.env.BASE_URL}samples/${name}.wav`;

export function usePlayground() {
  const [model, setModel] = useState<'v5' | 'v6'>('v6');
  const mic = useMicrophone(model);
  const agent = useAgentVoice();
  const controller = useMemo(() => new PreviewController(), []);
  const preview = useSyncExternalStore(
    controller.subscribe,
    controller.getSnapshot,
    controller.getSnapshot,
  );
  const [observations, setObservations] = useState({ speech: false, silence: false });
  const [sampleFinished, setSampleFinished] = useState(false);

  useEffect(() => () => controller.stop(), [controller]);
  useEffect(() => {
    if (mic.source === 'sample' && mic.speaking)
      setObservations((old) => ({ ...old, speech: true }));
    if (mic.source === 'sample' && mic.status === 'listening')
      setObservations((old) => ({ ...old, silence: old.speech || old.silence }));
    if (mic.status === 'idle' && observations.speech) setSampleFinished(true);
  }, [mic.status, mic.source, mic.speaking, observations.speech]);

  const resetSample = () => {
    setSampleFinished(false);
    setObservations({ speech: false, silence: false });
  };
  const stopAudio = () => {
    void mic.stop();
    void agent.stop();
  };
  const startMic = () => {
    controller.stop();
    resetSample();
    void mic.start();
  };
  const startSample = () => {
    controller.stop();
    resetSample();
    void mic.startSample(sampleUrl('voice-check'));
  };
  const startBothSamples = () => {
    startSample();
    void agent.start(sampleUrl('agent-voice'));
  };
  const selectPreview = (enabled: boolean) => {
    if (enabled !== preview.enabled) {
      stopAudio();
      resetSample();
    }
    controller.setEnabled(enabled);
  };
  const toggleAgent = () => {
    controller.stop();
    if (agent.status === 'idle') void agent.start(sampleUrl('agent-voice'));
    else void agent.stop();
  };
  const startSequence = (entry: VoiceSource) => {
    stopAudio();
    resetSample();
    controller.startSequence(entry);
  };
  const stop = () => {
    controller.stop();
    stopAudio();
  };
  const selectModel = (model: 'v5' | 'v6') => {
    setModel(model);
    resetSample();
  };

  const input: VoiceChannel = preview.enabled
    ? { speaking: preview.mode === 'user' || preview.mode === 'overlap', level: 0 }
    : { speaking: mic.speaking, level: mic.level, bands: mic.bands };
  const output: VoiceChannel = preview.enabled
    ? {
        speaking: preview.mode === 'agent' || preview.mode === 'overlap',
        thinking: preview.mode === 'thinking',
        level: 0,
      }
    : {
        speaking: agent.audible,
        thinking: agent.status === 'thinking',
        level: agent.level,
        bands: agent.bands,
      };
  const mode = conversationMode(input, output);
  const overlapEntry = useOverlapEntry(input.speaking, output.speaking);
  const running = ['loading', 'listening', 'speaking', 'muted'].includes(mic.status);
  const loading = mic.status === 'loading';
  const sample = mic.source === 'sample';
  const agentActive = agent.status !== 'idle';
  const active = running || agentActive || preview.enabled;
  const status = describeStatus(mic, agent, preview, mode, overlapEntry);
  const badge = preview.enabled
    ? 'プレビュー'
    : mode === 'overlap'
      ? '同時発話'
      : sample
        ? 'サンプル解析'
        : loading
          ? '準備中'
          : mic.status === 'muted'
            ? 'ミュート'
            : running
              ? 'マイク接続中'
              : agentActive
                ? 'サンプル再生'
                : 'READY';
  const sampleResult = sampleFinished
    ? `${observations.speech ? '発話を検出' : '発話未検出'}${observations.silence ? ' → 無音に復帰' : ''}`
    : null;

  return {
    mic,
    agent,
    preview,
    input,
    output,
    mode,
    status,
    badge,
    model,
    running,
    loading,
    sample,
    agentActive,
    active,
    sampleResult,
    actions: {
      startMic,
      startSample,
      startBothSamples,
      toggleAgent,
      selectPreview,
      startSequence,
      stop,
      selectModel,
      selectPreviewState: controller.selectState,
    },
    diagnostics: {
      mode,
      overlapEntry,
      model,
      micStatus: mic.status,
      source: preview.enabled ? 'preview' : mic.source,
      inputLevel: mic.level,
      probability: mic.probability,
      inputBands: mic.bands,
      agentStatus: agent.status,
      outputLevel: agent.level,
      outputBands: agent.bands,
    },
  };
}

export type PlaygroundSession = ReturnType<typeof usePlayground>;
