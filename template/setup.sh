#!/usr/bin/env bash
# 安装依赖并下载模型、字体、音色库（都放不进 GitHub 或不该重复存）。需要 Python 3.11+、Node 20+、ffmpeg。
set -e; cd "$(dirname "$0")"
mkdir -p .cache/models assets/fonts assets/soundfont
# 字体/音色库：若本仓库的 ../project/assets 存在就直接复制
if [ -d ../project/assets/fonts ]; then cp -n ../project/assets/fonts/* assets/fonts/; cp -n ../project/assets/soundfont/* assets/soundfont/;
else
  curl -L -o assets/soundfont/GeneralUser-GS.sf2 https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2
  echo "请把字体放进 assets/fonts/（文件名见 render/engine.js 的 FONTS 列表；可从本仓库 project/assets/fonts 复制）"
fi
M=.cache/models; B=https://github.com/thewh1teagle/kokoro-onnx/releases/download; S=https://github.com/k2-fsa/sherpa-onnx/releases/download
[ -f $M/kokoro-v1.1-zh.onnx ] || curl -L -o $M/kokoro-v1.1-zh.onnx $B/model-files-v1.1/kokoro-v1.1-zh.onnx
[ -f $M/voices-v1.1-zh.bin ]  || curl -L -o $M/voices-v1.1-zh.bin  $B/model-files-v1.1/voices-v1.1-zh.bin
[ -f $M/kokoro-v1.0.onnx ]    || curl -L -o $M/kokoro-v1.0.onnx    $B/model-files-v1.0/kokoro-v1.0.onnx
[ -f $M/voices-v1.0.bin ]     || curl -L -o $M/voices-v1.0.bin     $B/model-files-v1.0/voices-v1.0.bin
[ -d $M/kokoro-int8-multi-lang-v1_1 ] || (curl -L $S/tts-models/kokoro-int8-multi-lang-v1_1.tar.bz2 | tar -xj -C $M)
[ -d $M/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09 ] || (curl -L $S/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2 | tar -xj -C $M)
python3 -c "
import json;v={}
for l in open('$M/kokoro-int8-multi-lang-v1_1/tokens.txt',encoding='utf-8'):
    l=l.rstrip('\n')
    if l: v[l[:l.rfind(' ')]]=int(l[l.rfind(' ')+1:])
json.dump({'vocab':v},open('$M/config-v1.1-zh.json','w',encoding='utf-8'),ensure_ascii=False)"
pip install -r requirements.txt requests && pip install --no-deps tinysoundfont
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
(cd render && npm install)
echo 完成
