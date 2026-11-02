# Japanese demonstration samples

The three WAV files are synthesized test material, not a recording of a user. They were generated with Open JTalk 1.11 using **HTS Voice “NIT ATR503 M001” version 1.05**, released by the HTS Working Group.

Voice attribution: Copyright (c) 2003–2012 Nagoya Institute of Technology, Department of Computer Science; 2003–2008 Tokyo Institute of Technology, Interdisciplinary Graduate School of Science and Engineering. Voice source and terms: https://open-jtalk.sourceforge.net/readme_hts_voice_nitech_jp_atr503_m001.php . Licensed under [Creative Commons Attribution 3.0 Unported](https://creativecommons.org/licenses/by/3.0/); the full notice is in `../licenses/nitech-voice-CC-BY-3.0.txt`. No endorsement is implied.

The sample text was authored for Voice Wave. The samples are distributed under CC BY 3.0 with the attribution above. Changes: synthesis at speaking rate 1.1; 1 second leading and 1.5 seconds trailing silence; conversion to 16 kHz mono PCM16 WAV. Open JTalk is a Modified-BSD synthesis tool; it is not part of the browser runtime or React package.

| File | Text | Use |
|---|---|---|
| `voice-check.wav` | こんにちは。声の動きを試しています。話している間だけ、赤く光ります。 | Silent analysis with the real VAD |
| `agent-voice.wav` | はい。声の強さと響きに合わせて、青い波が動いています。 | Audible output sample |
| `eval-short.wav` | はい。 | Short-utterance fixture |

Run `scripts/audio-prepare-fixtures.sh` from the repository to regenerate all three. On macOS, prerequisites are `brew install open-jtalk ffmpeg`. On other platforms, set `OPEN_JTALK_ROOT` to a matching installation. Intermediate WAV/text files remain in ignored `work/audio/`.

`eval-results.json` contains model probabilities and state transitions measured on these fixed samples. It is a synthetic gate comparison, not a general Japanese accuracy benchmark. See `docs/STATUS.md` for test limitations.
