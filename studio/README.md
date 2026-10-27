# studio：《剂量》制作工程（源自《监查者》）

整片由代码生成，流程是“旁白 → 时间轴 → 画面 / 配乐 / 音效”。三者都从 `build/<EP>/timeline.json` 读时间：换配音后重建时间轴，画面、音乐、音效会自动重新对齐。

**系列标准**：每一集、每一个场景都走完整套后期（泛光、色差、颗粒、调色、故障、转场）和作曲引擎（逐拍配乐 + 对位音效 + 母带）。不允许出现只有画面、没有配乐或音效的段落，见 `系列制作规范_剂量.md`。

## 目录

| 路径 | 内容 |
| --- | --- |
| `episodes/<EP>/lines.py` | 该集全部旁白，是字幕和配音唯一的来源：`sub` 字幕，`tts` 送进语音合成的文本（读音修正写这里），`pre/post` 停顿，场景 `lead/tail/min_dur`。另有 `MIX_TARGET`（各场景配乐电平）、`MIX_FIXED`（固定增益） |
| `episodes/<EP>/scenes.js` | 场景入口：EP01 拆成 `lib.js`（共用组件）和 `act0–act5.js`（冷开场、四章、终章与收尾） |
| `episodes/<EP>/score.py` | 该集配乐：`CUES` 列表，每个场景一个函数，按 `cue(句, 关键词)` 对拍；`MASTER_KEYS` 是全局静音自动化（骤停、定格） |
| `episodes/<EP>/sfx.py` | 该集音效表 `build_sfx()`，时间公式与画面一致 |
| `render/` | `engine.js` 负责合成与后期（泛光、色差、颗粒、暗角、调色、故障、转场、字幕），`render.js` 负责并行逐帧渲染 |
| `audio/` | `dsp.py` 合成音色与音效库，`score.py` 配乐引擎（GeneralUser GS 音色库），`sfx.py`，`mix.py` 混音母带（−16 LUFS，−2 dBTP）与 SRT |
| `tts/` | `gen_elevenlabs.py` 正式配音，`estimate.py` 无配音时估算时长，`build_timeline.py` 生成时间轴 |
| `assets/` | 字体（OFL / Apache）与音色库 |

`build/`、`.cache/`（帧缓存）、`render/node_modules/` 不进仓库。

## 一集的完整流程

```bash
cd studio
python tts/gen_elevenlabs.py EP01        # 有密钥时：真实配音（逐字时间戳）；没有就用下一行
python tts/estimate.py EP01              # 无配音：按 4.4 音节/秒估算，混音自动出“音乐 + 音效”版（M&E）
python tts/build_timeline.py EP01
python audio/score.py EP01 && python audio/sfx.py EP01 && python audio/mix.py EP01
cd render && npm install
EP=EP01 node render.js previewg <目录> 3.4 19.2   # 按全片秒数出预览帧，先看
EP=EP01 node render.js frames 0 <总帧数> 6        # 总帧数见 timeline.json 的 frames；已有的帧会跳过
cd ..
```

编码用 `encode.sh`（两遍 x264；帧是 BT.601 全范围 JPEG，脚本里显式转成 BT.709，否则播放器偏色）：

```bash
./encode.sh EP01 EP01.mp4                 # 在线观看版 1500 kbps，7.5 分钟约 95 MB，放得进 GitHub（与《监查者》在线版同档）
MODE=master ./encode.sh EP01 EP01_B站.mp4  # 上传 B 站用的母版，CRF 16，不进仓库
```

## 改片子从哪下手

所有素材都由代码生成，仓库里没有中间素材文件：帧、音频分轨、时间轴都能从源码重建（10-27 从全新克隆重跑验证：时间轴、四条音频分轨、母带与原工程逐样本一致；抽查 15 帧，10 帧逐像素一致，其余是 JPEG 量化级的差异，PSNR ≥ 58 dB）。

| 想改 | 改哪 | 之后重跑 |
| --- | --- | --- |
| 字幕 / 旁白文字、停顿 | `episodes/EP01/lines.py` | 全部（时间会变） |
| 某个场景的画面 | `episodes/EP01/act*.js`（`def('sXX_…')`），共用组件在 `lib.js` | 先 `previewg` 看几帧；定了再删掉该场景的帧（帧号 = 秒 × 30），`frames` 只补缺的帧 |
| 某段配乐 | `episodes/EP01/score.py` 里对应的 `m_…()` | `audio/score.py` → `mix.py` → 重新编码（不用重渲画面） |
| 某个音效 | `episodes/EP01/sfx.py` | `audio/sfx.py` → `mix.py` → 重新编码 |
| 场景音乐电平 | `lines.py` 的 `MIX_TARGET` / `MIX_FIXED` | `mix.py` → 重新编码 |
| 后期质感（泛光、颗粒、调色、故障） | 场景的 `post:`，或 `render/engine.js` | 重渲受影响的帧 |

全片重渲约 50 分钟（8 核，约 4.5 帧/秒），两遍编码约 6 分钟。

## 依赖

- Python 3.11+：`pip install -r requirements.txt && pip install --no-deps tinysoundfont==0.3.7`。
- Node 20+：`render/package.json`（puppeteer-core、@sparticuz/chromium、three）。在 Windows / macOS 上，要把 `render.js` 的 `executablePath` 换成本机 Chrome，并去掉 `chromium.args`。
- ffmpeg（含 libx264）。
