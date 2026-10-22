# BE试验CRA职责｜抖音竖屏科普视频

一条 2 分 50 秒的竖屏短视频，讲生物等效性（BE）试验里临床监查员（CRA）要做什么：启动前、进行中、结束后的工作清单，BE 核查五大雷区，以及 2026 年 9 月 1 日起施行的新版 GCP 要点。新人和资深同行都适用。配音为 AI 语音合成，画面右上角带“AI合成配音”标识。

<img src="output/封面_1080x1920.png" width="300" alt="封面">

## 成片（`output/`）

| 文件 | 说明 |
|---|---|
| [BE试验CRA职责_抖音成片.mp4](output/BE试验CRA职责_抖音成片.mp4) | 发布用：1080×1920、30fps，AI 配音 + 字幕 + 背景音乐 |
| [BE试验CRA职责_无背景音乐版.mp4](output/BE试验CRA职责_无背景音乐版.mp4) | 画面相同、没有背景音乐，方便在抖音里配热门 BGM |
| [封面_1080x1920.png](output/封面_1080x1920.png) | 封面 |
| [字幕.srt](output/字幕.srt) | 字幕文件（成片里已经烧录了字幕，二次剪辑时再用） |
| [发布文案与脚本.md](output/发布文案与脚本.md) | 标题、作品描述、话题标签、带时间码的口播稿、内容依据 |

**下载**：点开文件，再点右上角的下载按钮（Download raw file）。GitHub 网页不能直接播放视频，需要下载后观看。

## 源码（`source/`）

整条视频由 Python 程序生成：离线 TTS 配音（Kokoro v1.1-zh，音色 16）、Pillow 逐帧绘制动画、ffmpeg 编码。要改口播稿或字幕，改 `script_data.py` 后重新生成即可。

脚本里的路径写死为 `/projects/sandbox/work`，复现时把 `source/` 里的文件放进这个目录，再准备依赖：

```bash
cd /projects/sandbox/work
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
ln -sf "$(python -c 'import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())')" ffmpeg

# 模型
mkdir -p models && cd models
R=https://github.com/k2-fsa/sherpa-onnx/releases/download
curl -L $R/tts-models/kokoro-multi-lang-v1_1.tar.bz2 | tar xjf -                                 # 配音（Apache-2.0）
curl -L $R/asr-models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09.tar.bz2 | tar xjf -# 质检用语音识别
curl -L -o dnsmos_sig_bak_ovr.onnx https://github.com/microsoft/DNS-Challenge/raw/master/DNSMOS/DNSMOS/sig_bak_ovr.onnx  # 选音色时的音质评分，可选
cd ..

# 字体（SIL OFL 1.1）
mkdir -p fonts && cd fonts
curl -LO https://github.com/atelier-anchor/smiley-sans/releases/download/v2.0.1/smiley-sans-v2.0.1.zip
curl -LO https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/18_NotoSansSC.zip
unzip -o smiley-sans-v2.0.1.zip SmileySans-Oblique.ttf && unzip -o 18_NotoSansSC.zip 'NotoSansSC-*.otf'
cd ..
```

生成顺序：

```bash
python build_audio.py       # 配音、音效、背景音乐、时间轴、字幕 → build/
python render.py --render   # 画面 → build/video_noaudio.mp4（可先用 --preview 12,40 出几张静帧检查）
python mux.py               # 响度标准化（-14 LUFS），合成两个版本 → /projects/sandbox/output/
python make_cover.py        # 封面
python make_doc.py          # 发布文案与字幕
python qa_audio.py          # 可选：用语音识别逐句回检配音
```
