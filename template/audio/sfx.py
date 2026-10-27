# -*- coding: utf-8 -*-
"""音效与环境声。时间点用和画面相同的公式（如 ls('L002') + .5），保证声画同步。可用音效见 dsp.py 的 sfx_* / amb_*。"""
import os, json, numpy as np, soundfile as sf
from pathlib import Path
from dsp import *
ROOT = str(Path(__file__).resolve().parents[1])
TL = json.load(open(f"{ROOT}/build/timeline.json", encoding="utf-8"))
SC = {s["id"]: s for s in TL["scenes"]}; LN = {l["id"]: l for l in TL["lines"]}; DUR = TL["duration"]
ss = lambda i: SC[i]["start"]; se = lambda i: SC[i]["end"]; ls = lambda i: LN[i]["start"]; le = lambda i: LN[i]["end"]
FX = Bus(DUR + 6); AMB = Bus(DUR + 6)
def fx(x, t, g=1.0, pan=0.0): FX.add(x, t, g, pan)
def amb(x, t, g=1.0, fi=1.0, fo=1.0): AMB.add(fade(x, fi, fo), t, g)

# ---- 在这里写音效 ----
fx(sfx_whoosh(1.0, 300, 4000, .4, 1), ss("s00_open") + .2, .5)
fx(sfx_glitch(.5, .5, 2), ls("L002") + .5, .6)
amb(amb_room(se("s01_chapter") - ss("s01_chapter"), .06), ss("s01_chapter"))
t0, t1 = ls("L003"), le("L003")
for i in range(12): fx(sfx_type(.25, i), t0 + i * (t1 - t0) / 12, .5)          # 打字机，与画面 typeText 同步
fx(sfx_impact(.6, 55, 2.5), ss("s01_chapter") - .05, .5)                          # 转场冲击

os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
sf.write(f"{ROOT}/build/audio/sfx.wav", reverb(FX.a, 1.4, .18, 7000, .012, 7)[: secs(DUR + 1)], SR, subtype="FLOAT")
sf.write(f"{ROOT}/build/audio/amb.wav", AMB.a[: secs(DUR + 1)], SR, subtype="FLOAT")
print("sfx done")
