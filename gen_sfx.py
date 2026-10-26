"""用 ElevenLabs Sound Effects 生成关键音效。

用法: python tools/gen_sfx.py EP01 [--only title_boom,whoosh] [--force]
输入: build/<EP>/sfx.tsv  每行 "名字<TAB>秒数<TAB>英文描述"，# 开头为注释
输出: build/<EP>/sfx/<名字>.mp3，已存在则跳过
只做少数关键音效（片名重击、转场、揭示）；环境底噪和轻击由 mix.py 程序合成。
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from gen_tts import ROOT, load_env_file  # noqa: E402


def main():
    load_env_file()
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    spec = ROOT / "build" / args.ep / "sfx.tsv"
    if not spec.exists():
        sys.exit(f"缺少 {spec}")
    out_dir = ROOT / "build" / args.ep / "sfx"
    out_dir.mkdir(parents=True, exist_ok=True)
    only = {s for s in args.only.split(",") if s}

    from elevenlabs import ElevenLabs
    client = ElevenLabs()  # 从环境变量读密钥

    for line in spec.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        name, sec, desc = line.split("\t", 2)
        if only and name not in only:
            continue
        out = out_dir / f"{name}.mp3"
        if out.exists() and not args.force:
            continue
        audio = client.text_to_sound_effects.convert(
            text=desc,
            duration_seconds=float(sec),
            prompt_influence=0.6,
            output_format="mp3_44100_128",
        )
        out.write_bytes(b"".join(audio))
        print(f"{name} ok  {sec}s")


if __name__ == "__main__":
    main()
