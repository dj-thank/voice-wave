/** The participant observed joining an already-active voice, or unknown ordering. */
export type OverlapEntry = 'user' | 'agent' | 'simultaneous';

export interface OverlapState {
  readonly inputSpeaking: boolean;
  readonly outputSpeaking: boolean;
  readonly entry: OverlapEntry | null;
}

/** An initially overlapping pair has no observed predecessor. */
export function createOverlapState(inputSpeaking = false, outputSpeaking = false): OverlapState {
  return { inputSpeaking, outputSpeaking, entry: inputSpeaking && outputSpeaking ? 'simultaneous' : null };
}

/**
 * Remember the observed entry order for this overlap episode. This follows
 * activity flags only, not volume, thinking, speaker identity or interruption intent.
 * If both flags first appear in one update, their finer timing is unknown.
 */
export function advanceOverlapState(previous: OverlapState, inputSpeaking: boolean, outputSpeaking: boolean): OverlapState {
  if (previous.inputSpeaking === inputSpeaking && previous.outputSpeaking === outputSpeaking) return previous;

  let entry: OverlapEntry | null = null;
  if (inputSpeaking && outputSpeaking) {
    entry = previous.inputSpeaking && !previous.outputSpeaking ? 'agent'
      : previous.outputSpeaking && !previous.inputSpeaking ? 'user'
      : 'simultaneous';
  }
  return { inputSpeaking, outputSpeaking, entry };
}
