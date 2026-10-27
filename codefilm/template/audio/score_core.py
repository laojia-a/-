# -*- coding: utf-8 -*-
"""作曲引擎核心：音色库乐器（Inst）、和弦/琶音/音序、自动化、打点总线。在 cues.py 里写每个场景的音乐。"""
import json, re, os
import numpy as np, tinysoundfont
from pathlib import Path
from dsp import *
ROOT = str(Path(__file__).resolve().parents[1])
CACHE = os.environ.get("CODEFILM_CACHE") or str(Path.home() / ".cache" / "codefilm")
SFP = os.environ.get("CODEFILM_SOUNDFONT") or next((p for p in [ROOT + "/assets/soundfont/GeneralUser-GS.sf2", CACHE + "/soundfont/GeneralUser-GS.sf2"] if os.path.exists(p)), CACHE + "/soundfont/GeneralUser-GS.sf2")
TL = json.load(open(f"{ROOT}/build/timeline.json", encoding="utf-8"))
SC = {s["id"]: s for s in TL["scenes"]}; LN = {l["id"]: l for l in TL["lines"]}; DUR = TL["duration"]
def ss(i): return SC[i]["start"]          # 场景开始
def se(i): return SC[i]["end"]            # 场景结束
def ls(i): return LN[i]["start"]          # 台词开始
def le(i): return LN[i]["end"]            # 台词结束
NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}
def N(s):
    m = re.match(r"([A-G])([#b]?)(-?\d)", s); n = NOTE[m.group(1)] + (1 if m.group(2) == "#" else -1 if m.group(2) == "b" else 0)
    return 12 * (int(m.group(3)) + 1) + n
def NS(s): return [N(x) for x in s.split()]
R = np.random.default_rng(1747)

class Inst:
    """一个 GM 音色（program 号见 GeneralUser GS：0钢琴 8钢片琴 10音乐盒 42大提琴 45拨弦 46竖琴 47定音鼓 48/49弦乐 52合唱 55管弦齐奏 60圆号 61铜管 89暖垫 91太空人声 94光环垫 98水晶 116太鼓；bank 128 为鼓组）"""
    def __init__(s, name, program, bank=0, gain_db=0.0, pan=0.0, send=.3, vol=1.0):
        s.name, s.program, s.bank, s.gain_db, s.pan, s.send, s.vol = name, program, bank, gain_db, pan, send, vol; s.ev = []; s.auto = []
    def n(s, t, m, dur, vel=90, hum=True):
        if hum: t += R.normal(0, .006); vel = int(np.clip(vel + R.normal(0, 5), 1, 127))
        s.ev.append((max(0, t), max(.03, dur), int(m), int(vel)))
    def chord(s, t, ms, dur, vel=80, strum=0.0):
        for k, m in enumerate(ms): s.n(t + k * strum, m, dur - k * strum, vel)
    def seq(s, t, notes, beat, vel=85, legato=.95):
        for nm, b in notes:
            if nm is not None:
                for m in ([nm] if isinstance(nm, int) else ([N(nm)] if isinstance(nm, str) else nm)): s.n(t, m, b * beat * legato, vel)
            t += b * beat
        return t
    def render(s):
        if not s.ev: return None, 0
        t0 = max(0, min(e[0] for e in s.ev) - .05); t1 = max(e[0] + e[1] for e in s.ev) + 4.0
        syn = tinysoundfont.Synth(samplerate=SR, gain=s.gain_db); sid = syn.sfload(SFP); syn.program_select(0, sid, s.bank, s.program)
        evs = sorted([(t, 1, m, v) for t, d, m, v in s.ev] + [(t + d, 0, m, 0) for t, d, m, v in s.ev], key=lambda e: (e[0], e[1]))
        out, pos = [], secs(t0)
        for (t, on, m, v) in evs:
            i = secs(t)
            if i > pos: out.append(np.frombuffer(syn.generate(i - pos), dtype=np.float32).reshape(-1, 2).copy()); pos = i
            syn.noteon(0, m, v) if on else syn.noteoff(0, m)
        if secs(t1) > pos: out.append(np.frombuffer(syn.generate(secs(t1) - pos), dtype=np.float32).reshape(-1, 2).copy())
        x = np.concatenate(out) * s.vol
        if s.auto: x = x * automation(s.auto, t0, len(x))[:, None]
        return x.astype(np.float32), t0

def automation(keys, t0, n):
    ks = sorted(keys); return np.interp(t0 + np.arange(n) / SR, [k[0] for k in ks], [k[1] for k in ks]).astype(np.float32)

INST = {}
def I(name, program, bank=0, gain_db=0.0, pan=0.0, send=.3, vol=1.0):
    """取/建乐器轨。同名复用；auto=[(秒,增益),...] 做音量自动化"""
    if name not in INST: INST[name] = Inst(name, program, bank, gain_db, pan, send, vol)
    return INST[name]
MUS = Bus(DUR + 6); SEND = Bus(DUR + 6)          # 合成器音乐（参与分场景调平）
HITS = Bus(DUR + 6); HSEND = Bus(DUR + 6)        # 打点：冲击/BRAAM/升调，独立总线，不被调平压扁
GLOBAL_AUTO = [(0, 1), (DUR + 5, 1)]             # 全局音乐自动化，用来做“骤停”：在爆点后几百毫秒压到 0
def synth_add(x, t, gain=1.0, pan=0.0, send=.3): MUS.add(x, t, gain, pan); SEND.add(x, t, gain * send, pan)
def hit_add(x, t, gain=1.0, pan=0.0, send=.3): HITS.add(x, t, gain, pan); HSEND.add(x, t, gain * send, pan)
def arp(inst, t0, t1, chords, step, vel=70, pattern=(0, 1, 2, 1), octs=0, legato=1.6):
    t = t0; k = 0
    while t < t1 - 1e-6:
        cur = [c for c in chords if c[0] <= t + 1e-6]; notes = cur[-1][1] if cur else chords[0][1]
        idx = pattern[k % len(pattern)]; inst.n(t, notes[idx % len(notes)] + 12 * (idx // len(notes)) + 12 * octs, step * legato, vel); t += step; k += 1
def drum(t, note, vel=90, kit=0, name='drums', gain_db=0, send=.15):
    """kit: 0标准 25电子808 48管弦；note: 36底鼓 38军鼓 42闭镲 49吊镲 57镲2"""
    I(name, kit, 128, gain_db, 0, send).n(t, note, .2, vel, hum=False)
def silence_after(t, hold, back=.8):
    """爆点后骤停：t 时刻起 0.3 秒内压到无声，保持 hold 秒，再 back 秒恢复"""
    GLOBAL_AUTO.extend([(t + .02, 1), (t + .35, 0), (t + hold, 0), (t + hold + back, 1)])
