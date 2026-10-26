# studio：《剂量》制作工程（源自《监查者》）

整片由代码生成，流程是“旁白 → 时间轴 → 画面 / 配乐 / 音效”。三者都从 `build/<EP>/timeline.json` 读时间，换配音后重建时间轴，画面和音乐会自动重新对齐。

## 目录

| 路径 | 内容 |
| --- | --- |
| `episodes/<EP>/lines.py` | 该集全部旁白：`sub` 字幕、`tts` 送进语音合成的文本（读音修正写这里）、`pre/post` 停顿、场景 `lead/tail/min_dur`；`MIX_TARGET` 各场景配乐电平 |
| `episodes/<EP>/scenes.js` | 该集画面场景（Canvas2D，`def()` 注册，`transition()` 定义转场） |
| `episodes/<EP>/score.py` | 该集配乐（`CUES` 列表，可选 `MASTER_KEYS` 全局静音自动化） |
| `episodes/<EP>/sfx.py` | 该集音效表（`build_sfx()`） |
| `render/` | `engine.js` 合成与后期（泛光、色差、颗粒、暗角、调色、故障、转场、字幕），`render.js` 并行逐帧渲染 |
| `audio/` | `dsp.py` 合成音色与音效库，`score.py` 配乐引擎（GeneralUser GS 音色库），`sfx.py`，`mix.py` 混音母带（−16 LUFS）与 SRT |
| `tts/` | `gen_kokoro.py` 临时配音，`build_timeline.py` 时间轴。ElevenLabs 正式配音脚本等密钥接通后再加（参照《监查者》`tts/gen_elevenlabs.py`：逐句传前后句上下文） |
| `assets/` | 字体（OFL / Apache）与音色库 |

`build/`、`.cache/`（帧、模型）、`render/node_modules/` 不进仓库。

## 一集的完整流程

```bash
cd studio
python tts/gen_kokoro.py EP01            # 临时配音；正式版换 ElevenLabs
python tts/build_timeline.py EP01
python audio/score.py EP01 && python audio/sfx.py EP01 && python audio/mix.py EP01
cd render && npm install
EP=EP01 node render.js frames 0 <总帧数> 6        # 总帧数见 timeline.json 的 frames
EP=EP01 node render.js previewg <目录> 3.4 19.2   # 按全片秒数出预览帧
cd .. && ffmpeg -framerate 30 -i .cache/frames/EP01/%06d.jpg -i build/EP01/audio/mix.wav \
  -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 320k -shortest EP01.mp4
```

## 依赖

- Python 3.11+：`numpy scipy soundfile pyloudnorm pillow`，`tinysoundfont`（加 `--no-deps`），临时配音另需 `kokoro-onnx==0.6.1 misaki[zh]==0.9.4`。
- Kokoro 模型放在 `.cache/models/` 或用 `DOSE_MODELS` 指定：`kokoro-v1.1-zh.onnx`、`voices-v1.1-zh.bin`（thewh1teagle/kokoro-onnx releases）；`config-v1.1-zh.json` 由 sherpa-onnx `kokoro-int8-multi-lang-v1_1` 的 `tokens.txt` 生成，方法见《监查者》`setup.sh`。
- Node 20+：`render/package.json`（puppeteer-core、@sparticuz/chromium、three）。在 Windows / macOS 上，要把 `render.js` 的 `executablePath` 换成本机 Chrome，并去掉 `chromium.args`。
