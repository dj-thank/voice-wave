import type { AudioBands } from './spectrum';
export type MicrophoneStatus = 'idle' | 'loading' | 'listening' | 'speaking' | 'muted' | 'error';
export type InputSource = { kind: 'microphone' } | { kind: 'sample'; url: string };
export interface AudioSnapshot {
  status: MicrophoneStatus;
  source: InputSource['kind'] | null;
  speaking: boolean;
  level: number;
  bands: AudioBands;
  probability: number;
  error: string | null;
}
export interface AudioCallbacks {
  frame: (probability: number, level: number, bands?: AudioBands) => void;
  speech: (speaking: boolean) => void;
  ended: () => void;
}
export interface AudioSession {
  dispose: () => Promise<void>;
}
export type SessionFactory = (
  source: InputSource,
  callbacks: AudioCallbacks,
  signal: AbortSignal,
) => Promise<AudioSession>;

const initial: AudioSnapshot = {
  status: 'idle',
  source: null,
  speaking: false,
  level: 0,
  bands: [0, 0, 0],
  probability: 0,
  error: null,
};
export function microphoneError(error: unknown): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'マイクの使用が許可されていません。ブラウザのサイト設定でマイクを許可して、もう一度開始してください。';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError')
    return 'マイクが見つかりません。接続を確認して、もう一度開始してください。';
  if (name === 'NotReadableError' || name === 'TrackStartError')
    return 'マイクを開けませんでした。他のアプリの使用状況やOSのマイク設定を確認してください。';
  if (error instanceof Error && error.message.startsWith('表示:')) return error.message.slice(3);
  return '音声の準備ができませんでした。ページを再読み込みして、もう一度開始してください。';
}

/** Owns asynchronous input sessions: stale permission/model callbacks cannot restart capture. */
export class MicrophoneController {
  private snapshot: AudioSnapshot = { ...initial };
  private listeners = new Set<() => void>();
  private generation = 0;
  private abort: AbortController | null = null;
  private session: AudioSession | null = null;
  private lastSource: InputSource = { kind: 'microphone' };
  private factory: SessionFactory;
  constructor(factory: SessionFactory) {
    this.factory = factory;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<AudioSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  start = () => this.open({ kind: 'microphone' });
  startSample = (url: string) => this.open({ kind: 'sample', url });
  private async open(source: InputSource) {
    const id = ++this.generation;
    this.abort?.abort();
    const previous = this.session;
    this.session = null;
    const abort = new AbortController();
    this.abort = abort;
    this.lastSource = source;
    this.publish({ ...initial, status: 'loading', source: source.kind });
    const valid = () => this.generation === id && !abort.signal.aborted;
    try {
      // The factory starts AudioContext in the current user gesture.
      const pending = this.factory(
        source,
        {
          frame: (probability, level, bands = [0, 0, 0]) => {
            if (valid()) this.publish({ probability, level, bands });
          },
          speech: (speaking) => {
            if (valid()) this.publish({ speaking, status: speaking ? 'speaking' : 'listening' });
          },
          ended: () => {
            if (valid()) void this.stop();
          },
        },
        abort.signal,
      );
      if (previous) void previous.dispose();
      const next = await pending;
      if (!valid()) {
        await next.dispose();
        return;
      }
      this.session = next;
      this.publish({ status: this.snapshot.speaking ? 'speaking' : 'listening' });
    } catch (error) {
      if (valid()) {
        abort.abort();
        this.publish({ ...initial, status: 'error', error: microphoneError(error) });
      }
    }
  }
  private async end(status: 'idle' | 'muted') {
    ++this.generation;
    this.abort?.abort();
    this.abort = null;
    const session = this.session;
    this.session = null;
    this.publish({ ...initial, status, source: status === 'muted' ? this.lastSource.kind : null });
    if (session) await session.dispose();
  }
  stop = () => this.end('idle');
  toggleMute = () =>
    this.snapshot.status === 'muted' ? this.open(this.lastSource) : this.end('muted');
}
