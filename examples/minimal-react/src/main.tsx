import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation, VoiceWave, type VoiceLayout, type VoiceWaveProps } from '@dj-thank/voice-wave';
import './style.css';

function Example() {
  const [mode, setMode] = useState<NonNullable<VoiceWaveProps['mode']>>('waiting');
  const [level, setLevel] = useState(0.5);
  const [layout, setLayout] = useState<VoiceLayout>('wave');
  const [idleMotion, setIdleMotion] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  return <main>
    <h1>Voice Wave component</h1>
    <p>Manual input example. No microphone, recording, or network audio.</p>
    <div className="preview">
      {layout === 'wave'
        ? <VoiceWave level={level} mode={mode} idleMotion={idleMotion} reducedMotion={reducedMotion}/>
        : <VoiceConversation input={{level, speaking: mode === 'user' || mode === 'overlap'}} output={{level, speaking: mode === 'agent' || mode === 'overlap', thinking: mode === 'thinking'}} layout={layout} idleMotion={idleMotion} reducedMotion={reducedMotion}/>}
    </div>
    <div role="status" aria-live="polite">State: {mode}</div>
    <label>State <select value={mode} onChange={e => setMode(e.target.value as NonNullable<VoiceWaveProps['mode']>)}>
      <option value="waiting">Waiting</option><option value="user">User speaking</option><option value="thinking">Thinking</option><option value="agent">Agent speaking</option><option value="overlap">Both speaking</option>
    </select></label>
    <label>Level <input type="range" min="0" max="1" step="0.01" value={level} onChange={e => setLevel(Number(e.target.value))}/></label>
    <label>Layout (legacy comparison) <select value={layout} onChange={e => setLayout(e.target.value as VoiceLayout)}>
      <option value="wave">Wave only</option><option value="wave-inside">Wave inside</option><option value="wave-outside">Wave outside</option>
    </select></label>
    <label><input type="checkbox" checked={idleMotion} onChange={e => setIdleMotion(e.target.checked)}/> Animate while waiting</label>
    <label><input type="checkbox" checked={reducedMotion} onChange={e => setReducedMotion(e.target.checked)}/> Reduced motion (all states)</label>
    <p>Waiting animation affects only idle movement. Reduced motion overrides it for all states. Both speaking uses one red/blue Wave; the inner/outer layouts are retained compatibility examples.</p>
  </main>;
}
createRoot(document.getElementById('root')!).render(<Example/>);
