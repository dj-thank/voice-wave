import type { VoiceMode, VoiceSource } from '../visualizer/conversationState';

export type PreviewPhase = 'first' | 'overlap' | 'last' | 'complete';
export interface PreviewSnapshot {
  enabled: boolean;
  mode: VoiceMode;
  sequence: { entry: VoiceSource; phase: PreviewPhase } | null;
}

export class PreviewController {
  private state: PreviewSnapshot = { enabled: false, mode: 'user', sequence: null };
  private listeners = new Set<() => void>();
  private timers: ReturnType<typeof setTimeout>[] = [];
  private generation = 0;

  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private publish(patch: Partial<PreviewSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private clearTimers() {
    this.generation++;
    this.timers.forEach(clearTimeout);
    this.timers = [];
  }

  setEnabled = (enabled: boolean) => {
    this.clearTimers();
    this.publish({ enabled, sequence: null });
  };

  selectState = (mode: VoiceMode) => {
    this.clearTimers();
    this.publish({ mode, sequence: null });
  };

  stop = () => this.setEnabled(false);

  startSequence = (entry: VoiceSource) => {
    this.clearTimers();
    this.publish({
      enabled: true,
      mode: entry === 'user' ? 'agent' : 'user',
      sequence: { entry, phase: 'first' },
    });
    const generation = this.generation;
    const steps: [number, PreviewPhase, VoiceMode][] = [
      [1800, 'overlap', 'overlap'],
      [4000, 'last', entry],
      [5800, 'complete', 'waiting'],
    ];
    this.timers = steps.map(([delay, phase, mode]) =>
      setTimeout(() => {
        if (this.generation === generation) this.publish({ mode, sequence: { entry, phase } });
      }, delay),
    );
  };
}
