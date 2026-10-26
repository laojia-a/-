# 《剂量》项目交接（冷启动从这里读）

B站临床药理科普系列，署名"支线进行中"。副题"每一个剂量，都是一次决定 / Every dose is a decision"。集数不固定，口播和画面里不写"十集"。片尾口播固定："这个系列叫《剂量》。每一个写进说明书的剂量，背后都是一连串的决定。我是支线进行中，来源在简介。喜欢这期的话，一键三连，我们下期见。"
用户要求：电影感、动画和故事性，不要 PPT；严谨，所有真实数字可回溯一手来源。用户已授权"其余你来把控"。

## 一、已确认的决定

| 事项 | 决定 |
| --- | --- |
| 系列名 | 《剂量》，副题"每一个剂量，都是一次决定 / Every dose is a decision" |
| 开季 | EP01 一顿饭（阿比特龙食物效应） |
| TGN1412 | 降级。EP03 只用约 60 秒交代，主线讲改名 TAB08 后以约千分之一剂量重新试验 |
| 主角药 | 伊布替尼贯穿 EP05 / EP08 / EP10，琥珀色胶囊轮廓为固定标识 |
| 硝苯地平番外 | 本季不做（与用户在研项目同药） |
| 红线 | 不给用药建议；不用用户在研项目资料（美洛加巴林、硝苯地平控释片）；不出现受试者、人脸、病房重现 |
| 时长 | 单集约 7–9 分钟，不注水 |
| 配音 | ElevenLabs，音色沿用《监查者》主旁白 Erich Li - Mystery Host `fYmV8EanqZP9BI4WvpB7`（已写进 gen_tts.py 默认值）；只差密钥，见第五节。edge-tts 只做内部对时，不得进成片 |
| 生图 | Codex CLI 的 image_generation（已接通） |

## 二、季度结构与进度

| 集 | 标题 | 锚点 | 脚本 | 事实核查 | 关键帧 | 动画 | 配音 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EP01 | 一顿饭 | ZYTIGA / YONSA | v2（narration.tsv 已是 v2，28 句） | F1–F14 已核；F15 待核（发布前） | 不用关键帧，全部代码绘制 | ep01.py 已按 v2 重写（10-26），全片 6 分 10 秒；详见 进度_EP01_v2.md | ElevenLabs 28/28，与 narration.tsv 一致 |
| EP02 | 加倍 | 加巴喷丁 | v1（10-25 统一） | 待核 1：F3 | shots 10，s01/s02 改黄色胶囊需重生 | 已渲染（旧胶囊画面） | 未做 |
| EP03 | 第一剂 | TGN1412 → TAB08 | v2（10-25 统一） | 待核 10：F1–F10 | shots 13，已生图 | 待做 | 未做 |
| EP04 | 第五天 | BIA 10-2474 | v1（10-25 统一） | 已清（F10 删除） | 12/12 | tools/ep04.py 已写，smoke 通过，未全片渲染 | 未做 |
| EP05 | 间隔 | 伊布替尼 | v1（10-25 统一） | 已清（F4 按标签改，F5 按预案改） | 生图中（交接时 1/12，日志 build/EP05/gen_frames.log） | 未做 | 未做 |
| EP06 | 第三片药 | PAXLOVID | v1（10-25 统一） | 已清 | shots 12，未生图 | 未做 | 未做 |
| EP07 | 肾 | PRADAXA | v1（10-25 统一） | 待核 1：F10 | shots 12，未生图 | 未做 | 未做 |
| EP08 | 去向 | 伊布替尼 14C | v1（10-25 统一） | 待核 3：F9–F11 | shots 12，未生图 | 未做 | 未做 |
| EP09 | 剂量考试 | LUMAKRAS | v1（10-25 统一） | 待核 4：F2、F8、F12、F13 | shots 11，未生图 | 未做 | 未做 |
| EP10 | 模型 | 伊布替尼 PBPK | v1（10-25 统一） | 待核 3：F6、F7、F13 | shots 13，未生图 | 未做 | 未做 |

实际进度以 `build/` 下文件为准：`frames/` 是关键帧，`<EP>_motion.mp4` 是无声动画，`<EP>_final.mp4` 是成片。

## 三、文件地图

- `系列制作规范_剂量.md`：每集结构、配色、声音、核查流程、红线。改风格先改这里。
- `第三人审核意见与系列方向_v1.md`：审核结论、全季结构、开季与主角药决定。
- `新药临床药理系列_选题方案与双稿审核_v1.md`：用户原始 v1 方案（188KB，含十题研究底稿），用 Grep 查，不要整读。
- `EPxx_*_脚本_*.md`：分集脚本。表格三列：画面 / 旁白 / 屏幕文字。文末有事实核查表。
- `核查素材_EP04第五天_EP05伊布替尼.md`：BIA 10-2474 与伊布替尼的已核事实和来源。
- `归档/`：弃用版本，勿用。
- `tools/`：制作工具（见下）。
- `build/<EP>/`：每集产物。`narration.tsv` 旁白、`shots.tsv` 镜头表、`frames/` 关键帧、`plan.tsv` 每句旁白在片中的起点、`tts/` 配音。

## 四、制作流水线

```
1. 写脚本 EPxx_*.md（旁白放在表格第二列）
2. python tools/extract_narration.py EPxx_*.md      → build/EPxx/narration.tsv
3. 写 build/EPxx/shots.tsv，python tools/gen_frames.py EPxx   → frames/（每张约 1 分钟）
4. 写 tools/epxx.py（场景动画，参照 ep01.py / ep02.py）
   python tools/epxx.py --smoke      快速检查报错
   python tools/epxx.py --limit 40   预览前 40 秒
   python tools/epxx.py              全片 → EPxx_motion.mp4 + plan.tsv（约 1.4× 实时）
5. python tools/gen_tts.py EPxx      → tts/（需 ElevenLabs 密钥）
6. 重跑第 4 步（时长自动按配音对齐）
7. python tools/mix.py EPxx          → EPxx_final.mp4（配音 + 铺底，自动压低）
```

工具说明：

- `motion.py`：动画引擎。cairo 逐帧绘制，管道送 ffmpeg。`Group(scene, lines, lead, tail, fixed)` 是一个场景；场景函数 `draw(ctx, t, g)` 用 `g.beat(i)` 取第 i 句旁白在场景内的起点，让画面节拍对上旁白。提供推镜、尘埃、热气、胶片颗粒、暗角、字幕、数字滚动、曲线生长、箭头、柱状图等。
- `common.py`：`Episode` 类（旁白、时长、渲染、smoke）和通用场景：`title_scene`、`vote_scene`、`map_scene`、`limits_scene`、`end_scene`，以及 `capsule`、`cylinder`、`bars`、`axes`。
- `ep01.py` / `ep02.py`：分集场景。新集照抄结构。
- `gen_frames.py`：调 Codex CLI 生图。统一画风写在 STYLE 里。图里不允许文字、数字、品牌、人脸，数据全部由动画叠加。Codex 路径可用环境变量 `CODEX_BIN` 覆盖。
- `gen_tts.py` + `lexicon.tsv`：ElevenLabs 逐句配音；lexicon 只改送进 TTS 的读音，字幕保留原文。
- `mix.py`：按 plan.tsv 铺配音；有 `build/EPxx/music.mp3` 就用作配乐，否则合成低频铺底。

视觉规则（代码里的常量）：底色 #0B0D10；真实数据琥珀 #E8A33D，右上角"真实数据 · 来源"；模拟数据冷蓝 #5AA9E6 加网格和左上"模拟"框；示意图左上"示意 · 非真实曲线"；风险暗红 #B23A3A。字体微软雅黑（思源未安装）。

## 五、待办（按优先级）

1. 配音：密钥在项目根目录 `.env.local`（`ELEVENLABS_API_KEY`），gen_tts.py 自动读取，默认模型 eleven_v4。EP01 已全部生成。流程：
   `python tools/gen_tts.py EP01` → 重跑 `python tools/ep01.py` → `python tools/mix.py EP01`。
   备注：旧项目最终版用的是 eleven_v4 按段落整段生成再切句（`tts/split_el.py`，经 ElevenLabs MCP），比逐句更连贯；当前 gen_tts.py 是逐句 + previous/next_text，模型默认 eleven_multilingual_v2。先用逐句出 EP01，听感不够再改段落模式。旧项目 `check_asr_el.py` 可做回听校验。
2. EP04：`python tools/ep04.py --limit 60` 看前 60 秒，再全片渲染。s08 关键帧（平直光线）暂未使用。时间轴和 s_sat 曲线 0.25–5 mg 之间是示意连线，画面已标注。
3. EP05：等生图跑完（检查 `build/EP05/frames/` 是否 12 张，缺的用 `python tools/gen_frames.py EP05` 补，已存在会跳过）→ 照 ep04.py 写 ep05.py → smoke → 渲染。伊布替尼按标签外观绘制，见规范。
4. EP03：等核查结果改脚本数字（TAB08 起始剂量、受体占有率、给药间隔等），核不实的改为定性描述；然后写 `tools/ep03.py` 并渲染。
5. EP02：s01/s02 改黄色胶囊需重生图后重渲染；F3 待核。
6. EP06–EP10：所有【待核】须核实后才能配音。
7. 配乐：目前是合成铺底。若用户提供配乐，放到 `build/EPxx/music.mp3`。
8. 发布前：每集核查表无"待核"；简介首行免责声明；简介列全部来源链接。

## 六、环境备忘

- Windows + Git Bash，Python 3.13（numpy、pillow、pycairo 1.28.0、requests），ffmpeg 9（有 h264_nvenc 可提速）。
- Codex CLI：`C:\Users\Lenovo\AppData\Local\OpenAI\Codex\bin\37f54d68e5533a51\codex.exe`，版本更新后路径可能变，用 `find "$LOCALAPPDATA/OpenAI/Codex/bin" -name codex.exe` 重找。
- `mmx`（MiniMax）有视频生成，但未登录且无订阅，未使用。
- 权限设置禁止读取工作目录以外的文件。`E:\AI 视频\2.临床试验`（含《监查者》旧项目）已加入可读目录；用户主目录不可读。
- 中文 Windows 控制台输出乱码时加 `PYTHONIOENCODING=utf-8`。
- 网络核查：WebSearch 在此环境可能只凭记忆作答，不可作为来源；用 WebFetch / curl 直接抓 DailyMed、accessdata.fda.gov、PubMed eutils。
- 目录结构：本地是 `tools/*.py` + `build/<EP>/`；GitHub 仓库是平铺的 `*.py` + `<EP>/`。`common.ep_dir()` 和 `mix.py` 两种都认，不用挪文件。
- 云端沙盒（Kiro Web）预览：pycairo 装不上，用 cairocffi 顶替；字体用 Noto Sans/Serif CJK 顶替微软雅黑和思源宋体，字形和本地略有不同，正式成片在本地出。
- ElevenLabs CLI（`npx @elevenlabs/cli onboard`）在仓库根目录写 `.env`，已加进 `.gitignore`。`gen_tts.py` 目前读的是 `.env.local` 和环境变量。
