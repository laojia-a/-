# -*- coding: utf-8 -*-
"""生成全部旁白：Kokoro v1.1-zh（中文）+ Kokoro v1.0（英文引文），并用 SenseVoice 做 ASR 回听校验。
用法: python gen_tts.py [line_id ...]
输出: build/tts/<id>.wav (24kHz float) + build/tts/meta.json + build/tts/report.txt
"""
import sys as _sys
if hasattr(_sys.stdout, "reconfigure"): _sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import os, sys, json, re, time, importlib.util
import numpy as np
import soundfile as sf
import librosa

import os as _os
from pathlib import Path as _P
ROOT = str(_P(__file__).resolve().parents[1])
CACHE = _os.environ.get("CODEFILM_CACHE") or str(_P.home() / ".cache" / "codefilm")

M = f"{CACHE}/models"
OUT = f"{ROOT}/build/tts"
os.makedirs(OUT, exist_ok=True)

spec = importlib.util.spec_from_file_location("lines", f"{ROOT}/script/lines.py")
L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)

from kokoro_onnx import Kokoro
from misaki import zh, en as misaki_en, espeak as mesp
import sherpa_onnx
from pypinyin import lazy_pinyin, Style

vocab = json.load(open(f"{M}/config-v1.1-zh.json", encoding="utf-8"))
K_ZH = Kokoro(f"{M}/kokoro-v1.1-zh.onnx", f"{M}/voices-v1.1-zh.bin", vocab_config=vocab)
K_EN = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")

EN_US = misaki_en.G2P(trf=False, british=False, fallback=mesp.EspeakFallback(british=False))
EN_GB = misaki_en.G2P(trf=False, british=True, fallback=mesp.EspeakFallback(british=True))
G2P_ZH = zh.ZHG2P(version="1.1", en_callable=lambda t: EN_US(t)[0])
# 本片无儿化词：关闭儿化合并（避免“胎儿”被读成儿化音）
G2P_ZH.frontend._merge_erhua = lambda ini, fin, w, p: (ini, fin)

ASR = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model=f"{M}/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/model.int8.onnx",
    tokens=f"{M}/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/tokens.txt",
    num_threads=4, use_itn=True, language="auto")


def review_pinyin(text):
    """逐词显示 misaki 前端实际使用的拼音（含变调），便于人工检查多音字。"""
    fe = G2P_ZH.frontend
    import jieba.posseg as psg
    out = []
    for seg in re.findall(r"[\u4e00-\u9fff]+", text):
        cut = fe.tone_modifier.pre_merge_for_modify(psg.lcut(seg))
        for w, pos in cut:
            ini, fin = fe._get_initials_finals(w)
            fin = fe.tone_modifier.modified_tone(w, pos, fin)
            out.append(w + "(" + " ".join(i + f for i, f in zip(ini, fin)) + ")")
    return " ".join(out)


def norm(s):
    s = s.lower()
    return re.sub(r"[^\u4e00-\u9fff0-9a-z]", "", s)


def cer(ref, hyp):
    r, h = norm(ref), norm(hyp)
    if not r:
        return 0.0
    d = list(range(len(h) + 1))
    for i in range(1, len(r) + 1):
        prev, d[0] = d[0], i
        for j in range(1, len(h) + 1):
            cur = min(d[j] + 1, d[j - 1] + 1, prev + (r[i - 1] != h[j - 1]))
            prev, d[j] = d[j], cur
    return d[len(h)] / len(r)


def synth(line):
    vc = dict(L.VOICES[line["spk"]])
    speed = line.get("speed", vc.get("speed", 1.0))
    if vc["engine"] == "zh":
        # 支持 {{原始音素}} 注入（用于外文专有名词）
        parts = re.split(r"\{\{(.+?)\}\}", line["tts"])
        ph = " ".join(p if i % 2 else G2P_ZH(p)[0] for i, p in enumerate(parts) if p.strip())
        samples, sr, timings = K_ZH.create_timed(ph, voice=vc["voice"], speed=speed, is_phonemes=True)
    else:
        g = EN_GB if vc.get("lang") == "en-gb" else EN_US
        ph, _ = g(line["tts"])
        samples, sr, timings = K_EN.create_timed(ph, voice=vc["voice"], speed=speed, is_phonemes=True)
    samples = samples.astype(np.float32)
    # 裁掉首尾静音（保留 60ms / 110ms），时间戳同步平移
    env = np.convolve(np.abs(samples), np.ones(240) / 240, mode="same")
    thr = max(1e-4, env.max() * 0.012)
    idx = np.where(env > thr)[0]
    a = max(0, idx[0] - int(0.06 * sr)) if len(idx) else 0
    b = min(len(samples), idx[-1] + int(0.11 * sr)) if len(idx) else len(samples)
    samples = samples[a:b].copy()
    fl = int(0.008 * sr); samples[:fl] *= np.linspace(0, 1, fl); samples[-fl:] *= np.linspace(1, 0, fl)
    off = a / sr
    tm = [dict(p=t.phoneme, s=round(max(0.0, float(t.start) - off), 3), e=round(max(0.0, float(t.end) - off), 3)) for t in timings]
    return ph, samples, sr, tm


def main(only):
    meta_path = f"{OUT}/meta.json"
    meta = json.load(open(meta_path, encoding="utf-8")) if os.path.exists(meta_path) else {}
    report = []
    for sc in L.SCENES:
        for line in sc["lines"]:
            if only and line["id"] not in only:
                continue
            t0 = time.time()
            ph, samples, sr, tm = synth(line)
            sf.write(f"{OUT}/{line['id']}.wav", samples, sr, subtype="FLOAT")
            a16 = librosa.resample(samples, orig_sr=sr, target_sr=16000)
            st = ASR.create_stream(); st.accept_waveform(16000, a16); ASR.decode_stream(st)
            hyp = re.sub(r"<\|[^|]*\|>", "", st.result.text)
            ref = line.get("sub_en") or line["sub"]
            c = cer(ref, hyp)
            dur = len(samples) / sr
            meta[line["id"]] = dict(scene=sc["id"], spk=line["spk"], dur=round(dur, 3), sr=sr, phonemes=ph, timings=tm,
                                    asr=hyp, cer=round(c, 3))
            flag = "  <<<<< CHECK" if c > 0.12 else ""
            rv = review_pinyin(re.sub(r"\{\{.+?\}\}", "", line["tts"])) if L.VOICES[line["spk"]]["engine"] == "zh" else ""
            report.append(f"[{line['id']}] {dur:5.2f}s CER={c:.2f}{flag}\n  SUB: {ref}\n  ASR: {hyp}\n  PY : {rv}\n")
            print(f"{line['id']} {dur:5.2f}s cer={c:.2f} ({time.time()-t0:.1f}s){flag}", flush=True)
    json.dump(meta, open(meta_path, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    with open(f"{OUT}/report.txt", "w" if not only else "a", encoding="utf-8") as f:
        f.write("\n".join(report))
    total = sum(v["dur"] for v in meta.values())
    print(f"total speech: {total:.1f}s over {len(meta)} lines")


if __name__ == "__main__":
    main(set(sys.argv[1:]))
