# -*- coding: utf-8 -*-
"""用 ASR（无ITN）回听已生成音频，与 TTS 文本逐字比较，标出可疑句。"""
import re, json, importlib.util, sys
import numpy as np, soundfile as sf, librosa, sherpa_onnx

import os as _os
from pathlib import Path as _P
ROOT = str(_P(__file__).resolve().parents[1])
CACHE = _os.environ.get("JCZ_CACHE", ROOT + "/.cache")
M = CACHE + "/models"
spec = importlib.util.spec_from_file_location("lines", f"{ROOT}/script/lines.py")
L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)
asr = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model=f"{M}/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/model.int8.onnx",
    tokens=f"{M}/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/tokens.txt",
    num_threads=6, use_itn=False, language="auto")
# 同音替换（TTS写法 -> 规范字），比较前还原
HOMO = {"维": "为", "趁": "称", "堪": "看", "扑": "铺"}
SAME = str.maketrans({"他": "她", "察": "查", "它": "她"})

def norm(s):
    s = s.upper()
    for a, b in HOMO.items():
        s = s.replace(a, b)
    s = s.translate(SAME)
    return re.sub(r"[^\u4e00-\u9fffA-Z]", "", s)

def diff(ref, hyp):
    import difflib
    sm = difflib.SequenceMatcher(None, ref, hyp)
    out = []
    for op, a0, a1, b0, b1 in sm.get_opcodes():
        if op != "equal":
            out.append(f"{op}:{ref[a0:a1]}→{hyp[b0:b1]}")
    return out, 1 - sm.ratio()

bad = 0
for sc in L.SCENES:
    for ln in sc["lines"]:
        if L.VOICES[ln["spk"]]["engine"] != "zh":
            continue
        s, sr = sf.read(f"{ROOT}/build/tts/{ln['id']}.wav", dtype="float32")
        a16 = librosa.resample(s, orig_sr=sr, target_sr=16000)
        st = asr.create_stream(); st.accept_waveform(16000, a16); asr.decode_stream(st)
        hyp = norm(re.sub(r"<\|[^|]*\|>", "", st.result.text))
        ref = norm(re.sub(r"\{\{.+?\}\}", "", ln["tts"]))
        d, r = diff(ref, hyp)
        if d:
            bad += 1
            print(f"{ln['id']} ({r:.2f}) {' | '.join(d)}")
print("lines with differences:", bad)
