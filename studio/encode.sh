#!/usr/bin/env bash
# 帧序列 + 母带 → 成片 MP4（两遍 x264，BT.709）。在 studio/ 下运行。
#   ./encode.sh EP01 out.mp4              在线观看版：1500 kbps，7.5 分钟约 95 MB（放得进 GitHub）
#   MODE=master ./encode.sh EP01 out.mp4  B 站上传母版：CRF 16，单遍，文件大，不进仓库
#   LIMIT=90 ./encode.sh EP01 test.mp4    只编前 90 帧，试参数用
set -euo pipefail
EP=${1:-EP01}; OUT=${2:-$EP.mp4}; BR=${BR:-1500k}; MODE=${MODE:-online}
FR=".cache/frames/$EP/%06d.jpg"; AU="build/$EP/audio/mix.wav"
[ -f ".cache/frames/$EP/000000.jpg" ] || { echo "没有帧：先渲染 render.js frames" >&2; exit 1; }
[ -f "$AU" ] || { echo "没有母带：先跑 audio/mix.py $EP" >&2; exit 1; }
# JPEG 帧是 BT.601 全范围，显式转成 BT.709 有限范围，否则播放器偏色
VF="scale=in_color_matrix=bt601:in_range=pc:out_color_matrix=bt709:out_range=tv,format=yuv420p"
X="aq-mode=3:aq-strength=0.85"          # 暗场多，aq-mode=3 把码率偏给暗部，减少色带
LIM=(); [ -n "${LIMIT:-}" ] && LIM=(-frames:v "$LIMIT")
TAG=(-colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv)
AUD=(-c:a aac -b:a 192k -ar 48000 -ac 2 -shortest -movflags +faststart)
if [ "$MODE" = master ]; then
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 30 -i "$FR" -i "$AU" -map 0:v:0 -map 1:a:0 "${LIM[@]}" -vf "$VF" \
    -c:v libx264 -preset slow -crf 16 -x264-params "$X" -profile:v high "${TAG[@]}" "${AUD[@]/192k/320k}" "$OUT"
else
  LOG=$(mktemp -d)/x264
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 30 -i "$FR" "${LIM[@]}" -vf "$VF" \
    -c:v libx264 -preset slow -b:v "$BR" -pass 1 -passlogfile "$LOG" -x264-params "$X" -an -f null /dev/null
  ffmpeg -hide_banner -loglevel error -stats -y -framerate 30 -i "$FR" -i "$AU" -map 0:v:0 -map 1:a:0 "${LIM[@]}" -vf "$VF" \
    -c:v libx264 -preset slow -b:v "$BR" -pass 2 -passlogfile "$LOG" -x264-params "$X" -profile:v high -level 4.1 \
    "${TAG[@]}" "${AUD[@]}" "$OUT"
  rm -rf "$(dirname "$LOG")"
fi
ls -la "$OUT"
