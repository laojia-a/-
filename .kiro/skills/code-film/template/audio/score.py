# -*- coding: utf-8 -*-
"""渲染配乐：执行 cues.py 里的全部 CUES → build/audio/music.wav + hits.wav"""
import os, time, soundfile as sf
from score_core import *
from cues import CUES
t0 = time.time()
for fn in CUES: fn()
for name, inst in INST.items():
    x, st = inst.render()
    if x is not None: MUS.add(x, st, 1.0, inst.pan); SEND.add(x, st, inst.send, inst.pan)
out = MUS.a + reverb(SEND.a, rt60=2.8, wet=1.0, damp=5500, pre=.025, seed=3) * .55
out *= automation(GLOBAL_AUTO, 0, len(out))[:, None]
out = out / (np.abs(out).max() + 1e-9) * .89
hw = HITS.a + reverb(HSEND.a, rt60=3.0, wet=1.0, damp=6000, pre=.02, seed=5) * .5; hw = hw / (np.abs(hw).max() + 1e-9) * .89
os.makedirs(f"{ROOT}/build/audio", exist_ok=True)
sf.write(f"{ROOT}/build/audio/music.wav", out[: secs(DUR + 1)], SR, subtype="FLOAT")
sf.write(f"{ROOT}/build/audio/hits.wav", hw[: secs(DUR + 1)], SR, subtype="FLOAT")
print(f"music done {time.time()-t0:.1f}s, {len(INST)} instruments")
