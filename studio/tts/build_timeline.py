# -*- coding: utf-8 -*-
"""按配音实际时长生成全片时间轴 build/<EP>/timeline.json（画面、配乐、音效、字幕共用）。
用法: python tts/build_timeline.py EP01"""
import importlib.util
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EP = sys.argv[1] if len(sys.argv) > 1 else "EP01"
spec = importlib.util.spec_from_file_location("lines", ROOT / "episodes" / EP / "lines.py")
L = importlib.util.module_from_spec(spec)
spec.loader.exec_module(L)
BUILD = ROOT / "build" / EP
meta = json.load(open(BUILD / "tts" / "meta.json", encoding="utf-8"))

FPS = 30
PUNCT = r"[\s，。、：；！？“”‘’（）()…—\-,.!?:;《》·]"
t = 0.0
scenes, lines = [], []
for sc in L.SCENES:
    s0 = t
    cur = s0 + sc.get("lead", 0.0)
    sl = []
    for ln in sc["lines"]:
        cur += ln.get("pre", 0.0)
        d = meta[ln["id"]]["dur"]
        item = dict(id=ln["id"], scene=sc["id"], spk=ln["spk"], start=round(cur, 3), end=round(cur + d, 3),
                    sub=ln["sub"], sub_en=ln.get("sub_en"))
        # 含换行的长句：按行拆成先后出现的字幕段，切点吸附到停顿处
        parts = ln["sub"].split("\n")
        if len(parts) > 1 and not ln.get("sub_en"):
            n = [len(re.sub(PUNCT, "", x)) for x in parts]
            pauses = [(x["s"] + x["e"]) / 2 for x in meta[ln["id"]].get("timings", []) if x["p"] in ",.;:!?…—"]
            cuts, acc = [], 0
            for k in range(len(parts) - 1):
                acc += n[k]
                tgt = d * acc / sum(n)
                if pauses:
                    best = min(pauses, key=lambda x: abs(x - tgt))
                    if abs(best - tgt) < 1.6:
                        tgt = best
                cuts.append(tgt)
            bounds = [0.0] + cuts + [d]
            item["segs"] = [dict(text=parts[k], start=round(cur + bounds[k], 3), end=round(cur + bounds[k + 1], 3))
                            for k in range(len(parts))]
        lines.append(item)
        sl.append(item)
        cur += d + ln.get("post", 0.0)
    end = max(cur + sc.get("tail", 0.0), s0 + sc.get("min_dur", 0.0))
    end = round(round(end * FPS) / FPS, 4)
    scenes.append(dict(id=sc["id"], start=round(s0, 4), end=end, dur=round(end - s0, 4),
                       chapter=sc.get("chapter"), lines=[x["id"] for x in sl]))
    t = end

tl = dict(ep=EP, fps=FPS, width=1920, height=1080, duration=round(t, 4), frames=int(round(t * FPS)),
          scenes=scenes, lines=lines)
json.dump(tl, open(BUILD / "timeline.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for s in scenes:
    print(f"{s['id']:18s} {s['start']:7.2f} → {s['end']:7.2f}  ({s['dur']:5.2f}s)")
print(f"TOTAL {t:.2f}s = {int(t // 60)}:{t % 60:05.2f}, frames={tl['frames']}")
