"""Offline authoring with official Irodori-TTS in a separately provisioned environment.

Usage: PYTHONPATH=/path/to/Irodori-TTS /path/to/venv/bin/python scripts/generate-conversation-local.py
"""
import hashlib
import json
import inspect
import subprocess
import time
from pathlib import Path

from huggingface_hub import snapshot_download
from irodori_tts.inference_runtime import InferenceRuntime, RuntimeKey, SamplingRequest, save_wav

root = Path(__file__).resolve().parent.parent
out = root / 'work/demo-video/local'
out.mkdir(parents=True, exist_ok=True)
script = json.loads((root / 'scripts/demo-conversation.json').read_text())
model = 'Aratako/Irodori-TTS-v4.1-Small'
revision = '2b28324dc263ed5e6638b3cf3dd94c82ead07b4b'
print('Downloading official model', model, revision, flush=True)
snapshot = snapshot_download(model, revision=revision, allow_patterns=['model.safetensors', 'tokenizer/*'])
print('Loading MPS runtime', flush=True)
runtime = InferenceRuntime.from_key(RuntimeKey(
    checkpoint=str(Path(snapshot) / 'model.safetensors'), model_device='mps', model_precision='fp32',
    codec_device='cpu', codec_precision='fp32'))
runtime_root = Path(inspect.getfile(InferenceRuntime)).resolve().parent.parent
runtime_commit = subprocess.check_output(['git', '-C', str(runtime_root), 'rev-parse', 'HEAD'], text=True).strip()
manifest = {'model': model, 'revision': revision, 'runtimeCommit': runtime_commit,
            'execution': 'local Mac MPS model, CPU codec; fictional designed voices, no user recording',
            'roles': script['roles'], 'settings': {'steps': 32, 'durationScale': 1}, 'lines': []}
refs = {}
for line in script['lines']:
    role = script['roles'][line['role']]
    dest = out / (line['id'] + '.wav')
    print('Generating', line['id'], line['text'], flush=True)
    started = time.monotonic()
    result = runtime.synthesize(SamplingRequest(
        text=line['text'], caption=role['caption'], seed=role['seed'], num_steps=32,
        cfg_scale_caption=4, no_ref=line['role'] not in refs, ref_wav=refs.get(line['role'])), log_fn=print)
    save_wav(dest, result.audio, result.sample_rate)
    refs.setdefault(line['role'], str(dest))
    record = {**line, 'file': dest.name, 'sampleRate': result.sample_rate,
              'seconds': result.audio.shape[-1] / result.sample_rate, 'generationSeconds': time.monotonic() - started,
              'sha256': hashlib.sha256(dest.read_bytes()).hexdigest(), 'messages': result.messages}
    manifest['lines'].append(record)
    (out / 'generation-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print('Saved', line['id'], record['seconds'], 'seconds', flush=True)
