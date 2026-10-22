"""Synthesize narration line by line, build the master timeline, SFX, BGM and mixes."""
import json, re
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt
from voice_eval import make_tts
from script_data import SCENES

SID, SPEED = 16, 1.18
SR = 48000
OUT = "/projects/sandbox/work/build/"
LEAD_IN = {"hook": 0.15}          # silence before first line of a scene
DEFAULT_LEAD = 0.45
TAIL = 0.55                        # hold after the last line of a scene
LIST_SCENES = {"pre", "during", "post", "senior", "gcp", "newbie"}


def pause_after(say):
    s = say.strip()
    if s.endswith(("。", "？", "！", "：")):
        return 0.22
    if s.endswith("；"):
        return 0.12
    return 0.04


def trim(x, sr, thr=0.003, lead=0.06, tail=0.08):
    # generous margins: soft affricate onsets (ch/c/zh) sit below the threshold
    idx = np.where(np.abs(x) > thr)[0]
    if len(idx) == 0:
        return x
    a = max(0, idx[0] - int(lead * sr))
    b = min(len(x), idx[-1] + int(tail * sr))
    y = x[a:b].copy()
    f = min(len(y) // 4, int(0.004 * sr))  # 4 ms fades avoid clicks at the cut points
    if f > 0:
        y[:f] *= np.linspace(0, 1, f)
        y[-f:] *= np.linspace(1, 0, f)
    return y


def main():
    import os
    os.makedirs(OUT, exist_ok=True)
    tts = make_tts()
    clips, scenes, events = [], [], []
    t = 0.0
    for si, (name, lines) in enumerate(SCENES):
        s0 = t
        t += LEAD_IN.get(name, DEFAULT_LEAD)
        if si > 0:
            events.append(("whoosh", s0))
        L = []
        for li, (sub, say) in enumerate(lines):
            a = tts.generate(say, sid=SID, speed=SPEED)
            x = np.array(a.samples, dtype=np.float32)
            x = trim(x, a.sample_rate)
            x = resample_poly(x, SR, a.sample_rate).astype(np.float32)
            d = len(x) / SR
            clips.append((t, x))
            L.append(dict(sub=sub, say=say, start=round(t, 3), end=round(t + d, 3)))
            if name in LIST_SCENES and li > 0:
                events.append(("pop", t))
            if name == "during" and "改时间" in say:
                events.append(("stamp", t + d * 0.62))
            t += d + pause_after(say)
        t += TAIL
        scenes.append(dict(name=name, start=round(s0, 3), end=round(t, 3), lines=L))
    total = t + 0.3
    n = int(np.ceil(total * SR))
    vo = np.zeros(n, np.float32)
    for st, x in clips:
        i = int(st * SR)
        vo[i:i + len(x)] += x
    # narration level: peak-normalize to -3 dBFS (final loudness done by ffmpeg)
    vo *= 0.70 / max(1e-6, np.abs(vo).max())

    sfx = make_sfx(events, n)
    bgm = make_bgm(n)
    duck = ducking_gain(vo)
    mix_bgm = vo + sfx + bgm * duck
    mix_nobgm = vo + sfx
    for nm, y in [("vo", vo), ("sfx", sfx), ("bgm", bgm), ("mix_bgm", mix_bgm), ("mix_nobgm", mix_nobgm)]:
        pk = np.abs(y).max()
        if pk > 0.98:
            y = y * (0.98 / pk)
        sf.write(OUT + nm + ".wav", y, SR, subtype="PCM_16")
    json.dump(dict(total=round(total, 3), scenes=scenes, events=[(k, round(v, 3)) for k, v in events]),
              open(OUT + "timeline.json", "w"), ensure_ascii=False, indent=1)
    write_srt(scenes, OUT + "subtitles.srt")
    print("total %.2fs, %d lines, %d events" % (total, len(clips), len(events)))
    for s in scenes:
        print("  %-7s %6.2f -> %6.2f (%.1fs)" % (s["name"], s["start"], s["end"], s["end"] - s["start"]))


# ---------------------------------------------------------------- SFX
def env_exp(n, tau):
    return np.exp(-np.arange(n) / (tau * SR)).astype(np.float32)


def make_sfx(events, n):
    out = np.zeros(n, np.float32)
    rng = np.random.default_rng(7)
    for kind, t in events:
        i = int(t * SR)
        if kind == "pop":       # soft glassy blip
            m = int(0.16 * SR)
            tt = np.arange(m) / SR
            f = 1150 + 500 * np.exp(-tt / 0.02)
            ph = 2 * np.pi * np.cumsum(f) / SR
            y = (np.sin(ph) + 0.25 * np.sin(2 * ph)) * env_exp(m, 0.045)
            y *= np.minimum(1, tt / 0.003)
            y *= 0.075
        elif kind == "whoosh":  # filtered noise swell
            m = int(0.55 * SR)
            tt = np.arange(m) / SR
            noise = rng.standard_normal(m).astype(np.float32)
            sos = butter(2, [500, 4500], btype="band", fs=SR, output="sos")
            y = sosfilt(sos, noise)
            shape = np.sin(np.pi * np.clip(tt / 0.55, 0, 1)) ** 2
            y = y * shape * 0.05
            i = max(0, i - int(0.2 * SR))
        elif kind == "stamp":   # low thump + click
            m = int(0.35 * SR)
            tt = np.arange(m) / SR
            f = 70 + 120 * np.exp(-tt / 0.03)
            ph = 2 * np.pi * np.cumsum(f) / SR
            y = np.sin(ph) * env_exp(m, 0.08) * 0.32
            click = rng.standard_normal(m) * env_exp(m, 0.006) * 0.08
            y = (y + click).astype(np.float32)
        else:
            continue
        j = min(n, i + len(y))
        out[i:j] += y[: j - i]
    return out


# ---------------------------------------------------------------- BGM
def note(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def make_bgm(n):
    """Calm ambient bed: Am - F - C - G pad, soft bass, gentle pluck arpeggio."""
    bpm = 96
    beat = 60 / bpm
    bar = 4 * beat
    chords = [  # (bass, pad voicing, arp tones)
        (45, [57, 60, 64, 69], [69, 72, 76, 72]),   # Am
        (41, [57, 60, 65, 69], [69, 72, 77, 72]),   # F
        (48, [55, 60, 64, 67], [67, 72, 76, 72]),   # C
        (43, [55, 59, 62, 67], [67, 71, 74, 71]),   # G
    ]
    t = np.arange(n) / SR
    pad = np.zeros(n, np.float32)
    bass = np.zeros(n, np.float32)
    arp = np.zeros(n, np.float32)
    nbars = int(np.ceil(n / SR / bar)) + 1
    for b in range(nbars):
        bs, pv, ap = chords[b % 4]
        s0 = b * bar
        i0 = int(s0 * SR)
        seg = int((bar + 1.2) * SR)
        i1 = min(n, i0 + seg)
        if i0 >= n:
            break
        tt = np.arange(i1 - i0) / SR
        env = np.minimum(1, tt / 0.9) * np.clip((bar + 1.2 - tt) / 1.2, 0, 1)
        for m in pv:
            f = note(m)
            for det in (-0.0012, 0.0, 0.0012):
                pad[i0:i1] += (np.sin(2 * np.pi * f * (1 + det) * tt) * env * 0.030).astype(np.float32)
        fb = note(bs)
        benv = np.minimum(1, tt / 0.05) * np.exp(-tt / 1.6) * (tt < bar)
        bass[i0:i1] += (np.sin(2 * np.pi * fb * tt) * benv * 0.11).astype(np.float32)
        for k in range(8):  # eighth-note arpeggio
            ns = s0 + k * beat / 2
            j0 = int(ns * SR)
            if j0 >= n:
                break
            m = int(0.9 * SR)
            j1 = min(n, j0 + m)
            tk = np.arange(j1 - j0) / SR
            f = note(ap[k % 4])
            e = np.minimum(1, tk / 0.004) * np.exp(-tk / 0.22)
            arp[j0:j1] += ((np.sin(2 * np.pi * f * tk) + 0.3 * np.sin(4 * np.pi * f * tk)) * e * 0.022).astype(np.float32)
    sos = butter(2, 3500, btype="low", fs=SR, output="sos")
    y = sosfilt(sos, pad + bass + arp).astype(np.float32)
    # slow fade in/out
    fi, fo = int(1.5 * SR), int(2.5 * SR)
    y[:fi] *= np.linspace(0, 1, fi)
    y[-fo:] *= np.linspace(1, 0, fo)
    y *= 0.128 / max(1e-6, np.sqrt(np.mean(y ** 2)) * 4)
    return y


def ducking_gain(vo):
    win = int(0.04 * SR)
    e = np.sqrt(np.convolve(vo ** 2, np.ones(win) / win, mode="same"))
    target = np.where(e > 0.01, 0.55, 1.0).astype(np.float32)
    g = np.empty_like(target)
    a_att, a_rel = np.exp(-1 / (0.06 * SR)), np.exp(-1 / (0.45 * SR))
    cur = 1.0
    for i, v in enumerate(target):  # one-pole attack/release smoother
        a = a_att if v < cur else a_rel
        cur = a * cur + (1 - a) * v
        g[i] = cur
    return g


def write_srt(scenes, path):
    def ts(x):
        h, r = divmod(x, 3600)
        m, s = divmod(r, 60)
        return "%02d:%02d:%06.3f" % (h, m, s)
    items = [(ln["start"], ln["end"], re.sub(r"[{}]", "", ln["sub"])) for s in scenes for ln in s["lines"]]
    rows = []
    for k, (a, b, txt) in enumerate(items):
        end = b + 0.15
        if k + 1 < len(items):  # never overlap the next cue
            end = min(end, items[k + 1][0] - 0.02)
        rows.append(f"{k + 1}\n{ts(a).replace('.', ',')} --> {ts(end).replace('.', ',')}\n{txt}\n")
    open(path, "w", encoding="utf-8").write("\n".join(rows))


if __name__ == "__main__":
    main()
