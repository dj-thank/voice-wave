import type { AudioSnapshot } from '../audio/controller';
import type { AgentVoiceState } from '../audio/agentController';
import type { VoiceMode } from '../visualizer/conversationState';
import type { OverlapEntry } from '../visualizer/overlapState';
import type { PreviewSnapshot } from './previewController';

export const PREVIEW_STATES: { value: VoiceMode; label: string; accessibleLabel?: string }[] = [
  { value: 'waiting', label: '待機' },
  { value: 'user', label: 'あなた' },
  { value: 'agent', label: 'エージェント' },
  { value: 'overlap', label: '同時', accessibleLabel: '同時発話' },
  { value: 'thinking', label: '思考' },
];

export function describeStatus(
  mic: AudioSnapshot,
  agent: AgentVoiceState,
  preview: PreviewSnapshot,
  mode: VoiceMode,
  entry: OverlapEntry | null,
) {
  const overlap =
    entry === 'user'
      ? 'エージェントの声にあなたの声が重なっています'
      : entry === 'agent'
        ? 'あなたの声にエージェントの声が重なっています'
        : 'あなたとエージェントが同時に発話中';
  const sample = mic.source === 'sample';
  if (preview.enabled) {
    const item = PREVIEW_STATES.find((item) => item.value === preview.mode)!;
    return mode === 'overlap'
      ? `${overlap}（模擬）`
      : `${item.accessibleLabel ?? item.label}のプレビュー（模擬）`;
  }
  if (mic.status === 'loading') return '音声の準備中';
  if (mode === 'overlap') return `${overlap}${sample ? '（サンプル）' : ''}`;
  if (mic.speaking) return sample ? 'サンプルの発話を検出' : 'あなたの声を検出';
  if (agent.status === 'thinking') return 'エージェントが考えています（デモ）';
  if (agent.audible) return 'エージェント音声を再生中（サンプル）';
  if (agent.status !== 'idle') return 'エージェントのサンプルを再生中（無音区間）';
  if (mic.status === 'muted') return 'ミュート中';
  if (mic.status === 'listening')
    return sample ? 'サンプルの無音を検出' : 'あなたの声を待っています';
  if (mic.status === 'error') return 'マイクを確認してください';
  return 'マイクはオフです';
}

export function describeSequence(sequence: PreviewSnapshot['sequence']) {
  if (!sequence) return '';
  const { entry, phase } = sequence;
  if (phase === 'first') return entry === 'user' ? 'エージェントだけ（青）' : 'あなただけ（赤）';
  if (phase === 'overlap')
    return entry === 'user' ? '赤が青に入り、同時発話' : '青が赤に入り、同時発話';
  if (phase === 'last') return entry === 'user' ? 'あなただけ（赤）' : 'エージェントだけ（青）';
  return '待機に戻りました';
}
