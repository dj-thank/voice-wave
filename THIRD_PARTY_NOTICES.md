# Third-party notices

## Pipecat UI — Audio Visualizer Wave

This demo uses the **actual Pipecat Wave fragment shader**, rather than a visual imitation.

- Upstream: https://github.com/pipecat-ai/pipecat-ui
- Revision: `32b15793b3f210abcff04121f22396634842cead`
- Original file: `packages/registry/src/components/audio-visualizer-wave.tsx`
- Source: https://github.com/pipecat-ai/pipecat-ui/blob/32b15793b3f210abcff04121f22396634842cead/packages/registry/src/components/audio-visualizer-wave.tsx
- Copyright (c) 2024–2026, Daily
- License: BSD-2-Clause. The full original notice, redistribution conditions and disclaimer are included in `public/licenses/pipecat-ui-BSD-2-Clause.txt` and must accompany redistribution.

`src/visualizer/upstream/audio-visualizer-wave.tsx.txt` preserves the source used. The extraction script produces `src/visualizer/pipecat-wave.frag.ts` with 24 ribbons and dithering disabled; the fragment algorithm is unchanged.

Local modifications: standalone native WebGL renderer (no Pipecat client or Motion dependency); explicit speech-active input distinct from track presence; fixed red user speech, green waiting, pulsing green thinking and blue-violet agent playback; measured low/mid/high audio features; smoothed state/volume/color transitions; 30 fps cap; pixel ratio capped at 1.5; reduced-motion rendering; off-screen/background pause; cleanup and visible fallback on WebGL failure. These changes are not an official Pipecat release.

## Silero VAD models

Models supplied through the pinned `@ricky0123/vad-web@0.0.31` package: `silero_vad_v5.onnx` and `silero_vad_v6.onnx`. MIT, Copyright (c) 2020-present Silero Team. Source: https://github.com/snakers4/silero-vad . Full notice: `public/licenses/silero-MIT.txt`. The wrapper's v6 label is not asserted to be upstream v6.2.

## vad-web

Version 0.0.31. ISC, Copyright (c) 2022-present ricky0123. Source: https://github.com/ricky0123/vad . Full notice, including Silero model attribution: `public/licenses/vad-web-ISC-and-Silero.txt`.

## ONNX Runtime Web

Version 1.22.0. MIT, Copyright (c) Microsoft Corporation. Source: https://github.com/microsoft/onnxruntime . Full notice: `public/licenses/onnxruntime-MIT.txt`. Runtime bundles retain their upstream license comments.

## React

React and React DOM 19.3.1. MIT, Copyright (c) Meta Platforms, Inc. and affiliates. Source: https://github.com/facebook/react . The npm package notices are copied to `public/licenses/` for distribution.

## LiveKit Components — Radial visualizer

- Upstream: https://github.com/livekit/components-js
- Revision: `c94f4148d658c1a4219b245ebcfa750fa046a8af`
- Original file: `packages/shadcn/components/agents-ui/agent-audio-visualizer-radial.tsx`
- Source: https://github.com/livekit/components-js/blob/c94f4148d658c1a4219b245ebcfa750fa046a8af/packages/shadcn/components/agents-ui/agent-audio-visualizer-radial.tsx
- Copyright 2023 LiveKit, Inc.
- License: Apache-2.0, preserved in `public/licenses/livekit-components-Apache-2.0.txt`; original NOTICE in `public/licenses/livekit-components-NOTICE.txt`.

`src/visualizer/LiveKitRadial.tsx` adapts the radial angle, dot sizing and speech-height calculations to an independent SVG renderer. Local changes remove SDK hooks and state sequencing, interpolate three measured frequency bands symmetrically, bound response amplitude for the composite layers, apply fixed semantic colors, and support reduced motion. It is a modified derivative, not the unchanged LiveKit component or a LiveKit SDK integration. No endorsement is implied.

## Japanese demonstration audio

`public/samples/voice-check.wav`, `agent-voice.wav`, and `eval-short.wav` were generated with Open JTalk 1.11 and **HTS Voice “NIT ATR503 M001” version 1.05**, released by the HTS Working Group. Voice copyright: 2003–2012 Nagoya Institute of Technology, Department of Computer Science; 2003–2008 Tokyo Institute of Technology, Interdisciplinary Graduate School of Science and Engineering.

The voice and distributed sample derivatives are attributed under Creative Commons Attribution 3.0 Unported. Source and attribution: https://open-jtalk.sourceforge.net/readme_hts_voice_nitech_jp_atr503_m001.php . License: https://creativecommons.org/licenses/by/3.0/ . Original notices: `public/licenses/nitech-voice-CC-BY-3.0.txt`. No endorsement is implied.

The sample text was authored for this project. Changes include synthesis at rate 1.1, leading/trailing silence and conversion to 16 kHz mono PCM16. Text and regeneration instructions are in `public/samples/README.md`. Open JTalk is a Modified-BSD tool used during asset preparation, not distributed in the browser or React runtime. Samples are not a user's recording and are excluded from the renderer-only npm tarball.
