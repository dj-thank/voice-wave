import assert from 'node:assert/strict';
import { cp, mkdir, mkdtemp, readFile, writeFile, lstat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Test a real archive in an independent consumer, never a source-directory symlink.
const root = resolve(import.meta.dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
function run(command, args, cwd = root, capture = false) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit' });
  if (result.status !== 0) {
    if (capture) process.stderr.write(result.stdout + result.stderr);
    throw new Error(`${command} ${args.join(' ')} failed (${result.status ?? result.error})`);
  }
  return result.stdout;
}

await mkdir(join(root, 'work'), { recursive: true });
const work = await mkdtemp(join(root, 'work', 'package-check-'));
run(npm, ['run', 'build:lib']);
const [packed] = JSON.parse(run(npm, ['pack', '--ignore-scripts', '--json', '--pack-destination', work], root, true));
const archive = join(work, packed.filename);
const paths = packed.files.map(file => file.path);
assert(paths.includes('dist-lib/index.js'), 'compiled runtime must be packed');
assert(paths.includes('dist-lib/types/index.d.ts'), 'public types must be packed');
assert(paths.includes('LICENSE'), 'project license must be packed');
assert(paths.includes('public/licenses/pipecat-ui-BSD-2-Clause.txt'), 'shader license must be packed');
assert(paths.includes('public/licenses/livekit-components-Apache-2.0.txt'), 'radial license must be packed');
assert(paths.includes('public/licenses/livekit-components-NOTICE.txt'), 'radial upstream notice must be packed');
assert(paths.includes('THIRD_PARTY_NOTICES.md'), 'upstream attribution must be packed');
assert(!paths.some(path => /(^src\/|^work\/|^public\/(?:samples|vad)\/|\.env|\.wav$|\.onnx$|\.wasm$)/i.test(path)), 'library must exclude demo audio, models and local work');

const consumer = join(work, 'consumer');
await cp(join(root, 'examples/minimal-react'), consumer, { recursive: true, filter: path => !/(?:^|\/)(?:node_modules|dist)(?:\/|$)/.test(path) });
const manifest = JSON.parse(await readFile(join(consumer, 'package.json'), 'utf8'));
manifest.dependencies['@dj-thank/voice-wave'] = `file:${archive}`;
await writeFile(join(consumer, 'package.json'), JSON.stringify(manifest, null, 2));
run(npm, ['install', '--ignore-scripts', '--no-audit', '--no-fund'], consumer);
const installed = join(consumer, 'node_modules/@dj-thank/voice-wave');
assert(!(await lstat(installed)).isSymbolicLink(), 'consumer must install an archive, not source');
const installedManifest = JSON.parse(await readFile(join(installed, 'package.json'), 'utf8'));
assert.deepEqual(Object.keys(installedManifest.dependencies ?? {}), [], 'renderer must not depend on demo VAD/runtime');
assert.deepEqual(Object.keys(installedManifest.peerDependencies), ['react']);
const runtime = await readFile(join(installed, 'dist-lib/index.js'), 'utf8');
assert(!/getUserMedia|onnxruntime|MicVAD/.test(runtime), 'importable runtime must not contain microphone acquisition');
run(npm, ['run', 'build'], consumer);
run(process.execPath, [join(consumer, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json', '--module', 'NodeNext', '--moduleResolution', 'NodeNext'], consumer);
await writeFile(join(consumer, 'ssr-check.mjs'), `
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {VoiceWave, VoiceConversation} from '@dj-thank/voice-wave';
assert.equal(typeof VoiceWave, 'function');
assert.equal(typeof VoiceConversation, 'function');
for (const mode of ['waiting', 'user', 'agent', 'thinking', 'overlap']) {
  const markup = renderToStaticMarkup(createElement(VoiceWave, {level:0.4, mode, idleMotion:false, overlapEntry:'user'}));
  assert(markup.includes('data-wave-mode="' + mode + '"'));
}
for (const layout of ['wave', 'wave-inside', 'wave-outside']) {
  const markup = renderToStaticMarkup(createElement(VoiceConversation, {input:{level:.7,speaking:true},output:{level:.4,speaking:true},layout}));
  assert(markup.includes('<canvas'));
}
console.log('Archive exports render on the server without browser globals or microphone access.');
`);
run(process.execPath, ['ssr-check.mjs'], consumer);
console.log(`Package smoke passed: ${packed.files.length} files, ${packed.size} bytes; ${archive}`);
console.log(`Independent consumer: ${consumer}`);
