# Minimal React consumer

This independent Vite app imports the **packed library**. It does not import repository source, microphone/VAD code, or the demo styles. Inputs are manual and clearly labelled.

Requires Node.js 24. From this directory, after the v0.1.0 GitHub release is available:

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4318/. Choose a state, level and layout. The component needs a parent with an explicit height; it fills its parent. Provide your own visible status text, as this example does.

To test a local checkout before release, run these from the repository root:

```sh
npm ci
npm pack
cd examples/minimal-react
npm install ../../dj-thank-voice-wave-0.1.0.tgz
npm run build
npm run dev
```

`npm run test:package` at the repository root automates packing, installing into an isolated copy of this example, type checking, building, and rendering the exports on the server. The package includes no audio capture; connect your own `0–1` level, optional low/mid/high bands and speaking state.
