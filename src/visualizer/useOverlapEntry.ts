import { useState } from 'react';
import { advanceOverlapState, createOverlapState } from './overlapState.js';
import type { OverlapEntry } from './overlapState.js';

/** Derive order from observed activity snapshots without an effect-frame delay. */
export function useOverlapEntry(
  inputSpeaking: boolean,
  outputSpeaking: boolean,
): OverlapEntry | null {
  const [state, setState] = useState(() => createOverlapState(inputSpeaking, outputSpeaking));
  const next = advanceOverlapState(state, inputSpeaking, outputSpeaking);
  // Adjust this component's state only when its observed inputs change. React
  // retries this render before committing children; unchanged inputs reuse state.
  if (next !== state) setState(next);
  return next.entry;
}
