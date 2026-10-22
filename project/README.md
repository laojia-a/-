# 《监查者》完整工程（源码 + 素材）

整片都是代码生成的：**旁白 → 时间轴 → 画面 / 配乐 / 音效**。三者都从 `build/timeline.json` 读取时间，所以换掉配音后重新生成时间轴，画面和音乐会自动重新对齐。

## 目录

| 路径 | 内容 |
|---|---|
| `script/lines.py` | **全部台词**：`sub` 是屏幕字幕，`tts` 是送进语音合成的文本（数字、多音字做过读音处理），`pre/post` 是句前/句后停顿（秒），每个场景的 `lead/tail` 是场景首尾留白 |
| `tts/` | 语音合成（`gen_tts.py`）、ASR 回听校验（`check_asr.py`）、生成时间轴（`build_timeline.py`） |
| `render/` | 画面：`scenes/act0~act5.js` 是 24 个场景，`engine.js` 是合成与后期，`render.js` 是并行逐帧渲染器 |
| `audio/` | `score.py` 配乐、`sfx.py` 音效、`mix.py` 混音母带并导出 SRT |
| `assets/fonts/` | 全部字体（OFL / Apache 授权） |
| `assets/soundfont/` | GeneralUser GS 音色库 |
| `build/timeline.json` | 当前版本的时间轴 |
| `build/tts/` | 当前每句配音（FLAC）、音素时间戳（`meta.json`）、回听报告 |
| `stems/` | 分轨（48k FLAC）：`voice` 人声、`music_leveled` 配乐（已按场景调平和闪避）、`sfx_leveled` 音效+环境声、`mix` 成品混音、`music_raw` / `hits_raw` 未处理配乐和打点音 |

GitHub 单文件上限 100MB，所以 Kokoro 模型、ASR 模型、ffmpeg、Chromium 没放进来，由 `setup.sh` 下载。

## 配音用的是什么，节奏为什么怪

- 中文旁白：**Kokoro-82M v1.1-zh**（本地 ONNX 推理），阿格斯用音色 `zm_089`，林夏用 `zf_059`；英文引文用 Kokoro v1.0 的 `bm_george` / `am_michael`。原因是制作环境连不上 ElevenLabs，也没有 API Key。
- 节奏怪的主要原因（都在代码里，可以直接改）：
  1. **逐句单独合成**，每句之间没有上下文，语调每句都“重新起头”，句尾也常常不收。
  2. 每句首尾静音被裁掉（`gen_tts.py` 的 `synth()`），然后按 `lines.py` 里固定的 `post` 停顿（0.3–0.9 秒）硬拼，换气感不自然。
  3. 为了纠正读音，`tts` 文本里插了很多逗号和同音字（如“以人维本”“堪守”），逗号会造成多余的停顿。
  4. Kokoro 本身韵律偏平、语速恒定，没有重音和情绪起伏。

## 换成更好的配音（推荐流程）

最省事的做法：**用你自己的配音（ElevenLabs、其他 TTS 或真人录音）替换 `build/tts/L001.wav … L074.wav`**，一句一个文件，文件名对应 `script/lines.py` 里的 `id`。然后：

```bash
python tts/build_timeline.py      # 按新配音时长重排时间轴（会读 build/tts/meta.json 的 dur，替换后需同步更新，见下）
python audio/score.py && python audio/sfx.py && python audio/mix.py
node render/render.js frames 0 <总帧数> 6   # 总帧数见 timeline.json 的 frames
ffmpeg -framerate 30 -i .cache/frames/%06d.jpg -i build/audio/mix.wav -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 320k out.mp4
```

替换配音后更新 `meta.json` 里每句时长的简便方法：

```python
import json, soundfile as sf
m = json.load(open('build/tts/meta.json', encoding='utf-8'))
for k in m: m[k]['dur'] = sf.info(f'build/tts/{k}.wav').duration
json.dump(m, open('build/tts/meta.json', 'w', encoding='utf-8'), ensure_ascii=False)
```

如果配音换成整段连续录音，建议先按句切开再放进来，否则长句字幕分段（依赖 `meta.json` 里的 `timings`）会不准；不需要分段也可以把 `timings` 留空。

## 其他说明

- 路径：模型和缓存默认在工程下的 `.cache/`，可用环境变量 `JCZ_CACHE` 改；Node 依赖默认在 `render/node_modules`，可用 `JCZ_NODE_MODULES` 改。
- 渲染依赖 `@sparticuz/chromium`（为 Linux/AWS Lambda 打包的 Chromium）。在 Windows / macOS 上要把 `render.js` 里的 `executablePath` 换成本机 Chrome 路径，并去掉 `chromium.args`。
- 改单个场景只需重渲染对应帧区间（渲染器会跳过已存在的帧，删掉那段帧即可）。
- 预览单帧：`node render/render.js preview <输出目录> s08_onepointone:25`。

## 用 ElevenLabs 重新配音（在你自己的电脑上运行）

```bash
pip install requests soundfile numpy
export ELEVENLABS_API_KEY=你的key            # Windows: set ELEVENLABS_API_KEY=你的key
export EL_VOICE_ARGUS=阿格斯的voice_id        # 可选，在 ElevenLabs Voice Library 里复制
export EL_VOICE_LIN=林夏的voice_id            # 可选
python tts/gen_elevenlabs.py                  # 生成全部 74 句，覆盖 build/tts/ 并更新 meta.json
python tts/gen_elevenlabs.py L030 L074        # 只重做某几句
```

脚本会把前后句作为上下文传给 ElevenLabs，句与句之间的语调会连贯得多；直接使用规范中文文本，不再需要 Kokoro 的同音字处理。生成后按上面的流程重建时间轴、配乐、混音并渲染。若要调整停顿，改 `script/lines.py` 里各句的 `post`。
