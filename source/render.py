"""Render the video frames (parallel), encode with x264, then mux audio.

  python render.py --preview 3.2,15,40      # write PNG stills for QA
  python render.py --render                 # full render -> build/video_noaudio.mp4
"""
import os, sys, subprocess, time
import numpy as np
from PIL import Image
from multiprocessing import Pool

FPS = 30
BUILD = "/projects/sandbox/work/build/"
FFMPEG = "/projects/sandbox/work/ffmpeg"

_G = {}


def init():
    import scenes as S
    _G["S"] = S
    _G["bg"] = S.make_background()
    _G["net"], _G["net_h"] = S.make_network()
    _G["header"] = S.Header()
    _G["subs"] = S.Subtitles()
    # explicit AIGC label (narration is AI-synthesised) - visible on every frame
    _G["ai"] = S.Layer(S.pill("AI合成配音", S.F_MED, 24, (176, 196, 216), bg=(255, 255, 255, 14),
                              border=(255, 255, 255, 70), padx=16, pady=6))
    _G["scenes"] = [S.SCENE_CLASSES[s["name"]](s) for s in S.TL["scenes"]]


def frame(gt):
    S = _G["S"]
    cv = _G["bg"].copy()
    off = (gt * 9.0) % _G["net_h"]
    S.blit(cv, _G["net"], 0, -off, 0.9)
    S.blit(cv, _G["net"], 0, -off + _G["net_h"], 0.9)
    sc = _G["scenes"]
    idx = len(sc) - 1
    for i, s in enumerate(sc):
        if s.S["start"] <= gt < s.S["end"]:
            idx = i
            break
    s = sc[idx]
    if idx >= 1:
        hop = 1.0 if idx > 1 else S.prog(gt - s.S["start"], 0.1, 0.5)
        _G["header"].draw(cv, gt, hop)
    s.frame(cv, gt - s.S["start"])
    S.blit(cv, _G["ai"], S.X0 + S.CW, 200, 0.9, anchor="tr")
    _G["subs"].draw(cv, gt)
    return (np.clip(cv, 0, 1) * 255 + 0.5).astype(np.uint8)


def render_chunk(args):
    k, f0, f1 = args
    init()
    out = BUILD + f"chunk_{k:02d}.mp4"
    cmd = [FFMPEG, "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920",
           "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset", "medium", "-crf", "17",
           "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2", "-g", "60", "-threads", "2",
           "-x264-params", "keyint=60:min-keyint=30", out]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t0 = time.time()
    for fi in range(f0, f1):
        p.stdin.write(frame(fi / FPS).tobytes())
    p.stdin.close()
    p.wait()
    return k, f1 - f0, time.time() - t0


def main():
    if "--preview" in sys.argv:
        init()
        os.makedirs(BUILD + "preview", exist_ok=True)
        ts = [float(x) for x in sys.argv[sys.argv.index("--preview") + 1].split(",")]
        for t in ts:
            t1 = time.time()
            img = frame(t)
            Image.fromarray(img).save(BUILD + f"preview/f_{t:07.2f}.png")
            print(f"t={t:.2f}s rendered in {time.time()-t1:.2f}s")
        return
    if "--render" in sys.argv:
        import json
        total = json.load(open(BUILD + "timeline.json"))["total"]
        n = int(round(total * FPS))
        workers = int(os.environ.get("WORKERS", "8"))
        nchunks = workers * 2
        b = np.linspace(0, n, nchunks + 1).astype(int)
        jobs = [(k, b[k], b[k + 1]) for k in range(nchunks)]
        t0 = time.time()
        with Pool(workers) as pool:
            for k, cnt, el in pool.imap_unordered(render_chunk, jobs):
                print(f"chunk {k:02d}: {cnt} frames in {el:.1f}s", flush=True)
        with open(BUILD + "chunks.txt", "w") as f:
            for k in range(nchunks):
                f.write(f"file 'chunk_{k:02d}.mp4'\n")
        subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i",
                        BUILD + "chunks.txt", "-c", "copy", BUILD + "video_noaudio.mp4"], check=True)
        print(f"rendered {n} frames in {time.time()-t0:.1f}s")


if __name__ == "__main__":
    main()
