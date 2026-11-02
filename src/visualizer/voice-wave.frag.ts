import { PIPECAT_FRAGMENT_BODY } from './pipecat-wave.frag';

// Keep the attributed upstream body intact. This localized color treatment puts
// both participants into one organic surface, without a second ring or layer.
export const VOICE_WAVE_FRAGMENT_BODY = PIPECAT_FRAGMENT_BODY.replace(
  '    pp += ik * cl;',
  `    if (uOverlap > 0.001) {
      float progress = smoothstep(0.0, 1.0, uOverlapProgress);
      float edge = uOverlapEntry > 0.5 ? mix(-0.48, 0.02, progress)
        : uOverlapEntry < -0.5 ? mix(0.48, 0.02, progress) : 0.02;
      float seam = st.x - edge + 0.045 * sin(st.y * 12.0 + t * 1.4);
      float side = smoothstep(-0.045, 0.045, seam);
      cl = mix(cl, mix(uUserColor, uAgentColor, side), uOverlap);
    }
    pp += ik * cl;`,
);
