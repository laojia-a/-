# -*- coding: utf-8 -*-
"""《监查者》原创配乐：按时间轴逐场景作曲（GeneralUser GS 音色库 + 合成器）。
输出：build/audio/music.wav（立体声 48k float）"""
import json, re, sys, os, time
import numpy as np
import tinysoundfont
import soundfile as sf
from dsp import *

import os as _os
from pathlib import Path as _P
ROOT = str(_P(__file__).resolve().parents[1])
CACHE = _os.environ.get("JCZ_CACHE", ROOT + "/.cache")
SFP = ROOT + "/assets/soundfont/GeneralUser-GS.sf2"
TL = json.load(open(f"{ROOT}/build/timeline.json", encoding="utf-8"))
SC = {s["id"]: s for s in TL["scenes"]}
LN = {l["id"]: l for l in TL["lines"]}
DUR = TL["duration"]
def ss(i): return SC[i]["start"]
def se(i): return SC[i]["end"]
def ls(i): return LN[i]["start"]
def le(i): return LN[i]["end"]

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def N(s):
    m = re.match(r"([A-G])([#b]?)(-?\d)", s); n = NOTE[m.group(1)] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)
    return 12 * (int(m.group(3)) + 1) + n
def NS(s): return [N(x) for x in s.split()]

R = np.random.default_rng(1747)


class Inst:
    def __init__(self, name, program, bank=0, gain_db=0.0, pan=0.0, send=.3, vol=1.0):
        self.name, self.program, self.bank, self.gain_db, self.pan, self.send, self.vol = name, program, bank, gain_db, pan, send, vol
        self.ev = []; self.auto = []
    def n(self, t, m, dur, vel=90, hum=True):
        if hum: t += R.normal(0, .006); vel = int(np.clip(vel + R.normal(0, 5), 1, 127))
        self.ev.append((max(0, t), max(.03, dur), int(m), int(vel)))
    def chord(self, t, ms, dur, vel=80, strum=0.0):
        for k, m in enumerate(ms): self.n(t + k * strum, m, dur - k * strum, vel)
    def seq(self, t, notes, beat, vel=85, legato=.95):
        """notes: [(note|None, beats)]"""
        for nm, b in notes:
            if nm is not None:
                for m in ([nm] if isinstance(nm, int) else ([N(nm)] if isinstance(nm, str) else nm)):
                    self.n(t, m, b * beat * legato, vel)
            t += b * beat
        return t
    def render(self):
        if not self.ev: return None, 0
        t0 = max(0, min(e[0] for e in self.ev) - .05); t1 = max(e[0] + e[1] for e in self.ev) + 4.0
        syn = tinysoundfont.Synth(samplerate=SR, gain=self.gain_db)
        sid = syn.sfload(SFP); syn.program_select(0, sid, self.bank, self.program)
        evs = []
        for (t, d, m, v) in self.ev: evs.append((t, 1, m, v)); evs.append((t + d, 0, m, 0))
        evs.sort(key=lambda e: (e[0], e[1]))
        out, pos = [], secs(t0)
        for (t, on, m, v) in evs:
            i = secs(t)
            if i > pos:
                out.append(np.frombuffer(syn.generate(i - pos), dtype=np.float32).reshape(-1, 2).copy()); pos = i
            if on: syn.noteon(0, m, v)
            else: syn.noteoff(0, m)
        end = secs(t1)
        if end > pos: out.append(np.frombuffer(syn.generate(end - pos), dtype=np.float32).reshape(-1, 2).copy())
        x = np.concatenate(out) * self.vol
        if self.auto: x = x * automation(self.auto, t0, len(x))[:, None]
        return x.astype(np.float32), t0


def automation(keys, t0, n):
    ks = sorted(keys); ts = np.array([k[0] for k in ks]); gs = np.array([k[1] for k in ks])
    tt = t0 + np.arange(n) / SR
    return np.interp(tt, ts, gs).astype(np.float32)


INST = {}
def I(name, program, bank=0, gain_db=0.0, pan=0.0, send=.3, vol=1.0):
    if name not in INST: INST[name] = Inst(name, program, bank, gain_db, pan, send, vol)
    return INST[name]

MUS = Bus(DUR + 6); SEND = Bus(DUR + 6)   # 合成器部分直接写入
POST = Bus(DUR + 6)  # 不受全局“骤停”自动化影响的声音
HITS = Bus(DUR + 6); HSEND = Bus(DUR + 6)  # 冲击/刮擦/升调等一次性“打点”，不参与分场景电平
def hit_add(x, t, gain=1.0, pan=0.0, send=.3):
    HITS.add(x, t, gain, pan); HSEND.add(x, t, gain * send, pan)
def synth_add(x, t, gain=1.0, pan=0.0, send=.3):
    MUS.add(x, t, gain, pan); SEND.add(x, t, gain * send, pan)

def arp(inst, t0, t1, chords, step, vel=70, pattern=(0, 1, 2, 1), octs=0, legato=1.6):
    """chords: [(t_start, [notes])]，在 [t0,t1) 区间按步长琶音"""
    t = t0; k = 0
    while t < t1 - 1e-6:
        cur = [c for c in chords if c[0] <= t + 1e-6]
        notes = cur[-1][1] if cur else chords[0][1]
        idx = pattern[k % len(pattern)]
        m = notes[idx % len(notes)] + 12 * (idx // len(notes)) + 12 * octs
        inst.n(t, m, step * legato, vel)
        t += step; k += 1

def drum(t, note, vel=90, kit=0, name='drums', gain_db=0, send=.15, vol=1.0):
    I(name, kit, 128, gain_db, 0, send, vol).n(t, note, .2, vel, hum=False)

# 主题动机（A 小调）与大调版本
THEME_MIN = [("A4", 1.5), ("C5", .5), ("E5", 1), ("D5", 1), ("C5", 2), ("A4", 1), ("C5", 1), ("G4", 1.5), ("E4", .5), ("G4", 1), ("C5", 1), ("B4", 2), ("D5", 1), ("B4", 1),
             ("A4", 1.5), ("C5", .5), ("E5", 1), ("G5", 1), ("F5", 1.5), ("E5", .5), ("C5", 2), ("D5", 1), ("C5", 1), ("A4", 1), ("G4", 1), ("G#4", 2), ("A4", 2)]
THEME_MAJ = [("C5", 1.5), ("E5", .5), ("G5", 1), ("F5", 1), ("E5", 2), ("C5", 1), ("E5", 1), ("A4", 1.5), ("F4", .5), ("A4", 1), ("C5", 1), ("B4", 2), ("D5", 1), ("G5", 1),
             ("C5", 1.5), ("E5", .5), ("G5", 1), ("C6", 1), ("A5", 1.5), ("G5", .5), ("E5", 2), ("F5", 1), ("E5", 1), ("D5", 1), ("C5", 1), ("D5", 2), ("C5", 2)]
CH_MIN = [NS("A2 E3 A3 C4 E4"), NS("F2 C3 F3 A3 C4"), NS("C3 G3 C4 E4 G4"), NS("G2 D3 G3 B3 D4"), NS("A2 E3 A3 C4 E4"), NS("F2 C3 F3 A3 C4"), NS("D3 A3 D4 F4 A4"), NS("E2 B2 E3 G#3 B3")]
CH_MAJ = [NS("C3 G3 C4 E4 G4"), NS("A2 E3 A3 C4 E4"), NS("F2 C3 F3 A3 C4"), NS("G2 D3 G3 B3 D4")]


def piano_chords(inst, t0, chords, bar, vel=58, style="broken"):
    t = t0
    for ch in chords:
        bass, upper = ch[0], ch[1:]
        inst.n(t, bass, bar * .98, vel + 6)
        if style == "broken":
            beat = bar / 4
            for k, m in enumerate([upper[0], upper[1], upper[2], upper[1]]):
                inst.n(t + k * beat, m, beat * 1.8, vel - 6)
        else:
            inst.chord(t, upper, bar * .95, vel - 4, strum=.03)
        t += bar
    return t


# ======================================================================= 场景配乐
def m_awakening():
    t0, t1 = 0.0, se("s00_eye")
    st = I("str_low", 49, gain_db=-2, send=.5)
    for t in [0.2, 8.2, 16.2]: st.chord(t, NS("D2 A2"), 8.4, 72)
    st.chord(24.2, NS("D2 A2"), 6.6, 60)
    st.auto += [(0, 0), (3.0, .9), (19.5, 1), (22, .35), (26.5, .5), (31, 0)]
    pad = I("spacevoice", 91, gain_db=-6, send=.6)
    pad.chord(3.0, NS("D3 F3 A3 E4"), 7.6, 70); pad.chord(10.5, NS("Bb2 F3 Bb3 D4"), 4.2, 70)
    pad.chord(14.6, NS("G2 D3 G3 Bb3"), 3.0, 70); pad.chord(17.5, NS("A2 E3 A3 C#4"), 2.6, 68)
    pad.auto += [(3, 0), (5, 1), (19.5, 1), (20.6, 0)]
    ch = I("choir", 52, gain_db=-4, send=.65)
    L2 = ls("L002")
    ch.chord(L2 - .2, NS("D3 A3 D4 F4"), 4.3, 74); ch.chord(L2 + 4.1, NS("D3 Bb3 D4 F4"), 3.9, 74)
    ch.chord(ls("L003"), NS("D3 G3 Bb3 D4"), 3.0, 70); ch.chord(ls("L003") + 3.0, NS("C#3 E3 A3 E4"), 2.4, 70)
    ch.auto += [(L2 - .3, 0), (L2 + 2.2, 1), (18.9, 1), (20.2, 0)]
    cel = I("celesta", 8, gain_db=-8, send=.6)
    scale = NS("D5 F5 G5 A5 C6 D6 F6")
    t = 3.4
    while t < 19.0:
        cel.n(t, int(R.choice(scale)), 1.2, int(R.integers(40, 62))); t += float(R.uniform(.45, 1.1))
    hp_ = I("harp", 46, gain_db=-6, send=.45)
    arp(hp_, ls("L003"), ls("L003") + 3.0, [(0, NS("G2 D3 G3 Bb3 D4"))], 60 / 180, 62, pattern=(0, 1, 2, 3, 4, 3, 2, 1))
    arp(hp_, ls("L003") + 3.0, ls("L004") - .1, [(0, NS("A2 E3 A3 C#4 E4"))], 60 / 180, 60, pattern=(0, 1, 2, 3, 4, 3, 2, 1))
    sb = I("sub_dm", 43, gain_db=-4, send=.2)
    sb.n(ls("L004") + 2.0, N("D1"), 4.5, 90)   # “1.1%” 出现时的低音
    sb.auto += [(0, 1)]
    # 倒带：反向渐强
    hit_add(sfx_reverse_swell(4.0, N("D3"), .3), ls("L005") + .1, 1.0, 0, .5)

def m_hotel():
    t0 = ss("s01_hotel") + .25; bar = 60 / 70 * 4
    pn = I("piano", 0, gain_db=-1, send=.35)
    piano_chords(pn, t0, CH_MIN[:7], bar, vel=50)
    pn.seq(t0 + bar, [(n, b) for n, b in THEME_MIN[:20]], bar / 4, vel=54)
    pd = I("warmpad", 89, gain_db=-12, send=.5)
    for k, ch in enumerate(CH_MIN[:7]): pd.chord(t0 + k * bar, ch[1:4], bar, 52)
    pd.auto += [(t0, 0), (t0 + 3, 1), (se("s01_hotel") - 1.5, 1), (se("s01_hotel") + .3, 0)]
    pn.auto += [(0, 1), (se("s01_hotel") - 1.2, 1), (se("s01_hotel") + .2, 0)]

def m_title():
    t = ss("s02_title") + .25
    hit_add(sfx_braam(N("D2"), 5.5, .55), t, 1.0, 0, .45)
    hit_add(sfx_impact(.8, 42, 4.0), t, 1.0, 0, .35)
    oh = I("orchhit", 55, gain_db=-4, send=.4); oh.chord(t, NS("D3 A3 D4 F4"), 1.2, 110, 0)
    tm = I("timpani", 47, gain_db=0, send=.4)
    for k in range(10): tm.n(t - 1.0 + k * .1, N("D2"), .15, 40 + k * 6)
    tm.n(t, N("D2"), 2.0, 120)
    hs = I("str_hi", 49, gain_db=-8, send=.6); hs.chord(t + .4, NS("D5 A5 D6"), 5.0, 60); hs.auto += [(t, 0), (t + 1.5, 1), (se("s02_title") - .6, 0)]

def m_1747():
    t0 = ss("s03_1747") + .4; bar = 4.0
    prog = [NS("D2 A2 D3 F3 A3"), NS("C2 G2 C3 E3 G3"), NS("Bb1 F2 Bb2 D3 F3"), NS("A1 E2 A2 C#3 E3"), NS("D2 A2 D3 F3 A3"), NS("F2 C3 F3 A3 C4"), NS("G2 D3 G3 Bb3 D4"), NS("A1 E2 A2 C#3 E3")]
    s = I("str_1747", 49, gain_db=-5, send=.5)
    hpp = I("harp", 46, gain_db=-5, send=.45)
    for k, ch in enumerate(prog):
        s.chord(t0 + k * bar, ch[1:], bar * .98, 62)
        arp(hpp, t0 + k * bar, t0 + (k + 1) * bar, [(0, ch)], .5, 56 if k != 5 else 70, pattern=(0, 1, 2, 3, 4, 3, 2, 1))
    cel = I("cello", 42, gain_db=-2, send=.45)
    mel = [("D3", 2), ("F3", 1), ("A3", 1), ("G3", 2), ("E3", 2), ("F3", 2), ("D3", 1), ("F3", 1), ("E3", 3), ("C#3", 1), ("D3", 2), ("A3", 2), ("A3", 1), ("C4", 1), ("F4", 2), ("D4", 2), ("Bb3", 1), ("G3", 1), ("E3", 4)]
    cel.seq(t0 + .02, mel, 1.0, 78)
    # 橘子与柠檬：竖琴刮奏
    tg = ls("L012") + .4
    for k, m in enumerate(NS("F4 A4 C5 F5 A5 C6 F6")): hpp.n(tg + k * .06, m, 1.5, 80)
    s.auto += [(t0, 0), (t0 + 3, 1), (se("s03_1747") - 1, 1), (se("s03_1747") + .6, .2)]

def m_blood():
    a = ss("s04_blood")
    # 时间尺：木鱼滴答 + 上行弦乐
    wb = I("woodblock", 115, gain_db=-8, send=.2)
    t = ls("L014"); k = 0
    while t < le("L014") - .1: wb.n(t, N("E5") if k % 2 else N("B4"), .1, 70); t += .25 - min(.12, k * .004); k += 1
    fs = I("str_fast", 48, gain_db=-6, send=.45)
    for i, m in enumerate(NS("D3 E3 F3 G3 A3 Bb3 C4 D4")): fs.n(ls("L014") + .2 + i * .42, m, .5, 60 + i * 4)
    # 纽伦堡：肃穆
    lo = I("str_low2", 49, gain_db=-4, send=.5)
    lo.chord(ls("L015") - .3, NS("D2 A2 D3"), 10.8, 66); lo.chord(ls("L016") + 4.5, NS("Bb1 F2 Bb2"), 6.0, 60)
    pn = I("piano", 0)
    for i, m in enumerate(NS("D3 A2 F3 E3 D3")): pn.n(ls("L015") + i * 2.1, m, 2.0, 44)
    # 沙利度胺：音乐盒摇篮曲片段 + 高音弦
    mb = I("musicbox", 10, gain_db=-8, send=.55)
    mb.seq(ls("L017") + .6, [("A5", 1), ("F5", 1), ("D5", 1), ("E5", 1), ("F5", 2), ("A5", 2), ("G5", 1), ("E5", 1), ("C5", 1), ("D5", 1), ("D5", 4)], .62, 50)
    hs = I("str_hi2", 49, gain_db=-10, send=.6); hs.chord(ls("L017"), NS("A4 D5 F5"), 9.8, 50)
    lo.chord(ls("L017") - .3, NS("D2 A2"), ls("L019") - ls("L017") + .3, 50)   # 填补沙利度胺→印章之间的空白
    hs.auto += [(ls("L017") - .1, 0), (ls("L017") + 2, 1), (le("L017"), 1), (le("L017") + 1.2, 0)]
    # 印章：定音鼓 + 铜管
    tm = I("timpani", 47); br = I("brass", 61, gain_db=-6, send=.45)
    for tt, ch in [(ls("L018") + .55, NS("D3 A3 D4 F4")), (ls("L018") + 6.25, NS("Bb2 F3 Bb3 D4"))]:
        tm.n(tt, N("D2") if ch[0] == N("D3") else N("Bb1"), 1.6, 120); br.chord(tt, ch, 2.2, 92)
    # GCP：合唱 + 太鼓心跳
    chr_ = I("choir2", 52, gain_db=-4, send=.6); chr_.chord(ls("L019") - .2, NS("D3 A3 D4 F4"), 8.4, 72)
    chr_.auto += [(ls("L019") - .3, 0), (ls("L019") + 2, 1), (se("s04_blood") - .6, 0)]
    tk = I("taiko", 116, gain_db=-2, send=.35)
    t = ls("L019") + .4
    while t < se("s04_blood") - .8: tk.n(t, N("C2"), .3, 100); tk.n(t + .24, N("C2"), .3, 70); t += 1.15

def m_suitcase():
    a = ss("s05_1996"); bar5 = 60 / 84 * 4
    hpp = I("harp2", 46, gain_db=-6, send=.5)
    for k, m in enumerate(NS("C4 E4 G4 C5 E5 G5 C6")): hpp.n(a + .3 + k * .07, m, 2.5, 66)
    st = I("str_96", 48, gain_db=-6, send=.5); hn = I("horn", 60, gain_db=-8, send=.5)
    t0 = ls("L020") - .1
    prog = [NS("C3 G3 C4 E4"), NS("B2 G3 B3 D4"), NS("A2 E3 A3 C4"), NS("F2 C3 F3 A3"), NS("G2 D3 G3 B3")]
    for k, ch in enumerate(prog):
        st.chord(t0 + k * bar5, ch, bar5 * .98, 70); hn.chord(t0 + k * bar5, ch[1:3], bar5 * .95, 60)
    pz = I("pizz", 45, gain_db=-4, send=.3)
    arp(pz, ls("L021"), ss("s06_suitcase"), [(0, NS("A3 C4 E4")), (t0 + 3 * bar5, NS("F3 A3 C4")), (t0 + 4 * bar5, NS("G3 B3 D4"))], 60 / 84 / 2, 70, pattern=(0, 1, 2, 1))
    # 行走律动 104 BPM
    b = 60 / 104; bar = b * 4; t1 = ss("s06_suitcase") + .05; nb = int((ss("s07_edc") - t1) / bar) + 1
    progw = [NS("C3 E3 G3 C4"), NS("G2 B2 D3 G3"), NS("A2 C3 E3 A3"), NS("F2 A2 C3 F3")]
    mar = I("marimba", 12, gain_db=-5, send=.3); pb = I("pizzbass", 45, gain_db=-3, send=.2)
    sdv0, sdv1 = ls("L023") - .3, ls("L024")
    for k in range(nb):
        ch = progw[k % 4]; tb = t1 + k * bar
        for q in range(4): pb.n(tb + q * b, ch[0] - 12 + (7 if q == 2 else 0), b * .8, 78)
        arp(mar, tb, tb + bar, [(0, ch[1:] + [ch[1] + 12])], b / 2, 64, pattern=(0, 1, 2, 3, 2, 1, 0, 2))
        for q in range(8):
            tt = tb + q * b / 2
            if tt >= ss("s07_edc") - .2: break
            busy = not (sdv0 < tt < sdv1)
            if q % 2 == 0 and busy: drum(tt, 36 if q in (0, 4) else 37, 70 if q in (0, 4) else 55, name='kit_walk', gain_db=-4)
            drum(tt, 42, 38 if busy else 28, name='kit_walk', gain_db=-4)
    # 100% 弦乐渐强 + 镲
    sw = I("str_swell", 48, gain_db=-4, send=.5); sw.chord(ls("L024") + 2.0, NS("C3 G3 C4 E4 G4"), le("L024") - ls("L024") - 1.6, 80)
    sw.auto += [(ls("L024") + 2, 0), (le("L024") - .4, 1), (le("L024") + .6, 0)]
    drum(le("L024") - .4, 49, 100, kit=48, name='kit_orch', gain_db=-2, send=.4)

def m_chip():
    a = ss("s07_edc") + .05; b = 60 / 132; bar = b * 4; nbar = int((se("s07_edc") - a) / bar)
    prog = [NS("C4 E4 G4"), NS("A3 C4 E4"), NS("F3 A3 C4"), NS("G3 B3 D4")]
    for k in range(nbar):
        ch = prog[k % 4]; tb = a + k * bar
        for q in range(16):
            m = ch[q % 3] + 12 * ((q // 3) % 2); synth_add(chip(m + 12, b / 4 * .9, 'sq', .25, .07), tb + q * b / 4, 1, .15, .1)
        for q in range(4): synth_add(chip(ch[0] - 12, b * .9, 'tri', gain=.2), tb + q * b, 1, 0, .05)
        for q in range(4):
            if q % 2 == 1: synth_add(hp(noise(secs(.08)), 3000) * exp_env(secs(.08), .02) * .12, tb + q * b, 1, 0, .05)
    # 获得道具 / 道具移除 / 提示
    tg = ls("L025") + 2.4
    for k, m in enumerate(NS("C5 E5 G5 C6")): synth_add(chip(m, .09, 'sq', .5, .14), tg + k * .07, 1, 0, .2)
    tr = ls("L025") + 3.6
    for k, m in enumerate(NS("G5 E5 C5 G4 C4")): synth_add(chip(m, .1, 'sq', .5, .12), tr + k * .09, 1, 0, .2)
    for k in range(2): synth_add(chip(N("A5") if k == 0 else N("E5"), .12, 'sq', .5, .12), ls("L026") + k * .16, 1, 0, .2)

def m_onepointone():
    a = ss("s08_onepointone"); b = 60 / 90
    hit_add(sfx_impact(.7, 40, 3.5), a + .2, 1, 0, .3)
    bass = I("synbass", 38, gain_db=-6, send=.15)
    t = ls("L027")
    while t < ls("L030") - .05: bass.n(t, N("A1"), b / 2 * .8, 80 if int((t - ls('L027')) / (b / 2)) % 2 == 0 else 62); t += b / 2
    lo = I("str_low3", 49, gain_db=-4, send=.5); lo.chord(ls("L027"), NS("A2 E3 A3"), ls("L030") - ls("L027"), 66)
    wb = I("woodblock", 115)
    t = ls("L027")
    while t < ls("L030") - .1: wb.n(t, N("B4"), .1, 50); t += b
    tk = I("taiko", 116)
    t = ls("L028")
    while t < ls("L030") - .1: tk.n(t, N("C2"), .3, 95); tk.n(t + 2 * b, N("C2"), .3, 80); t += 4 * b
    fs = I("str_fast2", 48, gain_db=-6, send=.4)
    arp(fs, ls("L028"), ls("L029"), [(0, NS("A3 C4 E4"))], b / 2, 66, pattern=(0, 1, 2, 1))
    tr = I("tremolo", 44, gain_db=-4, send=.5)
    for k, chn in enumerate([NS("A3 C4 E4"), NS("C4 E4 A4"), NS("E4 A4 C5")]): tr.chord(ls("L029") + k * 1.7, chn, 1.75, 64 + k * 8)
    tr.auto += [(ls("L029"), .4), (ls("L030") - .05, 1), (ls("L030"), 0)]
    chq = I("choir3", 52, gain_db=-4, send=.6); chq.chord(ls("L029"), NS("A3 E4 A4"), ls("L030") - ls("L029"), 80)
    chq.auto += [(ls("L029"), 0), (ls("L030") - .05, 1), (ls("L030"), 0)]
    tm = I("timpani", 47)
    t = ls("L029") + 2.5; k = 0
    while t < ls("L030") - .05: tm.n(t, N("A1"), .1, min(84, 40 + k * 2)); t += .09; k += 1
    # 1.1% 冲击 → 骤停
    hit = ls("L030") - .05
    HITS.add(sfx_braam(N("A1"), 5.0, .6), hit); HITS.add(sfx_impact(1.0, 38, 4.0), hit); HSEND.add(sfx_braam(N("A1"), 5.0, .6), hit, .4)
    oh = I("orchhit", 55); oh.chord(hit, NS("A2 E3 A3 C4"), 1.0, 120, 0)
    drum(hit, 49, 110, kit=48, name='kit_orch')
    ring = sine(1760, secs(3.4)) * np.minimum(1, np.arange(secs(3.4)) / secs(.3)) * np.linspace(1, 0, secs(3.4)) ** 2 * .03
    HITS.add(ring, hit + .25)
    # 钢琴余韵
    pn = I("piano", 0)
    for i, m in enumerate(NS("A3 E4 C5 E4 A3 B3 C4 E4")): pn.n(ls("L031") + i * 1.0, m, 1.8, 62)
    pn.seq(ls("L032") + .3, [("A4", 1.5), ("C5", .5), ("E5", 1), ("D5", 1), ("C5", 2), ("A4", 1), ("B4", 1.5)], .75, 64)
    pd = I("warmpad", 89); pd.chord(ls("L031"), NS("A2 E3 C4"), se("s08_onepointone") - ls("L031"), 44)

def m_rbm():
    a = ss("s09_rbm"); b = 60 / 96; bar = 4 * b
    hit_add(sfx_whoosh(1.4, 300, 3000, .25), ls("L033") + .1, 1, 0, .3)
    hit_add(sfx_chime(N("E6"), .12, 2.5), ls("L033") + 2.2, 1, .2, .5)
    prog = [NS("A3 C4 E4"), NS("F3 A3 C4"), NS("C4 E4 G4"), NS("G3 B3 D4")]
    t0 = ls("L034") - .2; nb = int((se("s09_rbm") - t0) / bar) + 1
    sp = I("sweeppad", 95, gain_db=-10, send=.5)
    for k in range(nb):
        ch = prog[k % 4]; tb = t0 + k * bar
        for q in range(16):
            tt = tb + q * b / 4
            if tt > se("s09_rbm") - .3: break
            synth_add(pluck(ch[q % 3] + 12 * (q // 8), .18, 2600, .07), tt, 1, (-.3 if q % 2 else .3), .25)
        synth_add(sub(ch[0] - 24, bar * .95, .16), tb, 1, 0, 0)
        sp.chord(tb, ch, bar, 56)
        for q in range(4):
            tt = tb + q * b
            if tt > se("s09_rbm") - .3: break
            drum(tt, 36, 70, kit=25, name='kit808', gain_db=-6)
            if tt > ls("L035"): drum(tt + b / 2, 42, 50, kit=25, name='kit808', gain_db=-6)

def m_722():
    a = ss("s10_722"); b = 60 / 92; bar = 4 * b
    dr = I("drone722", 49, gain_db=-4, send=.5); dr.chord(a + .1, NS("C2 G2 C3"), ls("L037") - a + .5, 70)
    hit = ls("L037") + .3
    hit_add(sfx_impact(1.0, 36, 4.0), hit, 1, 0, .4); hit_add(sfx_braam(N("C2"), 4.5, .45), hit, 1, 0, .4)
    tk = I("taiko", 116); fs = I("str_722", 48, gain_db=-4, send=.4); br = I("brass", 61)
    prog = [NS("C3 G3 C4 Eb4"), NS("Ab2 Eb3 Ab3 C4"), NS("Eb3 Bb3 Eb4 G4"), NS("Bb2 F3 Bb3 D4")]
    t0 = hit + .4; t_end = ls("L038") + .9; k = 0; tb = t0
    while tb < t_end - .1:
        ch = prog[k % 4]
        br.chord(tb, ch, bar * .9, 70 + min(20, k * 4))
        for q in range(8):
            tt = tb + q * b / 2
            if tt >= t_end: break
            fs.n(tt, ch[0] - 12 + (12 if q % 2 else 0), b / 2 * .9, 74)
            if q in (0, 3, 4, 6): tk.n(tt, N("C2"), .3, 100 if q == 0 else 78)
        tb += bar; k += 1
    # 口号印章
    st = ls("L038") + 1.1
    tm = I("timpani", 47); tm.n(st, N("C2"), 2, 122); br.chord(st, NS("C3 G3 C4 Eb4 G4"), 2.5, 105)
    hit_add(sfx_impact(.8, 40, 3.0), st, 1, 0, .3)
    # 加入 ICH：降 E 大调温暖解决
    wr = I("str_warm", 49, gain_db=-4, send=.55); wr.chord(ls("L039") + .2, NS("Eb3 Bb3 Eb4 G4"), se("s10_722") - ls("L039"), 70)
    wr.auto += [(ls("L039"), 0), (ls("L039") + 1.2, 1), (se("s10_722") - .3, 1), (se("s10_722") + .4, 0)]
    hit_add(sfx_chime(N("Bb5"), .18, 3.0), ls("L039") + 1.6, 1, .3, .6)

def m_2020():
    a = ss("s11_2020")
    atm = I("atmos", 99, gain_db=-8, send=.6); atm.chord(a + .2, NS("E2 B2 E3 G3"), se("s11_2020") - a - 1, 60)
    atm.auto += [(a, 0), (a + 2.5, 1), (se("s11_2020") - 1.5, 1), (se("s11_2020"), 0)]
    pn = I("piano", 0)
    for i, (m, dt) in enumerate([("E5", 0), ("B4", 2.2), ("G4", 4.6), ("B4", 7.1)]): pn.n(ls("L040") + dt, N(m), 2.4, 40)
    b = 60 / 80; t = ls("L041"); k = 0
    prog = [NS("E3 G3 B3"), NS("C3 E3 G3"), NS("G3 B3 D4"), NS("D3 F#3 A3")]
    while t < ls("L042") - .2:
        ch = prog[(k // 8) % 4]; synth_add(pluck(ch[k % 3] + 12, .2, 2200, .05), t, 1, (-.25 if k % 2 else .25), .3); t += b / 2; k += 1
    wp = I("warmpad", 89); wp.chord(ls("L042") + 2.4, NS("C3 G3 D4 E4"), 3.6, 64)
    hit_add(sfx_chime(N("G5"), .14, 2.6), ls("L042") + 2.4, 1, 0, .6)

def m_synthwave():
    a = ss("s12_llm"); b = 60 / 100; bar = 4 * b
    t0 = a + .2; t_end = ss("s14_extrap") + .2
    prog = [NS("A2 C3 E3 A3"), NS("F2 A2 C3 F3"), NS("C3 E3 G3 C4"), NS("G2 B2 D3 G3")]
    poly = I("poly", 90, gain_db=-10, send=.45); bs = I("synbass2", 38, gain_db=-6, send=.1)
    ch_ = I("choir4", 52, gain_db=-8, send=.6)
    k = 0; tb = t0
    while tb < t_end - .3:
        ch = prog[k % 4]; dens = 0 if tb < ls("L043") else 1 if tb < ls("L044") else 2
        poly.chord(tb, ch[1:], bar, 52)
        for q in range(16):
            tt = tb + q * b / 4
            if tt >= t_end - .2: break
            if dens >= 1: synth_add(pluck(ch[1 + q % 3] + 12 * (1 + (q // 4) % 2), .14, 3400, .06), tt, 1, (-.35 if q % 2 else .35), .3)
        for q in range(8):
            tt = tb + q * b / 2
            if tt >= t_end - .2: break
            if dens >= 2: bs.n(tt, ch[0] - 12, b / 2 * .8, 80)
            if dens >= 1:
                if q % 4 == 0: drum(tt, 36, 84, kit=25, name='kit808')
                if q % 4 == 2: drum(tt, 38, 70, kit=25, name='kit808')
                drum(tt, 42, 40, kit=25, name='kit808')
        if ls("L048") - .3 < tb < ls("L049"): ch_.chord(tb, ch[1:], bar, 60)
        tb += bar; k += 1
    # 里程碑叮
    starts = [ls("L045"), ls("L046"), ls("L047"), ls("L048"), ls("L049"), ls("L049") + 3.2]
    for i, s in enumerate(starts): hit_add(sfx_chime([N("E6"), N("G6"), N("A6"), N("C7"), N("E6"), N("G6")][i], .12, 2.0), s, 1, (.3 if i % 2 else -.3), .6)
    # 你在这里
    hit_add(sfx_riser(3.0, 200, 2400, .3), ls("L050") - 2.8, 1, 0, .4)
    hit_add(sfx_impact(.6, 50, 3.0), ls("L050") + .2, 1, 0, .4)
    hit_add(sfx_chime(N("C6"), .2, 3.5), ls("L050") + .2, 1, 0, .6)

def m_extrap():
    a = ss("s14_extrap")
    for k in range(10):
        hit_add(sfx_beep(880 if k % 2 == 0 else 660, .16, .05), a + .3 + k * .42, 1, 0, .2)
    hit_add(sfx_glitch(.5, .25, 3), a + .05, 1, 0, .2)
    hit_add(sfx_click(.4, 2000, 1), ls("L051") + 2.8, 1, 0, .2)
    hit_add(sfx_riser(2.2, 300, 5000, .45, 9), se("s14_extrap") - 2.2, 1, 0, .4)

def m_future():
    # s15 2030：晶莹琶音
    a = ss("s15_2030"); b = 60 / 90; bar = 4 * b
    hit_add(sfx_impact(.7, 55, 3.0), a, 1, 0, .4)
    halo = I("halo", 94, gain_db=-8, send=.6)
    cry = I("crystal", 98, gain_db=-10, send=.55)
    prog = [NS("F3 A3 C4 E4"), NS("C3 G3 C4 E4"), NS("D3 A3 D4 F4"), NS("Bb2 F3 Bb3 D4")]
    t0 = a + .2; k = 0; tb = t0
    while tb < se("s15_2030") - .3:
        ch = prog[k % 4]; halo.chord(tb, ch, bar, 56)
        if tb > ls("L052") - .5: arp(cry, tb, min(tb + bar, se("s15_2030") - .2), [(0, ch)], b / 2, 54, pattern=(0, 1, 2, 3, 2, 1))
        tb += bar; k += 1
    halo.auto += [(a, 0), (a + 2, 1), (se("s15_2030"), 1)]
    # s16 2035：心跳加速 → 持续音 → 史诗律动
    a16 = ss("s16_2035")
    hb_t = ls("L055") + .4; gap = 1.3
    while hb_t < le("L055") - .3:
        hit_add(sfx_heartbeat(.55), hb_t, 1, 0, .2); hb_t += gap; gap = max(.09, gap * .78)
    tone_n = secs(3.0); tone = sine(110, tone_n) * np.linspace(0, 1, tone_n) ** 2 * .12
    synth_add(tone, le("L055") - 2.2, 1, 0, .3)
    for k in range(int((ls("L057") - le("L055")) / (60 / 72))):
        hit_add(sfx_beep(1000, .1, .05), le("L055") + .2 + k * 60 / 72, 1, 0, .2)
    st = I("str_fut", 48, gain_db=-4, send=.45); chr_ = I("choir5", 52, gain_db=-6, send=.6); hn = I("horn", 60)
    tk = I("taiko", 116); bs = I("synbass2", 38)
    prog2 = [NS("D3 A3 D4 F4"), NS("Bb2 F3 Bb3 D4"), NS("F3 C4 F4 A4"), NS("C3 G3 C4 E4")]
    t0 = ls("L056") - .1; k = 0; tb = t0
    while tb < se("s16_2035") - .3:
        ch = prog2[k % 4] if tb < ls("L058") else [NS("F3 C4 F4 A4"), NS("C3 G3 C4 E4")][k % 2]
        st.chord(tb, ch, bar, 70); chr_.chord(tb, ch[1:], bar, 58)
        if tb > ls("L057"): hn.chord(tb, ch[:2], bar * .9, 60)
        for q in range(8):
            tt = tb + q * b / 2
            if tt > se("s16_2035") - .3: break
            bs.n(tt, ch[0] - 12, b / 2 * .8, 70)
            if q in (0, 3, 4, 6): tk.n(tt, N("C2"), .3, 84 if q == 0 else 64)
        tb += bar; k += 1
    for s in [ls("L057") + .9, ls("L057") + 4.6, ls("L057") + 8.4]:
        hit_add(sfx_beep(740, .14, .07), s, 1, 0, .2); hit_add(sfx_beep(587, .2, .07), s + .16, 1, 0, .2)
    hit_add(sfx_ping(1320, .2), ls("L058") + 2.0, 1, .4, .5)
    # s17 2040：数字孪生（F 利底亚）
    a17 = ss("s17_2040")
    prog3 = [NS("F3 C4 A4 E5"), NS("G3 D4 B4 F#5"), NS("A3 E4 C5 G5"), NS("C4 G4 E5 B5")]
    ch6 = I("choir6", 52, gain_db=-5, send=.65); st2 = I("str_twin", 49, gain_db=-5, send=.55); cel = I("celesta", 8)
    tb = a17 + .1; k = 0
    while tb < se("s17_2040") - .3:
        ch = prog3[k % 4]; ch6.chord(tb, ch[:3], bar, 64); st2.chord(tb, ch, bar, 60)
        arp(cel, tb, min(tb + bar, se("s17_2040") - .2), [(0, ch)], b / 2, 50, pattern=(0, 1, 2, 3, 2, 1), octs=1)
        tb += bar; k += 1
    for i in range(5): hit_add(sfx_chime(N("A6") + [0, 2, 4, 7, 9][i], .06, 2.0), ls("L059") + .6 + i * .35, 1, -.4 + i * .2, .7)
    # s18 2047：高潮
    a18 = ss("s18_2047"); hit = ls("L061") + 2.5
    tm = I("timpani", 47); t = ls("L061"); k = 0
    while t < hit - .05: tm.n(t, N("F2"), .1, min(80, 36 + k)); t += .08; k += 1
    up = I("str_rise", 48, gain_db=-4, send=.5)
    for i, m in enumerate(NS("F3 G3 A3 Bb3 C4 D4 E4 F4")): up.n(ls("L061") + i * .3, m, .32, 64 + i * 6)
    hit_add(sfx_braam(N("F2"), 6.0, .55), hit, 1, 0, .5); hit_add(sfx_impact(1.0, 44, 4.0), hit, 1, 0, .4)
    oh = I("orchhit", 55); oh.chord(hit, NS("F3 C4 F4 A4"), 1.0, 122, 0)
    drum(hit, 49, 115, kit=48, name='kit_orch'); drum(hit, 57, 100, kit=48, name='kit_orch')
    big = [NS("F2 C3 F3 A3 C4"), NS("C3 G3 C4 E4 G4"), NS("D3 A3 D4 F4 A4"), NS("C3 G3 C4 E4 G4")]
    st3 = I("str_big", 48, gain_db=-2, send=.5); ch7 = I("choir7", 52, gain_db=-3, send=.6); br = I("brass", 61); hn2 = I("horn2", 60, gain_db=-4, send=.5)
    seg = (se("s18_2047") - .6 - hit) / 4
    for k, ch in enumerate(big):
        tb = hit + k * seg; st3.chord(tb, ch, seg * 1.02, 88); ch7.chord(tb, ch[1:], seg * 1.02, 80); br.chord(tb, ch[1:4], seg * .9, 80); hn2.chord(tb, ch[2:4], seg * .95, 76)
        for q in range(4): tk.n(tb + q * seg / 4, N("C2"), .3, 110 if q == 0 else 82)
    for nm in ["str_big", "choir7", "horn2"]:
        INST[nm].auto += [(hit - .1, 1), (se("s18_2047") - .9, 1), (se("s18_2047") - .2, 0)]

def m_signature():
    a = ss("s19_signature"); b = 1.0
    pn = I("piano", 0); s = I("str_sig", 49, gain_db=-5, send=.55)
    pn.n(a + .4, N("A4"), 3.0, 52)
    s.chord(ls("L063") - .4, NS("A2 E3 A3"), ls("L065") - ls("L063") + .6, 48)   # 眼睛/ICF 段落的底垫
    for i, m in enumerate(NS("A3 E4 A4 C5")): pn.n(ls("L063") + i * .6, m, 2.4, 44)
    for i, m in enumerate(NS("F3 C4 F4 A4 C4")): pn.n(ls("L064") + i * 1.2, m, 2.4, 42)
    for i in range(3): hit_add(sfx_beep(1568, .07, .045), ls("L064") + 2.65 + i * .9, 1, .3, .2)
    t = ls("L065") - .3
    t = pn.seq(t, [(n, bt) for n, bt in THEME_MIN[:7]], .78, 54)
    s.chord(ls("L065"), NS("A2 E3 A3 C4"), 4.4, 52); s.chord(ls("L065") + 4.4, NS("F2 C3 F3 A3"), 3.0, 56)
    pn.seq(ls("L066") - .3, [(n, bt) for n, bt in THEME_MIN[7:14]], .78, 56)
    s.chord(ls("L066"), NS("C3 G3 C4 E4"), 3.0, 62); s.chord(ls("L066") + 3.0, NS("A2 E3 A3 B3 E4"), se("s19_signature") - ls("L066") - 2.0, 58)
    s.auto += [(ls("L063") - .5, 0), (ls("L063") + 1.5, .7), (ls("L065") - .5, .7), (ls("L065") + 2, 1), (se("s19_signature") - 1.0, 1), (se("s19_signature"), 0)]

def m_quis():
    a = ss("s20_quis")
    c = I("choir8", 52, gain_db=-3, send=.7); lo = I("str_low4", 49, gain_db=-4, send=.6)
    res = le("L068") - .5
    c.chord(a + .2, NS("D3 A3 D4 F4"), res - a - .2, 66); lo.chord(a + .2, NS("D2 A2"), res - a - .2, 62)
    c.chord(res, NS("D3 A3 D4 F#4 A4"), 4.5, 84); lo.chord(res, NS("D2 A2 D3 F#3"), 4.5, 78)
    c.auto += [(a, 0), (a + 2.5, .8), (res - .2, .9), (res + .8, 1.15), (se("s20_quis") + .8, 0)]
    lo.auto += [(a, 0), (a + 2.5, 1), (se("s20_quis") + .8, 0)]
    hit_add(sfx_impact(.5, 60, 3.0), res, 1, 0, .6); hit_add(sfx_chime(N("A5"), .16, 4.0), res + .05, 1, 0, .7)

def m_lin():
    a = ss("s21_lin")
    pn = I("piano_lofi", 0, gain_db=-3, send=.3)
    pn.seq(ls("L069") - .2, [(n, bt) for n, bt in THEME_MIN[:7]], .7, 50)
    for i, ch in enumerate([NS("A2 E3 C4"), NS("F2 C3 A3")]): pn.chord(ls("L069") - .2 + i * 2.8, ch, 2.8, 42)
    hp2 = I("harp2", 46)
    for k, m in enumerate(NS("C4 E4 G4 C5 E5 G5 C6 E6")): hp2.n(ls("L070") - .3 + k * .06, m, 2.0, 66)
    s = I("str_lin", 49, gain_db=-4, send=.55)
    s.chord(ls("L070"), NS("C3 G3 C4 E4"), 3.0, 64); s.chord(ls("L070") + 3.0, NS("G2 D3 G3 B3"), 1.4, 60)
    wp = I("warmpad2", 89, gain_db=-10, send=.6)
    for i, ch in enumerate([NS("A2 E3 C4"), NS("F2 C3 A3"), NS("C3 G3 E4"), NS("G2 D3 B3")]): wp.chord(ls("L071") + i * 1.55, ch, 1.6, 50)

def m_finale():
    a = ss("s22_quest"); b = 60 / 76; bar = 4 * b
    pn = I("piano", 0); s = I("str_fin", 49, gain_db=-4, send=.55); ch = I("choir9", 52, gain_db=-5, send=.65)
    s.chord(ls("L072"), NS("C3 G3 C4 E4"), 3.4, 62); s.chord(ls("L072") + 3.4, NS("A2 E3 A3 C4"), ls("L073") - ls("L072") - 3.0, 62)
    s.chord(ls("L073"), NS("F2 C3 F3 A3"), 1.5, 62); s.chord(ls("L073") + 1.5, NS("G2 D3 G3 B3"), ls("L074") - ls("L073") - 1.2, 66)
    for k in range(4): hit_add(sfx_click(.12, 2500, k), ls("L072") + k * .25, 1, 0, .1)
    hit = ls("L074") + .3
    hit_add(sfx_impact(.8, 50, 4.0), hit, 1, 0, .5); hit_add(sfx_chime(N("C6"), .22, 4.0), hit, 1, 0, .6); hit_add(sfx_chime(N("G6"), .12, 4.0), hit + .08, 1, 0, .6)
    ch.chord(hit, NS("C3 G3 C4 E4 G4"), 4.5, 78); s.chord(hit, NS("C2 G2 C3 E3 G3"), 4.5, 74)
    t0 = hit + 2.2
    pn.seq(t0, [(n, bt) for n, bt in THEME_MAJ], b, 56)
    for k, chn in enumerate(CH_MAJ * 2):
        tb = t0 + k * bar
        if tb > se("s23_end") - 1.5: break
        s.chord(tb, chn[:4], bar, 54); pn.n(tb, chn[0], bar, 48)
    pn.chord(t0 + 8 * bar, NS("C3 G3 C4 E4 G4"), 4.0, 50)
    for nm in ["str_fin", "piano"]:
        INST[nm].auto += [(0, 1), (se("s23_end") - 2.5, 1), (se("s23_end") - .2, 0)]


def build():
    t_start = time.time()
    for fn in [m_awakening, m_hotel, m_title, m_1747, m_blood, m_suitcase, m_chip, m_onepointone, m_rbm, m_722, m_2020, m_synthwave, m_extrap, m_future, m_signature, m_quis, m_lin, m_finale]:
        fn()
    for name, inst in INST.items():
        x, t0 = inst.render()
        if x is None: continue
        MUS.add(x, t0, 1.0, inst.pan); SEND.add(x, t0, inst.send, inst.pan)
        print(f"  rendered {name:12s} {len(inst.ev):4d} notes  peak {np.abs(x).max():.3f}", flush=True)
    wet = reverb(SEND.a, rt60=2.8, wet=1.0, damp=5500, pre=.025, seed=3)
    out = MUS.a + wet * .55
    # 全局音乐自动化：1.1% 骤停后的寂静、2047 收尾黑场
    keys = [(0, 1), (ls("L030") + .02, 1), (ls("L030") + .35, .0), (ls("L031") - .2, 0), (ls("L031") + .6, 1),
            (se("s18_2047") - .3, 1), (se("s18_2047") + .2, 0), (ss("s19_signature") + .2, 0), (ss("s19_signature") + .6, 1), (DUR + 5, 1)]
    out *= automation(keys, 0, len(out))[:, None]
    pk = np.abs(out).max(); out = out / pk * .89
    hw = HITS.a + reverb(HSEND.a, rt60=3.0, wet=1.0, damp=6000, pre=.02, seed=5) * .5
    hpk = np.abs(hw).max(); hw = hw / hpk * .89
    sf.write(f"{ROOT}/build/audio/hits.wav", hw[: secs(DUR + 1)], SR, subtype="FLOAT")
    os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
    sf.write(f"{ROOT}/build/audio/music.wav", out[: secs(DUR + 1)], SR, subtype="FLOAT")
    print(f"music done in {time.time()-t_start:.1f}s, peak before norm {pk:.3f}")


if __name__ == "__main__":
    build()
