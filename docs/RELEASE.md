# v0.1.0 release notes

Voice Wave provides an audio-reactive React component and a microphone demo. User speech turns recording-red; silence settles into a calm green orb. Agent sample output is blue-violet and follows the actual playback signal.

## Included

- Pipecat-derived Wave renderer with explicit speech state and measured audio features.
- Wave-only and LiveKit-derived radial composite layouts, including input/output assignment reversal.
- A renderer-only React package with TypeScript declarations and a standalone consumer example.
- Browser-local Silero v6/v5 demo, microphone start/stop/mute, labelled sample modes and reduced motion.
- Collapsed diagnostics with bounded in-memory metadata and explicit JSON export.
- Source attribution, licenses, English/Japanese instructions and reproducible checks.

The default presentation remains Wave alone. Composite layouts are available for comparing independently active user/agent signals. No AI provider account or API key is required.

## Distribution

The package is distributed as `dj-thank-voice-wave-0.1.0.tgz` on the GitHub Release. It is not an npm registry publication. GitHub Pages serves the interactive demo; all audio runtime assets are same-origin. Consult [STATUS](STATUS.md) for the actual publication and validation state.

## Verification boundaries

Automated tests and fixed synthetic audio establish lifecycle behavior, renderer packaging and detector wiring, not natural Japanese recognition accuracy. A sample replay is distinct from real microphone capture. The visual speech gate is not semantic turn detection or a phoneme recognizer.

Before extending support claims, verify:

- Real microphone permissions, stop/mute/restart and capture-device disconnection on the target browser.
- Normal speech, quiet speech, short responses, background sounds, speaker echo and simultaneous talk on the actual device.
- Keyboard navigation, reduced motion, screen-reader status and the non-WebGL fallback.
- Layout at narrow widths, off-screen/background behavior, device-specific frame rate and energy use.

No ASR, live LLM conversation, speech synthesis service, speaker identification or cloud audio upload is included. The agent is a labelled bundled sample. Mobile/Safari real-device compatibility and end-to-end p50/p95 latency remain unmeasured unless explicitly recorded in STATUS.
