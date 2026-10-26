"""把配音按 plan.tsv 的时间点铺到动画上，加环境底噪，输出成片。

用法: python tools/mix.py EP01
输入: build/<EP>/<EP>_motion.mp4、plan.tsv、tts/*.mp3、可选 music.mp3（自备配乐）
输出: build/<EP>/<EP>_final.mp4
没有 music.mp3 时用合成的低频铺底；配乐在人声出现时自动压低。
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def duration(p: Path) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", str(p)], capture_output=True, text=True)
    return float(r.stdout)


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    ep = sys.argv[1]
    base = ROOT / "build" / ep
    video = base / f"{ep}_motion.mp4"
    total = duration(video)

    cues = []
    for line in (base / "plan.tsv").read_text(encoding="utf-8").splitlines():
        lid, start = line.split("\t")
        mp3 = base / "tts" / f"{lid}.mp3"
        if mp3.exists():
            cues.append((mp3, float(start)))
    if not cues:
        sys.exit("tts/ 里没有配音，先运行 gen_tts.py，再重跑动画以对齐时长")

    # 关键音效（gen_sfx.py 生成，时间由动画脚本写进 sfx_plan.tsv）
    sfx = []
    sp = base / "sfx_plan.tsv"
    if sp.exists():
        for line in sp.read_text(encoding="utf-8").splitlines():
            name, start, vol = line.split("\t")
            f = base / "sfx" / f"{name}.mp3"
            if f.exists():
                sfx.append((f, float(start), float(vol)))

    inputs = ["-i", str(video)]
    for mp3, _ in cues:
        inputs += ["-i", str(mp3)]
    for f, _, _ in sfx:
        inputs += ["-i", str(f)]
    k = len(cues) + len(sfx) + 1  # 铺底输入的起始编号

    music = base / "music.mp3"
    if music.exists():
        inputs += ["-stream_loop", "-1", "-i", str(music)]
        bed_src = f"[{k}:a]atrim=0:{total:.2f},volume=0.35"
    else:
        # 合成铺底：55 Hz 与 82.4 Hz 低频加粉噪，慢速起伏，克制不抢戏
        inputs += ["-f", "lavfi", "-i", f"sine=f=55:d={total:.2f}",
                   "-f", "lavfi", "-i", f"sine=f=82.4:d={total:.2f}",
                   "-f", "lavfi", "-i", f"anoisesrc=c=pink:a=0.5:d={total:.2f}"]
        bed_src = (f"[{k}:a]volume=0.10[s1];[{k + 1}:a]volume=0.05[s2];"
                   f"[{k + 2}:a]lowpass=f=380,volume=0.06[s3];"
                   f"[s1][s2][s3]amix=inputs=3:normalize=0,"
                   f"tremolo=f=0.1:d=0.35")  # ffmpeg 要求 f ≥ 0.1

    parts = []
    for i, (_, start) in enumerate(cues, 1):
        ms = int(start * 1000)
        parts.append(f"[{i}:a]aresample=44100,aformat=channel_layouts=stereo,adelay={ms}|{ms}[v{i}]")
    for j, (_, start, vol) in enumerate(sfx):
        ms = int(start * 1000)
        idx = len(cues) + 1 + j
        parts.append(f"[{idx}:a]aresample=44100,aformat=channel_layouts=stereo,"
                     f"volume={vol},adelay={ms}|{ms}[f{j}]")
    vo = "".join(f"[v{i}]" for i in range(1, len(cues) + 1))
    graph = ";".join(parts) + (
        f";{vo}amix=inputs={len(cues)}:normalize=0,apad=whole_dur={total:.2f},asplit=2[vo][key]"
        f";{bed_src},aformat=channel_layouts=stereo,afade=t=in:d=3,"
        f"afade=t=out:st={max(0, total - 4):.2f}:d=4[bed]"
        # 人声出现时铺底压低约 10 dB
        f";[bed][key]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=600[duck]"
    )
    if sfx:
        fx = "".join(f"[f{j}]" for j in range(len(sfx)))
        graph += (f";{fx}amix=inputs={len(sfx)}:normalize=0,apad=whole_dur={total:.2f}[fx]"
                  f";[vo][duck][fx]amix=inputs=3:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
    else:
        graph += ";[vo][duck]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[aout]"
    out = base / f"{ep}_final.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y"] + inputs + [
        "-filter_complex", graph, "-map", "0:v", "-map", "[aout]",
        "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", f"{total:.2f}",
        "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    print(f"{out}  {total / 60:.1f} 分钟，{len(cues)} 句配音，{len(sfx)} 个音效")


if __name__ == "__main__":
    main()
