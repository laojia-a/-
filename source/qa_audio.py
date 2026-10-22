"""QA: re-recognise every narration line from the final VO track and flag pinyin mismatches."""
import json
import numpy as np
import soundfile as sf
from scipy.signal import resample_poly
from voice_eval import make_asr, asr_text
from voice_eval3 import score

tl = json.load(open("/projects/sandbox/work/build/timeline.json"))
vo, sr = sf.read("/projects/sandbox/work/build/vo.wav", dtype="float32")
asr = make_asr()
T = N = 0
for s in tl["scenes"]:
    for ln in s["lines"]:
        a, b = int((ln["start"] - 0.05) * sr), int((ln["end"] + 0.05) * sr)
        x = resample_poly(vo[a:b], 1, 3).astype(np.float32)  # 48k -> 16k
        hyp = asr_text(asr, x, 16000)
        tone, base, n = score(ln["say"], hyp)
        T += tone
        N += n
        flag = "  <--" if tone >= 2 or base >= 1 else ""
        print(f"[{tone}/{base}] {ln['say']}  =>  {hyp}{flag}")
print(f"overall tone-aware syllable error rate: {T / N:.3f}")
