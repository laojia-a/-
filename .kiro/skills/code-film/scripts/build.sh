#!/usr/bin/env bash
# 一键成片。参数：--no-tts 跳过配音（已有 build/tts）；--el 用 ElevenLabs；--audio-only 只重做声音；--from N 从第 N 帧渲染
set -e; cd "$(dirname "$0")"; export PATH="${CODE_FILM_CACHE:-$HOME/.cache/code-film}/bin:$PATH"
TTS=kokoro; AUD=0; FROM=0
while [ $# -gt 0 ]; do case $1 in --no-tts) TTS=none;; --el) TTS=el;; --audio-only) AUD=1;; --from) FROM=$2; shift;; esac; shift; done
case $TTS in kokoro) python3 tts/gen_tts.py;; el) python3 tts/gen_elevenlabs.py;; esac
python3 tts/build_timeline.py
(cd audio && python3 score.py && python3 sfx.py && python3 mix.py)
[ $AUD = 1 ] || node render/render.js frames $FROM "" ${WORKERS:-6}
ffmpeg -v error -stats -y -framerate 30 -i .cache/frames/%06d.jpg -i build/audio/mix.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -tune film -c:a aac -b:a 320k -movflags +faststart -shortest output/film.mp4
echo "✓ output/film.mp4"
