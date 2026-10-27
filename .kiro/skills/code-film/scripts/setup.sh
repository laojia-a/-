#!/usr/bin/env bash
# 安装依赖并下载资源到工程目录：bash setup.sh <工程目录>
# 资源可共享：设置 CODE_FILM_CACHE=某目录（默认 ~/.cache/code-film），只下载一次，工程里建软链接
set -e
P="$(cd "${1:-.}" && pwd)"; C="${CODE_FILM_CACHE:-$HOME/.cache/code-film}"; mkdir -p "$C"/{models,fonts,soundfont,bin}
g() { [ -s "$2" ] || { echo "↓ $(basename "$2")"; curl -fL --retry 3 -o "$2.part" "$1" && mv "$2.part" "$2"; }; }
# ---- 字体（均为 OFL/Apache 授权）
F=$C/fonts; GH=https://github.com; GF=https://raw.githubusercontent.com/google/fonts/main
if [ ! -s "$F/SourceHanSerifCN-Heavy.otf" ]; then
  T=$(mktemp -d)
  g $GH/adobe-fonts/source-han-serif/releases/download/2.003R/14_SourceHanSerifCN.zip $T/serif.zip
  g $GH/adobe-fonts/source-han-sans/releases/download/2.005R/19_SourceHanSansCN.zip $T/sans.zip
  g $GH/JetBrains/JetBrainsMono/releases/download/v2.304/JetBrainsMono-2.304.zip $T/jb.zip
  g $GH/TakWolf/fusion-pixel-font/releases/download/2026.10.16/fusion-pixel-font-12px-proportional-otf.woff2-v2026.10.16.zip $T/px.zip
  g $GH/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip $T/sm.zip
  (cd $T && for z in *.zip; do unzip -q -o $z -d x; done)
  find $T/x -path '*SubsetOTF/CN/*.otf' -exec cp {} $F/ \;
  for w in Regular Medium Bold ExtraBold Light; do cp $T/x/fonts/ttf/JetBrainsMono-$w.ttf $F/; done
  cp $T/x/fusion-pixel-12px-proportional-zh_hans.otf.woff2 $F/FusionPixel-zh_hans.woff2; cp $T/x/SmileySans-Oblique.ttf $F/; rm -rf $T
fi
g $GH/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Regular.ttf $F/LXGWWenKai-Regular.ttf
g $GH/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Medium.ttf $F/LXGWWenKai-Medium.ttf
g $GF/ofl/imfellenglish/IMFeENrm28P.ttf $F/IMFellEnglish-Regular.ttf
g $GF/ofl/imfellenglish/IMFeENit28P.ttf $F/IMFellEnglish-Italic.ttf
g $GF/apache/specialelite/SpecialElite-Regular.ttf $F/SpecialElite-Regular.ttf
g $GF/ofl/liujianmaocao/LiuJianMaoCao-Regular.ttf $F/LiuJianMaoCao-Regular.ttf
g $GF/ofl/mashanzheng/MaShanZheng-Regular.ttf $F/MaShanZheng-Regular.ttf
g "$GF/ofl/orbitron/Orbitron%5Bwght%5D.ttf" $F/Orbitron.ttf
g $GF/ofl/sharetechmono/ShareTechMono-Regular.ttf $F/ShareTechMono-Regular.ttf
g "$GF/ofl/cinzel/Cinzel%5Bwght%5D.ttf" $F/Cinzel.ttf
# ---- 音色库
g https://raw.githubusercontent.com/mrbumpy409/GeneralUser-GS/main/GeneralUser-GS.sf2 $C/soundfont/GeneralUser-GS.sf2
# ---- 语音模型（Kokoro 配音 + SenseVoice 回听）。只用 ElevenLabs 可设 SKIP_KOKORO=1
M=$C/models; KB=$GH/thewh1teagle/kokoro-onnx/releases/download; SB=$GH/k2-fsa/sherpa-onnx/releases/download
if [ -z "$SKIP_KOKORO" ]; then
  g $KB/model-files-v1.1/kokoro-v1.1-zh.onnx $M/kokoro-v1.1-zh.onnx; g $KB/model-files-v1.1/voices-v1.1-zh.bin $M/voices-v1.1-zh.bin
  g $KB/model-files-v1.0/kokoro-v1.0.onnx $M/kokoro-v1.0.onnx;       g $KB/model-files-v1.0/voices-v1.0.bin $M/voices-v1.0.bin
fi
[ -d $M/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09 ] || (curl -fL $SB/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2 | tar -xj -C $M)
cp "$P/tts/kokoro_zh_vocab.json" $M/config-v1.1-zh.json
# ---- ffmpeg（若系统没有；Linux x64）
command -v ffmpeg >/dev/null || { [ -x $C/bin/ffmpeg ] || { g $GH/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz $C/ff.tar.xz; tar -xf $C/ff.tar.xz -C $C; cp $C/ffmpeg-master-latest-linux64-gpl/bin/ff* $C/bin/; }; echo "把 $C/bin 加入 PATH"; }
# ---- 链接到工程
ln -sfn $F "$P/assets/fonts"; ln -sfn $C/soundfont "$P/assets/soundfont"; mkdir -p "$P/.cache"; ln -sfn $M "$P/.cache/models"
# ---- Python / Node 依赖（有 uv 用 uv，否则 pip）
if python3 -m pip --version >/dev/null 2>&1; then PIP="python3 -m pip"; else PIP="uv pip"; fi
$PIP install -q -r "$P/requirements.txt" requests && $PIP install -q --no-deps tinysoundfont
$PIP install -q https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.8.0/en_core_web_sm-3.8.0-py3-none-any.whl || true
(cd "$P/render" && npm install --silent)
echo "✓ 完成。试跑示例：cd $P && ./build.sh"
