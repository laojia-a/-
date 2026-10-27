# BE CSR Review — 宣传片 / Promo film

`video/be-csr-review-promo.mp4` — 98 s · 1920×1080 · 30 fps · H.264 + AAC 256k · 2.39:1 letterbox · burned-in zh + en subtitles.

| 文件 | 说明 |
|---|---|
| `video/be-csr-review-promo.mp4` | 成片 (subtitles burned in) |
| `video/be-csr-review-promo.zh-en.srt` | 同一份字幕的独立 SRT，便于上传平台 |
| `video/poster.jpg` | 封面帧 (24.5 s) |
| `src/` | 工程文件：画面与声音全部由代码生成 |

Every frame is rendered procedurally. The project uses no stock footage, no AE/Blender templates and no audio samples, so the whole film can be rebuilt byte-for-byte from this folder.

## Rebuild

```bash
cd be-csr-review-promo
npm install          # @napi-rs/canvas (Skia) + ffmpeg-static
npm run fonts        # downloads the OFL fonts into fonts/ (gitignored)
npm run build        # renders video/ (≈2–3 min on 8 cores; one worker per CPU)
```

- `npm run preview -- 21.5,46,84` renders single frames to `build/preview/`.
- `npm run audio` renders only the soundtrack to `build/audio.wav`.
- `node src/render.js --workers 4` caps the number of render workers.

## Structure

| 文件 | 作用 |
|---|---|
| `src/timeline.js` | Single source of truth: scene boundaries, subtitles, camera impulses (shake / flash / chroma) and the SFX cue sheet, all on a 120 BPM grid |
| `src/lib.js` | Easing, noise, palette, 3D camera/projection, plane text, post-processing (bloom, anamorphic streak, grade, vignette, grain, chromatic aberration) |
| `src/scenes.js` | Nine scenes, each a pure function `(ctx, localTime)` |
| `src/frame.js` | Composites scene, post, letterbox and subtitles for time `t` |
| `src/audio.js` | Synthesizes every SFX (impacts, braams, risers, whooshes, UI) plus a D-minor score with reverb, sidechain ducking and a limiter |
| `src/render.js` | Parallel frame rendering → x264 segments → concat → mux; also writes the SRT and poster |

## Scenes

| 时间 | 场景 | 内容 |
|---|---|---|
| 0–7.5 | cold | 一份 BE 临床总结报告：正文、表格、脚注、图都不能漏读 |
| 7.5–19 | storm | 纸页风暴、矛盾闪现、返工代价，「怎样才能一格都不漏？」 |
| 19–28 | title | BE CSR REVIEW 标题落版 |
| 28–44 | gates | 一条主线穿过 G0–G5 六道关口 |
| 44–58 | table | 直接复制的表逐格核对，命中转录不一致与显示精度问题 |
| 58–68 | roles | 审核人员 / Agent + Skill / 确定性工具的分工 |
| 68–80 | delivery | 七列意见表、批注副本、review-save / review-resume 断点续审 |
| 80–88 | package | Skill 包、SHA256 `--require-hashes`、离线安装、独立 venv |
| 88–98 | finale | 星图收束、标语与仓库地址 |

## Notes

- 片中表格数值、意见条目均为**演示用示例数据**，不来自任何真实研究。
- 内容依据仓库 README / SKILL.md / STATUS.md 的公开表述：该工具**辅助审核**，不替代专业判断与监管结论。
- Fonts (all SIL OFL 1.1, not committed): Noto Sans SC, Noto Serif SC, Bebas Neue, JetBrains Mono.
- Audio: about −16 LUFS integrated, true peak below −1 dBTP.
- This folder is self-contained. The film is about [pharmaxi/be-csr-review](https://github.com/pharmaxi/be-csr-review); that repository's source code was not modified.
