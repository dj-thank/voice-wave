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
export type VoiceMode = 'waiting' | 'user' | 'agent' | 'thinking';

export function channelMode(channel: VoiceChannel, source: VoiceSource): VoiceMode {
  if (channel.speaking) return source;
  if (source === 'agent' && channel.thinking) return 'thinking';
  return 'waiting';
}

/** The single Wave follows the user first; both channels remain independently available. */
export function primarySource(input: VoiceChannel, output: VoiceChannel): VoiceSource {
  return input.speaking || (!output.speaking && !output.thinking) ? 'user' : 'agent';
}

/** One shared semantic palette; position and audio response distinguish participants. */
export function conversationMode(input: VoiceChannel, output: VoiceChannel): VoiceMode {
  const source = primarySource(input, output);
  return channelMode(source === 'user' ? input : output, source);
}

export function layerSources(innerSource: VoiceSource): { inner: VoiceSource; outer: VoiceSource } {
  return { inner: innerSource, outer: innerSource === 'user' ? 'agent' : 'user' };
}
