# -*- coding: utf-8 -*-
"""无配音时的时长估算：按目标语速（音节/秒）和句内停顿，估算每句旁白时长，写 build/<EP>/tts/meta.json。
接上真实配音（ElevenLabs 或 Google TTS）后，用真实时长覆盖 meta.json，重建时间轴即可；
画面、配乐、音效都从时间轴取时间，会自动重新对齐。
用法: python tts/estimate.py EP01 [--rate=4.4]"""
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
EP = ARGS[0] if ARGS else "EP01"
RATE = 4.4   # 《监查者》实测约 4.5 字/秒
for a in sys.argv[1:]:
    if a.startswith("--rate="):
        RATE = float(a.split("=", 1)[1])

spec = importlib.util.spec_from_file_location("lines", ROOT / "episodes" / EP / "lines.py")
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)

# 句内停顿（秒）；句末标点不计，句后停顿由 lines.py 的 post 决定
PAUSE = {"，": .22, ",": .22, "、": .15, "：": .30, ":": .30, "；": .30, ";": .30,
         "。": .42, "？": .42, "?": .42, "！": .42, "!": .42, "…": .30}


def syllables(s):
    n = len(re.findall(r"[\u4e00-\u9fff]", s))
    for w in re.findall(r"[A-Za-z]+", s):
        if w.isupper() and len(w) <= 5:
            n += len(w)                                   # 缩写逐字母读
        else:
            n += max(1, len(re.findall(r"[aeiouy]+", w.lower())))
    n += len(re.findall(r"\d", s))                        # 残留阿拉伯数字，粗算
    return n


def pauses(s):
    body = s.rstrip("。？！!?…—，, ")
    tot = body.count("——") * .30
    for ch in body.replace("——", ""):
        tot += PAUSE.get(ch, 0.0)
    return tot


def main():
    out = ROOT / "build" / EP / "tts"
    out.mkdir(parents=True, exist_ok=True)
    meta, total = {}, 0.0
    for sc in L.SCENES:
        for ln in sc["lines"]:
            d = round(syllables(ln["tts"]) / RATE + pauses(ln["tts"]) + 0.15, 3)
            meta[ln["id"]] = dict(scene=sc["id"], spk=ln["spk"], dur=d, engine="estimate", rate=RATE, timings=[])
            total += d
    json.dump(meta, open(out / "meta.json", "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print(f"{EP}: {len(meta)} 句，估算旁白共 {total:.1f} 秒（{RATE} 音节/秒）")


if __name__ == "__main__":
    main()
