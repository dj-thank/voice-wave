export type AudioBands = [number, number, number];
export const silentBands = (): AudioBands => [0, 0, 0];

/** Three broad spectral envelopes, not phoneme or word recognition. */
export function analyseVoiceFrame(
  frame: Float32Array,
  sampleRate = 16000,
): { level: number; bands: AudioBands } {
  if (!frame.length) return { level: 0, bands: silentBands() };
  let mean = 0;
  for (const value of frame) mean += value;
  mean /= frame.length;
  let square = 0;
  const windowed = new Float32Array(frame.length);
  let windowSum = 0;
  for (let i = 0; i < frame.length; i++) {
    const value = frame[i] - mean;
    square += value * value;
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / Math.max(1, frame.length - 1));
    windowed[i] = value * window;
    windowSum += window;
  }
  const rms = Math.sqrt(square / frame.length);
  if (rms < 0.0008) return { level: 0, bands: silentBands() };
  const compress = (amplitude: number) =>
    Math.min(1, Math.max(0, (Math.log10(Math.max(amplitude, 0.00001)) + 3.1) / 2.5));
  const bands = [
    [180, 300, 480],
    [750, 1100, 1600],
    [2400, 3400, 4800],
  ].map((frequencies) => {
    let power = 0;
    for (const frequency of frequencies) {
      if (frequency >= sampleRate / 2) continue;
      const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
      let previous = 0;
      let beforePrevious = 0;
      for (const sample of windowed) {
        const current = sample + coefficient * previous - beforePrevious;
        beforePrevious = previous;
        previous = current;
      }
      power += Math.max(
        0,
        previous * previous +
          beforePrevious * beforePrevious -
          coefficient * previous * beforePrevious,
      );
    }
    return compress((2 * Math.sqrt(power)) / Math.max(windowSum, 1));
  }) as AudioBands;
  return { level: compress(rms), bands };
}

export function smoothBands(previous: AudioBands, current: AudioBands): AudioBands {
  return current.map(
    (value, index) =>
      previous[index] + (value - previous[index]) * (value > previous[index] ? 0.7 : 0.4),
  ) as AudioBands;
}
