# -*- coding: utf-8 -*-
"""用 ElevenLabs 重新生成全部 74 句旁白，替换 build/tts/L*.wav 并更新 meta.json。
用法：
  export ELEVENLABS_API_KEY=你的key
  python tts/gen_elevenlabs.py                 # 全部
  python tts/gen_elevenlabs.py L030 L074       # 只重做某几句
可选环境变量：
  EL_VOICE_ARGUS / EL_VOICE_LIN / EL_VOICE_EN   各角色 voice_id（在 ElevenLabs Voice Library 里复制）
  EL_MODEL   默认 eleven_multilingual_v2（也可用 eleven_v3）
依赖：pip install requests soundfile numpy
"""
import os, sys, json, base64, io, re, time, importlib.util
import requests, numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = f"{ROOT}/build/tts"; os.makedirs(OUT, exist_ok=True)
KEY = os.environ.get("ELEVENLABS_API_KEY") or sys.exit("请先设置 ELEVENLABS_API_KEY")
MODEL = os.environ.get("EL_MODEL", "eleven_multilingual_v2")
# 默认是 ElevenLabs 内置的多语种音色，可换成你喜欢的中文音色
VOICES = {
    "argus": os.environ.get("EL_VOICE_ARGUS", "pNInz6obpgDQGcFmaJgB"),   # Adam
    "lin": os.environ.get("EL_VOICE_LIN", "21m00Tcm4TlvDq8ikWAM"),       # Rachel
    "lin2": os.environ.get("EL_VOICE_LIN", "21m00Tcm4TlvDq8ikWAM"),
    "lind": os.environ.get("EL_VOICE_EN", "JBFqnCBsd6RMkjVDRZzb"),       # George
    "nuremberg": os.environ.get("EL_VOICE_EN", "JBFqnCBsd6RMkjVDRZzb"),
}
SETTINGS = {  # stability 越低越有表现力
    "argus": dict(stability=.55, similarity_boost=.8, style=.15, use_speaker_boost=True),
    "lin": dict(stability=.45, similarity_boost=.8, style=.3, use_speaker_boost=True),
    "lin2": dict(stability=.45, similarity_boost=.8, style=.3, use_speaker_boost=True),
    "lind": dict(stability=.5, similarity_boost=.8, style=.2, use_speaker_boost=True),
    "nuremberg": dict(stability=.5, similarity_boost=.8, style=.2, use_speaker_boost=True),
}

spec = importlib.util.spec_from_file_location("lines", f"{ROOT}/script/lines.py")
L = importlib.util.module_from_spec(spec); spec.loader.exec_module(L)

def clean(line):
    """ElevenLabs 直接读规范中文即可，不需要 Kokoro 那些同音字/拆字母的处理"""
    if line.get("sub_en"): return line["sub_en"]
    t = line["sub"].replace("\n", "")
    t = re.sub(r"[（(]([A-Za-z]+)[）)]", "", t)          # 去掉“美国药监局（FDA）”里的括注，避免重复念
    t = t.strip("（）()")
    return t

def synth(line, prev_text=None, next_text=None):
    vid = VOICES[line["spk"]]
    body = dict(text=clean(line), model_id=MODEL, voice_settings=SETTINGS[line["spk"]], output_format="pcm_44100")
    if prev_text: body["previous_text"] = prev_text      # 给模型上下文，句与句之间语调更连贯
    if next_text: body["next_text"] = next_text
    for attempt in range(4):
        r = requests.post(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps",
                          headers={"xi-api-key": KEY, "Content-Type": "application/json"}, json=body, timeout=120)
        if r.status_code == 200: break
        print("  重试", r.status_code, r.text[:200]); time.sleep(3 * (attempt + 1))
    else:
        raise RuntimeError(r.text)
    d = r.json()
    pcm = np.frombuffer(base64.b64decode(d["audio_base64"]), dtype=np.int16).astype(np.float32) / 32768
    al = d.get("alignment") or {}
    tm = [dict(p=ch, s=round(s, 3), e=round(e, 3)) for ch, s, e in zip(al.get("characters", []), al.get("character_start_times_seconds", []), al.get("character_end_times_seconds", []))]
    # 中文标点映射成时间轴脚本识别的停顿符号（用于长句字幕分段）
    for x in tm: x["p"] = {"，": ",", "。": ".", "：": ":", "；": ";", "？": "?", "！": "!", "、": ","}.get(x["p"], x["p"])
    # 裁首尾静音
    env = np.convolve(np.abs(pcm), np.ones(220) / 220, mode="same"); idx = np.where(env > env.max() * .012)[0]
    a = max(0, idx[0] - int(.06 * 44100)) if len(idx) else 0; b = min(len(pcm), idx[-1] + int(.12 * 44100)) if len(idx) else len(pcm)
    pcm = pcm[a:b]; off = a / 44100
    for x in tm: x["s"] = max(0, round(x["s"] - off, 3)); x["e"] = max(0, round(x["e"] - off, 3))
    return pcm, tm

def main(only):
    meta_p = f"{OUT}/meta.json"
    meta = json.load(open(meta_p, encoding="utf-8")) if os.path.exists(meta_p) else {}
    flat = [(sc["id"], ln) for sc in L.SCENES for ln in sc["lines"]]
    for i, (sid, ln) in enumerate(flat):
        if only and ln["id"] not in only: continue
        prev_t = clean(flat[i - 1][1]) if i > 0 and flat[i - 1][1]["spk"] == ln["spk"] else None
        next_t = clean(flat[i + 1][1]) if i + 1 < len(flat) and flat[i + 1][1]["spk"] == ln["spk"] else None
        pcm, tm = synth(ln, prev_t, next_t)
        sf.write(f"{OUT}/{ln['id']}.wav", pcm, 44100, subtype="FLOAT")
        meta[ln["id"]] = dict(scene=sid, spk=ln["spk"], dur=round(len(pcm) / 44100, 3), sr=44100, timings=tm, engine="elevenlabs")
        print(f"{ln['id']} {len(pcm)/44100:5.2f}s  {clean(ln)[:30]}")
    json.dump(meta, open(meta_p, "w", encoding="utf-8"), ensure_ascii=False, indent=0)
    print("完成。接着运行：python tts/build_timeline.py && python audio/score.py && python audio/sfx.py && python audio/mix.py，再渲染画面。")

if __name__ == "__main__":
    main(set(sys.argv[1:]))
