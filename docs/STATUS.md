# Verification status — 2026-11-02

This file distinguishes implementation, automated checks, browser observations and remaining real-device limits. A successful sample run is not a substitute for real microphone acceptance.

## Implemented

- Browser-local microphone capture with explicit start, stop, mute, cancellation and permission-error handling.
- Pipecat Wave shader with recording-red user speech, organic mint-green waiting, blue/cyan agent output and same-color thinking, plus red/blue simultaneous activity. Measured audio energy and low/mid/high bands drive the shape; no phoneme recognition is performed.
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

## Organic waiting and overlap — v0.2.0

- Compared the original local waiting controller with its later calm-form adjustment. Restored the earlier/upstream silent shape parameters (pace 2.8, scale .22, frequency .35, amplitude .35, variance .06, fill .4, core .1, depth .22). Waiting is softly mint green; speech retains the measured modulation. The previous public versions remain in Git/Release history.
- Added `idleMotion` (default true) to both renderer components and a dedicated waiting-motion switch. Off freezes waiting after transitions settle; speech and thinking continue. Global reduced motion takes precedence. Browser image comparisons confirmed identical waiting frames when off, changed frames after re-enabling, and changed thinking/agent frames while waiting motion was off.
- Agent output and thinking now use the same blue/cyan palette. Thinking remains a brightness pulse. Simultaneous activity is `overlap`: red and blue share one organic surface, with no inner/outer ring. The original attributed shader body stays intact; a small color patch applies the spatial two-color treatment.
- Both active levels and bands contribute through bounded `1 - (1-a)(1-b)` visual envelopes. A quiet participant does not contribute. The output controller separates playback lifecycle from audible activity: .025 onset, below .012 for 180 continuous milliseconds to release, with hysteresis in between. This is an output-energy gate, not VAD, ASR, or a detector of interruption intent; echo can still produce apparent overlap.
- Five labelled preview states, the explicit fallback, keyboard controls, and 320 × 844 / 1280 × 720 layouts were exercised. The narrow layout had no horizontal overflow and all state buttons had 40px height. The fallback displayed both colors; its default remains off.
- 22 tests passed, including simultaneous signal contribution, one participant ending, quiet playback, lifecycle resets and stale callbacks. TypeScript/production build passed. The real v0.2.0 archive passed installation into an independent consumer, Bundler/NodeNext type checks, Vite build and server rendering. A missing extension in an emitted type import was caught by that check and fixed before packaging passed. The known non-failing `use client` bundler warning remains; no Next.js acceptance is claimed.
- The two actual bundled sample signals produced agent → overlap → user → waiting transitions. Exported diagnostics contained 11 overlap entries, and the Japanese sample reported speech detected → silence restored. These are synthetic fixture checks, not real microphone or conversational-interruption acceptance. No console warnings/errors were observed in the sample check.

## Entry order and softer motion — v0.3.0

- Thinking keeps the agent blue/cyan palette and now pulses once every 3 seconds with a gentler brightness range. Waiting keeps the mint palette and fluid motion, with a rounder contour (pace 2.0, scale .225, frequency .30, amplitude .20, variance .035 at silence). Speech modulation and audio detection are unchanged.
- `VoiceConversation` tracks the observed activity order. Agent first → user joins reveals red from the left; user first → agent joins reveals blue from the right over about 850 ms, retaining the preceding speaker's color. Order is latched through overlap and resets after departure. An unknown/same-observation start is explicitly simultaneous. A short overlap fades from its actual reveal position instead of jumping to a completed split on exit.
- `VoiceWave` exposes optional `overlapEntry` (`user`, `agent`, `simultaneous`) and the `OverlapEntry` type. Reduced motion skips the directional reveal. Diagnostics whitelist the observed order; it is not a precise onset timestamp or an inference of conversational intent.
- The preview adds two labelled 5.8-second sequences: first speaker → both → entrant alone → waiting. Manual state selection, mode changes, another sequence, audio start and common stop cancel scheduled transitions. Actual media is stopped when entering a sequence.
- 28 tests passed, including order latching, both directions, departure/rejoin, unknown order and diagnostic sanitization. TypeScript/production build and the actual v0.3.0 archive's independent consumer installation, Bundler/NodeNext type checks, Vite build and server rendering passed. The existing non-failing `use client` warning remains.
- Browser checks observed both complete sequences with the correct entry attribute, then the entrant alone and waiting. A manual switch to thinking canceled a running sequence and remained thinking after all prior timers would have fired. No console warnings/errors were observed. Desktop 1280 × 720 and narrow 320 × 844 layouts were exercised; the narrow page had no horizontal overflow and both sequence buttons were 44 px tall. These are browser checks, not mobile hardware acceptance.
- The focused review caught the short-overlap exit jump, and confirmed its correction. Real microphone, acoustic interruption/echo behavior and precise audiovisual timing remain outside this acceptance pass.

## Minimal copy and authored video — 2026-11-03

- Removed explanatory paragraphs, repeated state descriptions and visual disclaimers from the playground. Short control labels, error messages, screen-reader states and collapsed diagnostics remain. Preview states and order sequences keep their behavior.
- Produced a local Irodori-TTS two-voice film with separate input/output stems and eight independently checked utterances. The film is an authored dialogue, not a live AI conversation. See `DEMO_VIDEO.md` for generation, analysis, capture and encoded-file verification.
- Added an optional synchronous `onRenderFrame` callback for recording the original WebGL Wave. Without the callback, the playground's rendering and audio path are unchanged. TypeScript/production build, 28 tests and the independent package consumer passed.
- The final minimal-copy MP4 is 39.833 seconds, 1920 × 1080 at 30 fps, H.264/AAC. All 1,195 encoded frames contain the Wave; 45 frames contain sustained red/blue overlap. Encoded audio correlation to the mixed source stems is .974 after accounting for capture preroll. Local browser checks confirmed the shortened controls, working thinking preview and common stop, with no horizontal overflow at 1280 px.

## Remaining boundaries

- No ASR, live LLM conversation, cloud TTS, phoneme alignment or speaker identification. Agent speech is a labelled bundled sample.
- Nearby voices and acoustic echo can trigger input VAD. Browser echo cancellation is requested, but echo robustness is unmeasured.
- Natural Japanese speech accuracy, real-life noise, p50/p95 onset/release latency, mobile/Safari hardware compatibility, GPU and energy measurements remain open.
- The first local version received hands-on microphone feedback. Subsequent automated/sample checks do not establish real microphone acceptance on every browser or device.
