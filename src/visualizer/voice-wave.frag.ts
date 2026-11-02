import { PIPECAT_FRAGMENT_BODY } from './pipecat-wave.frag';

// Keep the attributed upstream body intact. This localized color treatment puts
// both participants into one organic surface, without a second ring or layer.
export const VOICE_WAVE_FRAGMENT_BODY = PIPECAT_FRAGMENT_BODY.replace(
  '    pp += ik * cl;',
  `    if (uOverlap > 0.001) {
      float seam = st.x - 0.02 + 0.045 * sin(st.y * 12.0 + t * 1.4);
      float side = smoothstep(-0.045, 0.045, seam);
      cl = mix(cl, mix(uColor, uSecondaryColor, side), uOverlap);
    }
    pp += ik * cl;`,
);
