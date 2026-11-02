import type { CSSProperties } from 'react';
import { VoiceWave } from './VoiceWave.js';
import { LiveKitRadial } from './LiveKitRadial.js';
import { conversationMode, conversationSignal, layerSources, primarySource } from './conversationState.js';
import type { VoiceChannel, VoiceLayout, VoiceSource } from './conversationState.js';
import { useOverlapEntry } from './useOverlapEntry.js';

export type { VoiceChannel, VoiceLayout, VoiceSource } from './conversationState.js';

export interface VoiceConversationProps {
  input: VoiceChannel;
  output: VoiceChannel;
  /** The original Wave remains the default. */
  layout?: VoiceLayout;
  /** Which participant occupies the inner layer in a composite layout. */
  innerSource?: VoiceSource;
  reducedMotion?: boolean;
  /** Animate the waiting state; speech and thinking remain animated when false. */
  idleMotion?: boolean;
  /** 'fallback' offers the same states without requiring WebGL. */
  renderer?: 'auto' | 'fallback';
  className?: string;
  style?: CSSProperties;
  onError?: (message: string | null) => void;
}

/** Pure presentation: does not acquire microphones, start audio, or create a network connection. */
export function VoiceConversation({ input, output, layout = 'wave', innerSource = 'user', reducedMotion = false, idleMotion = true, renderer = 'auto', className, style, onError }: VoiceConversationProps) {
  const channels = { user: input, agent: output };
  const sources = layerSources(innerSource);
  const waveSource = layout === 'wave' ? primarySource(input, output) : layout === 'wave-inside' ? sources.inner : sources.outer;
  const radialSource = layout === 'wave-inside' ? sources.outer : sources.inner;
  const wave = layout === 'wave' ? conversationSignal(input, output) : channels[waveSource];
  const radial = channels[radialSource];
  const mode = conversationMode(input, output);
  const overlapEntry = useOverlapEntry(input.speaking, output.speaking);
  const orderDescription = overlapEntry === 'user' ? ' User joined agent.' : overlapEntry === 'agent' ? ' Agent joined user.' : overlapEntry === 'simultaneous' ? ' Entry order unknown.' : '';
  const accessibleState = `User: ${input.speaking ? 'speaking' : 'quiet'}. Agent: ${output.speaking ? 'speaking' : output.thinking ? 'thinking' : 'quiet'}.${orderDescription}`;
  return <div className={className} role="img" aria-label={accessibleState}
    data-voice-layout={layout} data-input-speaking={input.speaking} data-output-speaking={output.speaking}
    data-overlap-entry={overlapEntry ?? undefined}
    data-inner-source={layout === 'wave' ? undefined : innerSource}
    style={{ width: '100%', height: '100%', position: 'relative', ...style }}>
    <div style={{ position: 'absolute', inset: 0 }}>
      <VoiceWave level={wave.level} bands={wave.bands} mode={mode} active={wave.speaking}
        overlapEntry={overlapEntry ?? 'simultaneous'} reducedMotion={reducedMotion} idleMotion={idleMotion} renderer={renderer} onError={onError} />
    </div>
    {layout !== 'wave' && <LiveKitRadial channel={radial} mode={mode}
      inner={layout === 'wave-outside'} reducedMotion={reducedMotion} />}
  </div>;
}
