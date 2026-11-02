export type VoiceLayout = 'wave' | 'wave-inside' | 'wave-outside';
export type VoiceSource = 'user' | 'agent';
export interface VoiceChannel {
  /** Measured audio energy, normalized to 0–1. */
  level: number;
  speaking: boolean;
  /** Meaningful for agent output; does not imply that audio is playing. */
  thinking?: boolean;
  /** Measured low/mid/high energies. These are not phoneme classifications. */
  bands?: [number, number, number];
}
export type VoiceMode = 'waiting' | 'user' | 'agent' | 'thinking' | 'overlap';

export function channelMode(channel: VoiceChannel, source: VoiceSource): VoiceMode {
  if (channel.speaking) return source;
  if (source === 'agent' && channel.thinking) return 'thinking';
  return 'waiting';
}

/** The single Wave follows the user first; both channels remain independently available. */
export function primarySource(input: VoiceChannel, output: VoiceChannel): VoiceSource {
  return input.speaking || (!output.speaking && !output.thinking) ? 'user' : 'agent';
}

/** Both active signals are visible; this does not infer conversational intent. */
export function conversationMode(input: VoiceChannel, output: VoiceChannel): VoiceMode {
  if (input.speaking && output.speaking) return 'overlap';
  const source = primarySource(input, output);
  return channelMode(source === 'user' ? input : output, source);
}

const unit = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
const combine = (a: number, b: number) => 1 - (1 - unit(a)) * (1 - unit(b));

/** A bounded visual envelope, not a mixed audio waveform. Quiet sources contribute nothing. */
export function conversationSignal(input: VoiceChannel, output: VoiceChannel): VoiceChannel {
  if (!input.speaking || !output.speaking) return primarySource(input, output) === 'user' ? input : output;
  const a = input.bands ?? [input.level, input.level, input.level];
  const b = output.bands ?? [output.level, output.level, output.level];
  return { speaking: true, level: combine(input.level, output.level),
    bands: a.map((value, index) => combine(value, b[index])) as [number, number, number] };
}

export function layerSources(innerSource: VoiceSource): { inner: VoiceSource; outer: VoiceSource } {
  return { inner: innerSource, outer: innerSource === 'user' ? 'agent' : 'user' };
}
