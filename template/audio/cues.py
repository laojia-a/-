# -*- coding: utf-8 -*-
"""每个场景一段音乐。写法：读台词/场景时间（ls/le/ss/se），往乐器 I(...) 里放音符，或 synth_add/hit_add 合成音。最后把函数放进 CUES。"""
from score_core import *

THEME = [("A4", 1.5), ("C5", .5), ("E5", 1), ("D5", 1), ("C5", 2), ("A4", 1), ("C5", 1), ("G4", 1.5), ("E4", .5), ("G4", 1), ("C5", 1), ("B4", 2)]  # 主题动机：结尾可改成大调版

def c_open():
    a, b = ss("s00_open"), se("s00_open")
    pad = I("pad", 91, gain_db=-6, send=.6); pad.chord(a + .2, NS("D3 F3 A3 E4"), b - a, 70); pad.auto += [(a, 0), (a + 2, 1), (b, 1)]
    cel = I("celesta", 8, gain_db=-8, send=.6)
    t = a + 1
    while t < b - 1: cel.n(t, int(R.choice(NS("D5 F5 A5 C6"))), 1.2, 50); t += float(R.uniform(.5, 1.1))
    hit = ls("L002") + .5                                   # 与画面上数字出现同一时刻
    hit_add(sfx_braam(N("D2"), 4.0, .5), hit); hit_add(sfx_impact(.8, 42, 3.0), hit)
    silence_after(hit, 1.2)                                 # 爆点后骤停

def c_chapter():
    a, b = ss("s01_chapter"), se("s01_chapter")
    pn = I("piano", 0, gain_db=-1, send=.35); s = I("strings", 49, gain_db=-5, send=.5)
    s.chord(a + .3, NS("A2 E3 A3 C4"), b - a, 60)
    pn.seq(ls("L003"), THEME, .7, 56)

CUES = [c_open, c_chapter]
