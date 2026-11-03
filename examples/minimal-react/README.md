# Minimal React consumer

This independent Vite app imports the **packed library**. It does not import repository source, microphone/VAD code, or the demo styles. Inputs are manual and clearly labelled.

Requires Node.js 24. From this directory, after the v0.3.2 GitHub release is available:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4328/. Choose among five states, including **Both speaking** (`overlap`), and adjust the level. In Wave-only mode, **Joining voice (manual)** demonstrates `overlapEntry`: user joining agent, agent joining user, or unknown/simultaneous order. Thinking uses a three-second pulse, and waiting remains gently animated with a rounder outline. **Animate while waiting** is on by default and controls waiting movement only. **Reduced motion (all states)** overrides it. The selected design is one Wave; the legacy inner/outer options remain for API compatibility. The component needs a parent with an explicit height; it fills its parent. Provide your own visible status text, as this example does.

To test a local checkout before release, run these from the repository root:

```sh
npm ci
npm pack
cd examples/minimal-react
npm install ../../dj-thank-voice-wave-0.3.2.tgz
npm run build
npm run dev
```

`npm run test:package` at the repository root automates packing, installing into an isolated copy of this example, type checking, building, and rendering the exports on the server. The package includes no audio capture; connect your own `0–1` level, optional low/mid/high bands and speaking state.

For applications with separate activity flags, `VoiceConversation` automatically follows observed single-speaker → overlap transitions. It latches the joining participant until the overlap ends. Initial or jointly-started activity has unknown order; this is not precision onset measurement or a judgment of interruption intent. The full playground also provides two timed, silent entry-order sequences.
