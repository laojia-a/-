#!/usr/bin/env bash
# 出静帧联系表审稿：./preview.sh s01_hbo:3 s01_hbo:8 s02_hollywood:5   → output/preview.jpg
set -e; cd "$(dirname "$0")"; rm -rf .cache/preview; node render/render.js preview .cache/preview "$@" >/dev/null
python3 render/sheet.py .cache/preview output/preview.jpg ${COLS:-3} 640 && echo "✓ output/preview.jpg"
