# Irodori conversation video — 2026-11-03

Eight authored Japanese utterances, two designed voices, about 40 seconds. The film shows the same Wave renderer with separate user and agent captions. The visual surface deliberately contains only the brand, state, Wave and dialogue; implementation details live here.

## Audio and timing

- Model: [Aratako/Irodori-TTS-v4.1-Small](https://huggingface.co/Aratako/Irodori-TTS-v4.1-Small), revision `2b28324dc263ed5e6638b3cf3dd94c82ead07b4b`.
- Runtime: [official Irodori-TTS](https://github.com/Aratako/Irodori-TTS), commit `89f9d8fbd4d51ea019867ee1197725ede1df13c5`. Mac MPS FP32 model, CPU FP32 codec, 32 steps, official watermark enabled. A separate Python environment uses the upstream frozen lockfile.
- Voices are designed from captions, not recordings of the user or other people. Each role's first generated utterance is the reference for its later lines. Exact text, captions and seeds are in `scripts/demo-conversation.json`.
- Master clips: 48 kHz mono. User and agent stems have the same 39.636-second timeline. A 16 kHz mono user stem is supplied for input testing. Do not feed the mixed conversation to input VAD when testing separation.
- Input: the existing bundled Silero v6 and `SpeechGate`. Output: the existing `AgentVoiceController` energy gate. Both channels' PCM levels and bands are computed independently. The resulting 32 ms frames follow the audio playback clock.
- Both entry directions occur: user joins agent, then agent joins user. Replies and thinking gaps are scripted. This is an authored design demo, not evidence of live LLM/TTS latency, microphone capture, speaker identification or interruption intent.

The official hosted Space generated one probe but then refused the next request because of its quota. The delivered eight utterances were all regenerated locally; the hosted probe is not part of the film.

## Rebuild

1. Provision the official runtime in a separate environment with `uv sync --extra cpu --frozen`. Set `UV_PROJECT_ENVIRONMENT` to that environment; preserve other environments/services.
2. From this repository, set `PYTHONPATH` to the official runtime checkout and run `scripts/generate-conversation-local.py` with that environment's Python.
3. With Node 24, run `node scripts/prepare-conversation.mjs`, then `node scripts/video-server.mjs`.
4. Open `http://127.0.0.1:4319/film.html` and choose the export button. The local-only endpoint saves `work/demo-video/capture.webm` (or MP4 in compatible browsers). It is never included in the production build.
5. Convert the capture with FFmpeg to H.264/AAC, yuv420p, 30 fps and `+faststart`. Run `scripts/check-conversation-video.py FINAL.mp4` in the authoring Python environment.

The reusable renderer's optional `onRenderFrame(canvas)` callback provides a synchronous WebGL frame before browser buffer clearing. Recording copies it to a separate canvas. It is unused by the normal playground and has no microphone or audio behavior. It is only called for WebGL, not the CSS fallback.

## Verification

Whisper.cpp multilingual small independently transcribed all eight utterances without a text prompt; the intended readings matched (including ordinary homophone/kanji differences). This is automatic content checking, not a human naturalness score. Encoded-video verification checks every frame for the Wave, sustained two-color overlap and audio correlation against the two mixed source stems. Generation metadata, individual WAV hashes, transcript readback, timeline and final media checks accompany the delivered files.

Production build, existing 28 tests, and an actual package archive's independent consumer type/build/SSR checks pass. Public microphone/noise/mobile acceptance remains as described in `STATUS.md`.
