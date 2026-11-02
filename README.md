# Voice Wave

**Speak in red. Settle into green.** An audio-reactive React UI built from Pipecat Wave, with a browser-local microphone demo focused on a single Wave.

[Interactive demo](https://dj-thank.github.io/voice-wave/) · [日本語](README.ja.md) · [Release](https://github.com/dj-thank/voice-wave/releases/tag/v0.2.0) · [Verification status](docs/STATUS.md)

A softly moving mint-green Wave becomes recording-red for your voice and blue/cyan for agent audio. Thinking pulses in the agent color. When both channels are active, red and blue occupy different parts of the same fluid shape, with no inner/outer layers. Motion follows measured audio energy and low/mid/high bands. It does **not** recognize phonemes or words.

![Voice Wave demo](docs/preview.png)

## Try the demo

The playground keeps the visualizer in the main canvas, microphone controls below it, and sample/display controls in the inspector. Open the demo, choose **マイクを開始** (start microphone), and allow microphone access. **ミュート** releases capture and **再開** starts a new capture session. The shared **終了** control stops microphone input, sample playback and synthetic preview; during preparation it becomes **キャンセル**. Microphone use requires HTTPS or localhost. No API key is needed.

The **音声入力** mode responds to a microphone or actual sample audio. **見た目をプレビュー** switches to clearly labelled synthetic input and stops active microphone/sample sessions. Choose **待機** (waiting), **あなた** (user), **思考** (thinking), **エージェント** (agent), or **同時** (overlap; accessible label **同時発話**) to inspect each state without microphone access or audible output.

Under **声を試す**, three sample actions use real bundled audio:

- **あなたの声**: runs a Japanese sample through the speech detector without audible playback. Its accessible label is **日本語サンプルで試す**.
- **エージェントの声**: plays a sample through the speakers and animates from its measured audio. Press it again to stop the output.
- **二人の声を同時に**: starts input analysis and output playback together, using independent signals. This action produces sound.

The playground uses one Wave for all five states. Input and output remain independent; simultaneous activity combines their measured energy and bands with `1 - (1 - input) × (1 - output)`, keeping values within 0–1 without clipping one source away. Numerical details for both signals remain available in diagnostics. Overlap means both signals are active; it does not establish that people are interrupting or understand the meaning of a conversation.

**待機中も動かす** is initially on. Turning it off freezes only the waiting state; speech still responds to audio and thinking still pulses. **動きを控えめに** is initially off and takes priority over that setting, suppressing motion in every state. Expand **詳細設定** for the Silero v6/v5 comparison and **シンプルな描画** (non-WebGL rendering). Stop input before changing the speech detector. The central visualizer stays clear of input meters and microphone-off text; numerical information is available in the collapsed diagnostics below the workspace.

The agent sample is a UI demonstration, not a live AI conversation. Use headphones when comparing real microphone input with speaker output.

## Use the React component

Version 0.2.0 is distributed as a GitHub Release tarball; it is not published to the npm registry.

```sh
npm install https://github.com/dj-thank/voice-wave/releases/download/v0.2.0/dj-thank-voice-wave-0.2.0.tgz
```

```tsx
import { VoiceWave } from '@dj-thank/voice-wave';

export function SpeakingIndicator() {
  return (
    <VoiceWave
      mode="user"
      level={0.6}
      bands={[0.3, 0.6, 0.2]}
      idleMotion={true}
      reducedMotion={false}
      style={{ width: 320, height: 320 }}
    />
  );
}
```

This snippet uses fixed values. In an application, supply your own measured level and bands (each from 0 to 1), and switch `mode` among `waiting`, `user`, `agent`, `thinking`, and `overlap`. The component does not open a microphone, request permission, record audio, or require a Pipecat/LiveKit connection. React is a peer dependency.

For independent input/output, use `VoiceConversation`:

```tsx
import { VoiceConversation } from '@dj-thank/voice-wave';

<VoiceConversation
  input={{ speaking: true, level: 0.6, bands: [0.3, 0.6, 0.2] }}
  output={{ speaking: true, thinking: false, level: 0.4 }}
  layout="wave"
  idleMotion={true}
  style={{ width: 360, height: 360 }}
/>
```

`idleMotion` defaults to `true` on both components. `idleMotion={false}` stops only waiting motion; `reducedMotion={true}` suppresses motion in all states. `VoiceConversation` selects `overlap` when both channels report `speaking: true`; its single Wave combines their level and bands.

The single-Wave layout is the playground's selected design. The published v0.1.0 API also retains experimental `wave-inside` and `wave-outside` layouts, with `innerSource` set to `user` or `agent`, from an earlier visual comparison. These composite layouts are not used in the main demo; they remain available for compatibility with existing consumers. See [the minimal React consumer](examples/minimal-react/) and [layout notes](docs/LAYOUTS.md).

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

Silero v6 is the demo default, with v5 available for comparison. This choice is not a claim of best Japanese accuracy. Agent sample activity is measured from playback energy, with a 180 ms release hold to bridge brief gaps. It is not a second speech-recognition model or proof of a conversational interruption. The input visual activity gate is separate from semantic turn detection; nearby speech or acoustic echo can still trigger it. Natural-speaker accuracy, mobile/Safari devices, end-to-end latency and energy use are not fully measured. See [validation evidence and limits](docs/STATUS.md).

This project contains the actual Pipecat Wave shader (BSD-2-Clause) and an adapted LiveKit radial renderer (Apache-2.0). It is an independent project, not an official Pipecat or LiveKit product. Original code is BSD-2-Clause; bundled dependencies and samples retain their own licenses. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES](THIRD_PARTY_NOTICES.md).
