# Voice Wave v0.2.0

Waiting is fluid again, and simultaneous input/output has its own red-and-blue state on one Wave.

- Restore the earlier organic waiting shape; use a softer mint-green palette.
- Add `idleMotion` (default `true`) independently from global reduced motion. Turning it off only stops waiting animation.
- Keep user speech recording-red. Agent speech and thinking now share blue/cyan; thinking pulses.
- Add `mode="overlap"` and automatic overlap in `VoiceConversation`, combining both measured visual envelopes without clipping. A localized shader treatment shows both colors on the same surface.
- Distinguish audible output from playback lifecycle, so silent portions are not counted as continuing agent activity after the short release interval.
- Add a fifth preview state and update the minimal React example and documentation.

The main demo remains a single Wave. Existing experimental layout props remain available for compatibility. Color choices are semantic; user speech remains fixed red.

## Verification

22 tests, production build, actual tarball installation in an independent consumer, TypeScript Bundler/NodeNext checks, Vite and SSR smoke passed. Browser checks covered waiting motion off/on, thinking and speech while waiting motion is off, real bundled sample overlap transitions, fallback colors, and narrow layout. See [verification record](https://github.com/dj-thank/voice-wave/blob/main/docs/STATUS.md) for details.

The package is distributed as `dj-thank-voice-wave-0.2.0.tgz` on this GitHub Release; it is not an npm registry publication. The demo runs audio processing locally and serves runtime assets from the same origin.

Real microphone/noise acceptance, mobile/Safari hardware, latency and power measurements remain open. Output activity is not a speech-recognition model or a judgment about conversational interruption. The agent is a labelled sample, with no live LLM, cloud TTS, ASR, phoneme recognition or audio upload.
