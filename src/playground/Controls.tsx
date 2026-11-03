import type { ButtonHTMLAttributes } from 'react';
import type { VoiceSource } from '../visualizer/conversationState';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import type { PlaygroundSession } from './usePlayground';
import { describeSequence } from './status';

function SampleButton({
  icon,
  label,
  audible = true,
  active = false,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName;
  label: string;
  audible?: boolean;
  active?: boolean;
}) {
  return (
    <button {...props} className="sample-action" data-active={active}>
      <span className="action-icon">
        <Icon type={icon} />
      </span>
      <strong className="action-label">{label}</strong>
      <span className="sound-label">{audible ? '音あり' : '無音'}</span>
      <Icon type={active && audible ? 'stop' : 'play'} size={14} />
    </button>
  );
}

export function Samples({ session }: { session: PlaygroundSession }) {
  const { sample, loading, running, agentActive, sampleResult, actions } = session;
  return (
    <section className="inspector-section sample-section">
      <h2 className="section-heading">サンプル</h2>
      <div className="sample-actions">
        <SampleButton
          icon="wave"
          label={sample ? 'サンプルを解析中' : 'あなたの声'}
          audible={false}
          aria-label="日本語サンプルで試す"
          disabled={loading || sample}
          active={sample}
          onClick={actions.startSample}
        />
        <SampleButton
          icon="headphones"
          label={agentActive ? 'エージェントを停止' : 'エージェントの声'}
          aria-label={agentActive ? 'エージェント音声を止める' : 'エージェント音声を試す'}
          active={agentActive}
          onClick={actions.toggleAgent}
        />
        <SampleButton
          icon="layers"
          label="二人の声を同時に"
          aria-label="二人の声を同時に試す"
          disabled={running || agentActive}
          onClick={actions.startBothSamples}
        />
      </div>
      {sampleResult && (
        <p className="sample-feedback" role="status">
          <span>✓</span>
          {sampleResult}
        </p>
      )}
    </section>
  );
}

export function SequenceControls({
  session,
  onStart,
}: {
  session: PlaygroundSession;
  onStart: (entry: VoiceSource) => void;
}) {
  const { sequence } = session.preview;
  return (
    <section className="inspector-section sequence-section" aria-label="発話の順番プレビュー">
      <h2 className="section-heading">発話の順番</h2>
      <div className="sequence-actions">
        <button
          aria-label="青から赤が入る流れを再生"
          data-active={sequence?.entry === 'user' && sequence.phase !== 'complete'}
          onClick={() => onStart('user')}
        >
          <span className="sequence-dot agent" />
          青に
          <span className="sequence-dot user" />
          赤が入る
          <Icon type="play" size={12} />
        </button>
        <button
          aria-label="赤から青が入る流れを再生"
          data-active={sequence?.entry === 'agent' && sequence.phase !== 'complete'}
          onClick={() => onStart('agent')}
        >
          <span className="sequence-dot user" />
          赤に
          <span className="sequence-dot agent" />
          青が入る
          <Icon type="play" size={12} />
        </button>
      </div>
      <span className="sr-only" role="status">
        {describeSequence(sequence)}
      </span>
    </section>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  accessibleLabel,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  accessibleLabel?: string;
}) {
  return (
    <label className="switch-row">
      <span>{label}</span>
      <input
        type="checkbox"
        aria-label={accessibleLabel}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="switch-track" aria-hidden="true" />
    </label>
  );
}
