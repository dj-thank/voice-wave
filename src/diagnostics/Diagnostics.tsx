import { useEffect, useRef, useState } from 'react';
import { DiagnosticLog } from './log';
import type { DiagnosticSnapshot } from './log';
import './diagnostics.css';

export function Diagnostics({
  snapshot,
  status,
  sampleResult,
}: {
  snapshot: DiagnosticSnapshot;
  status: string;
  sampleResult: string | null;
}) {
  const log = useRef<DiagnosticLog | null>(null);
  if (!log.current) log.current = new DiagnosticLog(performance.now());
  const [, setRevision] = useState(0);
  const [recording, setRecording] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (recording && log.current!.append(snapshot, performance.now())) {
      setRevision((value) => value + 1);
      setSaved(false);
    }
  }, [snapshot, recording]);
  const download = () => {
    const blob = new Blob([JSON.stringify(log.current!.export(), null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'voice-wave-diagnostics.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setSaved(true);
  };
  const rows = log.current.read();
  const count = rows.length;
  const recent = rows
    .filter((row) => row.type === 'state')
    .slice(-6)
    .reverse();
  return (
    <details className="diagnostics">
      <summary>
        <span>診断・ログ</span>
        <span className="diagnostic-summary-note">
          {recording ? '記録中' : '停止中'} · {count}件
        </span>
      </summary>
      <div className="diagnostic-body">
        <div className="diagnostic-toolbar">
          <label>
            <input
              type="checkbox"
              checked={recording}
              onChange={(e) => setRecording(e.target.checked)}
            />
            ログを記録
          </label>
          <button onClick={download} disabled={!count}>
            JSONを保存
          </button>
          <button
            onClick={() => {
              log.current!.clear(performance.now());
              setRevision((value) => value + 1);
              setSaved(false);
            }}
          >
            クリア
          </button>
          {saved && <span role="status">保存しました</span>}
        </div>
        <div className="diagnostic-grid">
          <div>
            <span>状態</span>
            <strong>{status}</strong>
          </div>
          <div>
            <span>入力レベル</span>
            <strong>{Math.round(snapshot.inputLevel * 100)}%</strong>
          </div>
          <div>
            <span>発話確率</span>
            <strong>{Math.round(snapshot.probability * 100)}%</strong>
          </div>
          <div>
            <span>出力レベル</span>
            <strong>{Math.round(snapshot.outputLevel * 100)}%</strong>
          </div>
          <div>
            <span>検出器</span>
            <strong>Silero {snapshot.model}</strong>
          </div>
          <div>
            <span>音声ソース</span>
            <strong>{snapshot.source ?? 'なし'}</strong>
          </div>
        </div>
        {sampleResult && <p className="sample-result">{sampleResult}</p>}
        <table>
          <thead>
            <tr>
              <th>経過</th>
              <th>表示</th>
              <th>入力</th>
              <th>出力</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r, i) => (
              <tr key={`${r.atMs}-${i}`}>
                <td>{(r.atMs / 1000).toFixed(1)}s</td>
                <td>{r.mode}</td>
                <td>{r.micStatus}</td>
                <td>{r.agentStatus}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
