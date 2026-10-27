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
# HBO 场景：环境声是质感的一半——房间底噪、雨、远处城市
amb(amb_room(se("s01_hbo") - ss("s01_hbo"), .08, 3, 50), ss("s01_hbo"), 1.0, 1.5, 1.0)
amb(lp(amb_rain(se("s01_hbo") - ss("s01_hbo"), .10, 4), 3500), ss("s01_hbo"), 1.0, 2.0, 1.0)
for i in range(6): fx(sfx_paper(.4, .25, 10 + i), ls("L003") + 1.2 + i * .9, .3)
# 大片场景：风声铺底，标题冲击由配乐的打点总线负责
amb(amb_wind(se("s02_hollywood") - ss("s02_hollywood"), .18, 5), ss("s02_hollywood"), 1.0, 1.0, 2.0)
fx(sfx_whoosh(1.6, 200, 3000, .4, 6), ls("L004") + .3, .4)

os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
sf.write(f"{ROOT}/build/audio/sfx.wav", reverb(FX.a, 1.4, .18, 7000, .012, 7)[: secs(DUR + 1)], SR, subtype="FLOAT")
sf.write(f"{ROOT}/build/audio/amb.wav", AMB.a[: secs(DUR + 1)], SR, subtype="FLOAT")
print("sfx done")
