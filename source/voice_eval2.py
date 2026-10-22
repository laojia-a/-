"""Second-round voice selection on real script lines (Chinese-char CER + DNSMOS + pitch)."""
import json, re, sys
import numpy as np
from voice_eval import make_tts, make_asr, resample, asr_text, cer, f0_track, DNSMOS

LINES = [
    "先说B E，生物等效性试验。",
    "要证明仿制药和参比制剂，在人体内吸收的速度和程度等效。",
    "通常是健康受试者，交叉给药、密集采血，",
    "看C max和A U C的百分之九十置信区间，是否落在百分之八十到百分之一百二十五之间。",
    "评估一期病房的资质、抢救条件和关键设备；",
    "核对两种制剂的来源、检验报告和运输温度；",
    "知情同意，先签署、后筛选；联网筛查，挡住职业受试者；",
    "采血记录实际时间，超窗如实记录，绝不能改时间；",
    "严重不良事件，研究者获知后，要立即书面报告申办者和伦理审查委员会。",
    "二，给药、采血、离心的时间链，是否自洽；",
    "四，稽查轨迹和手动积分，是否有依据；",
    "新版把受试者改称试验参与者，强调质量源于设计、基于风险，还新增了数据治理专章。",
    "B E留样由研究者随机抽取，至少保存至上市后两年，不得返还申办者。",
    "C R A不是跑腿的，是试验质量的守门人。",
]
ZH = re.compile(r"[^\u4e00-\u9fff]")
# ASR homophone noise that is not a TTS error
NORM = str.maketrans({"察": "查", "又": "有", "二": "二"})


def zh_only(s):
    return ZH.sub("", s).translate(NORM)


if __name__ == "__main__":
    sids = [int(s) for s in sys.argv[1].split(",")]
    speed = float(sys.argv[2]) if len(sys.argv) > 2 else 1.15
    tts, asr = make_tts(), make_asr()
    dn = DNSMOS("/projects/sandbox/work/models/dnsmos_sig_bak_ovr.onnx")
    rows = []
    for sid in sids:
        errs, tot, audio, bad = 0.0, 0, [], []
        for t in LINES:
            a = tts.generate(t, sid=sid, speed=speed)
            x = np.array(a.samples, dtype=np.float32)
            sr = a.sample_rate
            hyp = asr_text(asr, resample(x, sr, 16000), 16000)
            r, h = zh_only(t), zh_only(hyp)
            c = cer(r, h)
            errs += c * len(r)
            tot += len(r)
            if c > 0.08:
                bad.append(hyp)
            audio.append(x)
            audio.append(np.zeros(int(0.15 * sr), np.float32))
        x = np.concatenate(audio)
        f0, f0sd = f0_track(x, sr)
        sig, bak, ovr = dn(x, sr)
        row = dict(sid=sid, cer=round(errs / tot, 3), f0=round(f0), f0sd=round(f0sd, 2),
                   sig=round(float(sig), 2), ovr=round(float(ovr), 2),
                   dur=round(len(x) / sr, 1), bad=bad)
        rows.append(row)
        print(json.dumps(row, ensure_ascii=False), flush=True)
    json.dump(rows, open("/projects/sandbox/work/voice_eval2.json", "w"), ensure_ascii=False, indent=1)
