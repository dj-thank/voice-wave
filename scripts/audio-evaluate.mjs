// Same local synthetic PCM -> same Silero probabilities -> old segment gate vs UI gate.
// Not a Japanese accuracy benchmark; no microphone recording or network requests.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as ort from 'onnxruntime-web/wasm';
import { SpeechGate, hasVariableAudio } from '../src/audio/speechGate.ts';
import { analyseVoiceFrame } from '../src/audio/spectrum.ts';

const require = createRequire(import.meta.url);
const dist = dirname(require.resolve('@ricky0123/vad-web'));
const { Silero } = require(join(dist, 'models/silero.js'));
const { FrameProcessor } = require(join(dist, 'frame-processor.js'));
const { Message } = require(join(dist, 'messages.js'));
function decodeWav(bytes) {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw new Error('PCM WAV required');
  let format, data;
  for (let p = 12; p + 8 <= bytes.length;) {
    const name = bytes.toString('ascii', p, p + 4), n = bytes.readUInt32LE(p + 4);
    if (name === 'fmt ') format = bytes.subarray(p + 8, p + 8 + n);
    if (name === 'data') data = bytes.subarray(p + 8, p + 8 + n);
    p += 8 + n + n % 2;
  }
  if (!format || !data || format.readUInt16LE(0) !== 1 || format.readUInt16LE(2) !== 1 || format.readUInt32LE(4) !== 16000 || format.readUInt16LE(14) !== 16) throw new Error('16kHz mono PCM16 expected');
  return Float32Array.from({ length: data.length / 2 }, (_, i) => data.readInt16LE(i * 2) / 32768);
}
const normal = decodeWav(await readFile('public/samples/voice-check.wav'));
const short = decodeWav(await readFile('public/samples/eval-short.wav'));
let seed = 109;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32 * 2 - 1; };
const fixtures = [
  { name: 'japanese-normal', pcm: normal, reference: normal },
  { name: 'japanese-minus20dB', pcm: normal.map(v => v * 0.1), reference: normal },
  { name: 'japanese-minus30dB', pcm: normal.map(v => v * 0.0316228), reference: normal },
  { name: 'short-hai', pcm: short, reference: short },
  { name: 'japanese-noise', pcm: normal.map(v => v * 0.2 + random() * 0.003), reference: normal },
  { name: 'digital-silence', pcm: new Float32Array(16000 * 5), negative: true },
  { name: 'separated-impulses', pcm: Float32Array.from({length:16000*5}, (_,i) => i % 1600 === 0 ? .8 : 0), negative: true },
  { name: 'steady-broadband-noise', pcm: Float32Array.from({length:16000*5}, () => random() * .03), negative: true },
];
ort.env.wasm.numThreads = 1;
const bytes = await readFile(join(dist, 'silero_vad_v6.onnx'));
const model = await Silero.new(ort, async () => new Uint8Array(bytes).buffer);
const report = [];
try {
  for (const fixture of fixtures) {
    model.reset_state();
    const gate = new SpeechGate();
    let probability = 0, oldActive = false, time = 0, oldMs = 0, newMs = 0;
    const events = { old: [], improved: [] };
    const old = new FrameProcessor(async () => ({isSpeech: probability, notSpeech: 1 - probability}), () => {}, {
      positiveSpeechThreshold:.55, negativeSpeechThreshold:.35, minSpeechMs:96, redemptionMs:520, preSpeechPadMs:0, submitUserSpeechOnPause:false,
    }, 32);
    old.resume();
    const trace = [];
    for (let i = 0; i < fixture.pcm.length; i += 512) {
      const frame = new Float32Array(512); frame.set(fixture.pcm.subarray(i, i + 512));
      time = (i + 512) / 16;
      const features = analyseVoiceFrame(frame, 16000);
      probability = (await model.process(frame)).isSpeech;
      await old.process(frame, event => {
        if (event.msg === Message.SpeechRealStart) { oldActive = true; events.old.push({ms:time, speaking:true}); }
        if (event.msg === Message.SpeechEnd || event.msg === Message.VADMisfire) {
          if (oldActive) events.old.push({ms:time, speaking:false});
          oldActive = false;
        }
      });
      const before = gate.speaking;
      const active = gate.update(probability, hasVariableAudio(frame));
      if (before !== active) events.improved.push({ms:time, speaking:active});
      if (oldActive) oldMs += 32;
      if (active) newMs += 32;
      trace.push({ms:time, probability:+probability.toFixed(4), level:+features.level.toFixed(4), old:oldActive, improved:active});
    }
    const summary = {fixture:fixture.name, durationMs:fixture.pcm.length/16, negative:!!fixture.negative, oldSpeechMs:oldMs, improvedSpeechMs:newMs, events};
    report.push({...summary, trace});
    console.log(JSON.stringify(summary));
  }
} finally { await model.release(); }
await writeFile('public/samples/eval-results.json', JSON.stringify({model:'vad-web 0.0.31 bundled Silero v6', conditions:'16kHz mono synthetic Japanese PCM, no microphone, same probabilities fed to both gates; deterministic synthetic negatives', disclaimer:'This is a limited wiring/gate comparison, not a natural Japanese accuracy score. Boundary timestamps are model-frame timestamps, not end-to-end measured UI latency.',cases:report},null,2));
