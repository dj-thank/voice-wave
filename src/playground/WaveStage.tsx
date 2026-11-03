import { useEffect, useState } from 'react';
import { VoiceConversation } from '../visualizer/VoiceConversation';
import type { VoiceConversationProps } from '../visualizer/VoiceConversation';
import type { PlaygroundSession } from './usePlayground';
import { PREVIEW_STATES } from './status';

export type DisplayOptions = Pick<
  VoiceConversationProps,
  'idleMotion' | 'reducedMotion' | 'renderer'
>;

function AnimatedPreview(props: VoiceConversationProps) {
  const [levels, setLevels] = useState({ user: 0, agent: 0 });
  const { input, output } = props;
  useEffect(() => {
    if (!input.speaking && !output.speaking) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setLevels({
        user: 0.25 + 0.3 * Math.abs(Math.sin(t * 5.5)) + 0.18 * Math.abs(Math.sin(t * 12)),
        agent: 0.22 + 0.28 * Math.abs(Math.sin(t * 3.6 + 0.7)) + 0.16 * Math.abs(Math.sin(t * 8.2)),
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [input.speaking, output.speaking]);

  const user = input.speaking ? levels.user : 0;
  const agent = output.speaking ? levels.agent : 0;
  return (
    <VoiceConversation
      {...props}
      input={{ ...input, level: user, bands: [user * 0.8, user, user * 0.6] }}
      output={{ ...output, level: agent, bands: [agent * 0.55, agent * 0.8, agent] }}
    />
  );
}

export function WaveStage({
  session,
  display,
  onError,
}: {
  session: PlaygroundSession;
  display: DisplayOptions;
  onError: NonNullable<VoiceConversationProps['onError']>;
}) {
  const { input, output, preview, mode, status, actions } = session;
  const Wave = preview.enabled ? AnimatedPreview : VoiceConversation;
  return (
    <>
      <div className="orb-wrap">
        <Wave input={input} output={output} {...display} onError={onError} />
      </div>
      <span className="sr-only" role="status" aria-live="polite">
        {status}
      </span>
      {preview.enabled ? (
        <div className="preview-state-buttons" role="group" aria-label="プレビュー状態">
          {PREVIEW_STATES.map((item) => (
            <button
              key={item.value}
              aria-label={item.accessibleLabel}
              aria-pressed={preview.mode === item.value}
              data-state={item.value}
              onClick={() => actions.selectPreviewState(item.value)}
            >
              <i />
              {item.label}
            </button>
          ))}
        </div>
      ) : (
        <div
          className="participant-key"
          aria-label={mode === 'overlap' ? '入出力の状態：同時発話' : '入出力の状態'}
        >
          <span data-active={input.speaking}>
            <i className="user-dot" />
            あなた
            {input.speaking && (
              <span className="activity-mark" aria-label="発話中">
                •••
              </span>
            )}
          </span>
          <span data-active={output.speaking || output.thinking}>
            <i className="agent-dot" />
            エージェント
            {(output.speaking || output.thinking) && (
              <span className="activity-mark" aria-label={output.thinking ? '思考中' : '再生中'}>
                {output.thinking ? '…' : '•••'}
              </span>
            )}
          </span>
        </div>
      )}
    </>
  );
}
