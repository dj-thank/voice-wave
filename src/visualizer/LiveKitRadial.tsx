/**
 * Modified from LiveKit's AgentAudioVisualizerRadial (Apache-2.0).
 * Copyright 2023 LiveKit, Inc.
 * Source: livekit/components-js @ c94f4148d658c1a4219b245ebcfa750fa046a8af,
 * packages/shadcn/components/agents-ui/agent-audio-visualizer-radial.tsx.
 *
 * Changes: SVG instead of Tailwind DOM, no LiveKit track hooks or state sequencer,
 * measured three-band interpolation, bounded two-layer geometry, fixed semantic
 * colors, and reduced-motion support. Angle/dot-size/bar-height mapping derives
 * from the original. This is an adapter, not the unmodified LiveKit component.
 * License and NOTICE are distributed in public/licenses/.
 */
import type { VoiceChannel, VoiceMode } from './conversationState.js';

interface Props {
  channel: VoiceChannel;
  mode: VoiceMode;
  inner?: boolean;
  reducedMotion?: boolean;
}
const clamp = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;

export function LiveKitRadial({ channel, mode, inner = false, reducedMotion = false }: Props) {
  const barCount = 40;
  // The ring now sits on the Wave's inner contour, never as a detached orbit.
  const distanceFromCenter = inner ? 58 : 68;
  const dotSize = distanceFromCenter * Math.PI / barCount * 0.32;
  const active = channel.speaking;
  const color = mode === 'user' || mode === 'overlap' ? '#ff0000' : mode === 'agent' || mode === 'thinking' ? '#146bff' : '#36b887';
  const bands = channel.bands ?? [channel.level, channel.level, channel.level];
  return <svg viewBox="0 0 300 300" aria-hidden="true" data-radial-mode={mode}
    data-radial-adapter="livekit" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
    <g transform="translate(150 150)" stroke={color} opacity={active ? 0.72 : mode === 'thinking' ? 0.5 : 0.22}>
      {mode === 'thinking' && !reducedMotion && <animate attributeName="opacity" values="0.22;0.55;0.22" dur="3s" repeatCount="indefinite" />}
      {Array.from({ length: barCount }, (_, idx) => {
        // Mirror the measured low/mid/high bands around the circle. This does
        // not invent forty frequency bins or identify spoken phonemes.
        const position = (1 - Math.abs(2 * idx / barCount - 1)) * 2;
        const lo = Math.floor(position), hi = Math.min(2, lo + 1);
        const band = clamp(bands[lo]) * (1 - position + lo) + clamp(bands[hi]) * (position - lo);
        const height = active && !reducedMotion ? Math.max(dotSize, dotSize * 10 * band * 0.6) : dotSize;
        const angle = idx / barCount * 360;
        return <line key={idx} data-lk-index={idx} transform={`rotate(${angle})`}
          x1="0" y1={-distanceFromCenter} x2="0" y2={-distanceFromCenter + height - dotSize}
          strokeWidth={dotSize} strokeLinecap="round" />;
      })}
    </g>
  </svg>;
}
