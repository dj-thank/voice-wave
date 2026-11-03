import { useRef, useState } from 'react';
import { version } from '../../package.json';
import { Diagnostics } from '../diagnostics/Diagnostics';
import type { VoiceSource } from '../visualizer/conversationState';
import { Icon } from './Icon';
import { Samples, SequenceControls, Switch } from './Controls';
import { WaveStage } from './WaveStage';
import { usePlayground } from './usePlayground';
import './playground.css';

const repository = 'https://github.com/dj-thank/voice-wave';

export function Playground() {
  const session = usePlayground();
  const { mic, agent, preview, mode, status, badge, running, loading, sample, active, actions } =
    session;
  const stage = useRef<HTMLDivElement>(null);
  const [idleMotion, setIdleMotion] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [simpleRenderer, setSimpleRenderer] = useState(false);
  const [rendererError, setRendererError] = useState<string | null>(null);
  const startSequence = (entry: VoiceSource) => {
    actions.startSequence(entry);
    if (window.matchMedia('(max-width: 760px)').matches) {
      const quietScroll =
        reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      stage.current?.scrollIntoView({
        block: 'center',
        behavior: quietScroll ? 'instant' : 'smooth',
      });
    }
  };

  return (
    <div className="app" data-mode={mode}>
      <header className="app-header">
        <a href={import.meta.env.BASE_URL} className="brand" aria-label="Voice Wave ホーム">
          <span className="brand-icon">
            <Icon type="wave" size={20} />
          </span>
          <span>Voice Wave</span>
          <span className="brand-version">{version}</span>
        </a>
        <nav className="header-nav" aria-label="メインナビゲーション">
          <span className="nav-current">Playground</span>
          <a href={`${repository}/blob/main/README.ja.md`} target="_blank" rel="noreferrer">
            ガイド
            <Icon type="external" size={13} />
          </a>
          <a href={repository} target="_blank" rel="noreferrer">
            GitHub
            <Icon type="external" size={13} />
          </a>
        </nav>
      </header>
      <main className="page">
        <h1 className="page-heading">声を、かたちに。</h1>
        <div className="workspace">
          <section className="preview-panel" aria-label="音声に反応するWaveデモ">
            <div className="preview-toolbar">
              <div className="mode-switch" role="group" aria-label="操作モード">
                <button
                  aria-pressed={!preview.enabled}
                  onClick={() => actions.selectPreview(false)}
                >
                  <Icon type="mic" size={15} />
                  音声入力
                </button>
                <button
                  aria-label="見た目をプレビュー"
                  aria-pressed={preview.enabled}
                  onClick={() => actions.selectPreview(true)}
                >
                  <Icon type="play" size={15} />
                  プレビュー
                </button>
              </div>
              <span className={`session-badge ${active ? 'is-active' : ''}`}>
                <i />
                {badge}
              </span>
            </div>
            <div ref={stage} className={`stage-view ${preview.enabled ? 'has-preview' : ''}`}>
              <WaveStage
                session={session}
                display={{
                  idleMotion,
                  reducedMotion,
                  renderer: simpleRenderer ? 'fallback' : 'auto',
                }}
                onError={setRendererError}
              />
            </div>
            <div className="call-dock">
              <div className="call-actions">
                {!running ? (
                  <button className="mic-button" onClick={actions.startMic}>
                    <Icon type="mic" />
                    マイクを開始
                  </button>
                ) : (
                  <button
                    className={`mic-button ${mic.status === 'muted' ? 'is-muted' : 'is-connected'}`}
                    disabled={loading || sample}
                    onClick={() => void mic.toggleMute()}
                  >
                    <Icon type={mic.status === 'muted' ? 'mic' : 'mute'} />
                    {loading
                      ? '準備中'
                      : sample
                        ? 'サンプル解析中'
                        : mic.status === 'muted'
                          ? '再開'
                          : 'ミュート'}
                  </button>
                )}
                <button
                  className="end-button"
                  disabled={!active}
                  onClick={actions.stop}
                  aria-label={loading ? 'キャンセル' : 'すべて停止'}
                  title={loading ? '準備をキャンセル' : 'すべての入力・再生を停止'}
                >
                  <Icon type="stop" size={15} />
                  <span>{loading ? 'キャンセル' : '終了'}</span>
                </button>
              </div>
            </div>
            {(mic.error || agent.error || rendererError) && (
              <div className="notice-area">
                {mic.error && (
                  <p className="error-notice" role="alert">
                    {mic.error}
                  </p>
                )}
                {agent.error && (
                  <p className="error-notice" role="alert">
                    {agent.error}
                  </p>
                )}
                {rendererError && (
                  <p className="fallback-notice" role="alert">
                    シンプルな表示に切り替えています。{rendererError}
                  </p>
                )}
              </div>
            )}
          </section>
          <aside className="inspector" aria-label="サンプルと表示設定">
            {preview.enabled && <SequenceControls session={session} onStart={startSequence} />}
            <Samples session={session} />
            <section className="inspector-section appearance-section">
              <h2 className="section-heading">表示</h2>
              <Switch label="待機中も動かす" checked={idleMotion} onChange={setIdleMotion} />
              <Switch label="動きを控えめに" checked={reducedMotion} onChange={setReducedMotion} />
            </section>
            <details className="advanced-settings">
              <summary>
                <span>詳細設定</span>
                <Icon type="chevron" size={16} />
              </summary>
              <div className="advanced-body">
                <label className="select-row">
                  <span>音声検出モデル</span>
                  <select
                    aria-label="音声検出モデル"
                    value={session.model}
                    disabled={running}
                    onChange={(event) => actions.selectModel(event.target.value as 'v5' | 'v6')}
                  >
                    <option value="v6">Silero v6</option>
                    <option value="v5">Silero v5</option>
                  </select>
                </label>
                <Switch
                  label="シンプルな描画"
                  accessibleLabel="シンプルな描画を使う"
                  checked={simpleRenderer}
                  onChange={setSimpleRenderer}
                />
              </div>
            </details>
          </aside>
        </div>
        <Diagnostics
          snapshot={session.diagnostics}
          status={status}
          sampleResult={session.sampleResult ? `サンプル確認：${session.sampleResult}` : null}
        />
        <footer className="page-footer">
          <a
            href={`${repository}/blob/main/THIRD_PARTY_NOTICES.md`}
            target="_blank"
            rel="noreferrer"
          >
            Licenses
            <Icon type="external" size={12} />
          </a>
        </footer>
      </main>
    </div>
  );
}
