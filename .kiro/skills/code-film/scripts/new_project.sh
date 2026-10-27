#!/usr/bin/env bash
# 新建一个影片工程：bash new_project.sh <目标目录>
set -e
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; DST="${1:?用法: new_project.sh <目标目录>}"
[ -e "$DST" ] && { echo "目标已存在：$DST"; exit 1; }
mkdir -p "$DST"; cp -r "$SKILL/template/." "$DST/"; mkdir -p "$DST"/{build/tts,build/audio,output,.cache,assets}
cp "$SKILL/scripts/build.sh" "$SKILL/scripts/preview.sh" "$DST/"; chmod +x "$DST"/*.sh
echo "已创建：$DST"
echo "下一步：bash $SKILL/scripts/setup.sh $DST    # 安装依赖、下载模型/字体/音色库（首次约 1.5GB）"
