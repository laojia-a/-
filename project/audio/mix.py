# -*- coding: utf-8 -*-
"""混音与母带：旁白处理（阿格斯/林夏/历史引文）、音乐分场景电平、旁白闪避、响度标准化、真峰值限制。
输出：build/audio/mix.wav（48k/24bit）、build/audio/voice.wav，以及 output/字幕.srt"""
import json, os, re
import numpy as np, soundfile as sf, pyloudnorm as pyln
from scipy import signal
from scipy.ndimage import minimum_filter1d, maximum_filter1d
from dsp import *

import os as _os
from pathlib import Path as _P
ROOT = str(_P(__file__).resolve().parents[1])
CACHE = _os.environ.get("JCZ_CACHE", ROOT + "/.cache")
OUT = ROOT + "/output"
TL = json.load(open(f"{ROOT}/build/timeline.json", encoding="utf-8"))
DUR = TL["duration"]; NTOT = secs(DUR)
METER = pyln.Meter(SR)

def db(x): return 20 * np.log10(np.maximum(x, 1e-9))
def undb(d): return 10 ** (d / 20)

def compress(x, thr=-24, ratio=2.5, att=.005, rel=.12):
    mono = np.abs(x).max(axis=1) if x.ndim == 2 else np.abs(x)
    env = np.zeros_like(mono); a_a, a_r = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR))
    e = 0.0
    # 向量化近似：先做峰值保持，再一阶平滑
    pk = maximum_filter1d(mono, secs(.004))
    b, a = signal.butter(1, 1 / (rel * 2 * np.pi) / (SR / 2))
    env = signal.lfilter(b, a, pk)
    over = db(env) - thr
    gr = np.where(over > 0, -over * (1 - 1 / ratio), 0.0)
    g = undb(gr).astype(np.float32)
    return x * (g[:, None] if x.ndim == 2 else g)

def chorus(x, base=.012, depth=.0015, rate=.6, mix=.18):
    n = len(x); t = np.arange(n) / SR; out = []
    for ch, ph in [(0, 0.0), (1, np.pi / 2)]:
        d = (base + depth * np.sin(2 * np.pi * rate * t + ph)) * SR
        src = np.arange(n) - d
        y = np.interp(src, np.arange(n), x, left=0, right=0)
        out.append(x + y * mix)
    return np.stack(out, 1).astype(np.float32)

def voice_fx(x, spk, sr_in):
    x = signal.resample_poly(x, SR, sr_in).astype(np.float32)
    try: L = METER.integrated_loudness(np.stack([x, x], 1))
    except Exception: L = -23
    if np.isfinite(L): x = x * undb(-20 - L)
    if spk == "argus":
        x = hp(x, 70); x = peq(x, 280, -2.0, .9); x = peq(x, 3200, 2.5, .8); x = peq(x, 10000, 1.5, .7)
        x = compress(x, -28, 3.0)
        y = chorus(x, .012, .0016, .55, .16)
        y = reverb(y, rt60=1.0, wet=.13, damp=7000, pre=.015, seed=21)
        return y * undb(1.0)
    if spk == "lin":
        x = hp(x, 95); x = lp(x, 7500); x = peq(x, 2500, 2.0, .8); x = compress(x, -26, 2.0)
        return reverb(stereo(x), rt60=.45, wet=.22, damp=6000, pre=.006, seed=22) * undb(-2.5)
    if spk == "lin2":
        x = hp(x, 80); x = peq(x, 2800, 1.5, .8); x = compress(x, -26, 2.0)
        return reverb(stereo(x), rt60=1.3, wet=.2, damp=7000, pre=.02, seed=23) * undb(.5)
    if spk in ("lind", "nuremberg"):
        lo, hi = (280, 3200) if spk == "lind" else (250, 4200)
        x = bp(x, lo, hi, 3); x = np.tanh(x * 2.4) / np.tanh(2.4) * .55
        n = len(x); hiss = bp(noise(n, 5 if spk == "lind" else 6), 2000, 7000) * .012
        y = stereo(x + hiss) + amb_crackle(n / SR + .01, .05 if spk == "lind" else .03, 7)[:n]
        return reverb(y, rt60=.5 if spk == "lind" else .7, wet=.15, damp=5000, seed=24) * undb(1.0)
    return stereo(x)

def short_rms_db(x, win=.4, hop=.1):
    m = x.mean(1) if x.ndim == 2 else x
    w, h = secs(win), secs(hop)
    idx = np.arange(0, max(1, len(m) - w), h)
    r = np.array([np.sqrt((m[i:i + w] ** 2).mean() + 1e-12) for i in idx])
    return idx / SR, db(r)

def smooth_curve(times, vals, n, ramp=1.2):
    """分段常数 → 平滑过渡的逐样本曲线"""
    tt = np.arange(n) / SR; out = np.interp(tt, times, vals)
    k = secs(ramp); ker = np.hanning(k * 2 + 1); ker /= ker.sum()
    return signal.fftconvolve(out, ker, mode="same").astype(np.float32)

def limiter(x, ceil_db=-1.0, look=.005, rel=.08):
    over = signal.resample_poly(x, 4, 1, axis=0)
    pk = np.abs(over).max(axis=1).reshape(-1, 4).max(axis=1)[: len(x)]
    if len(pk) < len(x): pk = np.pad(pk, (0, len(x) - len(pk)))
    ceil = undb(ceil_db)
    need = np.minimum(1.0, ceil / np.maximum(pk, 1e-9))
    g = minimum_filter1d(need, secs(look) * 2 + 1)
    # 释放平滑（只允许缓慢回升）
    b, a = signal.butter(1, 1 / (rel * 2 * np.pi) / (SR / 2))
    gs = signal.lfilter(b, a, g - 1) + 1
    g = np.minimum(g, gs)
    g = minimum_filter1d(g, secs(look) + 1)
    return (x * g[:, None]).astype(np.float32), float(g.min())

def srt_time(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h:02d}:{m:02d}:{int(s):02d},{int(round((s - int(s)) * 1000)):03d}".replace(",1000", ",999")

def write_srt():
    os.makedirs(OUT, exist_ok=True)
    cues = []
    for ln in TL["lines"]:
        segs = ln.get("segs") or [dict(text=ln["sub"], start=ln["start"], end=ln["end"])]
        for sg in segs:
            txt = sg["text"]
            if ln.get("sub_en"): txt = ln["sub_en"] + "\n" + txt
            cues.append([max(0, sg["start"] - .1), sg["end"] + .2, txt])
    cues.sort(key=lambda c: c[0])
    for i in range(len(cues) - 1):
        cues[i][1] = min(cues[i][1], cues[i + 1][0] - .02)
    rows = [f"{k}\n{srt_time(a)} --> {srt_time(b)}\n{t}\n" for k, (a, b, t) in enumerate(cues, 1)]; k = len(rows) + 1
    open(f"{OUT}/字幕.srt", "w", encoding="utf-8").write("\n".join(rows))
    print("srt lines", k - 1)

def main():
    # ---- 旁白
    V = Bus(DUR + 6)
    for ln in TL["lines"]:
        x, sr = sf.read(f"{ROOT}/build/tts/{ln['id']}.wav", dtype="float32")
        y = voice_fx(x, ln["spk"], sr)
        V.add(y, ln["start"], 1.0)
    voice = V.a[:NTOT]
    # ---- 音乐（分场景电平）
    mus, _ = sf.read(f"{ROOT}/build/audio/music.wav", dtype="float32"); mus = np.pad(mus, ((0, max(0, NTOT - len(mus))), (0, 0)))[:NTOT]
    TARGET = {"s00_eye": -26, "s01_hotel": -30, "s02_title": -21, "s03_1747": -27, "s04_blood": -28, "s05_1996": -27, "s06_suitcase": -25, "s07_edc": -25,
              "s08_onepointone": -25, "s09_rbm": -19, "s10_722": -24, "s11_2020": -30, "s12_llm": -25, "s13_rules": -26, "s14_extrap": -25, "s15_2030": -26,
              "s16_2035": -24, "s17_2040": -26, "s18_2047": -23, "s19_signature": -30, "s20_quis": -26, "s21_lin": -29, "s22_quest": -24, "s23_end": -31}
    ts, rd = short_rms_db(mus)
    keys_t, keys_v = [], []
    for s in TL["scenes"]:
        m = (ts >= s["start"]) & (ts < s["end"]) & (rd > -60)
        med = np.median(rd[m]) if m.sum() > 5 else -40
        tgt = TARGET[s["id"]] - (0 if s["id"] in ("s23_end",) else 8.5)
        g = np.clip(tgt - med, -20, 14)
        if s["id"] in ("s02_title", "s14_extrap"): g = 8.0
        keys_t += [s["start"] + .01, s["end"] - .01]; keys_v += [g, g]
        print(f"  music {s['id']:18s} median {med:6.1f} dB → gain {g:+5.1f} dB")
    gcurve = undb(smooth_curve(keys_t, keys_v, NTOT, ramp=.9))
    mus = mus * gcurve[:, None]
    # ---- 闪避：旁白包络 → 音乐 -7dB / 环境 -4dB
    vm = np.abs(voice).max(1); env = maximum_filter1d(vm, secs(.05))
    b, a = signal.butter(1, 2.0 / (SR / 2)); env = signal.lfilter(b, a, env)
    act = np.clip((db(env) + 50) / 14, 0, 1)
    act = maximum_filter1d(act, secs(.25)); act = signal.lfilter(*signal.butter(1, 1.4 / (SR / 2)), act)
    duck_m = undb(-9.0 * act).astype(np.float32); duck_a = undb(-5 * act).astype(np.float32)
    mus = mus * duck_m[:, None]
    sfx, _ = sf.read(f"{ROOT}/build/audio/sfx.wav", dtype="float32"); sfx = np.pad(sfx, ((0, max(0, NTOT - len(sfx))), (0, 0)))[:NTOT]
    amb, _ = sf.read(f"{ROOT}/build/audio/amb.wav", dtype="float32"); amb = np.pad(amb, ((0, max(0, NTOT - len(amb))), (0, 0)))[:NTOT]
    amb = amb * duck_a[:, None]
    hits, _ = sf.read(f"{ROOT}/build/audio/hits.wav", dtype="float32"); hits = np.pad(hits, ((0, max(0, NTOT - len(hits))), (0, 0)))[:NTOT]
    hits = hits * undb(-3.0 * act)[:, None]
    # 音效与环境整体电平
    sfx_g, amb_g, voice_g = undb(-5), undb(-4), undb(2.0)
    hits_g = undb(-9)
    mix = voice * voice_g + mus + sfx * sfx_g + amb * amb_g + hits * hits_g
    # ---- 母带：先按总响度定标，再分别限制音乐/音效总线峰值，最后总限幅
    TGT = -16.0
    L = METER.integrated_loudness(mix); G = undb(TGT - L)
    v_n = voice * voice_g * G; m_n = mus * G; s_n = sfx * sfx_g * G + hits * hits_g * G; a_n = amb * amb_g * G
    s_n = compress(s_n, thr=-21, ratio=3.0); s_n, gs = limiter(s_n, -5.0, look=.003, rel=.15); m_n = compress(m_n, thr=-17, ratio=2.5, att=.02, rel=.35); m_n, gm = limiter(m_n, -6.0, look=.005, rel=.25); v_n, gv = limiter(v_n, -3.5, look=.002, rel=.06)
    print(f"  bus limiters: sfx {20*np.log10(gs):.1f} dB, music {20*np.log10(gm):.1f} dB, voice {20*np.log10(gv):.1f} dB")
    mix = v_n + m_n + s_n + a_n
    L1 = METER.integrated_loudness(mix); mix = mix * undb(TGT - L1)
    mix, gmin = limiter(mix, -1.2)
    L2 = METER.integrated_loudness(mix)
    mix = fade(mix, .02, 1.5)
    os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
    sf.write(f"{ROOT}/build/audio/mix.wav", mix, SR, subtype="PCM_24")
    sf.write(f"{ROOT}/build/audio/voice.wav", v_n.astype(np.float32), SR, subtype="PCM_24")
    sf.write(f"{ROOT}/build/audio/music_leveled.wav", m_n.astype(np.float32), SR, subtype="PCM_24")
    sf.write(f"{ROOT}/build/audio/sfx_leveled.wav", (s_n + a_n).astype(np.float32), SR, subtype="PCM_24")
    print(f"mix: pre-norm {L:.2f} LUFS → {L2:.2f} LUFS, limiter min gain {20*np.log10(gmin):.2f} dB, peak {20*np.log10(np.abs(mix).max()):.2f} dBFS")
    write_srt()

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == 'srt': write_srt()
    else: main()
