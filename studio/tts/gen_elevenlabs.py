# -*- coding: utf-8 -*-
"""《剂量》旁白：ElevenLabs 逐句合成（源自《监查者》tts/gen_elevenlabs.py）。
写 build/<EP>/tts/<句号>.wav 和 meta.json（真实时长 + 逐字时间戳），之后重建时间轴，画面、配乐、音效自动对齐。
用法（在 studio/ 下）：
  export ELEVENLABS_API_KEY=你的key
  python tts/gen_elevenlabs.py EP01              # 全部
  python tts/gen_elevenlabs.py EP01 D030 D064    # 只重做某几句
  python tts/gen_elevenlabs.py EP01 --dry        # 不联网：只列出送去合成的文本，检查读音
环境变量：EL_VOICE_NAR 旁白音色（默认 fYmV8EanqZP9BI4WvpB7，系列既定音色）；EL_MODEL（默认 eleven_v4）；
          EL_SPEED 语速 0.7–1.2（可选，只在支持 speed 的模型上生效；目标约 4.4 音节/秒，脚本会打印实测值）
依赖：pip install requests soundfile numpy（soundfile 需 libsndfile ≥ 1.1 才能解 MP3，否则要有 ffmpeg）
"""
import base64, importlib.util, io, json, os, re, subprocess, sys, time
from pathlib import Path
import numpy as np, soundfile as sf

ROOT = Path(__file__).resolve().parents[1]
ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
EP = ARGS[0] if ARGS else "EP01"
ONLY = set(ARGS[1:])
DRY = "--dry" in sys.argv
OUT = ROOT / "build" / EP / "tts"
VOICE = os.environ.get("EL_VOICE_NAR", "fYmV8EanqZP9BI4WvpB7")
MODEL = os.environ.get("EL_MODEL", "eleven_v4")
SETTINGS = dict(stability=.6, similarity_boost=.8)          # 与仓库根目录 gen_tts.py 一致
if os.environ.get("EL_SPEED"): SETTINGS["speed"] = float(os.environ["EL_SPEED"])
PUNCT = {"，": ",", "。": ".", "：": ":", "；": ";", "？": "?", "！": "!", "、": ",", "…": "…", "—": "—"}

spec = importlib.util.spec_from_file_location("lines", ROOT / "episodes" / EP / "lines.py")
L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)


def syllables(s):
    return len(re.findall(r"[\u4e00-\u9fff]", s)) + sum(max(1, len(re.findall(r"[aeiouy]+", w.lower()))) for w in re.findall(r"[A-Za-z]+", s))


def decode(raw):
    """MP3（或 PCM16）字节 → float32 单声道、采样率"""
    if raw[:3] == b"ID3" or (len(raw) > 1 and raw[0] == 0xFF and raw[1] & 0xE0 == 0xE0):   # MP3：ID3 头或帧同步字
        try:
            x, sr = sf.read(io.BytesIO(raw), dtype="float32")
        except Exception:   # 旧版 libsndfile 不认 MP3：交给 ffmpeg
            p = subprocess.run(["ffmpeg", "-v", "error", "-i", "pipe:0", "-f", "f32le", "-ac", "1", "-ar", "44100", "pipe:1"], input=raw, capture_output=True, check=True)
            x, sr = np.frombuffer(p.stdout, dtype=np.float32).copy(), 44100
        return (x.mean(1) if x.ndim == 2 else x).astype(np.float32), sr
    return np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768, 44100


def process(d):
    """接口返回的 JSON → (音频, 采样率, 逐字时间戳)；裁掉首尾静音并同步平移时间戳"""
    x, sr = decode(base64.b64decode(d["audio_base64"]))
    al = d.get("alignment") or {}
    tm = [dict(p=PUNCT.get(ch, ch), s=round(s, 3), e=round(e, 3)) for ch, s, e in
          zip(al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", []))]
    env = np.convolve(np.abs(x), np.ones(220) / 220, mode="same"); idx = np.where(env > env.max() * .012)[0]
    a = max(0, idx[0] - int(.06 * sr)) if len(idx) else 0
    b = min(len(x), idx[-1] + int(.12 * sr)) if len(idx) else len(x)
    off = a / sr
    for q in tm: q["s"] = max(0.0, round(q["s"] - off, 3)); q["e"] = max(0.0, round(q["e"] - off, 3))
    return x[a:b], sr, tm


def synth(text, prev_text, next_text, key):
    import requests
    body = dict(text=text, model_id=MODEL, voice_settings=SETTINGS)
    if MODEL != "eleven_multilingual_v2": body["language_code"] = "zh"
    if prev_text: body["previous_text"] = prev_text      # 前后句上下文：句与句之间语调更连贯
    if next_text: body["next_text"] = next_text
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format=mp3_44100_128"
    for attempt in range(4):
        r = requests.post(url, headers={"xi-api-key": key, "Content-Type": "application/json"}, json=body, timeout=120)
        if r.status_code == 200: return r.json()
        print("  重试", r.status_code, r.text[:200]); time.sleep(3 * (attempt + 1))
    raise RuntimeError(r.text)


def main():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not DRY and not key: sys.exit("请先设置 ELEVENLABS_API_KEY（或加 --dry 只检查文本）")
    OUT.mkdir(parents=True, exist_ok=True)
    mp = OUT / "meta.json"
    meta = json.load(open(mp, encoding="utf-8")) if mp.exists() else {}
    flat = [(sc["id"], ln) for sc in L.SCENES for ln in sc["lines"]]
    tot_d = tot_s = 0.0
    for i, (sid, ln) in enumerate(flat):
        if ONLY and ln["id"] not in ONLY: continue
        prev_t = flat[i - 1][1]["tts"] if i > 0 else None
        next_t = flat[i + 1][1]["tts"] if i + 1 < len(flat) else None
        if DRY:
            print(f"{ln['id']}  {ln['tts']}"); continue
        x, sr, tm = process(synth(ln["tts"], prev_t, next_t, key))
        sf.write(OUT / f"{ln['id']}.wav", x, sr, subtype="FLOAT")
        d = round(len(x) / sr, 3); n = syllables(ln["tts"]); tot_d += d; tot_s += n
        meta[ln["id"]] = dict(scene=sid, spk=ln["spk"], dur=d, sr=sr, timings=tm, engine="elevenlabs", model=MODEL, voice=VOICE)
        print(f"{ln['id']} {d:5.2f}s  {n / max(d, .1):4.2f} 音节/秒  {ln['tts'][:28]}")
        json.dump(meta, open(mp, "w", encoding="utf-8"), ensure_ascii=False, indent=0)   # 每句落盘，中断后可续
    if DRY: return
    if tot_d: print(f"本次 {tot_s / tot_d:.2f} 音节/秒（目标约 4.4；偏慢可设 EL_SPEED 或换音色）")
    print("完成。接着：python tts/build_timeline.py %s && python audio/score.py %s && python audio/sfx.py %s && python audio/mix.py %s，再渲染画面。" % ((EP,) * 4))


if __name__ == "__main__":
    main()
