# 代码生成视频模板（来自《监查者》）

一套“台词驱动”的视频引擎：**写台词 → 配音 → 自动生成时间轴 → 画面、配乐、音效、字幕全部按时间轴对齐**。改一句话、换一个配音，整片自动重排。

自带示例（2 个场景、3 句旁白，18 秒）已实测跑通：`./setup.sh && ./build.sh`。

## 目录

```
script/lines.py          台词与场景结构（唯一的事实来源）
tts/gen_tts.py           Kokoro 本地配音（免费、离线，音质一般）
tts/gen_elevenlabs.py    ElevenLabs 配音（推荐，带前后句上下文）
tts/check_asr.py         语音识别回听，找读错的字
tts/build_timeline.py    按真实配音时长生成 build/timeline.json
render/engine.js         渲染引擎：Canvas2D + three.js 合成，后期链，转场，字幕，水印
render/presets.js        后期预设（cyber / archive / paper / bw / warm / ui / climax）
render/scenes/lib.js     可复用视觉组件（眼睛、点云地球、粒子、纸张、印章、帆船、海、警示条、超空间、行李箱）
render/scenes/example.js 示例场景 —— 新项目从这里开始写
render/render.js         并行逐帧渲染：frames / preview / cover
audio/score_core.py      作曲引擎（音色库乐器、和弦、琶音、自动化、打点总线、骤停）
audio/cues.py            每个场景的配乐 —— 新项目在这里写
audio/sfx.py             音效与环境声 —— 新项目在这里写
audio/dsp.py             30+ 种程序化音效与混响/滤波
audio/mix.py             混音母带：旁白处理、闪避、分场景调平、−16 LUFS、限幅、导出 SRT
audio/levels.json        各场景音乐电平
build.sh                 一键成片
docs/PROMPTS.md          让 AI 帮你做新片的提示词
docs/PLAYBOOK.md         导演手册：叙事模板、后期/转场/声音规则、审片清单
```

## 新项目 5 步

1. 用 `docs/PROMPTS.md` 的提示词生成台词，填进 `script/lines.py`。
2. 配音：`python tts/gen_elevenlabs.py`（或 `gen_tts.py`），再 `python tts/check_asr.py` 查读音。**先听一遍配音再往下做。**
3. `python tts/build_timeline.py`，看每个场景时长。
4. 在 `render/scenes/` 写场景（一个场景一个 `def('场景id', {...})`），用 `node render/render.js preview 输出目录 场景id:秒` 出静帧审稿。
5. 在 `audio/cues.py`、`audio/sfx.py` 写配乐和音效，然后 `./build.sh --no-tts`。

## 场景代码约定

- `draw(S)`：`S.ctx` 背景画布，`S.fg` 前景画布，`S.t` 场景内时间，`S.L('L003')` 返回该句的 `{s, e, d}`（场景内的开始/结束/时长）。
- **画面必须是 t 的纯函数**（不能存状态、不能用 Math.random），随机用 `rng(seed)` / `ihash(i)`。这样任意帧能单独渲染、多进程并行。
- 动画写法：`p(t, a, b)` 得到 0→1 的进度，再套缓动 `eOut / eInOut / eOutExpo / eOutBack`；淡入淡出用 `env(t, 开始, 结束, 淡入, 淡出)`。
- 后期：`post: P.cyber` 或 `post: (S) => ({...})` 随时间变化；冲击时在 draw 里写 `S.post.glitch = ...`、`S.post.flash = ...`。
- 转场写在**后一个**场景上：`transition('s02', { type: 'black' | 'cross' | 'white' | 'glitch', d: .8 })`。
- 3D：用 three.js 建场景后 `S.render3d(scene, camera)`。
- 音效/配乐的时间点用和画面相同的表达式（如 `ls('L002') + .5`），声画就天然同步。

## 平台说明

渲染用 `@sparticuz/chromium`（Linux 版）。Windows / macOS 请把 `render/render.js` 里的 `executablePath` 改成本机 Chrome 路径、去掉 `chromium.args`。水印文字在 `render/main.js` 的 `E.brand`。
