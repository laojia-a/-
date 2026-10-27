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

def c_hbo():
    """HBO：克制。低音弦乐长音 + 稀疏钢琴，几乎不用打击乐"""
    a, b = ss("s01_hbo"), se("s01_hbo")
    s = I("strings_low", 49, gain_db=-5, send=.55); s.chord(a + .3, NS("A1 E2 A2"), b - a, 52); s.auto += [(a, 0), (a + 3, 1), (b - 1, 1), (b, 0)]
    pn = I("piano", 0, gain_db=-2, send=.45)
    for i, m in enumerate(NS("E4 A3 C4 B3")): pn.n(ls("L003") - .5 + i * 1.6, m, 2.5, 44)

def c_hollywood():
    """大片：上行弦乐 + 合唱 + 铜管，标题出现时 BRAAM + 冲击"""
    a, b = ss("s02_hollywood"), se("s02_hollywood"); hit = ls("L004") + .8
    st = I("strings_big", 48, gain_db=-3, send=.5); ch = I("choir", 52, gain_db=-4, send=.6); br = I("brass", 61, gain_db=-5, send=.45)
    for i, m in enumerate(NS("C3 D3 E3 G3")): st.n(a + .2 + i * .5, m, .55, 60 + i * 8)
    hit_add(sfx_riser(hit - a - .1, 200, 3000, .3), a + .1)
    hit_add(sfx_braam(N("C2"), 6.0, .55), hit); hit_add(sfx_impact(1.0, 42, 4.0), hit)
    for chd, d in [(NS("C3 G3 C4 E4"), 0), (NS("A2 E3 A3 C4"), 2.2)]:
        st.chord(hit + d, chd, 2.3, 86); ch.chord(hit + d, chd[1:], 2.3, 78); br.chord(hit + d, chd[:3], 2.1, 80)
    for n in ["strings_big", "choir", "brass"]: INST[n].auto += [(hit - .1, 1), (b - 1.2, 1), (b - .1, 0)]

CUES = [c_open, c_hbo, c_hollywood]
