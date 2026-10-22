#!/usr/bin/env bash
# 下载 GitHub 放不下的模型（>100MB），并安装依赖。需要 Python 3.11+、Node 20+、ffmpeg。
set -e
cd "$(dirname "$0")"
M=.cache/models; mkdir -p $M
B=https://github.com/thewh1teagle/kokoro-onnx/releases/download
[ -f $M/kokoro-v1.1-zh.onnx ] || curl -L -o $M/kokoro-v1.1-zh.onnx $B/model-files-v1.1/kokoro-v1.1-zh.onnx
[ -f $M/voices-v1.1-zh.bin ]  || curl -L -o $M/voices-v1.1-zh.bin  $B/model-files-v1.1/voices-v1.1-zh.bin
[ -f $M/kokoro-v1.0.onnx ]    || curl -L -o $M/kokoro-v1.0.onnx    $B/model-files-v1.0/kokoro-v1.0.onnx
[ -f $M/voices-v1.0.bin ]     || curl -L -o $M/voices-v1.0.bin     $B/model-files-v1.0/voices-v1.0.bin
S=https://github.com/k2-fsa/sherpa-onnx/releases/download
[ -d $M/kokoro-int8-multi-lang-v1_1 ] || (curl -L $S/tts-models/kokoro-int8-multi-lang-v1_1.tar.bz2 | tar -xj -C $M)   # 只为取 tokens.txt
[ -d $M/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09 ] || (curl -L $S/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2 | tar -xj -C $M)
python3 - <<'PY'
import json
v={}
for l in open('.cache/models/kokoro-int8-multi-lang-v1_1/tokens.txt',encoding='utf-8'):
    l=l.rstrip('\n')
    if l: v[l[:l.rfind(' ')]]=int(l[l.rfind(' ')+1:])
json.dump({"vocab":v},open('.cache/models/config-v1.1-zh.json','w',encoding='utf-8'),ensure_ascii=False)
PY
pip install -r requirements.txt && pip install --no-deps tinysoundfont
pip install https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl
(cd render && npm install)
echo "完成。"
