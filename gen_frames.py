"""用 Codex CLI 的 image_generation 批量生成分镜关键帧。

用法: python tools/gen_frames.py EP01 [--only s01,s05] [--force]
输入: build/<EP>/shots.tsv  每行 "镜头编号<TAB>画面描述(英文)"
输出: build/<EP>/frames/<EP>_<镜头编号>.png，已存在则跳过
"""
import argparse
import os
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CODEX = os.environ.get(
    "CODEX_BIN",
    r"C:\Users\Lenovo\AppData\Local\OpenAI\Codex\bin\37f54d68e5533a51\codex.exe",
)

# 全系列统一画风，对应《系列制作规范_剂量》视觉规则
STYLE = (
    "16:9 landscape cinematic documentary film still. Near-black background (#0B0D10), "
    "low-key lighting, single soft key light, deep shadows, fine film grain, shallow depth of field, "
    "muted desaturated palette with warm amber (#E8A33D) highlights only. Photoreal or realistic "
    "microscopy/3D-render texture, never cartoon. No text, no letters, no numbers, no logos, "
    "no brand names, no human faces."
)


def run(shot_id: str, desc: str, out_dir: Path, ep: str) -> bool:
    name = f"{ep}_{shot_id}.png"
    prompt = (
        f"Use your image generation tool to create exactly ONE image, then save it as {name} "
        f"in the current directory. Do not write code. Do not create any other files.\n"
        f"Style: {STYLE}\nImage: {desc}"
    )
    r = subprocess.run(
        [CODEX, "exec", "--skip-git-repo-check", "-s", "workspace-write", "-C", str(out_dir), prompt],
        capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=600,
    )
    ok = (out_dir / name).exists()
    if not ok:
        print(r.stdout[-800:], r.stderr[-800:], file=sys.stderr)
    return ok


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ep")
    ap.add_argument("--only", default="")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    shots = ROOT / "build" / args.ep / "shots.tsv"
    out_dir = ROOT / "build" / args.ep / "frames"
    out_dir.mkdir(parents=True, exist_ok=True)
    only = {s for s in args.only.split(",") if s}

    for line in shots.read_text(encoding="utf-8").splitlines():
        if not line.strip() or line.startswith("#"):
            continue
        sid, desc = line.split("\t", 1)
        if only and sid not in only:
            continue
        out = out_dir / f"{args.ep}_{sid}.png"
        if out.exists() and not args.force:
            continue
        if args.force and out.exists():
            out.unlink()
        print(f"{sid} ...", flush=True)
        print(f"{sid} {'ok' if run(sid, desc, out_dir, args.ep) else 'FAILED'}", flush=True)


if __name__ == "__main__":
    main()
