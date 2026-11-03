/** Reject only numerical silence/DC, not quiet speech below the visual meter floor. */
export function hasVariableAudio(frame: Float32Array): boolean {
  let low = Infinity,
    high = -Infinity;
  for (const value of frame) {
    if (value < low) low = value;
    if (value > high) high = value;
  }
  return high - low > 0.000001;
}

/**
 * UI activity is deliberately separate from ASR/turn endpointing.
 * Silero v5/v6 supplies one probability per 512 samples at 16 kHz (32 ms).
 * Require consecutive evidence: scattered clicks must not accumulate into speech.
 */
export class SpeechGate {
  speaking = false;
  private positiveFrames = 0;
  private confidentFrames = 0;
  private quietFrames = 0;

  update(probability: number, hasSignal = true): boolean {
    const p = Number.isFinite(probability) && hasSignal ? Math.max(0, Math.min(1, probability)) : 0;
    if (!this.speaking) {
      this.positiveFrames = p >= 0.55 ? this.positiveFrames + 1 : 0;
      this.confidentFrames = p >= 0.85 ? this.confidentFrames + 1 : 0;
      if (this.confidentFrames >= 2 || this.positiveFrames >= 3) {
        this.speaking = true;
        this.quietFrames = 0;
      }
    } else {
      this.quietFrames = p < 0.35 ? this.quietFrames + 1 : 0;
      if (this.quietFrames >= 10) this.reset();
    }
    return this.speaking;
  }

  reset() {
    this.speaking = false;
    this.positiveFrames = 0;
    this.confidentFrames = 0;
    this.quietFrames = 0;
  }
}
