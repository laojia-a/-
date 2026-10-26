# -*- coding: utf-8 -*-
"""音效与环境声（源自《监查者》sfx.py）：按画面时间点放置。各集的音效表写在 episodes/<EP>/sfx.py（定义 build_sfx()）。
用法: python audio/sfx.py EP01      输出: build/<EP>/audio/sfx.wav、amb.wav"""
import json
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dsp import *  # noqa: E402,F403

ROOT = Path(__file__).resolve().parents[1]
EP = sys.argv[1] if len(sys.argv) > 1 else "EP01"
BUILD = ROOT / "build" / EP
TL = json.load(open(BUILD / "timeline.json", encoding="utf-8"))
SC = {s["id"]: s for s in TL["scenes"]}
LN = {l["id"]: l for l in TL["lines"]}
DUR = TL["duration"]
ss = lambda i: SC[i]["start"]; se = lambda i: SC[i]["end"]; ls = lambda i: LN[i]["start"]; le = lambda i: LN[i]["end"]
R = np.random.default_rng(99)
FX = Bus(DUR + 6)
AMB = Bus(DUR + 6)
PUNCT = r"[\s，。、：；！？“”‘’（）()…—\-,.!?:;《》·]"


def cue(i, kw, after=False):
    l = LN[i]; s = l["sub"].replace("\n", "")
    k = s.find(kw)
    if k < 0: return l["start"]
    pre = len(re.sub(PUNCT, "", s[: k + (len(kw) if after else 0)])); tot = len(re.sub(PUNCT, "", s)) or 1
    return l["start"] + (l["end"] - l["start"]) * pre / tot


def fx(x, t, g=1.0, pan=0.0): FX.add(x, t, g, pan)
def amb(x, t, g=1.0, fi=1.0, fo=1.0): AMB.add(fade(x, fi, fo), t, g)
def ui_blip(t, g=.12, f=2400): fx(sfx_ping(f, .5, .25), t, g)


def shimmer(dur, seed=0, f0=3000, f1=9000, dens=60, gain=.2):
    """粒子闪烁：一串随机高频小铃。"""
    n = secs(dur); y = np.zeros(n, np.float32); r = np.random.default_rng(seed)
    for _ in range(int(dens * dur)):
        f = r.uniform(f0, f1); L = secs(.12); i = int(r.uniform(0, max(1, n - L)))
        y[i:i + L] += sine(f, L) * exp_env(L, .03) * r.uniform(.2, 1)
    return (y * gain).astype(np.float32)


def crackle_arc(dur, seed=0, gain=.35):
    """电弧：带通噪声 + 随机爆裂。"""
    n = secs(dur); r = np.random.default_rng(seed)
    base = bp(noise(n, seed), 1500, 7000) * .25
    pops = np.zeros(n, np.float32)
    for _ in range(int(40 * dur)):
        i = int(r.uniform(0, n - 400)); pops[i:i + 400] += noise(400, int(r.integers(0, 9999))) * exp_env(400, .002) * r.uniform(.4, 1.2)
    env = np.minimum(1, np.arange(n) / secs(.15)) * np.minimum(1, (n - np.arange(n)) / secs(.2))
    return ((base + pops) * env * gain).astype(np.float32)


exec(open(ROOT / "episodes" / EP / "sfx.py", encoding="utf-8").read(), globals())

if __name__ == "__main__":
    build_sfx()
    (BUILD / "audio").mkdir(parents=True, exist_ok=True)
    sf.write(BUILD / "audio" / "sfx.wav", FX.a[: secs(DUR + 1)], SR, subtype="FLOAT")
    sf.write(BUILD / "audio" / "amb.wav", AMB.a[: secs(DUR + 1)], SR, subtype="FLOAT")
    print(f"sfx peak {np.abs(FX.a).max():.3f}, amb peak {np.abs(AMB.a).max():.3f}")
