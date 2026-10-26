# -*- coding: utf-8 -*-
"""音频 DSP 基础库：轨道、滤波、混响、合成音色、音效生成器。全部确定性（固定随机种子）。"""
import numpy as np
from scipy import signal

SR = 48000
RNG = np.random.default_rng(2047)


def secs(n):
    return int(round(n * SR))


class Bus:
    """立体声总线（float32, shape [N,2]）。"""
    def __init__(self, dur):
        self.a = np.zeros((secs(dur) + SR, 2), dtype=np.float32)

    def add(self, x, t, gain=1.0, pan=0.0):
        if x is None or len(x) == 0:
            return
        if x.ndim == 1:
            l = np.sqrt(.5 * (1 - pan)); r = np.sqrt(.5 * (1 + pan))
            x = np.stack([x * l * 1.414, x * r * 1.414], axis=1)
        elif pan != 0:
            x = x * np.array([min(1, 1 - pan), min(1, 1 + pan)], dtype=np.float32)
        i = secs(t)
        if i < 0:
            x = x[-i:]; i = 0
        j = min(len(self.a), i + len(x))
        if j <= i:
            return
        self.a[i:j] += (x[: j - i] * gain).astype(np.float32)


# ------------------------------------------------------------------ 滤波 / 包络
def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * .45) / (SR / 2), 'low'); return signal.lfilter(b, a, x, axis=0).astype(np.float32)

def hp(x, fc, order=2):
    b, a = signal.butter(order, max(fc, 10) / (SR / 2), 'high'); return signal.lfilter(b, a, x, axis=0).astype(np.float32)

def bp(x, f1, f2, order=2):
    b, a = signal.butter(order, [f1 / (SR / 2), min(f2, SR * .45) / (SR / 2)], 'band'); return signal.lfilter(b, a, x, axis=0).astype(np.float32)

def peq(x, f0, gain_db, q=1.0):
    A = 10 ** (gain_db / 40); w0 = 2 * np.pi * f0 / SR; al = np.sin(w0) / (2 * q)
    b = [1 + al * A, -2 * np.cos(w0), 1 - al * A]; a = [1 + al / A, -2 * np.cos(w0), 1 - al / A]
    return signal.lfilter(b, a, x, axis=0).astype(np.float32)

def env_adsr(n, a=.01, d=.1, s=.7, r=.2, sus_len=None):
    a_n, d_n, r_n = secs(a), secs(d), secs(r)
    s_n = max(0, n - a_n - d_n - r_n) if sus_len is None else secs(sus_len)
    e = np.concatenate([np.linspace(0, 1, max(1, a_n)), np.linspace(1, s, max(1, d_n)), np.full(s_n, s), np.linspace(s, 0, max(1, r_n))])
    if len(e) < n: e = np.concatenate([e, np.zeros(n - len(e))])
    return e[:n].astype(np.float32)

def exp_env(n, tau):
    return np.exp(-np.arange(n) / (tau * SR)).astype(np.float32)

def fade(x, fi=0.01, fo=0.05):
    x = x.copy(); n = len(x)
    a, b = min(n, secs(fi)), min(n, secs(fo))
    if a > 0: x[:a] *= np.linspace(0, 1, a)[:, None] if x.ndim == 2 else np.linspace(0, 1, a)
    if b > 0: x[-b:] *= np.linspace(1, 0, b)[:, None] if x.ndim == 2 else np.linspace(1, 0, b)
    return x

def stereo(x, width=0.0, seed=0):
    """单声道→立体声，带轻微去相关。"""
    if x.ndim == 2: return x
    if width <= 0: return np.stack([x, x], 1)
    d = int(SR * .00035 * (1 + seed % 3))
    l = x; r = np.concatenate([np.zeros(d, np.float32), x[:-d]]) if d > 0 else x
    return np.stack([l * (1 - width * .1), r * (1 - width * .1)], 1)


# ------------------------------------------------------------------ 混响（合成冲激响应 + FFT 卷积）
_IR = {}
def ir(rt60=2.2, damp=6000, pre=.02, seed=1):
    key = (rt60, damp, pre, seed)
    if key in _IR: return _IR[key]
    r = np.random.default_rng(seed); n = secs(rt60 * 1.2)
    t = np.arange(n) / SR
    envl = np.exp(-6.9 * t / rt60)
    L = r.standard_normal(n) * envl; R = r.standard_normal(n) * envl
    L = lp(L.astype(np.float32), damp); R = lp(R.astype(np.float32), damp)
    p = secs(pre); L = np.concatenate([np.zeros(p), L]); R = np.concatenate([np.zeros(p), R])
    out = np.stack([L, R], 1).astype(np.float32); out /= np.sqrt((out ** 2).sum() / 2)
    _IR[key] = out; return out

def reverb(x, rt60=2.2, wet=.3, damp=6000, pre=.02, seed=1):
    x = stereo(x)
    h = ir(rt60, damp, pre, seed)
    yl = signal.fftconvolve(x[:, 0], h[:, 0])[: len(x)]; yr = signal.fftconvolve(x[:, 1], h[:, 1])[: len(x)]
    y = np.stack([yl, yr], 1).astype(np.float32)
    return (x * (1 - wet * .35) + y * wet).astype(np.float32)

def delay(x, t=.3, fb=.35, wet=.25, lpf=4000):
    x = stereo(x); d = secs(t); y = x.copy(); tap = x.copy()
    for k in range(1, 6):
        tap = lp(tap, lpf) * fb
        sh = np.zeros_like(x); sh[d * k:] = tap[: len(x) - d * k] if d * k < len(x) else 0
        y += sh * (wet / fb) * (1 if k % 2 else .8)
    return y


# ------------------------------------------------------------------ 合成音色
def osc_saw(f, n, phase=0.0):
    t = np.arange(n) / SR; ph = (f * t + phase) % 1.0
    return (2 * ph - 1).astype(np.float32)

def osc_sq(f, n, duty=.5):
    t = np.arange(n) / SR; ph = (f * t) % 1.0
    return np.where(ph < duty, 1.0, -1.0).astype(np.float32)

def osc_tri(f, n):
    t = np.arange(n) / SR; ph = (f * t) % 1.0
    return (4 * np.abs(ph - .5) - 1).astype(np.float32)

def sine(f, n, phase=0):
    return np.sin(2 * np.pi * f * np.arange(n) / SR + phase).astype(np.float32)

def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)

def supersaw(m, dur, a=.6, r=1.2, cutoff=2400, voices=7, detune=.18, gain=.25):
    n = secs(dur + r); f = mtof(m); y = np.zeros(n, np.float32)
    for v in range(voices):
        dt = (v - (voices - 1) / 2) / ((voices - 1) / 2) * detune
        y += osc_saw(f * 2 ** (dt / 12), n, phase=RNG.random())
    y = lp(y / voices, cutoff, 2)
    return (y * env_adsr(n, a, .2, .85, r, sus_len=max(0, dur - a - .2)) * gain).astype(np.float32)

def pluck(m, dur=.4, cutoff=3200, gain=.3):
    n = secs(dur + .3); f = mtof(m)
    y = osc_saw(f, n) * .6 + osc_sq(f * 1.003, n, .3) * .4
    e = exp_env(n, dur * .35)
    fc_env = cutoff * (0.25 + 0.75 * e)
    # 简化：两段滤波混合模拟包络扫频
    y = lp(y, cutoff) * e
    return (y * gain).astype(np.float32)

def chip(m, dur, kind='sq', duty=.25, gain=.18, vib=0.0):
    n = secs(dur); f = mtof(m)
    if kind == 'sq': y = osc_sq(f, n, duty)
    else: y = osc_tri(f, n)
    e = env_adsr(n, .003, .05, .7, .03)
    return (y * e * gain).astype(np.float32)

def sub(m, dur, gain=.5):
    n = secs(dur); y = sine(mtof(m), n)
    return (y * env_adsr(n, .02, .1, .9, .3) * gain).astype(np.float32)

def noise(n, seed=None):
    r = np.random.default_rng(seed) if seed is not None else RNG
    return r.standard_normal(n).astype(np.float32)

def pink(n, seed=None):
    w = noise(n, seed); b, a = [0.049922035, -0.095993537, 0.050612699, -0.004408786], [1, -2.494956002, 2.017265875, -0.522189400]
    return (signal.lfilter(b, a, w) * 3).astype(np.float32)


# ------------------------------------------------------------------ 音效
def sfx_beep(f=1000, dur=.12, gain=.25):
    n = secs(dur); return sine(f, n) * env_adsr(n, .003, .02, .8, .04) * gain

def sfx_whoosh(dur=1.2, f1=300, f2=4000, gain=.4, seed=1, rev=False):
    n = secs(dur); x = noise(n, seed)
    t = np.linspace(0, 1, n); fc = f1 * (f2 / f1) ** (t if not rev else 1 - t)
    # 分块变截止频率
    out = np.zeros(n, np.float32); B = 1024
    zi = None
    for i in range(0, n, B):
        b, a = signal.butter(2, [max(40, fc[i] * .5) / (SR / 2), min(fc[i] * 1.6, SR * .45) / (SR / 2)], 'band')
        seg = x[i:i + B]
        y, zi = signal.lfilter(b, a, seg, zi=zi if zi is not None else signal.lfilter_zi(b, a) * 0)
        out[i:i + B] = y
    e = np.sin(np.pi * t) ** 1.5
    return (out * e * gain * 2.5).astype(np.float32)

def sfx_impact(gain=.9, low=48, dur=3.0, seed=3):
    n = secs(dur); t = np.arange(n) / SR
    f = low * (1 + 1.6 * np.exp(-t * 9)); ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 1.6)
    hit = lp(noise(n, seed), 2500) * np.exp(-t * 18) * .6
    return ((body + hit) * gain).astype(np.float32)

def sfx_braam(m_root=38, dur=4.0, gain=.55):
    """电影“BRAAAM”：失谐铜管感锯齿 + 次低频。"""
    n = secs(dur); y = np.zeros(n, np.float32)
    for m in [m_root, m_root + 7, m_root + 12, m_root + 15]:
        for dt in [-.12, 0, .12]:
            y += osc_saw(mtof(m) * 2 ** (dt / 12), n, RNG.random())
    t = np.arange(n) / SR
    cutoff_env = 300 + 1800 * np.exp(-t * 1.4)
    y = lp(y / 12, 1400, 2) * .7 + lp(y / 12, 500, 2) * .5
    e = np.minimum(1, t / .04) * np.exp(-t * .55)
    y = np.tanh(y * 2.2 * e) * .8
    y += sine(mtof(m_root - 12), n) * e * .7
    return (y * gain).astype(np.float32)

def sfx_riser(dur=3.0, f1=200, f2=2400, gain=.35, seed=5):
    n = secs(dur); t = np.linspace(0, 1, n)
    f = f1 * (f2 / f1) ** (t ** 1.6); ph = 2 * np.pi * np.cumsum(f) / SR
    tone = (np.sin(ph) + .5 * np.sin(ph * 1.5)) * .35
    w = sfx_whoosh(dur, 200, 6000, .5, seed)
    e = t ** 2
    return ((tone * e + w * (.4 + .6 * e)) * gain).astype(np.float32)

def sfx_reverse_swell(dur=2.5, m=50, gain=.4):
    y = supersaw(m, dur, a=.01, r=.05, cutoff=3000, gain=1)[: secs(dur)]
    e = np.linspace(0, 1, len(y)) ** 3
    return (y * e * gain).astype(np.float32)

def sfx_glitch(dur=.5, gain=.35, seed=7):
    n = secs(dur); r = np.random.default_rng(seed); y = np.zeros(n, np.float32); i = 0
    while i < n:
        L = int(r.integers(200, 2400)); kind = r.integers(0, 3)
        if kind == 0: seg = np.sign(np.sin(2 * np.pi * r.uniform(80, 2000) * np.arange(L) / SR))
        elif kind == 1: seg = r.standard_normal(L)
        else: seg = np.zeros(L)
        y[i:i + L] = seg[: n - i] * r.uniform(.3, 1); i += L
    y = np.round(y * 6) / 6
    return (bp(y, 200, 9000) * gain).astype(np.float32)

def sfx_click(gain=.25, f=3500, seed=0):
    n = secs(.03); x = noise(n, seed) * exp_env(n, .004)
    return (bp(x, f * .6, f * 1.6) * gain * 3).astype(np.float32)

def sfx_type(gain=.25, seed=0):
    r = np.random.default_rng(seed); n = secs(.08)
    x = noise(n, seed) * exp_env(n, .006) * .8 + sine(r.uniform(180, 260), n) * exp_env(n, .015) * .5
    return (bp(x, 400, 7000) * gain * 2).astype(np.float32)

def sfx_stamp(gain=.8, seed=2):
    n = secs(.7); t = np.arange(n) / SR
    thud = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * np.exp(-t * 9)
    slap = lp(noise(n, seed), 3000) * np.exp(-t * 40) * .8
    return ((thud + slap) * gain).astype(np.float32)

def sfx_drip(gain=.3, f0=1400, seed=0):
    n = secs(.25); t = np.arange(n) / SR
    f = f0 * (1 - .55 * (1 - np.exp(-t * 40))); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 18) * gain).astype(np.float32)

def sfx_thunder(dur=5.0, gain=.9, seed=11):
    n = secs(dur); t = np.arange(n) / SR; r = np.random.default_rng(seed)
    crack = hp(noise(n, seed), 800) * np.exp(-t * 14) * .6
    rumble = lp(pink(n, seed + 1), 180) * (np.minimum(1, t / .15) * np.exp(-t * .7)) * 1.6
    mod = 1 + .6 * lp(r.standard_normal(n).astype(np.float32), 6) * 8
    return ((crack + rumble * mod) * gain).astype(np.float32)

def sfx_paper(dur=.5, gain=.25, seed=0):
    n = secs(dur); r = np.random.default_rng(seed); x = noise(n, seed)
    e = np.zeros(n, np.float32)
    for _ in range(int(dur * 30)):
        i = int(r.integers(0, n)); L = int(r.integers(200, 1500)); e[i:i + L] += r.uniform(.2, 1)
    e = lp(e, 60); x = bp(x, 1500, 9000) * e
    x = x / (np.abs(x).max() + 1e-9) * .6
    return (x * gain).astype(np.float32)

def sfx_chime(m=84, gain=.25, dur=2.5):
    n = secs(dur); t = np.arange(n) / SR; f = mtof(m)
    y = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + k * .8)) * a for k, a in [(1, 1), (2.76, .4), (5.4, .2), (8.9, .1)])
    return (y * gain * np.minimum(1, t / .002)).astype(np.float32)

def sfx_ping(f=1760, gain=.2, dur=.6):
    n = secs(dur); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 7) * gain + np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 12) * gain * .3).astype(np.float32)

def sfx_heartbeat(gain=.7):
    n = secs(.6); t = np.arange(n) / SR
    def thump(t0, a):
        tt = np.clip(t - t0, 0, None); on = (t >= t0)
        return on * np.sin(2 * np.pi * (45 + 30 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 14) * a
    return ((thump(0, 1) + thump(.18, .7)) * gain).astype(np.float32)

def sfx_tick(gain=.12, seed=0):
    n = secs(.02); return (hp(noise(n, seed), 2000) * exp_env(n, .002) * gain * 3).astype(np.float32)

def sfx_door(gain=.8, seed=3):
    n = secs(1.6); t = np.arange(n) / SR
    slide = bp(noise(n, seed), 120, 900) * np.clip(1 - t / .9, 0, 1) * .3
    clunk = np.sin(2 * np.pi * 55 * t) * np.exp(-np.clip(t - .9, 0, None) * 6) * (t > .9) * 1.2
    clunk += lp(noise(n, seed + 1), 1200) * np.exp(-np.clip(t - .9, 0, None) * 30) * (t > .9) * .6
    return ((slide + clunk) * gain).astype(np.float32)

def sfx_scribble(dur=2.0, gain=.25, seed=4):
    n = secs(dur); r = np.random.default_rng(seed)
    x = bp(noise(n, seed), 2500, 9000)
    stroke = (np.abs(np.sin(np.linspace(0, dur * 9 * np.pi, n))) ** 1.5) * (.6 + .4 * lp(r.standard_normal(n).astype(np.float32), 8) * 6)
    return (x * stroke * gain * 2).astype(np.float32)

def amb_rain(dur, gain=.12, seed=21):
    n = secs(dur); r = np.random.default_rng(seed)
    bed = bp(pink(n, seed), 300, 7000) * .6
    drops = np.zeros(n, np.float32)
    for _ in range(int(dur * 25)):
        i = int(r.integers(0, n - 2000)); L = int(r.integers(300, 1500)); drops[i:i + L] += (r.standard_normal(L) * np.exp(-np.arange(L) / 200) * r.uniform(.2, 1)).astype(np.float32)
    drops = bp(drops, 1500, 9000)
    return (stereo(bed + drops * .5, 1) * gain).astype(np.float32)

def amb_ocean(dur, gain=.2, seed=22):
    n = secs(dur); t = np.arange(n) / SR
    base = lp(pink(n, seed), 900)
    swell = .45 + .55 * (.5 + .5 * np.sin(2 * np.pi * t / 7.5 + 1)) * (.7 + .3 * np.sin(2 * np.pi * t / 3.1))
    hi = bp(noise(n, seed + 1), 2000, 8000) * (.5 + .5 * np.sin(2 * np.pi * t / 7.5 + 1)) ** 4 * .25
    return (stereo(base * swell + hi, 1) * gain).astype(np.float32)

def amb_wind(dur, gain=.2, seed=23):
    n = secs(dur); t = np.arange(n) / SR
    x = bp(pink(n, seed), 200, 2000); m = .5 + .5 * np.sin(2 * np.pi * t / 5.3) * np.sin(2 * np.pi * t / 2.1 + 1)
    return (stereo(x * m, 1) * gain).astype(np.float32)

def amb_room(dur, gain=.05, seed=24, hum=50):
    n = secs(dur); x = lp(pink(n, seed), 400) * .7 + sine(hum, n) * .05 + sine(hum * 2, n) * .03
    return (stereo(x, 1) * gain).astype(np.float32)

def amb_projector(dur, gain=.12, seed=25):
    n = secs(dur); t = np.arange(n) / SR
    rattle = (np.sin(2 * np.pi * 24 * t) > .6).astype(np.float32) * bp(noise(n, seed), 800, 5000) * .5
    hiss = bp(noise(n, seed + 1), 3000, 10000) * .15
    return (stereo(rattle + hiss, 1) * gain).astype(np.float32)

def amb_crackle(dur, gain=.08, seed=26):
    n = secs(dur); r = np.random.default_rng(seed); x = np.zeros(n, np.float32)
    idx = r.integers(0, n, int(dur * 40)); x[idx] = r.uniform(-1, 1, len(idx))
    x = bp(x, 800, 8000) * 3 + bp(noise(n, seed), 2000, 8000) * .05
    return (stereo(x, 1) * gain).astype(np.float32)
