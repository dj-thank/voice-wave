import { createRequire } from 'node:module';
import { mkdir, readdir, copyFile, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const project = dirname(dirname(new URL(import.meta.url).pathname));
const destination = join(project, 'public/vad');
await mkdir(destination, { recursive: true });
const vadDist = dirname(require.resolve('@ricky0123/vad-web'));
const ortDist = dirname(require.resolve('onnxruntime-web/wasm'));
const copied = [];
for (const [folder, accept] of [
  [
    vadDist,
    (name) => /^silero_vad_v[56]\.onnx$/.test(name) || name === 'vad.worklet.bundle.min.js',
  ],
  [
    ortDist,
    (name) =>
      /^ort-wasm.*\.(wasm|mjs)$/.test(name) && !name.includes('jsep') && !name.includes('jspi'),
  ],
]) {
  for (const name of await readdir(folder)) {
    if (!accept(name)) continue;
    await copyFile(join(folder, name), join(destination, name));
    copied.push(name);
  }
}
// Preserve notices with the local runtime assets; full project attribution is separate.
for (const [label, base] of [
  ['vad-web', dirname(vadDist)],
  ['onnxruntime-web', dirname(ortDist)],
]) {
  for (const name of await readdir(base)) {
    if (/^(LICENSE|NOTICE)/i.test(name)) {
      await copyFile(join(base, name), join(destination, `${label}-${name}`));
    }
  }
  const meta = JSON.parse(await readFile(join(base, 'package.json'), 'utf8'));
  copied.push(`${label}@${meta.version}`);
}
await writeFile(join(destination, 'assets.json'), JSON.stringify({ files: copied }, null, 2));
console.log(`Prepared local VAD assets: ${copied.join(', ')}`);
