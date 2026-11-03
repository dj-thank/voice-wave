// Build isolated input/output stems and analyse their actual PCM with the demo's models.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import * as ort from 'onnxruntime-web/wasm';
import { SpeechGate, hasVariableAudio } from '../src/audio/speechGate.ts';
import { analyseVoiceFrame } from '../src/audio/spectrum.ts';
import { AgentVoiceController } from '../src/audio/agentController.ts';
import { createOverlapState, advanceOverlapState } from '../src/visualizer/overlapState.ts';

const directory = 'work/demo-video';
const manifest = JSON.parse(await readFile(`${directory}/local/generation-manifest.json`, 'utf8'));
await mkdir(`${directory}/prepared`, { recursive: true });
const clips = manifest.lines.map(line => {
  const bytes = execFileSync('/opt/homebrew/bin/ffmpeg', ['-v','error','-i',`${directory}/local/${line.file}`,
    '-af','loudnorm=I=-20:TP=-3:LRA=7','-ar','48000','-ac','1','-f','f32le','pipe:1'], { maxBuffer: 20 * 1024 * 1024 });
  let pcm = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  // Remove long generated padding only; preserve 120ms around the actual waveform.
  let first = 0, last = pcm.length - 1;
  while (first < pcm.length && Math.abs(pcm[first]) < .003) first++;
  while (last > first && Math.abs(pcm[last]) < .003) last--;
  pcm = pcm.slice(Math.max(0, first - 5760), Math.min(pcm.length, last + 5760));
  if (pcm.length < 12000 || !pcm.every(Number.isFinite)) throw new Error(`Invalid audio ${line.id}`);
  return { ...line, pcm, duration: pcm.length / 48000, start: 0, end: 0 };
});
// Authored conversational gaps. Two intentional overlaps, in opposite directions.
for (let i = 0; i < clips.length; i++) {
  const gap = i === 0 ? 2.5 : i === 1 ? 2.3 : i === 2 ? -1.25 : i === 3 ? 1.1 : i === 4 ? .65 : i === 5 ? -1.15 : i === 6 ? .55 : .9;
  clips[i].start = i === 0 ? gap : clips[i - 1].end + gap;
  clips[i].end = clips[i].start + clips[i].duration;
}
const duration = clips.at(-1).end + 2.8;
function wav(pcm, rate = 48000) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF');b.writeUInt32LE(b.length - 8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);
  b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);
  b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(pcm.length*2,40);
  pcm.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(.999969,v))*32768),44+i*2));
  return b;
}
const stems = {};
for (const role of ['user', 'agent']) {
  const pcm = new Float32Array(Math.ceil(duration * 48000));
  for (const clip of clips.filter(c=>c.role===role)) pcm.set(clip.pcm,Math.round(clip.start*48000));
  stems[role] = pcm;
  await writeFile(`${directory}/prepared/${role}.wav`,wav(pcm));
}
const mix = stems.user.map((v,i)=>v+stems.agent[i]);
if (mix.some(v=>Math.abs(v)>1)) throw new Error('Mix clips');
await writeFile(`${directory}/prepared/conversation.wav`,wav(mix));
const require = createRequire(import.meta.url);
const vadDist = dirname(require.resolve('@ricky0123/vad-web'));
const { Silero } = require(join(vadDist,'models/silero.js'));
ort.env.wasm.numThreads = 1;
const modelBytes = await readFile(join(vadDist,'silero_vad_v6.onnx'));
const model = await Silero.new(ort,async()=>new Uint8Array(modelBytes).buffer);
const gate = new SpeechGate();
const userBytes = execFileSync('/opt/homebrew/bin/ffmpeg',['-v','error','-i',`${directory}/prepared/user.wav`,'-ar','16000','-f','f32le','pipe:1'],{maxBuffer:20*1024*1024});
const user = new Float32Array(userBytes.buffer.slice(userBytes.byteOffset,userBytes.byteOffset+userBytes.byteLength));
let callbacks, time=0;
const output = new AgentVoiceController(async(_, cb)=>{callbacks=cb;return {dispose:async()=>{}};},()=>time*1000);
await output.start('authored-output-stem'); callbacks.playing();
const frames=[];
let order=createOverlapState();
try {
  for(let p=0;p<user.length;p+=512){
    time=(p+512)/16000;
    const u=new Float32Array(512);u.set(user.subarray(p,p+512));
    const a=stems.agent.subarray(p*3,Math.min((p+512)*3,stems.agent.length));
    const uf=analyseVoiceFrame(u,16000),af=analyseVoiceFrame(a,48000);
    const probability=(await model.process(u)).isSpeech;
    const speaking=gate.update(probability,hasVariableAudio(u));
    callbacks.frame(af.level,af.bands);
    const audible=output.getSnapshot().audible;
    order=advanceOverlapState(order,speaking,audible);
    const thinking=!speaking&&!audible&&clips.some((c,i)=>c.role==='agent'&&i>0&&time>=clips[i-1].end+.35&&time<c.start);
    const round=x=>+x.toFixed(4);
    frames.push({t:round(time),u:{speaking,level:round(uf.level),bands:uf.bands.map(round)},a:{speaking:audible,thinking,level:round(af.level),bands:af.bands.map(round)},entry:order.entry});
  }
}finally{await model.release();await output.stop();}
const timeline={duration,frameSeconds:.032,source:'Irodori-TTS-v4.1-Small; separate generated PCM stems. User: Silero v6 + SpeechGate; output: playback energy gate. Precomputed local analysis, scripted response timing, not live inference.',clips:clips.map(({pcm,...c})=>c),frames};
for (const entry of ['user','agent']) if (!frames.some(f=>f.entry===entry)) throw new Error(`Missing overlap direction: ${entry}`);
await writeFile(`${directory}/prepared/timeline.json`,JSON.stringify(timeline));
console.log(JSON.stringify({duration,clips:timeline.clips.map(({id,start,end})=>({id,start,end})),overlapFrames:frames.filter(f=>f.entry).length,thinkingFrames:frames.filter(f=>f.a.thinking).length},null,2));
