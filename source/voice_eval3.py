"""Third-round: tone-aware pinyin syllable error rate (homophones no longer count)."""
import json, re, sys
import numpy as np
from pypinyin import lazy_pinyin, Style
from voice_eval import make_tts, make_asr, resample, asr_text, f0_track, DNSMOS
from voice_eval2 import LINES

ZH = re.compile(r"[^\u4e00-\u9fff]")


def py(s):
    return lazy_pinyin(ZH.sub("", s), style=Style.TONE3, neutral_tone_with_five=True)


def ed(a, b):
    d = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev = d[:]
        d[0] = i
        for j in range(1, len(b) + 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (a[i - 1] != b[j - 1]))
    return d[len(b)]


def score(ref, hyp):
    r, h = py(ref), py(hyp)
    tone = ed(r, h)
    base = ed([x.rstrip("12345") for x in r], [x.rstrip("12345") for x in h])
    return tone, base, len(r)


if __name__ == "__main__":
    sids = [int(s) for s in sys.argv[1].split(",")]
    speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
    tts, asr = make_tts(), make_asr()
    dn = DNSMOS("/projects/sandbox/work/models/dnsmos_sig_bak_ovr.onnx")
    rows = []
    for sid in sids:
        T = B = N = 0
        audio, bad = [], []
        for t in LINES:
            a = tts.generate(t, sid=sid, speed=speed)
            x = np.array(a.samples, dtype=np.float32)
            sr = a.sample_rate
            hyp = asr_text(asr, resample(x, sr, 16000), 16000)
            tone, base, n = score(t, hyp)
            T += tone; B += base; N += n
            if tone:
                bad.append(f"{tone}:{hyp}")
            audio += [x, np.zeros(int(0.15 * sr), np.float32)]
        x = np.concatenate(audio)
        f0, f0sd = f0_track(x, sr)
        sig, bak, ovr = dn(x, sr)
        row = dict(sid=sid, tone_ser=round(T / N, 3), syl_ser=round(B / N, 3), f0=round(f0),
                   f0sd=round(f0sd, 2), sig=round(float(sig), 2), ovr=round(float(ovr), 2),
                   dur=round(len(x) / sr, 1), bad=bad)
        rows.append(row)
        print(json.dumps({k: v for k, v in row.items() if k != "bad"}, ensure_ascii=False), flush=True)
    json.dump(rows, open("/projects/sandbox/work/voice_eval3.json", "w"), ensure_ascii=False, indent=1)
