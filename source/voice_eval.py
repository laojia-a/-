"""Objectively score every Chinese Kokoro voice: ASR CER, DNSMOS, pitch, rate.

I cannot listen to audio, so I use proxies:
  - CER from a strong ASR model (intelligibility / pronunciation errors)
  - DNSMOS SIG/OVRL (artifact / quality proxy)
  - F0 mean (voice register) and F0 std in semitones (intonation liveliness)
"""
import json, re, sys, time
import numpy as np
import onnxruntime as ort
import sherpa_onnx

M = "/projects/sandbox/work/models/kokoro-multi-lang-v1_1/"
SV = "/projects/sandbox/work/models/sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2025-09-09/"


def make_tts():
    cfg = sherpa_onnx.OfflineTtsConfig(
        model=sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=M + "model.onnx", voices=M + "voices.bin", tokens=M + "tokens.txt",
                data_dir=M + "espeak-ng-data", dict_dir=M + "dict",
                lexicon=M + "lexicon-us-en.txt," + M + "lexicon-zh.txt"),
            provider="cpu", num_threads=8, debug=False),
        rule_fsts=M + "date-zh.fst," + M + "phone-zh.fst," + M + "number-zh.fst",
        max_num_sentences=1)
    return sherpa_onnx.OfflineTts(cfg)


def make_asr():
    return sherpa_onnx.OfflineRecognizer.from_sense_voice(
        model=SV + "model.int8.onnx", tokens=SV + "tokens.txt",
        num_threads=8, use_itn=True, language="zh")


def resample(x, sr_in, sr_out):
    if sr_in == sr_out:
        return x
    n = int(round(len(x) * sr_out / sr_in))
    t = np.linspace(0, len(x) - 1, n)
    return np.interp(t, np.arange(len(x)), x).astype(np.float32)


def asr_text(asr, x, sr):
    s = asr.create_stream()
    s.accept_waveform(sr, x)
    asr.decode_stream(s)
    return s.result.text


PUNCT = re.compile(r"[\s，。！？、；：,.!?;:“”\"'（）()《》<>…—\-]")


HOMO = str.maketrans({"察": "查"})  # 监查/监察 are homophones; not a TTS error


def cer(ref, hyp):
    r = PUNCT.sub("", ref).upper().translate(HOMO)
    h = PUNCT.sub("", hyp).upper().translate(HOMO)
    d = np.arange(len(h) + 1)
    for i in range(1, len(r) + 1):
        prev = d.copy()
        d[0] = i
        for j in range(1, len(h) + 1):
            d[j] = min(prev[j] + 1, d[j - 1] + 1, prev[j - 1] + (r[i - 1] != h[j - 1]))
    return d[len(h)] / max(1, len(r))


def f0_track(x, sr):
    x16 = resample(x, sr, 16000)
    fr, hop = 640, 160
    f0s = []
    lo, hi = int(16000 / 450), int(16000 / 70)
    for i in range(0, len(x16) - fr, hop):
        f = x16[i:i + fr]
        if np.sqrt(np.mean(f ** 2)) < 0.02:
            continue
        f = f - f.mean()
        ac = np.correlate(f, f, "full")[fr - 1:]
        if ac[0] <= 0:
            continue
        ac = ac / ac[0]
        lag = lo + np.argmax(ac[lo:hi])
        if ac[lag] > 0.6:
            f0s.append(16000 / lag)
    f0s = np.array(f0s)
    if len(f0s) < 10:
        return 0, 0
    st = 12 * np.log2(f0s / np.median(f0s))
    st = st[np.abs(st) < 12]  # drop octave errors
    return float(np.median(f0s)), float(np.std(st))


class DNSMOS:
    def __init__(self, path):
        self.s = ort.InferenceSession(path, providers=["CPUExecutionProvider"])
        self.p_ovr = np.poly1d([-0.06766283, 1.11546468, 0.04602535])
        self.p_sig = np.poly1d([-0.08397278, 1.22083953, 0.0052439])
        self.p_bak = np.poly1d([-0.13166888, 1.60915514, -0.39604546])

    def __call__(self, x, sr):
        a = resample(x, sr, 16000)
        L = int(9.01 * 16000)
        while len(a) < L:
            a = np.concatenate([a, a])
        hops = int(np.floor(len(a) / 16000) - 9.01) + 1
        res = []
        for k in range(max(1, hops)):
            seg = a[k * 16000:k * 16000 + L]
            if len(seg) < L:
                break
            o = self.s.run(None, {"input_1": seg[None, :].astype(np.float32)})[0][0]
            res.append((self.p_sig(o[0]), self.p_bak(o[1]), self.p_ovr(o[2])))
        return np.mean(np.array(res), axis=0)


if __name__ == "__main__":
    ref = ("做生物等效性试验的临床监查员，到底每天在忙什么？"
           "知情同意必须先签字、后筛选，每一个采血点的实际时间，都要如实记录。")
    sids = range(int(sys.argv[1]), int(sys.argv[2])) if len(sys.argv) > 2 else range(3, 103)
    tts, asr = make_tts(), make_asr()
    dn = DNSMOS("/projects/sandbox/work/models/dnsmos_sig_bak_ovr.onnx")
    out = []
    for sid in sids:
        t0 = time.time()
        a = tts.generate(ref, sid=sid, speed=1.0)
        x = np.array(a.samples, dtype=np.float32)
        sr = a.sample_rate
        x16 = resample(x, sr, 16000)
        hyp = asr_text(asr, x16, 16000)
        c = cer(ref, hyp)
        f0, f0sd = f0_track(x, sr)
        sig, bak, ovr = dn(x, sr)
        dur = len(x) / sr
        nchar = len(PUNCT.sub("", ref))
        row = dict(sid=sid, cer=round(c, 3), f0=round(f0), f0sd=round(f0sd, 2),
                   sig=round(float(sig), 2), bak=round(float(bak), 2), ovr=round(float(ovr), 2),
                   rate=round(nchar / dur, 2), peak=round(float(np.abs(x).max()), 2), hyp=hyp)
        out.append(row)
        print(json.dumps(row, ensure_ascii=False), f"{time.time()-t0:.1f}s", flush=True)
    with open(f"/projects/sandbox/work/voice_eval_{sids.start}_{sids.stop}.json", "w") as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
