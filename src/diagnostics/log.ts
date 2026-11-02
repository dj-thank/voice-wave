export interface DiagnosticSnapshot {
  mode: string; model: string; micStatus: string; source: string | null;
  inputLevel: number; probability: number; inputBands: number[];
  agentStatus: string; outputLevel: number; outputBands: number[];
}
export interface DiagnosticEntry extends DiagnosticSnapshot { atMs: number; type: 'state' | 'sample' }
const finite = (value: number) => Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000 : 0;
/** Bounded, in-memory numeric diagnostics. Never receives raw PCM or microphone IDs. */
export class DiagnosticLog {
  readonly capacity: number;
  private entries: DiagnosticEntry[] = [];
  private start: number;
  private lastAt = -Infinity;
  private signature = '';
  private total = 0;
  constructor(now = 0, capacity = 900) { this.start = now; this.capacity = capacity; }
  append(snapshot: DiagnosticSnapshot, now: number) {
    const signature = [snapshot.mode, snapshot.model, snapshot.micStatus, snapshot.source, snapshot.agentStatus].join('|');
    const changed = signature !== this.signature;
    const active = snapshot.micStatus === 'listening' || snapshot.micStatus === 'speaking' || snapshot.agentStatus !== 'idle' || snapshot.mode === 'user';
    if (!changed && (!active || now - this.lastAt < 250)) return false;
    this.entries.push({
      atMs: Math.max(0, Math.round(now - this.start)), type: changed ? 'state' : 'sample',
      mode: snapshot.mode, model: snapshot.model, micStatus: snapshot.micStatus, source: snapshot.source,
      inputLevel: finite(snapshot.inputLevel), probability: finite(snapshot.probability),
      inputBands: snapshot.inputBands.slice(0, 3).map(finite), agentStatus: snapshot.agentStatus,
      outputLevel: finite(snapshot.outputLevel), outputBands: snapshot.outputBands.slice(0, 3).map(finite),
    });
    if (this.entries.length > this.capacity) this.entries.splice(0, this.entries.length - this.capacity);
    this.lastAt = now; this.signature = signature; this.total++;
    return true;
  }
  clear(now = 0) { this.entries = []; this.start = now; this.lastAt = -Infinity; this.signature = ''; this.total = 0; }
  read() { return this.entries.map(row => ({ ...row, inputBands: [...row.inputBands], outputBands: [...row.outputBands] })); }
  export() { return { schema: 'voice-wave-diagnostics/v1', audioIncluded: false, storage: 'memory-until-explicit-download', sampleIntervalMs: 250, capacity: this.capacity, totalEvents: this.total, droppedEvents: Math.max(0, this.total-this.entries.length), entries: this.read() }; }
}
