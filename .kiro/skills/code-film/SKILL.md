---
name: code-film
description: 用代码生成有电影质感的叙事短片/知识类视频（B站、YouTube）。台词驱动：写台词→配音→自动时间轴→Canvas/three.js 画面、程序化配乐与音效、混音母带、硬字幕，一键出 1080p 成片。内置好莱坞大片、HBO 剧集、黑白、赛博等后期预设。当用户要“做一个视频/短片/纪录片/宣传片”“有电影感/大片感/美剧质感”，或要修改用本技能做出的工程时使用。
---

# code-film：代码生成电影级短片

一切以 `script/lines.py`（台词）为唯一事实来源。配音的真实时长生成 `build/timeline.json`，画面、配乐、音效、字幕全部读这条时间轴，所以**改台词或换配音后整片自动重新对齐**。

## 何时使用

- 从零做一部 3–15 分钟、以旁白叙事为主的视频（知识科普、行业史、品牌故事、预告片式开场）。
- 用户要“电影感 / 好莱坞大片 / HBO 美剧质感”。
- 修改已有 code-film 工程（改台词、换配音、调色、改配乐）。

不适合：需要真人实拍素材、口型同步的人物对白、复杂角色动画。

## 工作流（严格按顺序，每步完成后给用户确认）

1. **策划**：按 `references/PLAYBOOK.md` §1 的 9 段叙事模板，用 `references/PROMPTS.md` 的 1–2 号提示词做选题、叙事设定与事实核查。每个数字都要有来源；推演部分必须标注。
2. **台词**：按提示词 3 生成，填进 `script/lines.py`。规则：一句一事、≤40 字、数字在 `tts` 写中文读法、在 `sub` 写阿拉伯数字。
3. **建工程**：`bash scripts/new_project.sh <目录>` → `bash scripts/setup.sh <目录>`（首次下载约 1.5GB 资源到共享缓存 `~/.cache/code-film`）。
4. **配音（最关键，先于一切）**：优先 `python tts/gen_elevenlabs.py`（需要 `ELEVENLABS_API_KEY`，带前后句上下文）；离线用 `python tts/gen_tts.py`（Kokoro，质量一般）。跑 `python tts/check_asr.py` 查读音。**让用户亲耳听过再继续**——配音不行，后面全部白做。
5. **时间轴**：`python tts/build_timeline.py`，向用户报告各场景时长。
6. **视觉**：先按提示词 4 出分镜表让用户确认；再在 `render/scenes/` 写场景。每写完一章用 `./preview.sh 场景:秒 ...` 出联系表并亲自查看图片，自查文字出框/重叠、亮底糊白、字幕遮挡。
7. **声音**：在 `audio/cues.py` 写配乐、`audio/sfx.py` 写音效，跑 `audio/analyze.py` 检查各场景响度。
8. **成片**：`./build.sh --no-tts`（已有配音时）。从成片每个场景和每个转场处抽帧检查（PLAYBOOK §6 清单）。明确告诉用户哪些只能靠人耳/人眼确认（动态、配音、配乐平衡）。

## 写场景的硬性约定

- 场景：`def('场景id', { post, clear, draw(S) {...} })`，id 必须与 `lines.py` 一致；新文件要在 `render/main.js` 里 import。
- **画面是时间的纯函数**：不得保存跨帧状态、不得用 `Math.random()`；随机用 `rng(seed)` / `ihash(i)` / `noise1`。
- 与台词对齐：`S.L('L003')` → `{s, e, d}`（场景内秒）。动画 = `p(t,a,b)` 进度 + 缓动；淡入淡出用 `env()`。
- 后期：`post: P.hbo` / `P.hollywood` / `mixP(a,b,k)`；瞬时冲击在 draw 里改 `S.post.glitch/flash/exp`。
- 转场写在**后一个**场景上：`transition(id, {type: black|cross|white|glitch, d})`，语义见 PLAYBOOK §3。
- 摄影机：`cam(c, t, dur, {push, drift})` … `c.restore()`。光：`godRays`、`motes`；纵深：`depthLayer`。
- 音效与配乐的时间点使用与画面相同的表达式（如 `ls('L002') + .5`）。
- 亮底（纸张、白屏）必须高阈值低泛光（`P.paper`），否则会糊成一片白。

## 电影质感

读 `references/CINEMATIC.md`：好莱坞大片 vs HBO 剧集在布光、色彩、构图、运镜、剪辑、声音上的区别，以及对应的引擎参数与写法。

## 文件地图

| 路径 | 作用 |
|---|---|
| `template/` | 工程模板（`new_project.sh` 复制它） |
| `template/render/engine.js` | 合成、后期链（泛光/色差/颗粒/暗角/调色/故障/ACES 影调/分离色调/胶片晕/变形光条/遮幅/画面抖动）、转场、字幕 |
| `template/render/presets.js` | 后期预设与 `mixP` |
| `template/render/scenes/lib.js` | 组件：眼睛、点云地球、粒子、纸张、印章、帆船、海、警示条、超空间、摄影机、体积光、尘埃、景深 |
| `template/render/scenes/example.js` | 三个示例：赛博开场 / HBO 深夜办公室 / 大片日出标题 |
| `template/audio/score_core.py` | 作曲引擎（GM 音色库乐器、和弦/琶音/音序、自动化、打点总线、`silence_after` 骤停） |
| `template/audio/dsp.py` | 30+ 程序化音效、环境声、混响 |
| `template/audio/mix.py` + `levels.json` | 旁白处理、闪避、分场景调平、−16 LUFS、真峰值限制、SRT |
| `scripts/` | `new_project.sh`、`setup.sh`、`build.sh`（`--el` `--no-tts` `--audio-only` `--from N`）、`preview.sh` |
| `references/` | `PLAYBOOK.md` 导演手册、`CINEMATIC.md` 电影质感、`PROMPTS.md` 提示词 |

## 已知限制

- 渲染器使用 `@sparticuz/chromium`（Linux x64）。macOS/Windows 需把 `render/render.js` 的 `executablePath` 改为本机 Chrome 并去掉 `chromium.args`。
- 渲染速度约 4–5 帧/秒（8 核 CPU、SwiftShader）：10 分钟成片约 1 小时。
- 无法感知动态与声音：AI 只能看静帧、读响度数据，配音和配乐必须由人审听。
