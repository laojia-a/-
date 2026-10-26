"""用 ElevenLabs 为逐句旁白生成配音。

用法: python tools/gen_tts.py EP01 [--only EP01_003,EP01_010] [--force]
密钥: ELEVENLABS_API_KEY，从环境变量或项目根目录 .env.local 读取（SDK 自动读环境变量）
可选:
  ELEVENLABS_VOICE_ID  旁白音色 ID，默认沿用《监查者》主旁白 Erich Li - Mystery Host
  ELEVENLABS_MODEL     默认 eleven_v4
输出: build/<EP>/tts/<编号>.mp3，已存在则跳过（--force 重做）
"""
import argparse
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# 《监查者》主旁白音色（用户已同意沿用），见该项目 README
DEFAULT_VOICE = "fYmV8EanqZP9BI4WvpB7"

# 克制、低速的纪录片旁白。v4 只认 stability / similarity_boost，节奏靠标点控制
STABILITY = 0.6
SIMILARITY = 0.8


def load_env_file():
    """项目根目录 .env.local（ElevenLabs CLI 写入）里的变量，环境变量已设置的优先。"""
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env.local")


def load_lexicon():
    """字幕保留原文，只把送进 TTS 的文本换成读音写法。长词优先替换。"""
    path = ROOT / "tools" / "lexicon.tsv"
    pairs = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if "\t" in line:
            src, dst = line.split("\t", 1)
            pairs.append((src, dst))
    return sorted(pairs, key=lambda p: -len(p[0]))


def to_spoken(text: str, lexicon) -> str:
    for src, dst in lexicon:
        text = text.replace(src, dst)
    return text


def load_rows(ep: str):
    path = ROOT / "build" / ep / "narration.tsv"
    if not path.exists():
        sys.exit(f"缺少 {path}，先运行 extract_narration.py")
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        lid, _sec, text = line.split("\t", 2)
        rows.append((lid, text))
    return rows


def synth(client, text: str, voice: str, model: str, prev: str, nxt: str) -> bytes:
    from elevenlabs import VoiceSettings

    kw = dict(
        voice_id=voice,
        text=text,
        model_id=model,
        output_format="mp3_44100_128",
        voice_settings=VoiceSettings(stability=STABILITY, similarity_boost=SIMILARITY),
    )
    if model != "eleven_multilingual_v2":
        kw["language_code"] = "zh"
    # 前后句作上下文，让句与句之间语调连贯
    if prev:
        kw["previous_text"] = prev
    if nxt:
        kw["next_text"] = nxt
    for attempt in range(4):
        try:
            return b"".join(client.text_to_speech.convert(**kw))
        except Exception as e:  # 429 / 5xx 退避重试，其余直接报错
            code = getattr(e, "status_code", None)
            if code == 429 or (code and code >= 500):
                time.sleep(5 * (attempt + 1))
                continue
            raise
    raise RuntimeError("重试次数用尽")


def synth_edge(text: str, out: Path, voice: str, rate: str):
    """临时配音：微软 edge-tts，免密钥，只做内部对时预览，不得进成片。"""
    import asyncio
    import edge_tts
    asyncio.run(edge_tts.Communicate(text, voice, rate=rate).save(str(out)))


def main():
    load_env_file()
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--engine", choices=["eleven", "edge"], default="eleven")
    ap.add_argument("--edge-voice", default="zh-CN-YunyangNeural")
    ap.add_argument("--edge-rate", default="-6%")
    args = ap.parse_args()

    voice = os.environ.get("ELEVENLABS_VOICE_ID", DEFAULT_VOICE)
    model = os.environ.get("ELEVENLABS_MODEL", "eleven_v4")
    client = None
    if args.engine == "eleven":
        if not os.environ.get("ELEVENLABS_API_KEY"):
            sys.exit("请设置 ELEVENLABS_API_KEY（成片必须用 ElevenLabs）")
        from elevenlabs import ElevenLabs
        client = ElevenLabs()  # 从环境变量读密钥

    lexicon = load_lexicon()
    rows = [(lid, to_spoken(t, lexicon)) for lid, t in load_rows(args.ep)]
    only = {s for s in args.only.split(",") if s}
    # 成片只用 ElevenLabs（tts/）；edge 单独放，不会被 mix.py 读到
    out_dir = ROOT / "build" / args.ep / ("tts" if args.engine == "eleven" else "tts_edge_临时")
    out_dir.mkdir(parents=True, exist_ok=True)

    for i, (lid, text) in enumerate(rows):
        if only and lid not in only:
            continue
        out = out_dir / f"{lid}.mp3"
        if out.exists() and not args.force:
            continue
        if args.engine == "edge":
            synth_edge(text, out, args.edge_voice, args.edge_rate)
        else:
            prev = rows[i - 1][1] if i > 0 else ""
            nxt = rows[i + 1][1] if i + 1 < len(rows) else ""
            out.write_bytes(synth(client, text, voice, model, prev, nxt))
        print(f"{lid} ok  {text[:24]}")


if __name__ == "__main__":
    main()
