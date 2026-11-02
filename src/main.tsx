import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation } from './visualizer/VoiceConversation';
import { useMicrophone } from './audio/useMicrophone';
import { useAgentVoice } from './audio/useAgentVoice';
import { Diagnostics } from './diagnostics/Diagnostics';
import './style.css';

type PreviewState = 'waiting' | 'user' | 'thinking' | 'agent';
type IconName = 'mic' | 'stop' | 'mute' | 'play' | 'arrow' | 'external' | 'headphones' | 'layers' | 'lock' | 'chevron' | 'wave';
function Icon({ type, size = 18 }: { type: IconName; size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type === 'mic' && <><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></>}
    {type === 'stop' && <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none"/>}
    {type === 'play' && <path d="m9 5 10 7-10 7z"/>}
    {type === 'mute' && <><path d="m3 3 18 18M9 9v3a3 3 0 0 0 5 2M9 5a3 3 0 0 1 6 0v5M5 10v2a7 7 0 0 0 12 5M19 10v2M12 19v3"/></>}
    {type === 'arrow' && <path d="M5 12h14m-5-5 5 5-5 5"/>}
    {type === 'external' && <><path d="M14 4h6v6m0-6L10 14"/><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/></>}
    {type === 'headphones' && <><path d="M4 14v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="12" width="4" height="8" rx="2"/><rect x="17" y="12" width="4" height="8" rx="2"/></>}
    {type === 'layers' && <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></>}
    {type === 'lock' && <><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></>}
    {type === 'chevron' && <path d="m8 10 4 4 4-4"/>}
    {type === 'wave' && <path d="M3 10v4m4-8v12m5-16v20m5-16v12m4-8v4"/>}
  </svg>;
}

const PREVIEW_STATES: { value: PreviewState; label: string }[] = [
  { value: 'waiting', label: '待機' }, { value: 'user', label: 'あなた' },
  { value: 'thinking', label: '思考' }, { value: 'agent', label: 'エージェント' },
];
function App() {
  const [vadModel, setVadModel] = useState<'v5' | 'v6'>('v6');
  const mic = useMicrophone(vadModel);
  const agentVoice = useAgentVoice();
  const [preview, setPreview] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>('user');
  const [previewLevel, setPreviewLevel] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [simpleRenderer, setSimpleRenderer] = useState(false);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [sampleFinished, setSampleFinished] = useState(false);
  const [observations, setObservations] = useState({ speech: false, silence: false });

  useEffect(() => {
    if (!preview || previewState === 'waiting' || previewState === 'thinking') { setPreviewLevel(0); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setPreviewLevel(0.25 + 0.3 * Math.abs(Math.sin(t * 5.5)) + 0.18 * Math.abs(Math.sin(t * 12)));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [preview, previewState]);
  useEffect(() => {
    if (mic.source === 'sample' && mic.speaking) setObservations(old => ({ ...old, speech: true }));
    if (mic.source === 'sample' && mic.status === 'listening') setObservations(old => ({ ...old, silence: old.speech || old.silence }));
    if (mic.status === 'idle' && observations.speech) setSampleFinished(true);
  }, [mic.status, mic.source, mic.speaking, observations.speech]);

  const resetSample = () => { setSampleFinished(false); setObservations({ speech: false, silence: false }); };
  const startMic = () => { setPreview(false); resetSample(); void mic.start(); };
  const startSample = () => { setPreview(false); resetSample(); void mic.startSample(`${import.meta.env.BASE_URL}samples/voice-check.wav`); };
  const startBothSamples = () => { startSample(); void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`); };
  const selectPreview = (enabled: boolean) => {
    if (enabled === preview) return;
    void mic.stop(); void agentVoice.stop(); resetSample(); setPreview(enabled);
  };
  const toggleAgent = () => {
    setPreview(false);
    if (agentVoice.status === 'idle') void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`);
    else void agentVoice.stop();
  };
  const stop = () => { setPreview(false); void mic.stop(); void agentVoice.stop(); };
  const running = ['loading', 'listening', 'speaking', 'muted'].includes(mic.status);
  const loading = mic.status === 'loading';
  const sample = mic.source === 'sample';
  const agentActive = agentVoice.status !== 'idle';
  const anythingActive = running || agentActive || preview;
  const talking = preview ? previewState === 'user' : mic.speaking;
  const agentTalking = preview ? previewState === 'agent' : agentVoice.status === 'speaking';
  const thinking = preview ? previewState === 'thinking' : agentVoice.status === 'thinking';
  const mode = talking ? 'user' : thinking ? 'thinking' : agentTalking ? 'agent' : 'waiting';
  const previewBands: [number, number, number] = [previewLevel * .8, previewLevel, previewLevel * .6];
  const status = preview ? `${PREVIEW_STATES.find(item => item.value === previewState)!.label}のプレビュー（模擬）`
    : loading ? '音声の準備中'
    : mic.status === 'speaking' ? (sample ? 'サンプルの発話を検出' : 'あなたの声を検出')
    : thinking ? 'エージェントが考えています（デモ）'
    : agentTalking ? 'エージェント音声を再生中（サンプル）'
    : mic.status === 'muted' ? 'ミュート中'
    : mic.status === 'listening' ? (sample ? 'サンプルの無音を検出' : 'あなたの声を待っています')
    : mic.status === 'error' ? 'マイクを確認してください' : 'マイクはオフです';
  const stageBadge = preview ? '模擬プレビュー' : sample ? 'サンプル解析' : loading ? '準備中' : mic.status === 'muted' ? 'ミュート' : running ? 'マイク接続中' : agentActive ? 'サンプル再生' : 'READY';
  const dockNote = preview ? '状態を選んで動きを確認できます。音声は使いません。'
    : loading ? (sample ? '音声判定を準備しています。初回は少し時間がかかります。' : 'ブラウザのマイク許可を確認してください。初回は準備に時間がかかります。')
    : sample ? '日本語サンプルを解析しています。マイクは使用していません。'
    : mic.status === 'muted' ? 'マイクはミュート中です。再開すると新しく接続します。'
    : running ? '話すと赤く、黙ると緑へ。声の強さや響きに反応します。'
    : agentActive ? 'エージェントのサンプル音声です。実際のAI会話ではありません。'
    : 'マイクを開始して、ひと声どうぞ。';

  return <div className="app" data-mode={mode}>
    <header className="app-header">
      <a href={import.meta.env.BASE_URL} className="brand" aria-label="Voice Wave ホーム"><span className="brand-icon"><Icon type="wave" size={20}/></span><span>Voice Wave</span><span className="brand-version">0.1</span></a>
      <nav className="header-nav" aria-label="メインナビゲーション"><span className="nav-current">Playground</span><a href="https://github.com/dj-thank/voice-wave/blob/main/README.ja.md" target="_blank" rel="noreferrer">ガイド<Icon type="external" size={13}/></a><a href="https://github.com/dj-thank/voice-wave" target="_blank" rel="noreferrer">GitHub<Icon type="external" size={13}/></a></nav>
    </header>

    <main className="page">
      <div className="page-heading"><div><div className="breadcrumb">PLAYGROUND <span>/</span> AUDIO VISUALIZER</div><h1>声を、かたちに。</h1><p>話す、聴く。その瞬間を、ひとつのWaveに。</p></div><div className="privacy-note"><Icon type="lock" size={14}/><span>音声はブラウザ内で処理<br/><strong>録音・アップロードなし</strong></span></div></div>

      <div className="workspace">
        <section className="preview-panel" aria-label="音声に反応するWaveデモ">
          <div className="preview-toolbar"><div className="mode-switch" role="group" aria-label="操作モード"><button aria-pressed={!preview} onClick={() => selectPreview(false)}><Icon type="mic" size={15}/>音声入力</button><button aria-pressed={preview} onClick={() => selectPreview(true)}><Icon type="play" size={15}/>見た目をプレビュー</button></div><span className={`session-badge ${anythingActive ? 'is-active' : ''}`}><i/>{stageBadge}</span></div>
          <div className={`stage-view ${preview ? 'has-preview' : ''}`}>
            <div className="orb-wrap"><VoiceConversation input={{level:preview ? (talking ? previewLevel : 0) : mic.level,speaking:talking,bands:preview ? previewBands : mic.bands}} output={{level:preview ? (agentTalking ? previewLevel : 0) : agentVoice.level,speaking:agentTalking,thinking,bands:preview ? previewBands : agentVoice.bands}} layout="wave" renderer={simpleRenderer ? 'fallback' : 'auto'} reducedMotion={reduceMotion} onError={setRendererError}/></div>
            <span className="sr-only" role="status" aria-live="polite">{status}</span>
            {preview ? <div className="preview-state-buttons" role="group" aria-label="プレビュー状態">{PREVIEW_STATES.map(item => <button key={item.value} aria-pressed={previewState === item.value} data-state={item.value} onClick={() => setPreviewState(item.value)}><i/>{item.label}</button>)}</div>
              : <div className="participant-key" aria-label="入出力の状態"><span data-active={talking}><i className="user-dot"/>あなた{talking && <span className="activity-mark" aria-label="発話中">•••</span>}</span><span data-active={agentActive}><i className="agent-dot"/>エージェント{agentActive && <span className="activity-mark" aria-label={thinking ? '思考中' : '再生中'}>{thinking ? '…' : '•••'}</span>}</span></div>}
          </div>
          <div className="call-dock">
            <div className="call-actions">
              {!running ? <button className="mic-button" onClick={startMic}><Icon type="mic"/>マイクを開始</button>
                : <button className={`mic-button ${mic.status === 'muted' ? 'is-muted' : 'is-connected'}`} disabled={loading || sample} onClick={() => void mic.toggleMute()}><Icon type={mic.status === 'muted' ? 'mic' : 'mute'}/>{loading ? '準備中' : sample ? 'サンプル解析中' : mic.status === 'muted' ? '再開' : 'ミュート'}</button>}
              <button className="end-button" disabled={!anythingActive} onClick={stop} aria-label={loading ? 'キャンセル' : 'すべて停止'} title={loading ? '準備をキャンセル' : 'すべての入力・再生を停止'}><Icon type="stop" size={15}/><span>{loading ? 'キャンセル' : '終了'}</span></button>
            </div>
            <p className="dock-note">{dockNote}</p>
          </div>
          {(mic.error || agentVoice.error || rendererError) && <div className="notice-area">{mic.error && <p className="error-notice" role="alert">{mic.error}</p>}{agentVoice.error && <p className="error-notice" role="alert">{agentVoice.error}</p>}{rendererError && <p className="fallback-notice" role="alert">シンプルな表示に切り替えています。{rendererError}</p>}</div>}
        </section>

        <aside className="inspector" aria-label="サンプルと表示設定">
          <section className="inspector-section sample-section"><div className="section-heading"><h2>声を試す</h2><span>DEMO</span></div><p className="section-description">マイクがなくても、音声への反応を。</p>
            <div className="sample-actions">
              <button className="sample-action" aria-label="日本語サンプルで試す" disabled={loading || sample} data-active={sample} onClick={startSample}><span className="action-icon"><Icon type="wave"/></span><span className="action-copy"><strong>{sample ? 'サンプルを解析中' : 'あなたの声'}</strong><small>日本語の発話を検出</small></span><span className="sound-label">無音</span><Icon type="play" size={14}/></button>
              <button className="sample-action" aria-label={agentActive ? 'エージェント音声を止める' : 'エージェント音声を試す'} data-active={agentActive} onClick={toggleAgent}><span className="action-icon"><Icon type="headphones"/></span><span className="action-copy"><strong>{agentActive ? 'エージェントを停止' : 'エージェントの声'}</strong><small>{thinking && !preview ? '応答を準備中' : '音声と動きを合わせる'}</small></span><span className="sound-label">音あり</span><Icon type={agentActive ? 'stop' : 'play'} size={14}/></button>
              <button className="sample-action" aria-label="二人の声を同時に試す" disabled={running || agentActive} onClick={startBothSamples}><span className="action-icon"><Icon type="layers"/></span><span className="action-copy"><strong>二人の声を同時に</strong><small>入力と出力を同時に</small></span><span className="sound-label">音あり</span><Icon type="play" size={14}/></button>
            </div>
            {sampleFinished && <p className="sample-feedback" role="status"><span>✓</span>{observations.speech ? '発話を検出' : '発話未検出'}{observations.silence ? ' → 無音に復帰' : ''}</p>}
          </section>

          <section className="inspector-section appearance-section"><div className="section-heading"><h2>表示設定</h2><span>APPEARANCE</span></div>
            <label className="switch-row"><span>動きを控えめに</span><input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label>
          </section>

          <details className="advanced-settings"><summary><span>詳細設定</span><Icon type="chevron" size={16}/></summary><div className="advanced-body"><label className="select-row"><span>音声検出モデル</span><select aria-label="音声検出モデル" value={vadModel} disabled={running} onChange={e => {setVadModel(e.target.value as 'v5'|'v6'); resetSample();}}><option value="v6">Silero v6</option><option value="v5">Silero v5</option></select></label><p>入力を停止すると切り替えられます。精度の優劣を示すものではありません。</p><label className="switch-row"><span>シンプルな描画</span><input aria-label="シンプルな描画を使う" type="checkbox" checked={simpleRenderer} onChange={e => setSimpleRenderer(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label><p>描画が重い環境では、軽い表示へ切り替えられます。</p></div></details>
          <p className="demo-disclaimer">サンプルは表示を試すための音声です。<br/>AI会話サービスには接続していません。</p>
        </aside>
      </div>

      <Diagnostics snapshot={{mode,model:vadModel,micStatus:mic.status,source:preview?'preview':mic.source,inputLevel:mic.level,probability:mic.probability,inputBands:mic.bands,agentStatus:agentVoice.status,outputLevel:agentVoice.level,outputBands:agentVoice.bands}} status={status} sampleResult={sampleFinished ? `サンプル確認：${observations.speech?'発話を検出':'発話未検出'}${observations.silence?' → 無音に復帰':''}` : null}/>
      <footer className="page-footer"><span>Built for voice. Open to everyone.</span><div><a href="https://ui.pipecat.ai/docs/visualizers/audio-visualizer-wave" target="_blank" rel="noreferrer">Pipecat Wave<Icon type="external" size={12}/></a><a href="https://github.com/dj-thank/voice-wave/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Licenses<Icon type="external" size={12}/></a></div></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
