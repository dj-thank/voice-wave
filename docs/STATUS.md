# Verification status — 2026-11-02

This file distinguishes implementation, automated checks, browser observations and remaining real-device limits. A successful sample run is not a substitute for real microphone acceptance.

## Implemented

- Browser-local microphone capture with explicit start, stop, mute, cancellation and permission-error handling.
- Pipecat Wave shader with fixed recording-red speech, round green waiting, pulsing thinking and blue-violet agent output. Measured audio energy and low/mid/high bands drive the shape; no phoneme recognition is performed.
- A clean central stage with screen-reader state updates. Detailed state and input/output metrics are in collapsed diagnostics: up to 900 in-memory entries, numerical values at up to 4 Hz, immediate state changes, explicit JSON export, pause and clear. No raw audio, device identifiers or transcripts are logged.
- A consecutive-evidence visual speech gate: 3 frames at probability >= .55, or 2 at >= .85, starts speech; 10 frames below .35 return to idle. These are 32 ms model frames, not end-to-end latency measurements. This gate does not determine semantic turn endings.
- The main playground uses one original Pipecat Wave. Color distinguishes user speech, agent speech and idle; thinking retains its pulse. The rejected inner/outer comparison is removed from the demo. Its previously published component props remain available for API compatibility; see `docs/LAYOUTS.md`.
- A renderer-only React package with TypeScript declarations and a separate minimal consumer. No microphone or VAD initialization occurs on import.

The demo uses vad-web 0.0.31 and ONNX Runtime Web 1.22.0. Silero v6 is the default, with v5 available for comparison. This is an integration choice, not a measured all-model winner; the package's `v6` label is not asserted to be a specific upstream v6.2 revision.

## Evidence before the release pass

- TypeScript, production build and 16 tests passed for the microphone/playback lifecycle, spectral analysis, activity gate and diagnostics.
- Browser sample runs detected speech, returned to silence and stopped. The central stage stayed clear of status text/meters, and reduced motion was initially off.
- Diagnostics JSON download and clear were exercised. The observed log contained 39 state/metric entries with source sample/null and no audio payload.
- Agent sample playback followed thinking → actual audio → idle, with nonzero output features driving blue-violet motion.

Release-time package, composite layout, fallback and hosted checks are recorded below after execution. Earlier numerical comparisons used local prototype audio and do not apply to the redistributable fixtures.

## Redistributable fixed-input fixtures

The public WAV fixtures use Open JTalk 1.11 and HTS Voice “NIT ATR503 M001” 1.05, attributed under CC BY 3.0. They contain authored demonstration phrases, not user recordings. See [`public/samples/README.md`](../public/samples/README.md).

`scripts/audio-evaluate.mjs` passes each fixture through the same bundled Silero v6 model, then feeds identical probabilities to the old and new visual gates. It covers normal speech, −20 dB, −30 dB, short 「はい」, speech with noise, digital silence, separated impulses and broadband noise. Full event/probability traces are in `public/samples/eval-results.json`.

There are no annotated ground-truth speech boundaries, so missed-speech duration is not measured. Model-frame event times are not microphone-to-screen latency. This limited synthetic comparison is not a general Japanese accuracy score.

The redistributable-fixture run detected all five speech conditions; the three 5-second negative conditions had zero false-lit duration with both gates. First onset was 32 ms earlier for normal speech and short 「はい」, and unchanged in the other three conditions. Final return was 192 ms earlier in all five. The new gate also settled during some within-phrase pauses (one to three additional quiet intervals); without annotated boundaries these cannot be classified as correct pauses or missed speech. The earlier return is a visual-response tradeoff, not a blanket accuracy improvement.

## Release verification

- All 19 tests, TypeScript and production build passed after the combined-layout revision.
- A real 23 KB package archive was installed into an independent consumer: TypeScript Bundler and NodeNext checks, Vite build and server rendering passed. The browser consumer rendered the user speaking state without microphone acquisition. Vite reports a non-failing warning about the library's `use client` directive; client-side and SSR smoke checks passed, but no Next.js integration is claimed.
- Browser: both synthetic signals were simultaneously active; inner/outer assignment and both composite layouts could be selected. Following visual feedback, the detached ring and black center mask were removed. The radial marks now overlap the Wave's inner contour and share its speaking color; per-channel activity remains independent.
- Browser keyboard interaction: expanded settings, changed layout and enabled reduced motion and explicit non-WebGL rendering. DOM confirmed the canvas hidden and the fallback active. Actual GPU context loss/recovery was not induced.
- Public GitHub repository and GitHub Pages demo are live. Anonymous repository/API and demo reads returned HTTP 200. The initial clean Linux CI build, 19 tests, package-consumer validation and Pages deployment succeeded: [run 41415352854](https://github.com/dj-thank/voice-wave/actions/runs/41415352854).
- [Release v0.1.0](https://github.com/dj-thank/voice-wave/releases/tag/v0.1.0) contains the renderer tarball and SHA-256 checksum. A separate consumer installed the actual public Release URL and passed TypeScript/Vite build.
- The hosted demo loaded same-origin audio/model assets and reported speech detected → silence recovery → idle for the redistributable Japanese sample. No console errors/warnings were observed in that run.
- Production microphone acquisition stayed in the preparing state in the test browser; app-level permission controls were unavailable to automation. The request was canceled and the UI returned to microphone-off. Actual hosted microphone capture is not claimed as verified; users must allow microphone access and test their device.
- Responsive viewport override was unavailable in this browser session; mobile layout/device acceptance remains unverified.

## Playground redesign verification — 2026-11-02

- Rebuilt the page around the official Pipecat Wave documentation reference: restrained header, clear preview canvas, aligned borders/spacing, a stable start/stop dock, and separate sample/settings controls. The original renderer, shaders, palettes, VAD and audio engine are unchanged.
- Removed the inner/outer layout selectors following user review. The main demo uses a single fluid Wave with recording red for the user, blue-violet for the agent, green waiting and pulsing thinking. Reduced motion and the simple fallback are off initially. The fallback is an optional compatibility setting, not the default visual.
- Explicit preview states are waiting, user, thinking and agent. Switching into preview stops actual input/output. The common end button stops preview, input and output; preparation can be canceled. Diagnostics remain mounted across mode and settings changes.
- Focused source review found no functional blocker. All 19 existing tests and the TypeScript/production build passed. Renderer/package/audio sources have no changes in this pass.
- Browser: all four preview states worked with keyboard controls. Actual bundled agent playback transitioned into preview with output returning to idle. Preparation canceled to idle. The Japanese fixture detected speech, returned to silence and ended. Paired samples showed both channels speaking; common stop returned both to idle. Model selection was disabled during capture. Logs persisted across settings changes.
- Browser: optional simple rendering hid the WebGL canvas; reduced motion could be selected. Both options were reset to their default off state afterward. No console warnings/errors were observed in the focused sample run.
- Responsive viewport checks passed at 320 × 740, 390 × 844 and 1280 × 720: no horizontal page overflow; narrow toolbar labels wrap; the desktop start/stop buttons fit within the first viewport. These are browser viewport checks, not real mobile/Safari hardware acceptance. This supersedes the earlier session's unavailable viewport override.
- Real microphone hardware, acoustic noise and cloud/LLM conversation are not newly validated by this UI pass. The limits below remain applicable.

## Remaining boundaries

- No ASR, live LLM conversation, cloud TTS, phoneme alignment or speaker identification. Agent speech is a labelled bundled sample.
- Nearby voices and acoustic echo can trigger input VAD. Browser echo cancellation is requested, but echo robustness is unmeasured.
- Natural Japanese speech accuracy, real-life noise, p50/p95 onset/release latency, mobile/Safari hardware compatibility, GPU and energy measurements remain open.
- The first local version received hands-on microphone feedback. Subsequent automated/sample checks do not establish real microphone acceptance on every browser or device.
