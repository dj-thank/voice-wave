import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { VoiceConversation } from './visualizer/VoiceConversation';
import type { VoiceChannel } from './visualizer/conversationState';

type Frame = { t: number; u: VoiceChannel; a: VoiceChannel; entry: string | null };
type Clip = { id: string; role: 'user' | 'agent'; text: string; start: number; end: number };
type Timeline = { duration: number; clips: Clip[]; frames: Frame[]; frameSeconds: number };
const quiet: VoiceChannel = { speaking: false, level: 0, bands: [0, 0, 0] };
const initial: Frame = { t: 0, u: quiet, a: quiet, entry: null };
const font = '"Hiragino Sans", "Noto Sans JP", sans-serif';
const red = '#ff4c43', blue = '#62c9ff', mint = '#8acdb0';

function App() {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [frame, setFrame] = useState(initial);
  const [state, setState] = useState('音声を読み込み中');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canvas = useRef<HTMLCanvasElement>(null);
  const wave = useRef<HTMLDivElement>(null);
  const captured = useRef<HTMLCanvasElement | null>(null);
  const captureWave = (source: HTMLCanvasElement) => {
    const copy = captured.current ??= document.createElement('canvas');
    if (copy.width !== source.width || copy.height !== source.height) { copy.width = source.width; copy.height = source.height; }
    const ctx = copy.getContext('2d')!;
    ctx.clearRect(0, 0, copy.width, copy.height);
    ctx.drawImage(source, 0, 0);
  };
  const data = useRef<{ timeline: Timeline; audio: ArrayBuffer } | null>(null);
  const elapsed = useRef(0);
  const lastFrame = useRef(initial);
  const cleanup = useRef<() => void>(() => {});
  useEffect(() => {
    let disposed = false;
    Promise.all([
      fetch('/work/demo-video/prepared/timeline.json').then(r => { if (!r.ok) throw new Error('先に音声を準備してください'); return r.json(); }),
      fetch('/work/demo-video/prepared/conversation.wav').then(r => { if (!r.ok) throw new Error('音声がありません'); return r.arrayBuffer(); }),
    ]).then(([timeline, audio]) => { if (!disposed) { data.current = { timeline, audio }; setTimeline(timeline); setState('再生できます'); } }).catch(e => setError(String(e)));
    return () => { disposed = true; cleanup.current(); };
  }, []);

  useEffect(() => {
    if (!timeline || !canvas.current) return;
    const target = canvas.current, ctx = target.getContext('2d')!;
    let raf = 0;
    const text = (s: string, x: number, y: number, size: number, color = '#f1f5f6', weight = 400) => {
      ctx.font = `${weight} ${size}px ${font}`; ctx.fillStyle = color; ctx.fillText(s, x, y);
    };
    const paragraph = (s: string, x: number, y: number, width: number, size = 30) => {
      ctx.font = `500 ${size}px ${font}`;
      let line = '', row = 0;
      for (const ch of s) { if (ctx.measureText(line + ch).width > width) { text(line, x, y + row * 45, size); row++; line = ch; } else line += ch; }
      if (line) text(line, x, y + row * 45, size);
    };
    const draw = () => {
      const t = elapsed.current, f = lastFrame.current;
      ctx.fillStyle = '#0b0e11'; ctx.fillRect(0, 0, 1920, 1080);
      text('Voice Wave', 100, 88, 32, '#f1f5f6', 650);
      ctx.strokeStyle = '#293039'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(100, 125); ctx.lineTo(1820, 125); ctx.stroke();
      const s = captured.current;
      if (s) ctx.drawImage(s, 510, 20, 900, 900);
      const mode = f.u.speaking && f.a.speaking ? '同時発話' : f.u.speaking ? 'あなた' : f.a.speaking ? 'エージェント' : f.a.thinking ? '考え中' : '待機';
      const color = f.u.speaking ? red : f.a.speaking || f.a.thinking ? blue : mint;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(1590, 79, 5, 0, Math.PI * 2); ctx.fill();
      text(mode, 1610, 88, 24, color, 500);
      for (const [role, x, title, color, active] of [
        ['user', 100, 'あなた', red, f.u.speaking],
        ['agent', 980, 'エージェント', blue, f.a.speaking],
      ] as const) {
        const clip = [...timeline.clips].reverse().find(c => c.role === role && c.start <= t);
        ctx.fillStyle = active ? '#151b22' : '#10151b'; ctx.beginPath(); ctx.roundRect(x, 798, 840, 160, 18); ctx.fill();
        ctx.strokeStyle = active ? color + '88' : '#27303a'; ctx.stroke();
        text(title, x + 26, 839, 19, color, 550);
        if (clip) paragraph(clip.text, x + 26, 889, 786, 28);
      }
      ctx.fillStyle = '#252e38'; ctx.fillRect(100, 996, 1720, 2);
      ctx.fillStyle = '#8e9ba7'; ctx.fillRect(100, 996, 1720 * Math.min(1, t / timeline.duration), 2);
      raf = requestAnimationFrame(draw);
    };
    draw(); return () => cancelAnimationFrame(raf);
  }, [timeline]);

  const play = async (record: boolean) => {
    if (busy || !data.current || !canvas.current) return;
    setBusy(true); setError(''); setState(record ? '動画を書き出し中' : '再生中');
    const context = new AudioContext();
    let source: AudioBufferSourceNode | null = null, recorder: MediaRecorder | null = null, stream: MediaStream | null = null, tick = 0;
    const chunks: Blob[] = [];
    let canceled = false;
    const dispose = () => { cancelAnimationFrame(tick); try { source?.stop(); } catch {} stream?.getTracks().forEach(t => t.stop()); void context.close(); };
    cleanup.current = () => { canceled = true; if (recorder?.state === 'recording') recorder.stop(); dispose(); setBusy(false); setState('停止しました'); };
    try {
      await context.resume();
      const audio = await context.decodeAudioData(data.current.audio.slice(0));
      source = context.createBufferSource(); source.buffer = audio;
      source.connect(context.destination);
      if (record) {
        const destination = context.createMediaStreamDestination(); source.connect(destination);
        stream = canvas.current.captureStream(30);
        for (const track of destination.stream.getAudioTracks()) stream.addTrack(track);
        const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t));
        if (!type) throw new Error('このブラウザーでは動画を書き出せません');
        const container = type.startsWith('video/mp4') ? 'video/mp4' : 'video/webm';
        recorder = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 7500000, audioBitsPerSecond: 192000 });
        recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
        recorder.onstop = async () => {
          dispose(); if (canceled) return;
          setState('動画を保存中');
          try {
            const r = await fetch('/__video', { method: 'POST', headers: { 'content-type': container }, body: new Blob(chunks, { type: container }) });
            if (!r.ok) throw new Error('動画の保存に失敗しました');
            setState('動画を書き出しました');
          } catch (e) { setError(String(e)); } finally { setBusy(false); }
        };
        recorder.start(1000);
      }
      const start = context.currentTime + .2;
      elapsed.current = 0;
      lastFrame.current = initial; setFrame(initial);
      source.start(start);
      let previous = -1;
      const update = () => {
        const t = Math.max(0, context.currentTime - start);
        elapsed.current = Math.min(t, data.current!.timeline.duration);
        // Frame entries describe completed 32ms windows; never look ahead in the audio.
        const index = Math.max(0, Math.floor(t / .032) - 1);
        if (index !== previous) { previous = index; const f = data.current!.timeline.frames[index] ?? initial; lastFrame.current = f; setFrame(f); }
        if (t >= data.current!.timeline.duration) {
          if (recorder) recorder.stop(); else { dispose(); setBusy(false); setState('再生が終わりました'); }
          return;
        }
        tick = requestAnimationFrame(update);
      };
      tick = requestAnimationFrame(update);
    } catch (e) { dispose(); setBusy(false); setError(String(e)); }
  };
  return <main>
    <div className="source" ref={wave}><VoiceConversation input={frame.u} output={frame.a} onRenderFrame={captureWave} onError={message => { if (message) setError(message); }} /></div>
    <h1>Voice Wave</h1>
    <canvas ref={canvas} width={1920} height={1080} aria-label="会話デモの映像" />
    <nav><button disabled={!timeline || busy} onClick={() => void play(false)} aria-label="音声つきで再生">再生</button><button disabled={!timeline || busy} onClick={() => void play(true)} aria-label="動画を書き出す">書き出し</button><button disabled={!busy} onClick={() => cleanup.current()}>停止</button></nav>
    <p role="status">{state}</p>{error && <p role="alert">{error}</p>}
    <style>{`*{box-sizing:border-box}body{margin:0;background:#0b0e11;color:#ecf1f6;font-family:${font}}main{max-width:1280px;margin:28px auto;padding:0 20px}h1{font-size:22px}p{font-size:13px;color:#9eafbf;line-height:1.8}canvas{display:block;width:100%;height:auto;border-radius:12px}.source{position:fixed;top:0;left:0;width:700px;height:700px;opacity:.001;pointer-events:none;z-index:-1}nav{display:flex;gap:12px;margin-top:20px;flex-wrap:wrap}button{padding:12px 18px;border-radius:8px;border:1px solid #3c4c5d;background:#1d2a37;color:#e6eef5;font:inherit;font-size:13px}button:disabled{opacity:.4}[role=alert]{color:#ff7b74}`}</style>
  </main>;
}
createRoot(document.getElementById('root')!).render(<App />);
