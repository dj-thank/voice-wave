# Layout decision and compatibility

The main playground uses **Wave alone**, preserving the preferred calm green idle and recording-red response. The inner/outer composite design was evaluated and rejected for the main demo. There is no layout or inner-participant selector in the playground.

Input and output signals remain independent. One Wave shows user speech first, otherwise agent speech, thinking or waiting. During simultaneous speech, user speech takes priority; both signals remain available in diagnostics. Audio acquisition and speech detection do not depend on the visual layout.

## Earlier experimental layouts

The published v0.1.0 React API retains the following layouts for compatibility with existing consumers. The two composite layouts are earlier visual experiments, not the selected demo design. They do not require two different audio services.

| Layout | Inner layer | Outer layer | Default participant assignment |
|---|---|---|---|
| `wave` | Pipecat-derived Wave | — | User speech takes priority; otherwise agent speech/thinking |
| `wave-inside` | Pipecat-derived Wave | LiveKit-derived Radial | Inner user, outer agent |
| `wave-outside` | LiveKit-derived Radial | Pipecat-derived Wave | Inner user, outer agent |

For API consumers using a composite layout, `innerSource="agent"` exchanges the participant assignment. Both layers share one palette for the current conversation state: recording red during user speech, blue-violet during agent-only speech, and green during thinking/waiting. User speech has color priority during simultaneous speech. Participant identity is represented by inner/outer position, while each layer's energy and motion still follow its own independent signal. Changing the component's layout prop does not acquire audio, change the detector, or change source ownership.

In the retained composite implementation, a thin Radial sits just inside the Wave contour instead of orbiting separately. There is no black center disk or opaque mask: the natural center of the Wave remains visible. The `wave-inside` preset puts the Radial at the contour (radius 68 in a 300-unit view), while `wave-outside` moves it slightly further inward (radius 58). The bars grow inward. These details document the earlier experiment; they are not a recommendation or a user-study result.

## Source and modifications

The Radial adapter follows the angle, dot-size and volume-to-height mapping in [LiveKit's pinned component](https://github.com/livekit/components-js/blob/c94f4148d658c1a4219b245ebcfa750fa046a8af/packages/shadcn/components/agents-ui/agent-audio-visualizer-radial.tsx). It is a local derivative, not a LiveKit SDK connection or an unmodified component. The SVG version removes track hooks, Tailwind and automatic listening sequences. Three measured low/mid/high energies are interpolated symmetrically around the circle; forty bars do **not** imply forty independently measured bands. Thin inward bars overlap the Wave's contour and use the shared conversation palette. There is no synthetic motion during listening and no phoneme recognition. Thinking uses a separate slow opacity pulse.

License: Apache-2.0; copyright 2023 LiveKit, Inc. The source license and NOTICE are included under `public/licenses/`. See `THIRD_PARTY_NOTICES.md` for all dependencies.

## Motion, failure, and acceptance limits

`reducedMotion` freezes radial lengths and suppresses thinking pulses while retaining semantic color changes. The Wave also settles into a fixed round form. Offscreen and hidden-document WebGL work is suspended by the Wave renderer.

`renderer="fallback"` deliberately avoids WebGL and uses an energy-responsive CSS orb. Automatic WebGL initialization failure or context loss selects the same fallback; context restoration rebuilds the renderer. `onError` receives a message on failure and `null` after recovery. Fallback and composite rendering are presentation only and never acquire a microphone.

Unit checks cover simultaneous state independence, shared palette priority, inner/outer assignment exchange, and the distinction between agent thinking and user speech. `VoiceWave.active` can control audio-driven shape activity independently of `mode`, which selects the shared palette in composites. Browser checks and real-device limits are recorded in `STATUS.md` by the release verification flow. Source-level state checks do not establish microphone separation, perceptual timing, or mobile GPU performance.
