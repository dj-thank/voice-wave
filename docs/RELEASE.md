# Voice Wave v0.3.0

A calmer thinking pulse, rounder waiting, and visible entry order when two voices overlap.

- Slow thinking to a gentle 3-second pulse in the agent's blue/cyan palette.
- Round the waiting contour while retaining its soft organic motion and independent motion switch.
- Reveal red from the left when the user joins an active agent, or blue from the right when the agent joins the user. The preceding color remains visible during the approximately 850 ms transition.
- Add `overlapEntry` to `VoiceWave`, export `OverlapEntry`, and infer observed order automatically in `VoiceConversation`. Unknown order stays neutral; reduced motion skips the sweep.
- Add two interactive preview sequences. Another state, sequence, mode, audio action or stop cancels the current sequence.
- Preserve short overlaps' partial transition when fading out, and include sanitized entry order in metadata-only diagnostics.

The demo still uses one fluid Wave. User speech stays recording-red, and existing experimental layout props remain available for compatibility.

## Verification

28 tests, production build, actual tarball installation in an independent consumer, TypeScript Bundler/NodeNext checks, Vite and SSR smoke passed. Browser checks covered both complete entry sequences, cancellation, rounder waiting, and desktop/narrow layouts. See the [verification record](https://github.com/dj-thank/voice-wave/blob/main/docs/STATUS.md).

This GitHub Release distributes `dj-thank-voice-wave-0.3.0.tgz`; it is not an npm registry publication. Audio processing remains browser-local, with same-origin runtime assets.

Entry order describes observed activity flags, not precise onset measurement or interruption intent. Real microphone/noise acceptance, mobile/Safari hardware, latency and energy measurements remain open. The agent is a labelled sample, with no live LLM, cloud TTS, ASR, phoneme recognition or audio upload.
