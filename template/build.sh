#!/usr/bin/env bash
# 一键成片：配音 → 时间轴 → 配乐 → 音效 → 混音 → 渲染 → 合成。可传参数跳过：./build.sh --no-tts（已有配音时）
set -e; cd "$(dirname "$0")"
[ "$1" = "--no-tts" ] || python tts/gen_tts.py            # 或 python tts/gen_elevenlabs.py
python tts/build_timeline.py
(cd audio && python score.py && python sfx.py && python mix.py)
node render/render.js frames 0 "" ${WORKERS:-6}
mkdir -p output
ffmpeg -y -framerate 30 -i .cache/frames/%06d.jpg -i build/audio/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 320k -movflags +faststart -shortest output/film.mp4
echo "成片：output/film.mp4"
