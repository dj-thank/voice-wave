# React API

The package exports `VoiceWave` and `VoiceConversation`. Both render without acquiring audio or connecting to a service. Give them a sized container or a `style` with width and height.

## VoiceWave

```tsx
<VoiceWave mode="user" level={0.6} bands={[0.3, 0.6, 0.2]} />
```

| Prop           | Default        | Meaning                                             |
| -------------- | -------------- | --------------------------------------------------- |
| `level`        | Required       | Audio energy, 0–1                                   |
| `mode`         | From `active`  | `waiting`, `user`, `agent`, `thinking` or `overlap` |
| `active`       | From `mode`    | Audio activity, independent of the selected palette |
| `bands`        | From `level`   | Low/mid/high energy, each 0–1                       |
| `overlapEntry` | `simultaneous` | Joining voice: `user`, `agent`, or unknown order    |

Red enters blue from the left; blue enters red from the right. Entry takes about 850 ms. Reduced motion skips the sweep. Colors are fixed by state; legacy `color` and `accentColor` props are accepted but ignored.

## VoiceConversation

```tsx
<VoiceConversation
  input={{ speaking: true, level: 0.6 }}
  output={{ speaking: true, level: 0.4, thinking: false }}
/>
```

Each channel accepts `speaking`, `level`, optional `bands` and optional `thinking` (output only). The component derives the visual state and tracks which voice joined. Simultaneous starts use neutral red/blue. When one stops, the remaining voice takes over.

Both active channels contribute to the level and bands through `1 - (1 - a) * (1 - b)`. This is a visual envelope, not an audio mix or a judgment of interruption intent.

`layout` defaults to `wave`. Legacy composite layouts and `innerSource` remain compatible; see [layout notes](LAYOUTS.md).

## Shared props

| Prop                 | Default | Meaning                                                                     |
| -------------------- | ------- | --------------------------------------------------------------------------- |
| `idleMotion`         | `true`  | Animate waiting; speech and thinking still animate when false               |
| `reducedMotion`      | `false` | Reduce motion in every state; takes precedence over `idleMotion`            |
| `renderer`           | `auto`  | WebGL with fallback, or explicit `fallback`                                 |
| `className`, `style` | —       | Container presentation                                                      |
| `onError`            | —       | Error message, or `null` after successful WebGL preparation/recovery        |
| `onRenderFrame`      | —       | Synchronous WebGL canvas callback for recording; not called by CSS fallback |

Exports also include `VoiceWaveProps`, `VoiceConversationProps`, `VoiceChannel`, `VoiceLayout`, `VoiceSource` and `OverlapEntry`. The [minimal consumer](../examples/minimal-react/) demonstrates installation from a release archive.
