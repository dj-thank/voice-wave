# Voice Wave

**Speak in red. Settle into green.** An audio-reactive React UI built from Pipecat Wave, with a browser-local microphone demo and optional LiveKit-derived radial layouts.

[Interactive demo](https://dj-thank.github.io/voice-wave/) · [日本語](README.ja.md) · [Release](https://github.com/dj-thank/voice-wave/releases/tag/v0.1.0) · [Verification status](docs/STATUS.md)

The default is a calm green orb that becomes recording-red during speech. Agent audio uses blue-violet; thinking gently pulses. Motion follows measured audio energy and low/mid/high bands. It does **not** recognize phonemes or words.

![Voice Wave demo](docs/preview.png)

## Try the demo

Open the demo in a browser, choose **マイクを開始** (start microphone), and allow microphone access. **ミュート** releases capture, **再開** starts a new capture session, and **終了** stops it. Microphone use requires HTTPS or localhost. No API key is needed.

- **見た目をプレビュー**: labelled synthetic motion, without microphone access.
- **日本語サンプルで試す**: a bundled Japanese sample through the actual speech detector, with no audible playback.
- **エージェント音声を試す**: plays a bundled sample through the speakers and animates from its real audio.
- Layout comparison: Wave alone, Wave inside a radial visualizer, or Wave outside it. Swap the user/agent assignment without changing the input signals. Wave alone remains the default; composite layouts expose both signals independently. Their colors follow one shared speaking state, while inner/outer position identifies each signal.
- **動きを控えめに**: optional reduced-motion presentation, initially off.

The agent sample is a UI demonstration, not a live AI conversation. In the single-Wave layout, user speech takes visual priority during simultaneous speech. Use headphones when comparing real microphone input with speaker output.

## Use the React component

The first release is distributed as a GitHub Release tarball; it is not published to the npm registry.

```sh
npm install https://github.com/dj-thank/voice-wave/releases/download/v0.1.0/dj-thank-voice-wave-0.1.0.tgz
```

```tsx
import { VoiceWave } from '@dj-thank/voice-wave';

export function SpeakingIndicator() {
  return (
    <VoiceWave
      mode="user"
      level={0.6}
      bands={[0.3, 0.6, 0.2]}
      reducedMotion={false}
      style={{ width: 320, height: 320 }}
    />
  );
}
```

This snippet uses fixed values. In an application, supply your own measured level and bands (each from 0 to 1), and switch `mode` among `waiting`, `user`, `agent`, and `thinking`. The component does not open a microphone, request permission, record audio, or require a Pipecat/LiveKit connection. React is a peer dependency.

For independent input/output, use `VoiceConversation`:

```tsx
import { VoiceConversation } from '@dj-thank/voice-wave';

<VoiceConversation
  input={{ speaking: true, level: 0.6, bands: [0.3, 0.6, 0.2] }}
  output={{ speaking: true, thinking: false, level: 0.4 }}
  layout="wave-inside"
  innerSource="user"
  style={{ width: 360, height: 360 }}
/>
```

`layout` accepts `wave`, `wave-inside`, or `wave-outside`. `innerSource` selects `user` or `agent` for composite layouts. See [the minimal React consumer](examples/minimal-react/) and [layout notes](docs/LAYOUTS.md).

## Run and verify from source

Use Node.js 24 and npm.

```sh
git clone https://github.com/dj-thank/voice-wave.git
cd voice-wave
npm ci
npm run build
npm run dev
```

Open `http://127.0.0.1:4317/`.

```sh
npm test
npm run typecheck
npm run build
npm run test:package
```

The pinned demo dependencies prepare local Silero models, the audio worklet, and ONNX WASM files in `public/vad/`. Browser runtime assets and samples are served from the same origin; they are not fetched from a third-party CDN. The distributable renderer is separate from the demo's speech-detection stack.

## Privacy and diagnostics

Microphone audio is processed in the browser. The app does not upload audio or persist recordings. The hosting service still receives normal web requests for page and asset delivery.

**診断・ログ** is collapsed by default. It keeps up to 900 state/metric entries in browser memory: numeric samples at up to 4 Hz, with state changes logged immediately. **JSONを保存** explicitly downloads them; **クリア** clears them; **ログを記録** pauses collection. Reloading clears the in-memory log. Entries contain state, model, input/output level and band values; they exclude audio samples, device identifiers and transcripts. No analytics service is integrated.

## Limits and provenance

Silero v6 is the demo default, with v5 available for comparison. This choice is not a claim of best Japanese accuracy. The visual activity gate is separate from semantic turn detection; nearby speech or acoustic echo can still trigger it. Natural-speaker accuracy, mobile/Safari devices, end-to-end latency and energy use are not fully measured. See [validation evidence and limits](docs/STATUS.md).

This project contains the actual Pipecat Wave shader (BSD-2-Clause) and an adapted LiveKit radial renderer (Apache-2.0). It is an independent project, not an official Pipecat or LiveKit product. Original code is BSD-2-Clause; bundled dependencies and samples retain their own licenses. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).
