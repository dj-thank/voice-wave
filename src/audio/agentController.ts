import type { AudioBands } from './spectrum';
export interface AgentVoiceState {
  status: 'idle' | 'thinking' | 'speaking';
  level: number;
  bands: AudioBands;
  error: string | null;
}
export type AgentVoiceFactory = (url: string, callbacks: {
  playing: () => void;
  frame: (level: number, bands: AudioBands) => void;
  ended: () => void;
}, signal: AbortSignal) => Promise<{ dispose: () => Promise<void> }>;
const initial: AgentVoiceState = { status: 'idle', level: 0, bands: [0, 0, 0], error: null };

export class AgentVoiceController {
  private state = { ...initial };
  private listeners = new Set<() => void>();
  private generation = 0;
  private abort: AbortController | null = null;
  private session: { dispose: () => Promise<void> } | null = null;
  private factory: AgentVoiceFactory;
  constructor(factory: AgentVoiceFactory) { this.factory = factory; }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<AgentVoiceState>) {
    this.state = { ...this.state, ...patch };
    for (const listener of this.listeners) listener();
  }
  start = async (url: string) => {
    const id = ++this.generation;
    this.abort?.abort();
    const oldSession = this.session;
    this.session = null;
    const abort = new AbortController();
    this.abort = abort;
    this.publish({ ...initial, status: 'thinking' });
    const valid = () => this.generation === id && !abort.signal.aborted;
    try {
      const pending = this.factory(url, {
        playing: () => { if (valid()) this.publish({ status: 'speaking' }); },
        frame: (level, bands) => { if (valid()) this.publish({ level, bands }); },
        ended: () => { if (valid()) void this.stop(); },
      }, abort.signal);
      if (oldSession) void oldSession.dispose();
      const session = await pending;
      if (!valid()) { await session.dispose(); return; }
      this.session = session;
    } catch (error) {
      if (valid()) {
        abort.abort();
        this.publish({ ...initial, error: error instanceof Error && error.message.startsWith('表示:') ? error.message.slice(3) : 'AIサンプル音声を再生できませんでした。もう一度お試しください。' });
      }
    }
  };
  stop = async () => {
    ++this.generation;
    this.abort?.abort();
    this.abort = null;
    const session = this.session;
    this.session = null;
    this.publish({ ...initial });
    if (session) await session.dispose();
  };
}
