import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation, VoiceWave, type VoiceLayout, type VoiceWaveProps } from '@dj-thank/voice-wave';
import './style.css';

function Example() {
  const [mode, setMode] = useState<NonNullable<VoiceWaveProps['mode']>>('waiting');
  const [level, setLevel] = useState(0.5);
  const [layout, setLayout] = useState<VoiceLayout>('wave');
  const [reducedMotion, setReducedMotion] = useState(false);
  return <main>
    <h1>Voice Wave component</h1>
    <p>Manual input example. No microphone, recording, or network audio.</p>
    <div className="preview">
      {layout === 'wave'
        ? <VoiceWave level={level} mode={mode} reducedMotion={reducedMotion}/>
        : <VoiceConversation input={{level, speaking: mode === 'user'}} output={{level, speaking: mode === 'agent', thinking: mode === 'thinking'}} layout={layout} reducedMotion={reducedMotion}/>}
    </div>
    <div role="status" aria-live="polite">State: {mode}</div>
    <label>State <select value={mode} onChange={e => setMode(e.target.value as NonNullable<VoiceWaveProps['mode']>)}>
      <option value="waiting">Waiting</option><option value="user">User speaking</option><option value="thinking">Thinking</option><option value="agent">Agent speaking</option>
    </select></label>
    <label>Level <input type="range" min="0" max="1" step="0.01" value={level} onChange={e => setLevel(Number(e.target.value))}/></label>
    <label>Layout <select value={layout} onChange={e => setLayout(e.target.value as VoiceLayout)}>
      <option value="wave">Wave only</option><option value="wave-inside">Wave inside</option><option value="wave-outside">Wave outside</option>
    </select></label>
    <label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/> Reduced motion</label>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Example/>);
