# Verification status — 2026-11-03

## Current implementation

- One Wave: red user speech, mint waiting, blue agent speech/thinking, and directional red/blue overlap. Audio energy and three frequency bands drive the shape.
- Independent microphone and playback controllers, explicit start/mute/stop/cancel, same-origin model assets and samples. Silero v6 is the default; v5 remains selectable.
- Display-only React components with TypeScript exports. Existing layout props remain compatible.
- Collapsed diagnostics keep up to 900 numeric/state entries in memory, at up to 4 Hz plus immediate state transitions. No audio or device IDs are stored.

## Structure cleanup — v0.3.2

- `main.tsx` only mounts the page. `playground/` owns the page, reusable controls, audio coordination and preview sessions. Preview frame updates stay inside the animated Wave.
- Preview timers are isolated and tested for both entry directions, cancellation and sequence replacement. Visual state comes from the same conversation model as the renderer.
- Removed 31 unused CSS rules and two unused icons. Base, playground and diagnostics styles are separated. README contains the quick start; prop details live in `API.md`.
- Formatting and unused TypeScript declarations are checked automatically. The renderer and audio algorithms are unchanged.
- 31 unit tests, formatting, TypeScript and production build passed. The actual 22,806-byte archive passed independent installation, Bundler/NodeNext types, Vite build and server rendering. The existing non-failing `use client` bundler warning remains.
- Browser: both entry directions, return to waiting, manual cancellation, sample speech → silence → idle, playback-to-preview stop, log pause/clear/resume, waiting toggle and CSS fallback passed. At 320 px there was no horizontal overflow; state buttons were 40 px high and sequence buttons 44 px. Desktop 1280 px rendering passed. No console warnings/errors were observed.
- Review confirmed that 27 existing source/test files differ only by formatting. The behavioral changes are confined to playground coordination and diagnostic view bookkeeping; the film only drops unused bindings.

## Published baseline

[v0.3.1](https://github.com/dj-thank/voice-wave/releases/tag/v0.3.1), commit `f8a60a4`, passed [Linux CI and Pages deployment](https://github.com/dj-thank/voice-wave/actions/runs/41581281663). The public screen's preview/stop controls worked without console warnings or errors. Its public archive matched the tested archive.

Earlier checks covered sample speech → silence → idle, both overlap directions, waiting-motion off/on, keyboard controls, explicit CSS fallback and 320/390/1280 px browser viewports. The independent package consumer checks Bundler/NodeNext types, Vite build and server rendering. Historical results remain in Git history and Releases.

## Audio and video evidence

[Fixed input fixtures](../public/samples/README.md) cover five speech conditions and three negative conditions. The bundled detector found all five speech conditions, with zero false-lit duration in the three 5-second negative fixtures. These authored samples have no annotated speech boundaries and do not establish general Japanese accuracy.

The [Irodori conversation film](DEMO_VIDEO.md) uses eight generated utterances and separate user/agent stems. The final 39.833-second H.264/AAC file is 1920×1080 at 30 fps: all 1,195 frames contain the Wave, 45 show both colors, and encoded audio correlates .974 with the mixed stems. Independent transcription confirmed the intended readings. Responses and thinking intervals are scripted.

## Not yet verified

- Hosted microphone access could not be completed in the automated browser; local hands-on feedback is separate from hosted/device acceptance.
- Natural Japanese accuracy, acoustic echo, daily noise and microphone-to-screen latency.
- Safari/mobile hardware, GPU/energy measurements and actual WebGL context loss/recovery. Explicit fallback was tested.
- No live LLM conversation, phoneme alignment, semantic turn detection or speaker identification. Overlap indicates simultaneous activity, not interruption intent.
