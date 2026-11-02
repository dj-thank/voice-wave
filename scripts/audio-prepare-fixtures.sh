#!/usr/bin/env bash
# Regenerate distributable Japanese samples with Open JTalk + NIT ATR503 M001.
# Prerequisites on macOS: brew install open-jtalk ffmpeg
# Other platforms: set OPEN_JTALK_ROOT to a matching installation (dic/ and voice/m100/).
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ -z "${OPEN_JTALK_ROOT:-}" ]]; then
  OPEN_JTALK_ROOT="$(brew --prefix open-jtalk)"
fi
OPEN_JTALK_BIN="${OPEN_JTALK_BIN:-$OPEN_JTALK_ROOT/bin/open_jtalk}"
FFMPEG_BIN="${FFMPEG_BIN:-ffmpeg}"
VOICE_MODEL="$OPEN_JTALK_ROOT/voice/m100/nitech_jp_atr503_m001.htsvoice"
mkdir -p work/audio public/samples
printf '%s\n' 'こんにちは。声の動きを試しています。話している間だけ、赤く光ります。' > work/audio/voice-check.txt
printf '%s\n' 'はい。声の強さと響きに合わせて、青い波が動いています。' > work/audio/agent-voice.txt
printf '%s\n' 'はい。' > work/audio/eval-short.txt
for sample in voice-check agent-voice eval-short; do
  "$OPEN_JTALK_BIN" -x "$OPEN_JTALK_ROOT/dic" -m "$VOICE_MODEL" -r 1.1 -ow "work/audio/$sample-raw.wav" "work/audio/$sample.txt"
  "$FFMPEG_BIN" -hide_banner -loglevel error -y -i "work/audio/$sample-raw.wav" -af 'adelay=1000,apad=pad_dur=1.5' -ar 16000 -ac 1 -c:a pcm_s16le "public/samples/$sample.wav"
done
printf '%s\n' 'Prepared 3 Japanese Open JTalk samples. Preserve public/samples/README.md and the Nitech CC BY 3.0 notice when redistributing.'
