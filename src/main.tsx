import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation } from './visualizer/VoiceConversation';
import { useOverlapEntry } from './visualizer/useOverlapEntry';
import { useMicrophone } from './audio/useMicrophone';
import { useAgentVoice } from './audio/useAgentVoice';
import { Diagnostics } from './diagnostics/Diagnostics';
import './style.css';

type PreviewState = 'waiting' | 'user' | 'thinking' | 'agent' | 'overlap';
type SequenceEntry = 'user' | 'agent';
type SequencePhase = 'first' | 'overlap' | 'last' | 'complete';
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

const PREVIEW_STATES: { value: PreviewState; label: string; accessibleLabel?: string }[] = [
  { value: 'waiting', label: '待機' }, { value: 'user', label: 'あなた' },
  { value: 'agent', label: 'エージェント' }, { value: 'overlap', label: '同時', accessibleLabel: '同時発話' },
  { value: 'thinking', label: '思考' },
];
function App() {
  const [vadModel, setVadModel] = useState<'v5' | 'v6'>('v6');
  const mic = useMicrophone(vadModel);
  const agentVoice = useAgentVoice();
  const [preview, setPreview] = useState(false);
  const [previewState, setPreviewState] = useState<PreviewState>('user');
  const [previewLevel, setPreviewLevel] = useState(0);
  const [previewAgentLevel, setPreviewAgentLevel] = useState(0);
  const [previewSequence, setPreviewSequence] = useState<{ entry: SequenceEntry; phase: SequencePhase } | null>(null);
  const sequenceClock = useRef<{ generation: number; timers: ReturnType<typeof setTimeout>[] }>({ generation: 0, timers: [] });
  const stageRef = useRef<HTMLDivElement>(null);
  const [idleMotion, setIdleMotion] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [simpleRenderer, setSimpleRenderer] = useState(false);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const [sampleFinished, setSampleFinished] = useState(false);
  const [observations, setObservations] = useState({ speech: false, silence: false });

  useEffect(() => () => {
    sequenceClock.current.generation++;
    sequenceClock.current.timers.forEach(clearTimeout);
    sequenceClock.current.timers = [];
  }, []);
  useEffect(() => {
    if (!preview || previewState === 'waiting' || previewState === 'thinking') { setPreviewLevel(0); setPreviewAgentLevel(0); return; }
    let frame = 0; const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      setPreviewLevel(0.25 + 0.3 * Math.abs(Math.sin(t * 5.5)) + 0.18 * Math.abs(Math.sin(t * 12)));
      setPreviewAgentLevel(0.22 + 0.28 * Math.abs(Math.sin(t * 3.6 + .7)) + 0.16 * Math.abs(Math.sin(t * 8.2)));
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

  const cancelSequence = () => {
    sequenceClock.current.generation++;
    sequenceClock.current.timers.forEach(clearTimeout);
    sequenceClock.current.timers = [];
    setPreviewSequence(null);
  };
  const resetSample = () => { setSampleFinished(false); setObservations({ speech: false, silence: false }); };
  const startMic = () => { cancelSequence(); setPreview(false); resetSample(); void mic.start(); };
  const startSample = () => { cancelSequence(); setPreview(false); resetSample(); void mic.startSample(`${import.meta.env.BASE_URL}samples/voice-check.wav`); };
  const startBothSamples = () => { startSample(); void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`); };
  const selectPreview = (enabled: boolean) => {
    cancelSequence();
    if (enabled === preview) return;
    void mic.stop(); void agentVoice.stop(); resetSample(); setPreview(enabled);
  };
  const toggleAgent = () => {
    cancelSequence();
    setPreview(false);
    if (agentVoice.status === 'idle') void agentVoice.start(`${import.meta.env.BASE_URL}samples/agent-voice.wav`);
    else void agentVoice.stop();
  };
  const stop = () => { cancelSequence(); setPreview(false); void mic.stop(); void agentVoice.stop(); };
  const selectPreviewState = (state: PreviewState) => { cancelSequence(); setPreviewState(state); };
  const startSequence = (entry: SequenceEntry) => {
    cancelSequence();
    void mic.stop(); void agentVoice.stop(); resetSample(); setPreview(true);
    setPreviewState(entry === 'user' ? 'agent' : 'user');
    setPreviewSequence({ entry, phase: 'first' });
    const generation = sequenceClock.current.generation;
    const schedule = (delay: number, phase: SequencePhase, state: PreviewState) => {
      sequenceClock.current.timers.push(setTimeout(() => {
        if (sequenceClock.current.generation !== generation) return;
        setPreviewState(state); setPreviewSequence({ entry, phase });
      }, delay));
    };
    schedule(1800, 'overlap', 'overlap');
    schedule(4000, 'last', entry);
    schedule(5800, 'complete', 'waiting');
    if (window.matchMedia('(max-width: 760px)').matches) {
      const quietScroll = reduceMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      stageRef.current?.scrollIntoView({ block: 'center', behavior: quietScroll ? 'instant' : 'smooth' });
    }
  };
  const running = ['loading', 'listening', 'speaking', 'muted'].includes(mic.status);
  const loading = mic.status === 'loading';
  const sample = mic.source === 'sample';
  const agentActive = agentVoice.status !== 'idle';
  const anythingActive = running || agentActive || preview;
  const talking = preview ? previewState === 'user' || previewState === 'overlap' : mic.speaking;
  const agentTalking = preview ? previewState === 'agent' || previewState === 'overlap' : agentVoice.audible;
  const thinking = preview ? previewState === 'thinking' : agentVoice.status === 'thinking';
  const overlapping = talking && agentTalking;
  const overlapEntry = useOverlapEntry(talking, agentTalking);
  const overlapDescription = overlapEntry === 'user' ? 'エージェントの声にあなたの声が重なっています'
    : overlapEntry === 'agent' ? 'あなたの声にエージェントの声が重なっています'
    : 'あなたとエージェントが同時に発話中';
  const mode = overlapping ? 'overlap' : talking ? 'user' : agentTalking ? 'agent' : thinking ? 'thinking' : 'waiting';
  const previewBands: [number, number, number] = [previewLevel * .8, previewLevel, previewLevel * .6];
  const previewAgentBands: [number, number, number] = [previewAgentLevel * .55, previewAgentLevel * .8, previewAgentLevel];
  const status = preview ? (overlapping ? `${overlapDescription}（模擬）` : `${PREVIEW_STATES.find(item => item.value === previewState)!.accessibleLabel ?? PREVIEW_STATES.find(item => item.value === previewState)!.label}のプレビュー（模擬）`)
    : loading ? '音声の準備中'
    : overlapping ? `${overlapDescription}${sample ? '（サンプル）' : ''}`
    : mic.status === 'speaking' ? (sample ? 'サンプルの発話を検出' : 'あなたの声を検出')
    : thinking ? 'エージェントが考えています（デモ）'
    : agentTalking ? 'エージェント音声を再生中（サンプル）'
    : agentActive ? 'エージェントのサンプルを再生中（無音区間）'
    : mic.status === 'muted' ? 'ミュート中'
    : mic.status === 'listening' ? (sample ? 'サンプルの無音を検出' : 'あなたの声を待っています')
    : mic.status === 'error' ? 'マイクを確認してください' : 'マイクはオフです';
  const stageBadge = preview ? '模擬プレビュー' : overlapping ? '同時発話' : sample ? 'サンプル解析' : loading ? '準備中' : mic.status === 'muted' ? 'ミュート' : running ? 'マイク接続中' : agentActive ? 'サンプル再生' : 'READY';
  const sequenceStep = previewSequence?.phase === 'first' ? (previewSequence.entry === 'user' ? 'エージェントだけ（青）' : 'あなただけ（赤）')
    : previewSequence?.phase === 'overlap' ? (previewSequence.entry === 'user' ? '赤が青に入り、同時発話' : '青が赤に入り、同時発話')
    : previewSequence?.phase === 'last' ? (previewSequence.entry === 'user' ? 'あなただけ（赤）' : 'エージェントだけ（青）')
    : '待機に戻りました';
  const dockNote = preview ? (previewSequence ? `${sequenceStep}。音声を使わない模擬再生です。` : overlapping ? `${overlapDescription}（模擬）。音声は使いません。` : '状態を選んで動きを確認できます。音声は使いません。')
    : loading ? (sample ? '音声判定を準備しています。初回は少し時間がかかります。' : 'ブラウザのマイク許可を確認してください。初回は準備に時間がかかります。')
    : overlapping ? `${overlapDescription}${sample ? '（サンプル）' : ''}。`
    : sample ? '日本語サンプルを解析しています。マイクは使用していません。'
    : mic.status === 'muted' ? 'マイクはミュート中です。再開すると新しく接続します。'
    : running ? '話すと赤く、黙ると緑へ。声の強さや響きに反応します。'
    : agentActive ? 'エージェントのサンプル音声です。実際のAI会話ではありません。'
    : 'マイクを開始して、ひと声どうぞ。';

  return <div className="app" data-mode={mode}>
    <header className="app-header">
      <a href={import.meta.env.BASE_URL} className="brand" aria-label="Voice Wave ホーム"><span className="brand-icon"><Icon type="wave" size={20}/></span><span>Voice Wave</span><span className="brand-version">0.3</span></a>
      <nav className="header-nav" aria-label="メインナビゲーション"><span className="nav-current">Playground</span><a href="https://github.com/dj-thank/voice-wave/blob/main/README.ja.md" target="_blank" rel="noreferrer">ガイド<Icon type="external" size={13}/></a><a href="https://github.com/dj-thank/voice-wave" target="_blank" rel="noreferrer">GitHub<Icon type="external" size={13}/></a></nav>
    </header>

    <main className="page">
      <div className="page-heading"><div><div className="breadcrumb">PLAYGROUND <span>/</span> AUDIO VISUALIZER</div><h1>声を、かたちに。</h1><p>話す、聴く。その瞬間を、ひとつのWaveに。</p></div><div className="privacy-note"><Icon type="lock" size={14}/><span>音声はブラウザ内で処理<br/><strong>録音・アップロードなし</strong></span></div></div>

      <div className="workspace">
        <section className="preview-panel" aria-label="音声に反応するWaveデモ">
          <div className="preview-toolbar"><div className="mode-switch" role="group" aria-label="操作モード"><button aria-pressed={!preview} onClick={() => selectPreview(false)}><Icon type="mic" size={15}/>音声入力</button><button aria-pressed={preview} onClick={() => selectPreview(true)}><Icon type="play" size={15}/>見た目をプレビュー</button></div><span className={`session-badge ${anythingActive ? 'is-active' : ''}`}><i/>{stageBadge}</span></div>
          <div ref={stageRef} className={`stage-view ${preview ? 'has-preview' : ''}`}>
            <div className="orb-wrap"><VoiceConversation input={{level:preview ? (talking ? previewLevel : 0) : mic.level,speaking:talking,bands:preview ? previewBands : mic.bands}} output={{level:preview ? (agentTalking ? previewAgentLevel : 0) : agentVoice.level,speaking:agentTalking,thinking,bands:preview ? previewAgentBands : agentVoice.bands}} layout="wave" idleMotion={idleMotion} renderer={simpleRenderer ? 'fallback' : 'auto'} reducedMotion={reduceMotion} onError={setRendererError}/></div>
            <span className="sr-only" role="status" aria-live="polite">{status}</span>
            {preview ? <div className="preview-state-buttons" role="group" aria-label="プレビュー状態">{PREVIEW_STATES.map(item => <button key={item.value} aria-label={item.accessibleLabel} aria-pressed={previewState === item.value} data-state={item.value} onClick={() => selectPreviewState(item.value)}><i/>{item.label}</button>)}</div>
              : <div className="participant-key" aria-label={overlapping ? '入出力の状態：同時発話' : '入出力の状態'}><span data-active={talking}><i className="user-dot"/>あなた{talking && <span className="activity-mark" aria-label="発話中">•••</span>}</span><span data-active={agentTalking || thinking}><i className="agent-dot"/>エージェント{(agentTalking || thinking) && <span className="activity-mark" aria-label={thinking ? '思考中' : '再生中'}>{thinking ? '…' : '•••'}</span>}</span></div>}
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
          {preview && <section className="inspector-section sequence-section" aria-label="発話の順番プレビュー">
            <div className="section-heading"><h2>重なる順番を試す</h2><span>PREVIEW</span></div>
            <p className="section-description">声が入る順番を、約6秒の模擬再生で。</p>
            <div className="sequence-actions">
              <button aria-label="青から赤が入る流れを再生" data-active={previewSequence?.entry === 'user' && previewSequence.phase !== 'complete'} onClick={() => startSequence('user')}><span className="sequence-dot agent"/>青に<span className="sequence-dot user"/>赤が入る<Icon type="play" size={12}/></button>
              <button aria-label="赤から青が入る流れを再生" data-active={previewSequence?.entry === 'agent' && previewSequence.phase !== 'complete'} onClick={() => startSequence('agent')}><span className="sequence-dot user"/>赤に<span className="sequence-dot agent"/>青が入る<Icon type="play" size={12}/></button>
            </div>
            <p className="sequence-progress">{previewSequence ? <><span className="sequence-trail">{previewSequence.entry === 'user' ? '青 → 赤＋青 → 赤 → 待機' : '赤 → 赤＋青 → 青 → 待機'}</span><span>{sequenceStep}</span></> : <span>実際の音声は再生しません。</span>}</p>
          </section>}
          <section className="inspector-section sample-section"><div className="section-heading"><h2>声を試す</h2><span>DEMO</span></div><p className="section-description">マイクがなくても、音声への反応を。</p>
            <div className="sample-actions">
              <button className="sample-action" aria-label="日本語サンプルで試す" disabled={loading || sample} data-active={sample} onClick={startSample}><span className="action-icon"><Icon type="wave"/></span><span className="action-copy"><strong>{sample ? 'サンプルを解析中' : 'あなたの声'}</strong><small>日本語の発話を検出</small></span><span className="sound-label">無音</span><Icon type="play" size={14}/></button>
              <button className="sample-action" aria-label={agentActive ? 'エージェント音声を止める' : 'エージェント音声を試す'} data-active={agentActive} onClick={toggleAgent}><span className="action-icon"><Icon type="headphones"/></span><span className="action-copy"><strong>{agentActive ? 'エージェントを停止' : 'エージェントの声'}</strong><small>{thinking && !preview ? '応答を準備中' : '音声と動きを合わせる'}</small></span><span className="sound-label">音あり</span><Icon type={agentActive ? 'stop' : 'play'} size={14}/></button>
              <button className="sample-action" aria-label="二人の声を同時に試す" disabled={running || agentActive} onClick={startBothSamples}><span className="action-icon"><Icon type="layers"/></span><span className="action-copy"><strong>二人の声を同時に</strong><small>入力と出力を同時に</small></span><span className="sound-label">音あり</span><Icon type="play" size={14}/></button>
            </div>
            {sampleFinished && <p className="sample-feedback" role="status"><span>✓</span>{observations.speech ? '発話を検出' : '発話未検出'}{observations.silence ? ' → 無音に復帰' : ''}</p>}
          </section>

          <section className="inspector-section appearance-section"><div className="section-heading"><h2>表示設定</h2><span>APPEARANCE</span></div>
            <label className="switch-row"><span>待機中も動かす</span><input type="checkbox" checked={idleMotion} onChange={e => setIdleMotion(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label>
            <p className="setting-hint">{reduceMotion ? '「動きを控えめに」がオンの間は、待機も静止します。' : '待機中だけ切り替えます。発話や思考の動きはそのまま。'}</p>
            <label className="switch-row"><span>動きを控えめに</span><input type="checkbox" checked={reduceMotion} onChange={e => setReduceMotion(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label>
          </section>

          <details className="advanced-settings"><summary><span>詳細設定</span><Icon type="chevron" size={16}/></summary><div className="advanced-body"><label className="select-row"><span>音声検出モデル</span><select aria-label="音声検出モデル" value={vadModel} disabled={running} onChange={e => {setVadModel(e.target.value as 'v5'|'v6'); resetSample();}}><option value="v6">Silero v6</option><option value="v5">Silero v5</option></select></label><p>入力を停止すると切り替えられます。精度の優劣を示すものではありません。</p><label className="switch-row"><span>シンプルな描画</span><input aria-label="シンプルな描画を使う" type="checkbox" checked={simpleRenderer} onChange={e => setSimpleRenderer(e.target.checked)}/><span className="switch-track" aria-hidden="true"/></label><p>描画が重い環境では、軽い表示へ切り替えられます。</p></div></details>
          <p className="demo-disclaimer">サンプルは表示を試すための音声です。<br/>AI会話サービスには接続していません。</p>
        </aside>
      </div>

      <Diagnostics snapshot={{mode,overlapEntry,model:vadModel,micStatus:mic.status,source:preview?'preview':mic.source,inputLevel:mic.level,probability:mic.probability,inputBands:mic.bands,agentStatus:agentVoice.status,outputLevel:agentVoice.level,outputBands:agentVoice.bands}} status={status} sampleResult={sampleFinished ? `サンプル確認：${observations.speech?'発話を検出':'発話未検出'}${observations.silence?' → 無音に復帰':''}` : null}/>
      <footer className="page-footer"><span>Built for voice. Open to everyone.</span><div><a href="https://ui.pipecat.ai/docs/visualizers/audio-visualizer-wave" target="_blank" rel="noreferrer">Pipecat Wave<Icon type="external" size={12}/></a><a href="https://github.com/dj-thank/voice-wave/blob/main/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Licenses<Icon type="external" size={12}/></a></div></footer>
    </main>
  </div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>);
