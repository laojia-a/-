# -*- coding: utf-8 -*-
"""分析音频：按场景统计响度/峰值，并输出波形+响度曲线图供检查。用法: python analyze.py file.wav out.png"""
import sys as _sys
if hasattr(_sys.stdout, "reconfigure"): _sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import sys, json
import numpy as np, soundfile as sf, pyloudnorm as pyln
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

f, out = sys.argv[1], sys.argv[2]
x, sr = sf.read(f, dtype="float32")
if x.ndim == 1: x = np.stack([x, x], 1)
tl = json.load(open(__import__("os").path.join(__import__("os").path.dirname(__file__), "..", "build", "timeline.json"), encoding="utf-8"))
meter = pyln.Meter(sr)
print(f"integrated LUFS: {meter.integrated_loudness(x):.2f}  peak: {20*np.log10(np.abs(x).max()+1e-9):.2f} dBFS  dur {len(x)/sr:.1f}s")
for s in tl["scenes"]:
    a, b = int(s["start"] * sr), int(s["end"] * sr)
    seg = x[a:b]
    if len(seg) < sr * .5: continue
    try: L = meter.integrated_loudness(seg)
    except Exception: L = float('nan')
    pk = 20 * np.log10(np.abs(seg).max() + 1e-9)
    print(f"  {s['id']:18s} LUFS {L:7.2f}  peak {pk:6.2f}")
# 短时响度曲线
win = int(sr * .4); hop = int(sr * .2)
ts, ls_ = [], []
for i in range(0, len(x) - win, hop):
    seg = x[i:i + win]; r = np.sqrt((seg ** 2).mean() + 1e-12); ts.append(i / sr); ls_.append(20 * np.log10(r))
plt.figure(figsize=(20, 4)); plt.plot(ts, ls_, lw=.6)
for s in tl["scenes"]: plt.axvline(s["start"], color="r", lw=.5); plt.text(s["start"], max(ls_), s["id"][:6], fontsize=6, rotation=90)
plt.ylim(-70, 0); plt.grid(alpha=.3); plt.tight_layout(); plt.savefig(out, dpi=90)
print("plot", out)
