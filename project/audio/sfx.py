# -*- coding: utf-8 -*-
"""音效与环境声：严格按画面时间点（与 render/scenes/*.js 中的公式一致）放置。输出 build/audio/sfx.wav 与 amb.wav"""
import json, os
import numpy as np, soundfile as sf
from dsp import *

import os as _os
from pathlib import Path as _P
ROOT = str(_P(__file__).resolve().parents[1])
CACHE = _os.environ.get("JCZ_CACHE", ROOT + "/.cache")

TL = json.load(open(f"{ROOT}/build/timeline.json", encoding="utf-8"))
SC = {s["id"]: s for s in TL["scenes"]}; LN = {l["id"]: l for l in TL["lines"]}; DUR = TL["duration"]
ss = lambda i: SC[i]["start"]; se = lambda i: SC[i]["end"]; ls = lambda i: LN[i]["start"]; le = lambda i: LN[i]["end"]
R = np.random.default_rng(99)
FX = Bus(DUR + 6); AMB = Bus(DUR + 6)

def fx(x, t, g=1.0, pan=0.0): FX.add(x, t, g, pan)
def amb(x, t, g=1.0, fi=1.0, fo=1.0): AMB.add(fade(x, fi, fo), t, g)
def ui_blip(t, g=.12, f=2400): fx(sfx_ping(f, .5, .25), t, g)

def footstep(seed):
    n = secs(.22); t = np.arange(n) / SR
    th = np.sin(2 * np.pi * (70 + 40 * np.exp(-t * 40)) * t) * np.exp(-t * 30)
    cl = bp(noise(n, seed), 1500, 6000) * np.exp(-t * 60) * .5
    return (th + cl).astype(np.float32)

def wheels(dur, seed=5):
    n = secs(dur); t = np.arange(n) / SR
    rum = lp(noise(n, seed), 300) * 1.4
    bumps = np.zeros(n, np.float32)
    for k in np.arange(0, dur, .17): i = secs(k); L = secs(.03); bumps[i:i + L] += np.exp(-np.arange(min(L, n - i)) / 200) * .8
    return (rum * .5 + lp(bumps * noise(n, seed + 1), 900) * .6).astype(np.float32)

def creak(seed, dur=1.4):
    n = secs(dur); t = np.arange(n) / SR; r = np.random.default_rng(seed)
    f = 180 + 60 * np.sin(2 * np.pi * .7 * t) + r.uniform(-20, 20); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sign(np.sin(ph)) * (np.abs(np.sin(2 * np.pi * 11 * t)) > .6)
    return (bp(y.astype(np.float32), 300, 2500) * np.sin(np.pi * t / dur) * .5).astype(np.float32)

def build():
    # ---------------- s00 冷开场
    for tb in [0.928, 1.615, 2.303]: fx(sfx_beep(1000, .14, .5), tb, .55)
    fx(sfx_whoosh(.9, 200, 3500, .4, 2), 2.45, .5)
    fx(sfx_impact(.5, 60, 2.5, 4), 2.9, .5); fx(sfx_chime(86, .25, 3.0), 2.95, .35)
    for k in range(3): ui_blip(3.6 + k * .18, .08, 3000 + k * 400)
    L2 = ls("L002")
    for i in range(40): fx(sfx_click(.12, 4500, i), L2 + 1.2 + R.uniform(0, 2.4), .35, R.uniform(-.8, .8))
    for i in range(18): fx(sfx_ping(R.uniform(2500, 5000), .4, .3), ls("L003") + R.uniform(0, 2.8), .12, R.uniform(-.6, .6))
    t11 = ls("L004") + 1.9
    fx(sfx_glitch(.7, .6, 11), t11, .7); fx(sfx_impact(.6, 45, 2.5, 12), t11, .5)
    for k in range(4): fx(sfx_glitch(.12, .4, 20 + k), t11 + .4 + k * .5 + R.uniform(0, .2), .35)
    fx(sfx_whoosh(1.4, 4000, 300, .3, 13), le("L004") + 1.2, .4)
    a = ls("L005") + .2
    n = secs(4.2); tt = np.arange(n) / SR; f = 2200 * np.exp(-tt * .9) + 150; ph = 2 * np.pi * np.cumsum(f) / SR
    tape = (np.sin(ph) * .15 + bp(noise(n, 14), 500, 5000) * .25) * np.minimum(1, tt / .3)
    fx(tape.astype(np.float32), a, .35)
    fx(sfx_riser(1.6, 400, 6000, .5, 15), se("s00_eye") - 1.5, .45)
    fx(sfx_impact(.7, 70, 2.0, 16), se("s00_eye") - .02, .5); fx(sfx_whoosh(1.0, 6000, 400, .4, 17), se("s00_eye") - .1, .4)
    # ---------------- s01 酒店
    a = ss("s01_hotel")
    amb(lp(amb_rain(se("s01_hotel") - a + 1, .16, 31), 5000), a, 1.0, .8, 1.2)
    amb(amb_room(se("s01_hotel") - a + 1, .07, 32, 60), a, 1.0, .8, 1.2)
    for L in ["L006", "L007"]:
        t = ls(L) + .3
        while t < le(L) - .2:
            burst = int(R.integers(3, 9))
            for k in range(burst): fx(sfx_type(.12, int(R.integers(0, 999))), t + k * R.uniform(.07, .14), .5, .25)
            t += burst * .11 + R.uniform(.3, 1.1)
    for tt_ in [ls("L006") + 3.5, ls("L007") + 2.6, ls("L008") + .9, ls("L009") + .5]: ui_blip(tt_, .1, 2600); fx(sfx_whoosh(.35, 1500, 6000, .15, 33), tt_, .3)
    fx(sfx_beep(1320, .08, .3), ls("L009") + 2.0, .25); fx(sfx_beep(1760, .12, .3), ls("L009") + 2.12, .25)
    # ---------------- s02 片名
    fx(sfx_glitch(.5, .5, 41), ss("s02_title") - .1, .6)
    # ---------------- s03 1747
    a = ss("s03_1747")
    amb(amb_ocean(ls("L011") + 2.0 - a, .3, 51), a, 1.0, 1.5, 1.6)
    for k, dt in enumerate([4.2, 8.7, 13.1]): fx(creak(60 + k), a + dt, .25, -.3)
    fx(sfx_scribble(2.6, .3, 61), ls("L010") + 3.2, .35)
    fx(sfx_paper(.8, .4, 62), ls("L011") - .1, .5)
    for g in range(6): fx(sfx_click(.2, 1800, 70 + g), ls("L011") + 3.5 + g * .45, .5)
    for i, tt_ in enumerate([ls("L013") + .3, ls("L013") + 1.3, ls("L013") + 3.0]):
        fx(sfx_scribble(.45, .5, 80 + i), tt_ + .35, .5); fx(sfx_stamp(.35, 85 + i), tt_ + .75, .35)
    # ---------------- s04
    fx(sfx_whoosh(3.4, 150, 1200, .25, 90), ls("L014") + .3, .45)
    amb(amb_projector(ls("L017") - ls("L015") + 1.0, .14, 91), ls("L015") - .4, 1.0, .5, .7)
    NUREM = "1. The voluntary consent of the human subject is absolutely essential."
    t0, t1 = ls("L015") + .1, le("L015") - .4
    for i, ch in enumerate(NUREM):
        if ch != " ": fx(sfx_type(.3, 100 + i), t0 + (i / len(NUREM)) * (t1 - t0), .55, .1)
    fx(sfx_chime(96, .2, 1.2), t1 + .05, .25)
    fx(sfx_scribble(1.4, .3, 110), ls("L016") + 2.2, .4)
    fx(sfx_ping(2200, .3, .8), ls("L017") + .1, .3)
    for i in range(70): fx(sfx_tick(.05, 120 + i), ls("L017") + 3.8 + R.uniform(0, le("L017") - ls("L017") - 4.3), .5, R.uniform(-.5, .5))
    fx(sfx_stamp(.9, 130), ls("L018") + .5, .8); fx(sfx_stamp(.9, 131), ls("L018") + 6.2, .8)
    for i in range(16): fx(sfx_drip(.35, R.uniform(900, 1600), i), ls("L019") + 1.6 + R.uniform(0, 7.0), .4, R.uniform(-.4, .4))
    # ---------------- s05
    a = ss("s05_1996")
    for i in range(3): fx(sfx_whoosh(1.2, 300, 2500, .2, 140 + i), a + .4 + i * .3, .3, -.6 + i * .6)
    fx(sfx_paper(.6, .4, 143), ls("L020") + 1.8, .4); ui_blip(ls("L020") + 4.2, .1)
    for i in range(30): fx(sfx_ping(R.uniform(1800, 3200), .3, .25), ls("L021") + .4 + R.uniform(0, 4.0), .1, R.uniform(-.8, .8))
    # ---------------- s06 行走
    a = ss("s06_suitcase"); wend = ls("L023") - .5
    t = a + .1; k = 0
    while t < wend: fx(footstep(150 + k), t, .45, -.1); t += .419; k += 1
    fx(fade(wheels(wend - a, 151), .3, .4), a, .3)
    fx(sfx_chime(76, .3, 1.6), a + .5, .35); fx(sfx_chime(72, .3, 2.0), a + .95, .35)  # 机场提示音
    fx(sfx_whoosh(2.4, 80, 900, .5, 152), a + .6, .4)                                 # 起飞
    fx(sfx_whoosh(2.0, 120, 3000, .6, 153), a + 2.7, .55)                             # 高铁通过
    amb(amb_room(2.6, .06, 154, 50), a + 4.6, 1.0, .4, .6)
    fx(sfx_door(.4, 155), ls("L022") + 6.4, .4)
    for i in range(7):
        tt_ = ls("L023") + .6 + (i + .6) * .62
        if i == 1: fx(sfx_beep(330, .25, .3), tt_, .35); fx(sfx_beep(262, .3, .3), tt_ + .18, .35)
        else: fx(sfx_ping(2600, .25, .3), tt_, .25)
    n = secs(le("L024") - ls("L024") - 3.8); tt = np.arange(n) / SR; f = 300 * (3 ** (tt / (n / SR))); ph = 2 * np.pi * np.cumsum(f) / SR
    fx((np.sin(ph) * .12 * np.minimum(1, tt / .5)).astype(np.float32), ls("L024") + 3.4, .5)
    fx(sfx_chime(88, .3, 2.0), le("L024") - .4, .4)
    # ---------------- s08
    fx(sfx_glitch(.4, .5, 160), ls("L027") + 2.4, .5)
    fx(sfx_whoosh(le("L028") - ls("L028") - 1.0, 200, 5000, .25, 161), ls("L028") + .6, .4)
    n = secs(5.2); fx((lp(noise(n, 162), 120) * np.linspace(0, 1, n) ** 2 * .8).astype(np.float32), ls("L029"), .5)
    for i in range(14): fx(sfx_tick(.08, 170 + i), ls("L031") + .2 + i * .1, .4)
    fx(sfx_stamp(.4, 171), ls("L031") + 3.0, .3)
    fx(sfx_paper(.7, .3, 172), ls("L032") - .2, .4)
    # ---------------- s09
    fx(sfx_whoosh(.6, 400, 4000, .3, 180), ls("L034") + .3, .3); fx(sfx_whoosh(.6, 400, 4000, .3, 181), ls("L034") + 5.4, .3)
    for i in range(4): fx(sfx_ping(1200 + i * 150, .3, .5), ls("L035") + 1.0 + i * .4, .25)
    # ---------------- s10 风暴
    a = ss("s10_722")
    amb(amb_wind(ls("L039") - a + .5, .28, 190), a, 1.0, 1.0, 1.0)
    for i, st in enumerate([ls("L036") + .9, ls("L036") + 2.6, ls("L037") + .4, ls("L037") + 6.2, ls("L037") + 10.4]): fx(sfx_thunder(5.0, .7, 191 + i), st - .02, .45, R.uniform(-.4, .4))
    for i in range(4): fx(sfx_paper(1.4, .5, 200 + i), ls("L037") + 9.2 + i * 1.0, .5, .3)
    fx(sfx_whoosh(4.4, 100, 3000, .6, 205), ls("L037") + 9.2, .45)
    fx(sfx_stamp(1.0, 206), ls("L038") + 1.05, .9)
    fx(sfx_whoosh(1.2, 300, 2500, .3, 207), ls("L039") + .4, .3)
    # ---------------- s11 2020
    fx(sfx_door(1.0, 210), ls("L040") + 2.2 + (le("L040") + .2 - (ls("L040") + 2.2)) - .9, .8)
    fx(sfx_ping(1500, .3, .3), le("L040") - .3, .2)
    for d in [0, 1.7, 3.4, 5.2]: ui_blip(ls("L041") + .3 + d, .12, 2000)
    fx(sfx_ping(880, .3, .3), ls("L041") + .5, .25); fx(sfx_ping(1320, .3, .3), ls("L041") + .65, .25)
    fx(sfx_stamp(.4, 211), ls("L041") + 2.9, .4)
    fx(sfx_scribble(1.0, .35, 212), ls("L041") + 4.2, .4)
    fx(sfx_whoosh(.9, 200, 1500, .3, 213), ls("L041") + 5.8, .3)
    for k in range(2): fx(sfx_impact(.25, 120, .3, 214 + k), ls("L041") + 7.1 + k * .22, .5)
    amb(amb_room(se("s11_2020") - ss("s11_2020"), .05, 215, 50), ss("s11_2020"), 1.0, 1.0, 1.0)
    # ---------------- s12 我的祖先
    t0, t1 = ls("L043") + .2, ls("L043") + 1.4
    for i in range(10): fx(sfx_type(.25, 220 + i), t0 + i * (t1 - t0) / 10, .4)
    for i in range(8): fx(sfx_type(.2, 240 + i), ls("L043") + 1.8 + i * .17, .35)
    for i in range(24): fx(sfx_type(.15, 260 + i), ls("L043") + 3.4 + i * .125, .25)
    for i in range(4): fx(sfx_ping(1400 + i * 200, .3, .4), ls("L043") + 4.6 + i * .5, .2)
    for i in range(4): fx(sfx_whoosh(.4, 600, 5000, .2, 280 + i), ls("L044") + .4 + i * .9, .25); ui_blip(ls("L044") + .45 + i * .9, .08)
    # ---------------- s13
    starts = [ls("L045"), ls("L046"), ls("L047"), ls("L048"), ls("L049"), ls("L049") + 3.2]
    for i, s in enumerate(starts): fx(sfx_whoosh(.5, 500, 5000, .2, 290 + i), s - .2, .25)
    # ---------------- s14
    fx(sfx_glitch(.6, .5, 300), ss("s14_extrap") - .05, .5)
    fx(sfx_impact(.9, 60, 3.0, 301), se("s14_extrap") - .05, .6); fx(sfx_whoosh(1.2, 6000, 300, .5, 302), se("s14_extrap") - .1, .4)
    # ---------------- s15 2030
    fx(sfx_chime(91, .3, 2.0), ls("L052") + .4, .3)
    for i in range(14): fx(sfx_click(.15, 5000, 310 + i), ls("L052") + 5.6 + i * .08, .3)
    fx(sfx_click(.5, 1800, 330), ls("L052") + 6.8, .5)
    fx(sfx_whoosh(2.8, 300, 5000, .35, 331), ls("L052") + 7.4, .4)
    fx(sfx_impact(.35, 70, 1.5, 332), ls("L053"), .4); fx(sfx_impact(.35, 80, 1.5, 333), ls("L053") + .9, .4)
    fx(sfx_whoosh(1.6, 300, 3000, .3, 334), ls("L054") + .3, .35); fx(sfx_impact(.5, 55, 2.5, 335), ls("L054") + 2.0, .45); fx(sfx_chime(84, .25, 2.5), ls("L054") + 2.05, .3)
    fx(sfx_paper(.6, .3, 336), ls("L054") + 1.6, .35); fx(sfx_stamp(.7, 337), ls("L054") + 3.35, .6)
    # ---------------- s16
    amb(lp(pink(secs(le("L057") - ls("L056") + 2), 340), 200) * .25, ls("L056"), 1.0, 1.0, 1.0)
    fx(sfx_whoosh(1.5, 400, 4000, .3, 341), ls("L058") + .6, .35)
    # ---------------- s17
    for i in range(14): fx(sfx_ping(R.uniform(2000, 3500), .3, .3), ls("L060") + .8 + R.uniform(0, 3.0), .12, R.uniform(-.6, .6))
    for i in range(5): fx(sfx_whoosh(1.6, 600, 5000, .15, 350 + i), ls("L059") + 2.4 + i * .3, .2, -.6 + i * .3)
    # ---------------- s18
    for i in range(7): fx(sfx_click(.25, 2200, 360 + i), ls("L061") + 1.4 + i * .17, .4)
    n = secs(le("L062") - ls("L062") + 1.5); amb((lp(pink(n, 370), 160) * .5 + sine(55, n) * .05).astype(np.float32), ls("L062") - .3, 1.0, .6, 1.0)
    # ---------------- s19 签名
    a = ss("s19_signature")
    c0, c1 = ls("L065") - .5, ls("L066") + .3
    amb(amb_room(c1 - c0, .07, 380, 50), c0, 1.0, .9, .8)
    t = c0 + .3; k = 0
    while t < c1 - .2: fx(sfx_tick(.12, 381 + k), t, .5, .5); t += .5; k += 1
    for i in range(int((c1 - c0) / 1.2)): fx(sfx_beep(1046, .06, .5), c0 + .6 + i * 1.2, .03, -.6)
    fx(sfx_scribble(2.8, .35, 390), ls("L066") - .4, .55)
    fx(sfx_glitch(.25, .3, 391), ls("L066") + 1.6, .25)
    # ---------------- s20
    n = secs(se("s20_quis") - ss("s20_quis")); amb((lp(pink(n, 400), 140) * .35).astype(np.float32), ss("s20_quis"), 1.0, 1.0, 1.0)
    # ---------------- s21
    for i in range(4): fx(sfx_glitch(.12, .3, 410 + i), ls("L069") + .5 + i * 1.3, .25)
    n = secs(se("s21_lin") - ls("L070") + 1); hum = (sine(110, n) * .04 + sine(220, n) * .02 + lp(pink(n, 411), 300) * .08).astype(np.float32)
    amb(hum, ls("L070") - .4, 1.0, 1.0, 1.0)
    # ---------------- s23
    a = ss("s23_end")
    for i in range(3): fx(sfx_ping([1320, 1760, 2093][i], .35, .5), a + 2.15 + i * .25, .25)
    fx(sfx_chime(100, .2, 1.0), a + 2.45, .3)

    os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
    fxw = reverb(FX.a, rt60=1.4, wet=.18, damp=7000, pre=.012, seed=7)
    sf.write(f"{ROOT}/build/audio/sfx.wav", fxw[: secs(DUR + 1)], SR, subtype="FLOAT")
    sf.write(f"{ROOT}/build/audio/amb.wav", AMB.a[: secs(DUR + 1)], SR, subtype="FLOAT")
    print("sfx peak", np.abs(fxw).max(), "amb peak", np.abs(AMB.a).max())

if __name__ == "__main__":
    build()
