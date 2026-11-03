"""Check the encoded artifact, including Wave presence and actual mixed audio.

Use the Irodori authoring environment (numpy/scipy) and pass the final MP4 path.
"""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from scipy.signal import correlate, correlation_lags

video = Path(sys.argv[1])
ffmpeg = '/opt/homebrew/bin/ffmpeg'
info = json.loads(subprocess.check_output(['/opt/homebrew/bin/ffprobe', '-v', 'error', '-show_entries',
    'format=duration,size:stream=codec_name,width,height,r_frame_rate,sample_rate,channels', '-of', 'json', str(video)]))
def audio(path):
    return np.frombuffer(subprocess.check_output([ffmpeg, '-v', 'error', '-i', str(path), '-ac', '1', '-ar', '8000', '-f', 'f32le', 'pipe:1']), dtype=np.float32)
reference = audio(Path('work/demo-video/prepared/conversation.wav'))
actual = audio(video)
corr = correlate(actual, reference, mode='full', method='fft')
lags = correlation_lags(len(actual), len(reference), mode='full')
lag = int(lags[np.argmax(corr)])
a = actual[max(0, lag):max(0, lag) + len(reference)]
b = reference[max(0, -lag):max(0, -lag) + len(a)]
coefficient = float(np.corrcoef(a[:len(b)], b)[0, 1])
raw = subprocess.check_output([ffmpeg, '-v', 'error', '-i', str(video), '-an', '-vf',
    'crop=900:640:510:150,scale=90:64', '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1'])
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, 64, 90, 3).astype(np.int16)
# Color interpolation can be temporarily desaturated. Presence must use luminance,
# not a saturation threshold; the isolated Wave region has no text or captions.
present = (frames.max(axis=3) > 45).sum(axis=(1, 2))
red = ((frames[:, :, :, 0] - frames[:, :, :, 2] > 40) & (frames[:, :, :, 0] > 95)).sum(axis=(1, 2))
blue = ((frames[:, :, :, 2] - frames[:, :, :, 0] > 40) & (frames[:, :, :, 2] > 95)).sum(axis=(1, 2))
report = {'media': info, 'frames': len(frames), 'framesWithWave': int((present > 100).sum()),
          'minimumWavePixels': int(present.min()), 'twoColorFrameCount': int(((red > 100) & (blue > 100)).sum()),
          'audioFileOffsetSeconds': lag / 8000, 'audioCorrelationToMixedStems': coefficient,
          'scope': 'Encoded file comparison, not microphone or TTS latency measurement'}
assert coefficient > .97, 'Captured audio differs from source stems'
assert present.min() > 100, 'Missing Wave in an encoded frame'
assert ((red > 100) & (blue > 100)).sum() > 20, 'No sustained two-color overlap'
report['passed'] = True
video.with_name('video-check.json').write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=2))
