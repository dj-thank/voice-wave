# Layout decision and compatibility

The main playground uses **Wave alone**, with a softly moving, slightly rounder mint-green idle and recording-red response. The inner/outer composite design was evaluated and rejected for the main demo. There is no layout or inner-participant selector in the playground.

Input and output signals remain independent. One Wave shows five states: mint-green waiting, recording-red user speech, blue/cyan agent speech, three-second blue thinking pulses, and red/blue overlap within the same shape. During overlap, its level and each low/mid/high band combine the two inputs as `1 - (1 - input) × (1 - output)`. Both original signals remain available in diagnostics. Audio acquisition and speech detection do not depend on the visual layout.

`VoiceConversation` tracks the observed transition from a single active voice to both. When the user joins an agent, red enters from the left over about 850 ms; when the agent joins the user, blue enters from the right. This order remains latched while both are active. When one stops, the Wave follows the remaining voice; a later re-entry starts a new episode. If both flags appear initially or together in one update, the direction is unknown and the composition is neutral.

Direct `VoiceWave` consumers can supply `overlapEntry="user"`, `"agent"` or `"simultaneous"` (the default), describing the joining participant. This is independent of `innerSource`, which belongs only to the retained composite API. The two silent sequence buttons in the playground demonstrate both entry orders without changing the audio stack.

The overlap state indicates concurrent signal activity and the order of observed activity flags, not precise acoustic onset times, semantic interruption or a judgment that a conversation has collided. The demo measures agent playback activity from output energy with a 180 ms release hold; it is not an output VAD or ASR model.

## Earlier experimental layouts

The React API introduced in v0.1.0 retains the following layouts for compatibility with existing consumers. The two composite layouts are earlier visual experiments, not the selected demo design. They do not require two different audio services.

| Layout | Inner layer | Outer layer | Default participant assignment |
|---|---|---|---|
| `wave` | Pipecat-derived Wave | — | Both signals share one Wave; red/blue overlap when both speak |
| `wave-inside` | Pipecat-derived Wave | LiveKit-derived Radial | Inner user, outer agent |
| `wave-outside` | LiveKit-derived Radial | Pipecat-derived Wave | Inner user, outer agent |

For API consumers using a composite layout, `innerSource="agent"` exchanges the participant assignment. The Wave follows the current conversation colors. The retained radial uses red during user speech/overlap, blue during agent speech/thinking, and mint-green during waiting. Participant identity is represented by inner/outer position, while each layer's energy and motion still follow its own independent signal. Changing the component's layout prop does not acquire audio, change the detector, or change source ownership.

In the retained composite implementation, a thin Radial sits just inside the Wave contour instead of orbiting separately. There is no black center disk or opaque mask: the natural center of the Wave remains visible. The `wave-inside` preset puts the Radial at the contour (radius 68 in a 300-unit view), while `wave-outside` moves it slightly further inward (radius 58). The bars grow inward. These details document the earlier experiment; they are not a recommendation or a user-study result.

## Source and modifications

The Radial adapter follows the angle, dot-size and volume-to-height mapping in [LiveKit's pinned component](https://github.com/livekit/components-js/blob/c94f4148d658c1a4219b245ebcfa750fa046a8af/packages/shadcn/components/agents-ui/agent-audio-visualizer-radial.tsx). It is a local derivative, not a LiveKit SDK connection or an unmodified component. The SVG version removes track hooks, Tailwind and automatic listening sequences. Three measured low/mid/high energies are interpolated symmetrically around the circle; forty bars do **not** imply forty independently measured bands. Thin inward bars overlap the Wave's contour and follow the conversation-state colors described above. There is no synthetic motion during listening and no phoneme recognition. Thinking uses a separate slow opacity pulse.

License: Apache-2.0; copyright 2023 LiveKit, Inc. The source license and NOTICE are included under `public/licenses/`. See `THIRD_PARTY_NOTICES.md` for all dependencies.

## Motion, failure, and acceptance limits

`idleMotion` defaults to `true`. With `idleMotion={false}`, only the Wave waiting animation stops; speech response and thinking pulses remain enabled. `reducedMotion={true}` takes priority and suppresses motion across all states while retaining semantic color changes. The directional entry sweep is also suppressed; the resulting color state remains visible. It also freezes radial lengths and thinking opacity pulses in retained composites. Offscreen and hidden-document WebGL work is suspended by the Wave renderer.

`renderer="fallback"` deliberately avoids WebGL and uses an energy-responsive CSS orb. Automatic WebGL initialization failure or context loss selects the same fallback; context restoration rebuilds the renderer. `onError` receives a message on failure and `null` after recovery. Fallback and composite rendering are presentation only and never acquire a microphone.

Acceptance criteria for the affected features include overlap entry order and sequence cancellation, bounded signal mixing, idle-motion controls, inner/outer assignment compatibility, and the distinction between agent thinking and user speech. `VoiceWave.active` can control audio-driven shape activity independently of `mode`, which selects the shared palette in composites. Browser checks and real-device limits are recorded in `STATUS.md` by the release verification flow. Source-level state checks do not establish microphone separation, perceptual timing, or mobile GPU performance.
