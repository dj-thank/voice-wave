import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation } from './visualizer/VoiceConversation';
import { useMicrophone } from './audio/useMicrophone';
import { useAgentVoice } from './audio/useAgentVoice';
import { Diagnostics } from './diagnostics/Diagnostics';
import './style.css';

function Icon({ type }: { type: 'mic' | 'stop' | 'mute' | 'play' | 'arrow' }) {
  return <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'mic' && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>}
    {type === 'stop' && <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>}
    {type === 'play' && <path d="m9 5 10 7-10 7z"/>}
    {type === 'mute' && <><path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v5M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3"/></>}
    {type === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5"/>}
  </svg>;
}
function App() {
  const [vadModel, setVadModel] = useState<'v5' | 'v6'>('v6');
  const mic = useMicrophone(vadModel);
  const agentVoice = useAgentVoice();
  const [preview, setPreview] = useState(false);
  const [previewLevel, setPreviewLevel] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [layout, setLayout] = useState<'wave' | 'wave-inside' | 'wave-outside'>('wave');
  const [innerSource, setInnerSource] = useState<'user' | 'agent'>('user');
  const [simpleRenderer, setSimpleRenderer] = useState(false);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [sampleFinished, setSampleFinished] = useState(false);
  const [observations, setObservations] = useState({ speech: false, silence: false });
  useEffect(() => {
    if (!preview) { setPreviewLevel(0); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      const talking = t % 7 < 3.7;
      setPreviewLevel(talking ? 0.3 + 0.34 * Math.abs(Math.sin(t * 5.5)) + 0.18 * Math.abs(Math.sin(t * 12)) : 0);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [preview]);
  useEffect(() => {
    if (mic.source === 'sample' && mic.speaking) setObservations(old => ({ ...old, speech: true }));
    if (mic.source === 'sample' && mic.status === 'listening') setObservations(old => ({ ...old, silence: old.speech || old.silence }));
    if (mic.status === 'idle' && observations.speech) setSampleFinished(true);
  }, [mic.status, mic.source, mic.speaking, observations.speech]);
  const startMic = () => { setPreview(false); setSampleFinished(false); setObservations({ speech: false, silence: false }); void mic.start(); };
  const startSample = () => { setPreview(false); setSampleFinished(false); setObservations({ speech: false, silence: false }); void mic.startSample(`${import.meta.env.BASE_URL}samples/voice-check.wav`); };
  const startBothSamples = () => { startSample(); void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`); };
  const togglePreview = () => { void mic.stop(); setSampleFinished(false); setObservations({ speech: false, silence: false }); setPreview(p => !p); };
  const stop = () => { setPreview(false); void mic.stop(); void agentVoice.stop(); };
  const talking = preview ? previewLevel > 0 : mic.speaking;
  const mode = talking ? 'user' : agentVoice.status === 'thinking' ? 'thinking' : agentVoice.status === 'speaking' ? 'agent' : 'waiting';
  const level = preview ? previewLevel : mode === 'agent' ? agentVoice.level : mic.level;
  const running = ['loading', 'listening', 'speaking', 'muted'].includes(mic.status);
  const loading = mic.status === 'loading';
  const sample = mic.source === 'sample';
  const status = preview ? (talking ? '発話のプレビュー' : '無音のプレビュー')
    : loading ? '音声の準備中'
    : mic.status === 'speaking' ? (sample ? 'サンプルの発話を検出' : 'あなたの声を検出')
    : agentVoice.status === 'thinking' ? 'エージェントが考えています（デモ）'
    : agentVoice.status === 'speaking' ? 'エージェント音声を再生中（サンプル）'
    : mic.status === 'muted' ? 'ミュート中'
    : mic.status === 'listening' ? (sample ? 'サンプルの無音を検出' : 'あなたの声を待っています')
    : mic.status === 'error' ? 'マイクを確認してください' : 'マイクはオフです';
  return <div className={`app ${talking ? 'is-speaking' : ''}`}>
    <header className="topbar">
      <a href={import.meta.env.BASE_URL} className="brand" aria-label="Voice Wave ホーム"><span className="brand-mark"><i/><i/><i/></span>voice<span>wave</span><sup>LAB</sup></a>
      <div className="local-badge"><span/>ブラウザ内で完結</div>
    </header>
    <main>
      <div className="intro"><div><p className="eyebrow">A STUDY IN VOICE & MOTION</p><h1>声を、かたちに。</h1></div><p className="intro-copy">話すと赤く、黙ると穏やかに。<br/>あなたの声と呼吸する、Wave。</p></div>
      <section className="studio" aria-label="音声に反応するWaveデモ">
        <div className="stage">
          <div className="orb-wrap"><VoiceConversation input={{level:preview ? previewLevel : mic.level,speaking:talking,bands:preview ? [level*.8,level,level*.6] : mic.bands}} output={{level:agentVoice.level,speaking:agentVoice.status === 'speaking',thinking:agentVoice.status === 'thinking',bands:agentVoice.bands}} layout={layout} innerSource={innerSource} renderer={simpleRenderer ? 'fallback' : 'auto'} reducedMotion={reduceMotion} onError={setRendererError}/></div>
          <span className="sr-only" role="status" aria-live="polite">{status}</span>
          {rendererError && <p className="render-error" role="alert">この環境では静止画で表示しています。{rendererError}</p>}
        </div>
        <aside className="controls">
          <p className="eyebrow">MAKE IT YOURS</p><h2>ひと声、どうぞ。</h2>
          <p className="help">マイクを開始して話しかけてください。<br/>声を検出すると、Waveが赤く応えます。</p>
          {(preview || sample || mode === 'agent' || mode === 'thinking') && <p className="demo-indicator">{preview ? '模擬プレビュー' : sample ? 'サンプル解析 · マイク未使用' : mode === 'thinking' ? 'エージェントの思考デモ' : 'エージェントのサンプル音声'}</p>}
          <div className="primary-controls">
            {!running ? <button className="primary" onClick={startMic}><Icon type="mic"/>マイクを開始<Icon type="arrow"/></button>
              : <div className="active-actions"><button className="primary stop" onClick={stop}><Icon type="stop"/>{loading ? 'キャンセル' : '終了'}</button><button className="secondary mute" disabled={loading || sample} onClick={() => void mic.toggleMute()}><Icon type={mic.status === 'muted' ? 'mic' : 'mute'}/>{mic.status === 'muted' ? '再開' : 'ミュート'}</button></div>}
            <p className="control-note">{loading ? (sample ? '初回は音声判定の準備に時間がかかります。' : 'マイクの許可を確認してください。初回は音声判定の準備にも時間がかかります。') : '音声はこのブラウザ内で処理します。録音・送信なし。'}</p>
          </div>
          {mic.error && <div className="error" role="alert">{mic.error}</div>}
          <div className="state-key" aria-label="入出力の状態"><span data-active={mode === 'waiting'}><i className="green"/>待機</span><span data-active={talking}><i className="red"/>{talking ? '● あなた' : 'あなた'}</span><span data-active={agentVoice.status !== 'idle'}><i className="blue"/>{agentVoice.status === 'speaking' ? '▶ エージェント' : agentVoice.status === 'thinking' ? '… エージェント' : 'エージェント'}</span></div>
          <label className="motion-option"><span>動きを控えめに</span><input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)}/><span className="switch"/></label>
          <div className="try-options"><button className="text-button" onClick={togglePreview}><Icon type="play"/>{preview ? 'プレビューを止める' : '見た目をプレビュー'}<span>模擬</span></button><button className="text-button" onClick={startSample} disabled={loading || sample}><Icon type="play"/>日本語サンプルで試す<span>解析</span></button><button className="text-button" onClick={() => {setPreview(false); agentVoice.status === 'idle' ? void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`) : void agentVoice.stop();}}><Icon type={agentVoice.status === 'idle' ? 'play' : 'stop'}/>{agentVoice.status === 'idle' ? 'エージェント音声を試す' : 'エージェント音声を止める'}<span>音が出ます</span></button><p>日本語サンプルは無音で解析。<br/>エージェントのサンプルは音声を再生します。</p></div>
          {agentVoice.error && <p className="error" role="alert">{agentVoice.error}</p>}
          <details className="model-options layout-options"><summary>内側・外側の配置を比較</summary><label>表示<select aria-label="Waveの配置" value={layout} onChange={e => setLayout(e.target.value as typeof layout)}><option value="wave">Wave単体（標準）</option><option value="wave-inside">内側Wave・外側Radial</option><option value="wave-outside">内側Radial・外側Wave</option></select></label>{layout !== 'wave' && <label>内側の声<select aria-label="内側に表示する声" value={innerSource} onChange={e => setInnerSource(e.target.value as typeof innerSource)}><option value="user">あなた</option><option value="agent">エージェント</option></select></label>}<p>{layout === 'wave' ? '重なって話すときは、あなたの声を優先。右の状態表示は両方の声を示します。' : `内側：${innerSource === 'user' ? 'あなた' : 'エージェント'} ／ 外側：${innerSource === 'user' ? 'エージェント' : 'あなた'}。色は発話に合わせて揃え、内外の位置で声を区別します。`}</p><button className="text-button" disabled={running || agentVoice.status !== 'idle'} onClick={startBothSamples}><Icon type="play"/>二人の声を同時に試す<span>音が出ます</span></button><p>入力サンプルと出力サンプルを別々に解析します。実際のAI会話ではありません。</p></details>
          <details className="model-options"><summary>音声判定を比較</summary><label>Sileroモデル<select aria-label="音声検出モデル" value={vadModel} disabled={running} onChange={e => { setVadModel(e.target.value as 'v5'|'v6'); setSampleFinished(false); setObservations({speech:false,silence:false}); }}><option value="v6">v6（公式推奨）</option><option value="v5">v5（比較用）</option></select></label><p>同じ声で比較できます。全体的な精度の順位は、まだ検証していません。</p></details>
          <details className="model-options"><summary>表示の互換性</summary><label>シンプルな描画を使う<input type="checkbox" checked={simpleRenderer} onChange={e => setSimpleRenderer(e.target.checked)}/></label><p>描画が重い環境では、色で応えるシンプルな表示を選べます。</p></details>
        </aside>
      </section>
      <Diagnostics snapshot={{mode,model:vadModel,micStatus:mic.status,source:preview?'preview':mic.source,inputLevel:mic.level,probability:mic.probability,inputBands:mic.bands,agentStatus:agentVoice.status,outputLevel:agentVoice.level,outputBands:agentVoice.bands}} status={status} sampleResult={sampleFinished ? `サンプル確認：${observations.speech?'発話を検出':'発話未検出'}${observations.silence?' → 無音に復帰':''}` : null}/>
      <footer><span>VOICE WAVE <span className="muted">/ OPEN VOICE UI 0.1</span></span><span><a href="https://github.com/dj-thank/voice-wave" target="_blank" rel="noreferrer">GitHub ↗</a><span className="footer-sep">·</span><a href="https://github.com/dj-thank/voice-wave/blob/main/README.ja.md" target="_blank" rel="noreferrer">使い方・ライセンス ↗</a><span className="footer-sep">·</span><a href="https://ui.pipecat.ai/docs/visualizers/audio-visualizer-wave" target="_blank" rel="noreferrer">Pipecat Wave ↗</a></span></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
