---
name: codefilm
description: Generate cinematic narrated short films entirely from code (Bilibili/YouTube explainers, documentaries, brand stories, trailers). Script-driven pipeline: lines → voice-over (ElevenLabs or offline Kokoro) → auto timeline → Canvas2D/three.js scenes with film-grade post (ACES tone, teal-orange split, halation, anamorphic streaks, letterbox, grain, gate weave, motion blur) → procedural score and sound design → loudness-mastered mix with burned-in subtitles → 1080p MP4. Hollywood-blockbuster and HBO-drama looks built in. Works on Windows, macOS and Linux. Use when the user asks to make a video/short film/documentary/trailer, wants a "cinematic", "Hollywood" or "HBO" look, or wants to edit a codefilm project.
---

# codefilm

Code-generated films with cinematic texture. `script/lines.py` is the single source of truth: real voice-over durations produce `build/timeline.json`, and visuals, music, SFX and subtitles all read that timeline — **change a line or swap the voice and the whole film re-syncs**.

All commands go through one cross-platform CLI (Python 3.10+, Node 20+):

```
python <skill>/scripts/codefilm.py new <dir>          # scaffold a project from template/
python <skill>/scripts/codefilm.py setup <dir>        # deps + fonts/soundfont/models/ffmpeg into a shared cache
python <skill>/scripts/codefilm.py doctor <dir>       # check environment (browser, ffmpeg, assets, keys)
python <skill>/scripts/codefilm.py build <dir> [--tts kokoro|el|none] [--audio-only] [--from N] [--workers N] [--mb N]
python <skill>/scripts/codefilm.py preview <dir> s01_hbo:3 s02_hollywood:6   # contact sheet → output/preview.jpg
```

Windows: `scripts\codefilm.cmd <command> ...` works the same. Cache: `CODEFILM_CACHE` (default `~/.cache/codefilm`). Browser: auto-detects Chrome/Edge (or set `CHROME_PATH`).

## When to use

- A 1–15 minute narration-led film: explainer, industry history, brand story, trailer-style opener.
- The user wants a cinematic / Hollywood / HBO / film look.
- Editing an existing codefilm project (lines, voice, grade, music).

Not suitable for live-action footage, lip-synced dialogue, or complex character animation.

## Workflow (in order; confirm with the user after each step)

1. **Concept** — Follow the 9-part structure in `references/PLAYBOOK.md` §1; use prompts 1–2 in `references/PROMPTS.md` for the narrative premise and fact-checking. Every number needs a source; mark speculation explicitly.
2. **Lines** — Prompt 3; write `script/lines.py`. One idea per line, ≤40 Chinese characters; spoken form of numbers in `tts`, digits in `sub`.
3. **Project** — `new` then `setup` (first run downloads ~1.5 GB into the shared cache).
4. **Voice first** — Prefer ElevenLabs (`build --tts el` or `python tts/gen_elevenlabs.py`, needs `ELEVENLABS_API_KEY`; sends neighbouring lines as context). Offline fallback: Kokoro (`tts/gen_tts.py`, mediocre prosody). Run `tts/check_asr.py` for mispronunciations. **Have the user listen before continuing** — a bad voice ruins everything downstream.
5. **Timeline** — `python tts/build_timeline.py`; report scene durations.
6. **Visuals** — Get a shot list approved (prompt 4, and prompt 9 for the look). Write scenes in `render/scenes/`. After each chapter run `preview` and actually look at the image; check text overflow/overlap, blown-out bright backgrounds, subtitle collisions (`references/CINEMATIC.md` §4).
7. **Sound** — Write music in `audio/cues.py`, effects in `audio/sfx.py`; check per-scene loudness with `audio/analyze.py`.
8. **Final** — `build --tts none`. Sample frames from every scene and every transition (PLAYBOOK §6). Tell the user explicitly what only human eyes/ears can verify (motion, voice, music balance).

## Scene code rules

- Register: `def('scene_id', { post, clear, draw(S) {...} })`; ids must match `lines.py`; import new files in `render/main.js`.
- **Frames are pure functions of time**: no cross-frame state, no `Math.random()`; use `rng(seed)`, `ihash(i)`, `noise1`. (Enables parallel rendering and motion blur.)
- Sync to speech: `S.L('L003')` → `{s, e, d}` in scene seconds. Animate with `p(t,a,b)` + easing (`eOut`, `eInOut`, `eOutExpo`, `eOutBack`); fades with `env()`.
- Grade: `post: P.hbo` / `P.hollywood` / `P.trailer` / `P.bleach` / `P.dream` / `P.noir`, or `(S) => mixP(a, b, k)`; one-off hits via `S.post.glitch/flash/exp` inside draw.
- Transitions go on the **incoming** scene: `transition(id, {type: 'black'|'cross'|'white'|'glitch', d})`; semantics in PLAYBOOK §3.
- Camera `cam(c, t, dur, {push, drift, dutch})` … `c.restore()`; light `godRays`, `motes`; depth `depthLayer`.
- SFX/music timings use the same expressions as the visuals (e.g. `ls('L002') + .5`).
- Bright backgrounds (paper, white screens) need high threshold / low bloom (`P.paper`).
- Motion blur is a render option (`--mb 4`, cost ×4) — use for fast camera moves or the final render only.

## Cinematic texture

Read `references/CINEMATIC.md` before designing visuals: Hollywood vs HBO across aspect, colour, tone, light, framing, camera, editing, type and sound, mapped to engine parameters, plus common failure modes.

## File map

| Path | Purpose |
|---|---|
| `scripts/codefilm.py` (+ `codefilm.cmd`, `codefilm`) | Cross-platform CLI |
| `template/render/engine.js` | Compositor, post chain, transitions, subtitles, motion blur |
| `template/render/presets.js` | Grade presets + `mixP` |
| `template/render/scenes/lib.js` | Components: eye, point-cloud globe, dust, paper, stamp, ship, sea, hazard tape, warp, camera, god rays, motes, depth layer |
| `template/render/scenes/example.js` | Examples: stylised open / HBO late-night office / Hollywood sunrise title |
| `template/audio/score_core.py`, `cues.py` | Composition engine (GM soundfont instruments, chords/arps, automation, hit bus, `silence_after`) and per-scene cues |
| `template/audio/dsp.py`, `sfx.py` | 30+ procedural SFX/ambiences, reverb; per-scene SFX |
| `template/audio/mix.py`, `levels.json` | Voice chain, ducking, per-scene levels, tape saturation + width, −16 LUFS, true-peak limit, SRT |
| `template/tts/` | ElevenLabs / Kokoro voice, ASR check, timeline |
| `references/` | `PLAYBOOK.md` director's handbook, `CINEMATIC.md` cinematic texture, `PROMPTS.md` prompts |
| `examples/` | Demo film and frames |

## Known limits

- Rendering ~4–5 fps on an 8-core CPU without GPU (≈1 h per 10 min of film); faster with a real GPU. Motion blur multiplies cost.
- The agent cannot perceive motion or hear audio; voice and music balance must be reviewed by a human.
- Kokoro offline voice is functional but flat; use ElevenLabs or human voice for anything published.
