# -*- coding: utf-8 -*-
"""临时配音：Kokoro v1.1-zh（与《监查者》旁白同一音色 zm_089），只用于对时和样片。
正式成片用 gen_elevenlabs.py（需要 ELEVENLABS_API_KEY）。
用法: python tts/gen_kokoro.py EP01 [line_id ...]
输出: build/<EP>/tts/<id>.wav + meta.json（dur、音素时间戳）
模型目录: 环境变量 DOSE_MODELS，默认 studio/.cache/models（kokoro-v1.1-zh.onnx、voices-v1.1-zh.bin、config-v1.1-zh.json）
"""
import importlib.util
import json
import os
import re
import sys
from pathlib import Path

import numpy as np
import soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
EP = sys.argv[1] if len(sys.argv) > 1 else "EP01"
ONLY = set(sys.argv[2:])
M = Path(os.environ.get("DOSE_MODELS", ROOT / ".cache" / "models"))
OUT = ROOT / "build" / EP / "tts"
OUT.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location("lines", ROOT / "episodes" / EP / "lines.py")
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

from kokoro_onnx import Kokoro  # noqa: E402
from misaki import zh  # noqa: E402

K = Kokoro(str(M / "kokoro-v1.1-zh.onnx"), str(M / "voices-v1.1-zh.bin"),
           vocab_config=json.load(open(M / "config-v1.1-zh.json", encoding="utf-8")))
G2P = zh.ZHG2P(version="1.1")
G2P.frontend._merge_erhua = lambda ini, fin, w, p: (ini, fin)


def synth(line):
    vc = dict(L.VOICES[line["spk"]])
    speed = line.get("speed", vc.get("speed", 1.0))
    parts = re.split(r"\{\{(.+?)\}\}", line["tts"])
    ph = " ".join(p if i % 2 else G2P(p)[0] for i, p in enumerate(parts) if p.strip())
    samples, sr, timings = K.create_timed(ph, voice=vc["voice"], speed=speed, is_phonemes=True)
    samples = samples.astype(np.float32)
    env = np.convolve(np.abs(samples), np.ones(240) / 240, mode="same")
    thr = max(1e-4, env.max() * 0.012)
    idx = np.where(env > thr)[0]
    a = max(0, idx[0] - int(0.05 * sr)) if len(idx) else 0
    b = min(len(samples), idx[-1] + int(0.12 * sr)) if len(idx) else len(samples)
    samples = samples[a:b].copy()
    fl = int(0.008 * sr)
    samples[:fl] *= np.linspace(0, 1, fl)
    samples[-fl:] *= np.linspace(1, 0, fl)
    off = a / sr
    tm = [dict(p=t.phoneme, s=round(max(0.0, float(t.start) - off), 3), e=round(max(0.0, float(t.end) - off), 3))
          for t in timings]
    return ph, samples, sr, tm


def main():
    mp = OUT / "meta.json"
    meta = json.load(open(mp, encoding="utf-8")) if mp.exists() else {}
    for sc in L.SCENES:
        for line in sc["lines"]:
            if ONLY and line["id"] not in ONLY:
                continue
            ph, s, sr, tm = synth(line)
            sf.write(OUT / f"{line['id']}.wav", s, sr, subtype="FLOAT")
            meta[line["id"]] = dict(scene=sc["id"], spk=line["spk"], dur=round(len(s) / sr, 3), sr=sr,
                                    engine="kokoro-zm_089", phonemes=ph, timings=tm)
            print(f"{line['id']} {len(s) / sr:5.2f}s  {line['sub'][:30]}", flush=True)
    json.dump(meta, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"total speech {sum(v['dur'] for v in meta.values()):.1f}s, {len(meta)} lines")


if __name__ == "__main__":
    main()
