#!/usr/bin/env python3
"""Soundtrack for the JCLAW TV promo: every sound is synthesized (no samples).

  python audio/score.py build/soundtrack.wav

Timing comes from src/timeline.js (dumped through node), so picture and sound share one source of truth.
Score: 120 BPM, D minor, a five-note theme (D F A G F) that returns in D major for the finale.
Each channel gets its own orchestration; impacts are followed by hard silence.
Mix: music bus (tape saturation, mid/side width, ducking under impacts) + SFX bus + room tone,
convolution reverb, BS.1770 loudness normalisation to -16 LUFS and a 4x-oversampled true-peak limiter at -1 dBTP.
Requires numpy + scipy.
"""
import json, os, subprocess, sys
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 48000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.loads(subprocess.check_output(['node', os.path.join(ROOT, 'src', 'timeline.js')]))
DUR = TL['DURATION']
K = TL['K']
BEAT = TL['BEAT']
N = int(DUR * SR) + SR
rng = np.random.default_rng(2026)

music = np.zeros((2, N))
sfx = np.zeros((2, N))
room = np.zeros((2, N))
duck_keys = []  # times where music ducks under an impact


# ---------------------------------------------------------------- helpers
def tt(d):
    return np.arange(int(d * SR)) / SR


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


NOTE = {n: i for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def nm(s):  # 'D3' -> midi
    return 12 * (int(s[-1]) + 1) + NOTE[s[:-1]]


def env_adsr(n, a, d, s, r, sr=SR):
    a, d, r = int(a * sr), int(d * sr), int(r * sr)
    e = np.ones(n) * s
    if a: e[:min(a, n)] = np.linspace(0, 1, a)[:min(a, n)]
    if d and a < n: seg = min(d, n - a); e[a:a + seg] = np.linspace(1, s, d)[:seg]
    if r: rr = min(r, n); e[n - rr:] *= np.linspace(1, 0, rr)
    return e


def lp(x, f, order=2):
    f = min(f, SR * 0.45)
    b, a = signal.butter(order, f / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, f0, f1, order=2):
    b, a = signal.butter(order, [f0 / (SR / 2), min(f1, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def sweep_lp(x, f0, f1, blocks=64):
    """time-varying low-pass by crossfading block-filtered copies (cheap, smooth enough)"""
    out = np.zeros_like(x)
    n = len(x)
    edges = np.linspace(0, n, blocks + 1).astype(int)
    zi = None
    for i in range(blocks):
        f = f0 * (f1 / f0) ** (i / max(1, blocks - 1))
        b, a = signal.butter(2, min(f, SR * 0.45) / (SR / 2), 'low')
        if zi is None: zi = signal.lfilter_zi(b, a) * 0
        seg, zi = signal.lfilter(b, a, x[edges[i]:edges[i + 1]], zi=zi)
        out[edges[i]:edges[i + 1]] = seg
    return out


def pan_st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.vstack([x * l, x * r])


def add(bus, t0, x, gain=1.0, pan=0.0):
    if x.ndim == 1: x = pan_st(x, pan)
    i = int(round(t0 * SR))
    if i < 0: x = x[:, -i:]; i = 0
    j = min(N, i + x.shape[1])
    if j > i: bus[:, i:j] += x[:, :j - i] * gain


def saw(f, d, detune=0.0):
    t = tt(d)
    ph = rng.random()
    return signal.sawtooth(2 * np.pi * f * (1 + detune) * t + ph * 2 * np.pi)


def noise(d):
    return rng.standard_normal(int(d * SR))


# ---------------------------------------------------------------- instruments
def pad(midis, d, bright=1800, a=1.2, r=1.5, voices=3):
    x = np.zeros(int(d * SR))
    for m in midis:
        f = mtof(m)
        for v in range(voices):
            x += saw(f, d, (v - (voices - 1) / 2) * 0.006) / voices
    x = lp(x, bright, 2)
    x *= env_adsr(len(x), a, 0.5, 0.85, r)
    return x / max(1, len(midis)) * 0.9


def pad_st(midis, d, **k):
    a = pad(midis, d, **k); b = pad(midis, d, **k)
    return np.vstack([a, b])


def keys(m, d=2.5, vel=1.0):
    """felt-piano-ish additive voice"""
    f = mtof(m); t = tt(d)
    x = np.zeros_like(t)
    for h, amp in enumerate([1, 0.5, 0.28, 0.16, 0.09, 0.05], 1):
        x += amp * np.sin(2 * np.pi * f * h * (1 + 0.0004 * h * h) * t) * np.exp(-t * (1.6 + h * 0.9))
    x *= np.minimum(1, t / 0.004)
    hammer = lp(noise(0.02), 2500) * np.linspace(1, 0, int(0.02 * SR)) * 0.15
    x[:len(hammer)] += hammer
    return x * vel * 0.5


def pluck(m, d=1.6, bright=0.5, damp=0.996):
    """Karplus-Strong via lfilter"""
    f = mtof(m)
    L = max(2, int(SR / f))
    n = int(d * SR)
    exc = np.zeros(n)
    burst = lp(rng.uniform(-1, 1, L), 1500 + 6000 * bright)
    exc[:L] = burst
    a = np.zeros(L + 2); a[0] = 1; a[L] = -damp * 0.5; a[L + 1] = -damp * 0.5
    y = signal.lfilter([1], a, exc)
    return y * 0.6


def kalimba(m, d=1.8):
    f = mtof(m); t = tt(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 3.2) + 0.35 * np.sin(2 * np.pi * f * 5.93 * t) * np.exp(-t * 14) + 0.2 * np.sin(2 * np.pi * f * 2.0 * t) * np.exp(-t * 6)
    x *= np.minimum(1, t / 0.002)
    return x * 0.45


def bell(f, d=3.0):
    t = tt(d)
    x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) for r, a, dc in [(1, 1, 1.4), (2.76, 0.5, 2.6), (5.4, 0.3, 4.5), (8.9, 0.15, 7)])
    return x * np.minimum(1, t / 0.002) * 0.35


def bass_note(m, d, cutoff=900, drive=1.5):
    x = saw(mtof(m), d) + 0.6 * np.sin(2 * np.pi * mtof(m - 12) * tt(d))
    x = lp(x, cutoff, 2)
    x = np.tanh(x * drive)
    return x * env_adsr(len(x), 0.005, 0.12, 0.6, 0.06) * 0.5


def pulse_arp(m, d, cutoff=2400):
    t = tt(d)
    x = signal.square(2 * np.pi * mtof(m) * t, 0.3)
    x = lp(x, cutoff, 2)
    return x * np.exp(-t * 9) * 0.25


def kick(d=0.5, f0=140, f1=42, vel=1.0):
    t = tt(d)
    f = f1 + (f0 - f1) * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 7)
    x[:200] += lp(noise(200 / SR), 4000) * np.linspace(0.4, 0, 200)
    return np.tanh(x * 1.6) * vel * 0.8


def taiko(vel=1.0, d=1.6):
    t = tt(d)
    f = 48 + 80 * np.exp(-t * 18)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    skin = lp(noise(d), 900) * np.exp(-t * 18) * 0.6
    return np.tanh((x + skin) * 1.8) * vel * 0.75


def snare(d=0.35, vel=1.0):
    t = tt(d)
    x = bp(noise(d), 900, 7000) * np.exp(-t * 16) + 0.4 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)
    return x * vel * 0.35


def shaker(vel=1.0):
    d = 0.09; t = tt(d)
    return hp(noise(d), 6000) * np.exp(-t * 60) * (1 - np.exp(-t * 600)) * vel * 0.18


def hat(vel=1.0, d=0.06):
    t = tt(d)
    return hp(noise(d), 8000) * np.exp(-t * 80) * vel * 0.16


def boom(d=4.0, vel=1.0):
    t = tt(d)
    f = 28 + 55 * np.exp(-t * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 0.9)
    x += lp(noise(d), 300) * np.exp(-t * 4) * 0.5
    return np.tanh(x * 1.5) * vel * 0.9


def braam(root=nm('D2'), d=3.2, vel=1.0, major=False):
    t = tt(d)
    x = np.zeros_like(t)
    for m, a in [(root - 12, 1.0), (root, 0.8), (root + 7, 0.55), (root + 12, 0.35), (root + (16 if major else 15), 0.25)]:
        for dv in (-0.01, 0, 0.012):
            x += a * signal.sawtooth(2 * np.pi * mtof(m) * (1 + dv) * t + rng.random() * 6)
    x = sweep_lp(x, 300, 2600, 48) * 0.5 + sweep_lp(x, 2600, 260, 48) * 0.5
    x = np.tanh(x * 0.9)
    x *= env_adsr(len(x), 0.03, 0.6, 0.55, 1.6)
    return x * vel * 0.32


def riser(d=4.0, f0=200, f1=6000, vel=1.0):
    t = tt(d)
    n = noise(d)
    x = np.zeros_like(n)
    blocks = 40
    edges = np.linspace(0, len(n), blocks + 1).astype(int)
    for i in range(blocks):
        fc = f0 * (f1 / f0) ** (i / blocks)
        seg = bp(n[edges[i]:edges[i + 1]], fc * 0.7, fc * 1.4, 1)
        x[edges[i]:edges[i + 1]] = seg
    tone = np.sin(2 * np.pi * np.cumsum(f0 * 0.5 * (f1 / f0 * 0.25) ** (t / d)) / SR) * 0.3
    e = (t / d) ** 2.2
    return (x * 1.4 + tone) * e * vel * 0.5


def whoosh(d=1.2, f0=400, f1=4000, vel=1.0):
    t = tt(d)
    x = riser(d, f0, f1, 1.0)
    e = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return x / np.maximum(1e-3, (t / d) ** 2.2) * e * vel * 0.4


def static(d=0.5, vel=1.0):
    t = tt(d)
    x = bp(noise(d), 600, 9000) * 0.6
    crackle = (rng.random(len(t)) < 0.004) * rng.standard_normal(len(t)) * 3
    x += hp(crackle, 2000)
    return x * vel * 0.32


def click(vel=1.0, f=2400):
    d = 0.05; t = tt(d)
    x = hp(noise(d), 1500) * np.exp(-t * 200) + 0.5 * np.sin(2 * np.pi * f * t) * np.exp(-t * 120)
    return x * vel * 0.6


def knob(vel=1.0):
    x = click(vel, 1700)
    y = np.zeros(int(0.12 * SR)); y[:len(x)] += x
    c2 = click(vel * 0.5, 900); y[int(0.035 * SR):int(0.035 * SR) + len(c2)] += c2
    y += lp(noise(0.12), 400) * np.exp(-tt(0.12) * 40) * 0.6 * vel
    return y


def thump(vel=1.0):
    t = tt(0.6)
    return np.tanh(np.sin(2 * np.pi * np.cumsum(60 + 60 * np.exp(-t * 20)) / SR) * np.exp(-t * 9) * 2) * vel * 0.6


def zap(d=1.2, vel=1.0):
    t = tt(d)
    f = 3200 * np.exp(-t * 5) + 60
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * 0.4
    x += bp(noise(d), 1000, 8000) * np.exp(-t * 9) * 0.5
    return x * vel * 0.5


def paper(vel=1.0, d=0.35):
    t = tt(d)
    x = bp(noise(d), 1500, 9000) * (np.abs(np.sin(t * 60 + rng.random() * 6)) ** 3) * np.exp(-t * 7)
    return x * vel * 0.4


def chalk(d=0.5, vel=1.0):
    t = tt(d)
    grit = bp(noise(d), 2500, 8000) * (0.5 + 0.5 * np.sin(2 * np.pi * 22 * t + 1.3) ** 2)
    return grit * np.sin(np.pi * t / d) * vel * 0.25


def tick(vel=1.0):
    d = 0.03; t = tt(d)
    return (np.sin(2 * np.pi * 3200 * t) * np.exp(-t * 300) + hp(noise(d), 4000) * np.exp(-t * 400) * 0.5) * vel * 0.4


def glitch(d=0.25, vel=1.0):
    t = tt(d)
    x = signal.square(2 * np.pi * (300 + 900 * rng.random()) * t) * (rng.random(len(t)) < 0.6)
    x = bp(x + noise(d) * 0.5, 400, 8000)
    gate = (np.floor(t * 40) % 2 == 0)
    return x * gate * np.exp(-t * 6) * vel * 0.3


# ---------------------------------------------------------------- arrangement helpers
def chord(name, octave=3):
    roots = {'Dm': ('D', 'm'), 'Bb': ('A#', ''), 'F': ('F', ''), 'C': ('C', ''), 'Gm': ('G', 'm'), 'A': ('A', ''), 'D': ('D', ''), 'G': ('G', ''), 'Am': ('A', 'm'), 'Em': ('E', 'm')}
    r, q = roots[name]
    m = 12 * (octave + 1) + NOTE[r]
    return [m, m + (3 if q == 'm' else 4), m + 7]


def progression(bus, t0, names, bar_beats, gain, octave=3, bright=1800, pan_spread=True):
    bl = bar_beats * BEAT
    for i, n in enumerate(names):
        x = pad_st(chord(n, octave), bl + 1.2, bright=bright, a=0.4, r=1.0)
        add(bus, t0 + i * bl, x, gain)


THEME = [nm('D5'), nm('F5'), nm('A5'), nm('G5'), nm('F5')]
THEME_MAJ = [nm('D5'), nm('F#5'), nm('A5'), nm('G5'), nm('F#5')]


# ================================================================ ROOM TONE (whole film)
room_len = N / SR
rt = lp(rng.standard_normal(N), 180) * 0.012 + lp(rng.standard_normal(N), 900) * 0.0025
hum_t = np.arange(N) / SR
hum = sum(a * np.sin(2 * np.pi * 50 * k * hum_t) for k, a in [(1, 1), (2, 0.5), (3, 0.3), (5, 0.12)]) * 0.004
room += np.vstack([rt + hum, np.roll(rt, 900) + hum])


def room_gain(t):
    g = np.ones_like(t)
    g *= np.clip(t / 0.4, 0, 1)
    g = np.where((t > K['crash']) & (t < K['crash'] + 1.0), 0.15, g)       # sucked out after the crash
    g = np.where((t > 10) & (t < K['crash']), 0.5, g)
    g = np.where((t > 36) & (t < 134), 0.25, g)                           # inside the programmes
    g *= np.clip((DUR - t) / 0.6, 0, 1)
    return g


room *= room_gain(np.arange(N) / SR)

# CRT whine + electrical buzz while the set is on and we are in the room
whine_t = np.arange(N) / SR
whine = np.sin(2 * np.pi * 15734 * whine_t) * 0.0035 + bp(rng.standard_normal(N), 100, 400) * 0.002
wg = np.clip((whine_t - K['powerOn']) / 0.3, 0, 1) * (whine_t < 10.0) + ((whine_t > 24) & (whine_t < 35.5)) * 0.6 + np.clip((whine_t - 137) / 1.0, 0, 1) * (whine_t < K['powerOff']) * 1.0
add(sfx, 0, np.vstack([whine * wg, whine * wg]), 1.0)

# ================================================================ COLD OPEN 0–10
add(sfx, K['ledOn'], click(0.5, 3000), 0.6, 0.35)
add(sfx, K['powerOn'] - 0.05, knob(0.8), 0.8, 0.3)
add(sfx, K['powerOn'], thump(1.0), 1.0)
add(sfx, K['powerOn'], static(0.7, 0.6), 0.7)
add(sfx, K['powerOn'] + 0.05, bp(noise(1.6), 200, 2000) * np.exp(-tt(1.6) * 3) * 0.15, 1.0)
# low drone + first hint of the theme on felt keys
add(music, 3.4, pad_st([nm('D2'), nm('A2')], 6.8, bright=500, a=2.5, r=1.2), 0.55)
for i, m in enumerate([nm('D4'), nm('F4'), nm('A4')]):
    add(music, 5.0 + i * 1.0, keys(m, 3.0, 0.5), 0.6, -0.2 + i * 0.2)
add(sfx, 8.6, riser(1.4, 400, 7000, 0.6), 0.8)
add(sfx, 9.3, static(0.8, 1.0), 0.9)

# ================================================================ STORM 10–24
s0, crash = K['stormStart'], K['crash']
# accelerating ticks (clock, keyboard, notifications)
tcur, gap = s0 + 0.2, 0.5
while tcur < crash - 0.05:
    add(sfx, tcur, tick(0.6 + 0.4 * (tcur - s0) / 12), 0.7, rng.uniform(-0.6, 0.6))
    gap = max(0.06, gap * 0.94)
    tcur += gap
for k in range(14):  # notification pings
    tp = s0 + 1.0 + k * 0.8 + rng.uniform(-0.2, 0.2)
    if tp < crash - 0.3: add(sfx, tp, bell(mtof(nm('A5') + rng.integers(0, 8)), 0.8), 0.18, rng.uniform(-0.8, 0.8))
# pulse bass in 8ths building
for i in range(int((crash - s0) / (BEAT / 2))):
    tb = s0 + i * BEAT / 2
    vel = 0.35 + 0.65 * (i / ((crash - s0) / (BEAT / 2)))
    add(music, tb, bass_note(nm('D2'), BEAT / 2 * 0.9, cutoff=300 + 1500 * vel, drive=1.2 + vel), vel * 0.8)
# kicks on beats after 14 s, doubling at 18
for i in range(int((crash - 14) / BEAT)):
    tb = 14 + i * BEAT
    add(music, tb, kick(0.5, vel=0.7), 0.8)
    if tb > 18: add(music, tb + BEAT / 2, kick(0.4, vel=0.5), 0.7)
# words on beats 15–19.5: stabs
for i in range(int((19.5 - 15.0) / 0.35)):
    add(sfx, 15.0 + i * 0.35, glitch(0.18, 0.5), 0.5, rng.uniform(-0.5, 0.5))
progression(music, s0, ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb'], 4, 0.35, octave=3, bright=1200)
add(sfx, 14.0, riser(8.0, 120, 9000, 1.0), 0.9)
add(sfx, 20.5, whoosh(1.5, 300, 6000, 1.0), 0.9)
add(sfx, crash - 0.6, np.flip(boom(0.6, 0.8)) * 0.6, 0.8)
# the crash, then hard silence
add(sfx, crash, boom(3.5, 1.2), 1.1)
add(sfx, crash, braam(nm('D2'), 1.4, 1.1), 1.0)
add(sfx, crash, static(0.25, 1.2), 1.0)
duck_keys.append(crash)
add(sfx, K['knob'], knob(1.0), 1.1, 0.25)

# ================================================================ TITLE 24–36
h = K['hero']
add(sfx, h, boom(4.5, 1.0), 1.0)
add(music, h, braam(nm('D2'), 4.0, 1.0), 1.0)
add(sfx, h - 0.8, np.flip(whoosh(0.8, 800, 5000, 0.8)), 0.6)
duck_keys.append(h)
# knob macro: detent clicks as it sweeps two channels
for i, td in enumerate([24.6, 25.3, 25.8, 26.2]):
    add(sfx, td, knob(0.6), 0.6, 0.3)
add(sfx, 26.4, whoosh(1.6, 300, 3000, 0.8), 0.8)
add(sfx, K['titleSlam'], boom(3.0, 0.9), 0.9)
add(sfx, K['titleSlam'], snare(0.6, 1.4), 0.9)
add(music, K['titleSlam'], braam(nm('A1'), 3.0, 0.7), 0.8)
duck_keys.append(K['titleSlam'])
# theme statement (felt keys + strings)
progression(music, 28.0, ['Dm', 'Bb', 'F', 'C'], 4, 0.42, octave=3, bright=2200)
for i, m in enumerate(THEME):
    add(music, 28.5 + i * 1.0, keys(m, 2.8, 0.9), 0.75, -0.1 + i * 0.05)
    add(music, 28.5 + i * 1.0, keys(m - 12, 2.8, 0.5), 0.5)
for i in range(int(7.5 / BEAT)):
    add(music, 28.5 + i * BEAT, hat(0.5 if i % 2 else 0.8), 0.6, 0.3)
    if i % 4 == 0: add(music, 28.5 + i * BEAT, kick(0.4, vel=0.5), 0.6)
# programme guide cursor ticks
for k in range(5): add(sfx, 24 + 7.4 + k * 0.52, click(0.4, 2800), 0.45, 0.4)
add(sfx, 24 + 10.2, knob(1.0), 1.0, 0.3)
add(sfx, 24 + 10.6, riser(1.4, 300, 9000, 0.9), 0.9)
add(sfx, 24 + 11.4, static(0.6, 0.9), 0.8)


# ================================================================ channel switch stingers
def channel_switch(t0, pan=0.25):
    add(sfx, t0 - 0.12, knob(0.9), 0.9, pan)
    add(sfx, t0, static(0.45, 1.0), 0.75)
    add(sfx, t0, thump(0.5), 0.5)


for tc in [K['ch1'], K['ch2'], K['ch3'], K['ch5']]:
    channel_switch(tc)

# ================================================================ CH01 36–52 · warm plucks (F major colour)
c1 = K['ch1']
prog1 = ['F', 'C', 'Dm', 'Bb', 'F', 'C', 'Bb', 'C']
progression(music, c1, prog1, 4, 0.22, octave=3, bright=1500)
arp = [0, 7, 12, 16, 12, 7]
for bar, name in enumerate(prog1):
    ch = chord(name, 3)
    for k in range(8):
        tb = c1 + bar * 2.0 + k * BEAT / 2
        m = ch[k % 3] + 12 * (k // 3 % 2)
        add(music, tb, pluck(m, 1.2, 0.4), 0.55, -0.4 + 0.8 * (k % 2))
    add(music, c1 + bar * 2.0, bass_note(ch[0] - 12, 1.8, 500, 1.0), 0.45)
    for k in range(4):
        add(music, c1 + bar * 2 + k * BEAT, shaker(0.8), 0.6, 0.5)
        if k % 2 == 0: add(music, c1 + bar * 2 + k * BEAT, kick(0.35, 110, 50, 0.4), 0.55)
        else: add(music, c1 + bar * 2 + k * BEAT, snare(0.2, 0.4), 0.4)
for st in [0.3, 3.4, 5.9, 8.4, 10.8]:  # cards land
    add(sfx, c1 + st - 0.5, paper(0.9), 0.7, rng.uniform(-0.4, 0.4))
    add(sfx, c1 + st + 0.05, thump(0.25), 0.4)
for i in range(12): add(sfx, c1 + 3.4 + 0.25 + i * 0.09, click(0.25, 4200), 0.3, -0.3)   # tubes into the rack
add(sfx, c1 + 13.0, whoosh(2.4, 200, 2500, 0.7), 0.6)
add(sfx, c1 + 13.4, bell(mtof(nm('C6')), 2.0), 0.25)

# ================================================================ CH02 52–66 · kalimba + chalk
c2 = K['ch2']
prog2 = ['Dm', 'Bb', 'F', 'C', 'Dm', 'Bb', 'Gm', 'A']
progression(music, c2, prog2[:7], 4, 0.2, octave=3, bright=1300)
pat = [0, 2, 1, 2, 0, 1, 2, 1]
for bar, name in enumerate(prog2[:7]):
    ch = chord(name, 4)
    for k in range(8):
        add(music, c2 + bar * 2 + k * BEAT / 2, kalimba(ch[pat[k]] + (12 if k == 4 else 0), 1.4), 0.5, -0.5 + k / 8)
    add(music, c2 + bar * 2, bass_note(ch[0] - 24, 1.9, 380, 0.9), 0.35)
    for k in range(4): add(music, c2 + bar * 2 + k * BEAT, hat(0.4), 0.4, -0.3)
for i in range(3): add(sfx, c2 + 1.6 + i * 0.35, paper(0.7, 0.4), 0.5, -0.5)          # cards flip
for i in range(3): add(sfx, c2 + 4.2 + i * 0.22, whoosh(0.9, 500, 3000, 0.5), 0.5)
add(sfx, c2 + 4.6, chalk(1.2, 1.0), 0.8, -0.2)
add(sfx, c2 + 1.0, chalk(0.6, 0.7), 0.5, -0.4)
add(sfx, c2 + 6.7, click(1.0, 1500), 0.8)
add(sfx, c2 + 6.75, bell(mtof(nm('A5')), 2.0), 0.3)
# progress saves: soft marimba-ish ticks
for k in range(26):
    add(sfx, c2 + 8.3 + k * 0.21, kalimba(nm('A6') + [0, 3, 5, 7][k % 4], 0.3), 0.12, rng.uniform(-0.6, 0.6))
add(sfx, c2 + 10.4, click(0.8, 1200), 0.6)

# ================================================================ CH03 66–88 · taiko + synth bass, CI lock
c3 = K['ch3']
ci = K['ciLock']
prog3 = ['Dm', 'Dm', 'Bb', 'C', 'Dm', 'Bb', 'Gm', 'A']
progression(music, c3, prog3, 4, 0.26, octave=3, bright=1500)
for i in range(int((ci - c3) / (BEAT / 4))):   # 16th bass
    tb = c3 + i * BEAT / 4
    bar = int((tb - c3) / 2.0) % 8
    root = chord(prog3[bar], 2)[0]
    vel = 0.4 + 0.6 * (tb - c3) / (ci - c3)
    m = root + (12 if i % 8 == 6 else 0)
    add(music, tb, bass_note(m, BEAT / 4 * 0.8, 500 + 1600 * vel, 1.6), 0.55 * vel + 0.15)
for i in range(int((ci - c3) / BEAT)):
    tb = c3 + i * BEAT
    if i % 4 == 0: add(music, tb, taiko(1.0), 0.9, -0.2)
    if i % 4 == 2: add(music, tb, taiko(0.6), 0.7, 0.2)
    if tb > 73 and i % 2 == 1: add(music, tb, snare(0.3, 0.6), 0.6)
    add(music, tb + BEAT / 2, hat(0.6), 0.5, 0.4)
# taiko roll into the lock
for k in range(16):
    add(music, ci - 2.0 + k * 0.125, taiko(0.3 + 0.7 * k / 16, 0.6), 0.6, (-1) ** k * 0.3)
add(sfx, c3 + 0.9, riser(1.6, 1500, 6000, 0.4), 0.5)     # scan beam
for i in range(7): add(sfx, c3 + 1.1 + i * 0.12, tick(0.6), 0.6, -0.6 + i * 0.2)
for i in range(4): add(sfx, c3 + 1.4 + i * 0.5, click(0.7, 1800 + 300 * i), 0.6)
add(sfx, c3 + 3.8, whoosh(0.9, 300, 2500, 0.6), 0.6)
add(sfx, c3 + 4.6, thump(0.6), 0.6)
for i in range(16): add(sfx, c3 + 4.6 + i * 0.075, tick(0.35), 0.4, 0.4)  # hash decoding
add(sfx, c3 + 7.0, whoosh(1.8, 200, 4000, 1.0), 0.9)      # fly into the curves
add(sfx, c3 + 9.2, riser(0.8, 600, 3000, 0.5), 0.5)       # semi-log flip
add(sfx, c3 + 11.4, whoosh(1.0, 400, 3000, 0.7), 0.6)
add(sfx, ci - 4.0, riser(4.0, 100, 10000, 1.1), 1.0)
add(sfx, ci - 0.08, np.flip(snare(0.25, 1.0)), 0.6)
add(sfx, ci, boom(4.0, 1.3), 1.1)
add(music, ci, braam(nm('D2'), 4.2, 1.2), 1.1)
add(sfx, ci, snare(0.8, 1.6), 0.9)
duck_keys.append(ci)
# after the lock: lineage blips then identity streams
add(music, ci + 0.4, pad_st(chord('Dm', 3) + [nm('A4')], 5.8, bright=900, a=1.0, r=1.0), 0.35)
for i in range(5): add(sfx, ci + 0.2 + i * 0.28, bell(mtof(nm('D6') - i * 2), 1.2), 0.15, -0.2 + i * 0.1)
for i, m in enumerate([nm('D4'), nm('A4'), nm('F4')]):
    add(music, ci + 2.9 + i * 0.15, pulse_arp(m, 0.8), 0.6, -0.6 + i * 0.6)
for i in range(12):
    add(music, ci + 3.4 + i * BEAT / 2, pulse_arp(chord('Dm', 4)[i % 3], 0.4, 1800), 0.4, (-1) ** i * 0.5)

# ================================================================ CH04 88–104 · EZCTD
c4 = K['ch4']; lock4 = K['ch4Lock']
add(sfx, c4 - 0.12, knob(0.9), 0.9, 0.25)
add(sfx, c4, static(lock4 - c4 + 0.1, 0.9), 0.75)
for i in range(5): add(sfx, c4 + 0.6 + i * 0.18, tick(0.5), 0.5)       # signal bars
add(sfx, lock4 - 0.5, riser(0.5, 800, 8000, 0.7), 0.7)
add(sfx, lock4, thump(0.8), 0.8)
add(sfx, lock4, bell(mtof(nm('E6')), 2.0), 0.3)
prog4 = ['Dm', 'C', 'Bb', 'C', 'Dm', 'C', 'Bb']
progression(music, lock4, prog4, 4, 0.32, octave=3, bright=1300)
for i in range(int((c4 + 16 - lock4) / (BEAT / 2))):
    tb = lock4 + i * BEAT / 2
    bar = int((tb - lock4) / 2) % 7
    ch = chord(prog4[bar], 4)
    add(music, tb, pulse_arp(ch[[0, 2, 1, 2][i % 4]], 0.35, 1800), 0.55, (-1) ** i * 0.35)
    if i % 2 == 0: add(music, tb, kick(0.3, 100, 45, 0.5), 0.7)
    if i % 4 == 2: add(music, tb, hat(0.6), 0.5, 0.3)
    if i % 8 == 0: add(music, tb, bass_note(ch[0] - 24, 1.8, 450, 1.0), 0.45)
for i in range(4): add(sfx, lock4 + 0.1 + i * 0.12, paper(0.7, 0.3), 0.5, -0.6 + 0.4 * i)
for i in range(5): add(sfx, lock4 + 1.4 + i * 0.14, click(0.35, 3500), 0.4)          # typing 12.50
add(sfx, lock4 + 2.2, bell(mtof(nm('B5')), 1.2), 0.3)
add(sfx, lock4 + 4.3, whoosh(0.8, 400, 3000, 0.6), 0.6)
for i in range(104):                                                    # matrix cells
    if i % 3 == 0: add(sfx, lock4 + 4.6 + i * 0.03, tick(0.25), 0.3, -0.7 + 1.4 * (i / 104))
add(sfx, lock4 + 8.6, whoosh(0.8, 300, 2500, 0.6), 0.5)
add(sfx, lock4 + 8.8, click(1.0, 1100), 0.6)                            # lock
add(sfx, lock4 + 9.4, whoosh(1.0, 500, 4000, 0.6), 0.6)                 # copy
for k in range(3): add(sfx, lock4 + 10.6 + k * 0.35, bell(mtof(nm('A5') + k * 4), 1.0), 0.22)

# ================================================================ CH05 104–120 · BE Solo
c5 = K['ch5']; acc = K['accept']
prog5 = ['Bb', 'F', 'C', 'Dm', 'Bb', 'F', 'C', 'A']
progression(music, c5, prog5, 4, 0.34, octave=3, bright=1900)
for i in range(int(16 / (BEAT / 4))):
    tb = c5 + i * BEAT / 4
    bar = int((tb - c5) / 2) % 8
    ch = chord(prog5[bar], 4)
    seq = [0, 1, 2, 1, 0, 2, 1, 2]
    if tb < acc - 0.25 or tb > acc + 0.4:
        add(music, tb, pulse_arp(ch[seq[i % 8]] + (12 if i % 16 >= 12 else 0), 0.3, 2800), 0.48, (-1) ** i * 0.4)
    if i % 4 == 0: add(music, tb, kick(0.35, 120, 45, 0.6), 0.75)
    if i % 16 == 0: add(music, tb, bass_note(ch[0] - 24, 1.9, 500, 1.0), 0.5)
    if i % 8 == 4: add(music, tb, snare(0.25, 0.4), 0.45)
for d in [0.3, 0.6, 4.4, 5.4, 9.4]: add(sfx, c5 + d, whoosh(0.9, 500, 3500, 0.45), 0.5, rng.uniform(-0.4, 0.4))
for k in range(8): add(sfx, c5 + 0.6 + k * 0.25, tick(0.3), 0.35)       # node fill
add(sfx, c5 + 9.8, click(0.6, 2600), 0.5)                              # send prompt
for k in range(24): add(sfx, c5 + 10.3 + k * 0.05, tick(0.12), 0.25, 0.3)   # streaming
add(sfx, c5 + 11.0, whoosh(0.6, 800, 4000, 0.5), 0.5)
add(sfx, c5 + 11.3, bell(mtof(nm('E6')), 1.5), 0.3)                    # pending badge
add(sfx, acc, click(1.2, 1900), 1.0)
add(sfx, acc + 0.02, bell(mtof(nm('A5')), 2.5), 0.45)
add(sfx, acc + 0.12, bell(mtof(nm('E6')), 2.5), 0.35)
add(sfx, acc + 0.9, whoosh(0.9, 400, 2800, 0.6), 0.6)

# ================================================================ SPECIAL 120–134 · BE CSR Review
sp = K['special']
add(sfx, sp - 0.12, knob(0.9), 0.9, 0.25)
add(sfx, sp, glitch(0.5, 1.2), 0.9)
add(sfx, sp, boom(2.0, 0.8), 0.8)
for i in range(4): add(music, sp + 0.15 + i * 0.16, bell(mtof(nm('D6') + [0, 4, 7, 12][i]), 1.2), 0.25)
add(sfx, sp + 1.15, whoosh(0.5, 600, 6000, 0.7), 0.6)
add(sfx, sp + 1.5, boom(3.0, 0.9), 0.9)
add(music, sp + 1.5, braam(nm('D2'), 3.0, 0.8), 0.9)
duck_keys.append(sp + 1.5)
progression(music, sp + 1.5, ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb'], 4, 0.25, octave=3, bright=1400)
for i in range(int(12.5 / (BEAT / 2))):
    tb = sp + 1.5 + i * BEAT / 2
    add(music, tb, bass_note(nm('D2'), BEAT / 2 * 0.8, 900, 1.4), 0.4)
    if i % 2 == 0: add(music, tb, kick(0.35, vel=0.5), 0.55)
    add(music, tb + BEAT / 4, hat(0.4), 0.4, 0.3)


def inout_cubic(q):
    return 4 * q ** 3 if q < 0.5 else 1 - (-2 * q + 2) ** 3 / 2


g0 = sp + 1.5 + 4.1
for i in range(6):   # gate hits when the light head passes each gate
    gx = 290 + i * 268
    q = next(v for v in np.linspace(0, 1, 2001) if 140 + (1920 - 280) * inout_cubic(v) >= gx)
    add(sfx, g0 + q * 2.6, snare(0.3, 0.8), 0.7, -0.6 + i * 0.24)
    add(sfx, g0 + q * 2.6, bell(mtof(nm('A5') + [0, 2, 3, 5, 7, 10][i]), 1.0), 0.25, -0.6 + i * 0.24)
for i in range(3): add(sfx, g0 + 2.8 + i * 0.25, tick(0.6), 0.5)
add(sfx, g0 + 3.6, glitch(0.3, 1.0), 0.7)
add(sfx, g0 + 3.6, bell(mtof(nm('C#6')), 1.2), 0.3)
add(sfx, sp + 1.5 + 8.3, whoosh(0.8, 400, 3000, 0.6), 0.6)
for i in range(3): add(sfx, sp + 1.5 + 8.9 + i * 0.3, click(0.5, 2200), 0.45)

# ================================================================ FINALE 134–160
f0 = K['flip']
add(music, f0, riser(3.0, 150, 6000, 0.9), 0.8)
for k in range(6):
    add(music, f0 + k * 0.5, taiko(0.6 + 0.08 * k), 0.8, (-1) ** k * 0.3)
    add(music, f0 + k * 0.5, bass_note(nm('D2'), 0.45, 900, 1.5), 0.5)
    add(sfx, f0 + k * 0.5 - 0.06, knob(0.7), 0.7, 0.25)
    add(sfx, f0 + k * 0.5, static(0.22, 0.9), 0.7)
add(sfx, K['pullOut'] - 0.4, np.flip(whoosh(0.4, 500, 4000, 0.8)), 0.6)
add(sfx, K['pullOut'], whoosh(3.0, 3000, 200, 1.0), 0.9)
add(sfx, K['pullOut'], boom(3.0, 0.7), 0.7)
# theme returns in D major, building
progression(music, K['pullOut'], ['D', 'A', 'G', 'A', 'D', 'G'], 4, 0.36, octave=3, bright=2400)
for i, m in enumerate(THEME_MAJ):
    add(music, K['pullOut'] + 0.5 + i * 1.0, keys(m, 3.0, 0.85), 0.7)
    add(music, K['pullOut'] + 0.5 + i * 1.0, keys(m - 12, 3.0, 0.5), 0.5)
for i, m in enumerate(THEME_MAJ):   # strings an octave below, in long notes
    add(music, K['beams'] + i * 1.4, pad_st([m - 12, m - 24], 1.8, bright=2600, a=0.3, r=0.6), 0.3)
for i in range(int((K['finalTitle'] - K['pullOut']) / BEAT)):
    tb = K['pullOut'] + i * BEAT
    if i % 2 == 0: add(music, tb, taiko(0.5 + 0.5 * i / 24), 0.6)
    add(music, tb + BEAT / 2, hat(0.5), 0.45, 0.3)
    if tb > K['beams']: add(music, tb, bass_note(nm('D2') + (0 if (i // 4) % 2 == 0 else 7), BEAT * 0.9, 700, 1.2), 0.4)
for i in range(6):   # beams
    add(sfx, K['beams'] + 0.2 + i * 0.32, whoosh(0.7, 800, 5000, 0.5), 0.45, -0.7 if i < 3 else 0.7)
    add(sfx, K['beams'] + 0.6 + i * 0.32, bell(mtof([nm('D6'), nm('F#6'), nm('A6'), nm('A5'), nm('D6'), nm('E6')][i]), 1.6), 0.18, -0.7 if i < 3 else 0.7)
add(sfx, K['beams'] + 4.2, bell(mtof(nm('D6')), 3.0), 0.35)        # hub
add(sfx, K['finalTitle'] - 3.0, riser(3.0, 100, 9000, 1.1), 1.0)
ft = K['finalTitle']
add(sfx, ft, boom(5.0, 1.3), 1.1)
add(music, ft, braam(nm('D2'), 5.0, 1.1, major=True), 1.1)
add(music, ft, pad_st(chord('D', 3) + [nm('A4'), nm('D5'), nm('F#5')], 7.8, bright=3000, a=0.05, r=1.5), 0.6)
add(music, ft + 2.0, pad_st([nm('D5'), nm('A5')], 5.6, bright=4000, a=1.5, r=1.2), 0.3)
for i, m in enumerate([nm('D5'), nm('F#5'), nm('A5'), nm('D6')]):
    add(music, ft + 1.0 + i * 0.5, keys(m, 4.0, 0.7), 0.55)
duck_keys.append(ft)
add(sfx, K['powerOff'], zap(1.4, 1.0), 0.9)
add(sfx, K['powerOff'] - 0.05, knob(0.9), 0.8, 0.3)
add(sfx, K['powerOff'] + 1.6, keys(nm('D4'), 4.0, 0.4), 0.5)
add(sfx, K['powerOff'] + 2.4, keys(nm('A4'), 3.5, 0.3), 0.4)

# ================================================================ MIX
t_all = np.arange(N) / SR
# duck music briefly under impacts, then let it return (and hard-cut music during the post-crash silence)
duck = np.ones(N)
for k in duck_keys:
    d = t_all - k
    m = (d > 0) & (d < 1.6)
    duck[m] = np.minimum(duck[m], 0.55 + 0.45 * (d[m] / 1.6) ** 0.7)
silence = (t_all > K['crash'] + 0.35) & (t_all < K['hero'] - 0.02)
duck[silence] = 0.0
# music fully off after the power-off
duck *= np.where(t_all < K['powerOff'] + 0.2, 1.0, np.clip(1 - (t_all - K['powerOff'] - 0.2) / 0.5, 0, 1))
music *= duck
# sfx after the crash also stop (except the knob)
sfx_gate = np.ones(N)
sfx_gate[(t_all > K['crash'] + 0.9) & (t_all < K['knob'] - 0.02)] *= 0.2
sfx *= sfx_gate


def reverb_ir(d=2.6, decay=2.2, pre=0.012):
    n = int(d * SR)
    t = np.arange(n) / SR
    irs = []
    for ch in range(2):
        x = rng.standard_normal(n) * np.exp(-t * decay * 3 / d)
        x = lp(x, 6500) ; x = hp(x, 120)
        x[:int(pre * SR)] = 0
        irs.append(x / np.sqrt(np.sum(x ** 2)))
    return irs


ir = reverb_ir()
def verb(x, wet):
    return np.vstack([signal.fftconvolve(x[0], ir[0])[:N], signal.fftconvolve(x[1], ir[1])[:N]]) * wet


music_v = music + verb(music, 0.35)
sfx_v = sfx + verb(sfx, 0.18)
# the post-crash silence: everything except the knob click and a breath of room tone is cut
sil = np.ones(N)
a0, a1 = int((K['crash'] + 0.45) * SR), int((K['knob'] - 0.01) * SR)
sil[a0:a1] = 0.0
ramp = int(0.25 * SR); sil[a0 - ramp:a0] = np.linspace(1, 0, ramp)
music_v *= sil; sfx_v *= sil
kn = np.zeros((2, N)); add(kn, K['knob'], knob(1.0), 1.1, 0.25); sfx_v += (kn + verb(kn, 0.3)) * (1 - sil)

# tape saturation + mid/side width on the music bus (lows kept mono)
music_v = np.tanh(music_v * 1.5) / 1.5
mid = (music_v[0] + music_v[1]) / 2; side = (music_v[0] - music_v[1]) / 2
side = hp(side, 160) * 1.25
music_v = np.vstack([mid + side, mid - side])

mix = music_v * 0.9 + sfx_v * 1.0 + room * 1.0
mix = np.vstack([hp(mix[0], 25), hp(mix[1], 25)])


# BS.1770 integrated loudness
def k_weight(x):
    # high-shelf pre-filter + RLB high-pass (48 kHz coefficients from the standard)
    b1 = [1.53512485958697, -2.69169618940638, 1.19839281085285]; a1 = [1.0, -1.69065929318241, 0.73248077421585]
    b2 = [1.0, -2.0, 1.0]; a2 = [1.0, -1.99004745483398, 0.99007225036621]
    return signal.lfilter(b2, a2, signal.lfilter(b1, a1, x))


def lufs(st):
    y = np.vstack([k_weight(st[0]), k_weight(st[1])])
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    ms = []
    for i in range(0, y.shape[1] - blk, hop):
        ms.append(np.mean(y[:, i:i + blk] ** 2, axis=1).sum())
    ms = np.array(ms)
    l = -0.691 + 10 * np.log10(ms + 1e-12)
    g1 = ms[l > -70]
    rel = -0.691 + 10 * np.log10(np.mean(g1)) - 10
    g2 = g1[(-0.691 + 10 * np.log10(g1 + 1e-12)) > rel]
    return -0.691 + 10 * np.log10(np.mean(g2))


def true_peak_limit(st, ceiling_db=-1.0, look=0.004, release=0.08):
    ceil = 10 ** (ceiling_db / 20)
    up = signal.resample_poly(st, 4, 1, axis=1)
    peak = np.max(np.abs(up), axis=0)[:4 * st.shape[1]].reshape(-1, 4).max(axis=1)
    gain = np.minimum(1.0, ceil / np.maximum(peak, 1e-9))
    la = int(look * SR)
    # look-ahead: minimum over the window ahead
    from scipy.ndimage import minimum_filter1d
    g = minimum_filter1d(gain, size=2 * la + 1)
    # smooth release (one-pole on the way up only)
    a = np.exp(-1 / (release * SR))
    out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        v = g[i]
        cur = v if v < cur else a * cur + (1 - a) * v
        out[i] = cur
    return st * out


target = -16.0
l0 = lufs(mix)
mix *= 10 ** ((target - l0) / 20)
for _ in range(3):
    mix = true_peak_limit(mix, -1.2)
    l1 = lufs(mix)
    if abs(l1 - target) < 0.3: break
    mix *= 10 ** ((target - l1) / 20)
mix = true_peak_limit(mix, -1.2)
mix = mix[:, :int(DUR * SR)]
fade = int(0.3 * SR); mix[:, -fade:] *= np.linspace(1, 0, fade)
up = signal.resample_poly(mix, 4, 1, axis=1)
tp = 20 * np.log10(np.max(np.abs(up)) + 1e-12)
print(f'integrated {lufs(mix):.2f} LUFS · true peak {tp:.2f} dBTP · {mix.shape[1] / SR:.1f} s')
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'build', 'soundtrack.wav')
os.makedirs(os.path.dirname(out), exist_ok=True)
wavfile.write(out, SR, (np.clip(mix.T, -1, 1) * 32767).astype(np.int16))
print('->', out)
