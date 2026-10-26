# -*- coding: utf-8 -*-
"""《剂量》配乐引擎（源自《监查者》score.py）：GeneralUser GS 音色库 + 合成器，按时间轴逐场景作曲。
用法: python audio/score.py EP01
各集的作曲写在 episodes/<EP>/score.py：定义 CUES = [函数...]，可选 MASTER_KEYS（全局音乐自动化）。
输出: build/<EP>/audio/music.wav、hits.wav"""
import json, re, sys, os, time
import numpy as np
import tinysoundfont
import soundfile as sf
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dsp import *

ROOT = Path(__file__).resolve().parents[1]
EP = sys.argv[1] if len(sys.argv) > 1 else "EP01"
BUILD = ROOT / "build" / EP
SFP = str(ROOT / "assets" / "soundfont" / "GeneralUser-GS.sf2")
TL = json.load(open(BUILD / "timeline.json", encoding="utf-8"))
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

R = np.random.default_rng(1994)


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



# ======================================================================= 载入本集作曲并渲染
exec(open(ROOT / "episodes" / EP / "score.py", encoding="utf-8").read(), globals())


def build():
    t_start = time.time()
    for fn in CUES:
        fn()
    for name, inst in INST.items():
        x, t0 = inst.render()
        if x is None: continue
        MUS.add(x, t0, 1.0, inst.pan); SEND.add(x, t0, inst.send, inst.pan)
        print(f"  rendered {name:12s} {len(inst.ev):4d} notes  peak {np.abs(x).max():.3f}", flush=True)
    wet = reverb(SEND.a, rt60=2.8, wet=1.0, damp=5500, pre=.025, seed=3)
    out = MUS.a + wet * .55
    keys = globals().get("MASTER_KEYS", lambda: [(0, 1), (DUR + 5, 1)])()
    out *= automation(keys, 0, len(out))[:, None]
    pk = np.abs(out).max(); out = out / max(pk, 1e-6) * .89
    hw = HITS.a + reverb(HSEND.a, rt60=3.0, wet=1.0, damp=6000, pre=.02, seed=5) * .5
    hpk = np.abs(hw).max(); hw = hw / max(hpk, 1e-6) * .89
    os.makedirs(BUILD / "audio", exist_ok=True)
    sf.write(BUILD / "audio" / "hits.wav", hw[: secs(DUR + 1)], SR, subtype="FLOAT")
    sf.write(BUILD / "audio" / "music.wav", out[: secs(DUR + 1)], SR, subtype="FLOAT")
    print(f"music done in {time.time()-t_start:.1f}s, peak before norm {pk:.3f}")


if __name__ == "__main__":
    build()
