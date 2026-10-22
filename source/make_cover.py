"""Douyin cover 1080x1920; all key text inside the centre 3:4 crop (y 240-1680) used on profile grids."""
import math
import numpy as np
from PIL import Image, ImageDraw
from gfx import *
import scenes as S

cv = S.make_background()
net, _ = S.make_network()
blit(cv, net, 0, -300, 0.9)

# faint PK curve
img = Image.new("RGBA", (W * 2, 900 * 2), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
pts = []
for i in range(241):
    tt = i / 10
    c = 1.32 * (math.exp(-0.16 * tt) - math.exp(-0.75 * tt))
    pts.append(((60 + tt / 24 * 980) * 2, (860 - c * 760) * 2))
d.line(pts, fill=(34, 211, 197, 80), width=14, joint="curve")
blit(cv, Layer(resize(img, (W, 900))), 0, 560, 1.0)

def put(im, x, y, anchor="c", op=1.0):
    blit(cv, Layer(im) if not isinstance(im, Layer) else im, x, y, op, anchor=anchor)

put(pill("临床试验 · 职场干货", F_MED, 36, TEAL, bg=(34, 211, 197, 24), border=rgba(TEAL, 170), padx=30, pady=12),
    W / 2, 330)
put(text("BE试验", F_SMILEY, 160, TEAL), W / 2, 500)
g, _ = glow(text("CRA", F_SMILEY, 330, WHITE), 32, TEAL, 0.7)
put(g, W / 2, 730)
put(text("职责全景图", F_BLACK, 112, WHITE), W / 2, 975)

chips = [pill(s, F_BOLD, 36, c, bg=(c[0], c[1], c[2], 30), border=rgba(c, 210), padx=26, pady=12)
         for s, c in [("启动前", TEAL), ("进行中", TEAL), ("结束后", TEAL)]]
arrow = text("→", F_BOLD, 40, TEAL, pad=0)
tot = sum(c.width for c in chips) + 2 * (arrow.width + 36)
x = (W - tot) / 2
for i, c in enumerate(chips):
    put(c, x, 1105, anchor="tl")
    x += c.width
    if i < 2:
        put(arrow, x + 18, 1112, anchor="tl")
        x += arrow.width + 36

row = [pill(s, F_BOLD, 34, NAVY if bgc else c, bg=rgba(c) if bgc else (c[0], c[1], c[2], 30),
            border=None if bgc else rgba(c, 210), padx=24, pady=10)
       for s, c, bgc in [("新人入门清单", TEAL, False), ("资深避坑指南", AMBER, False)]]
x = (W - sum(r.width for r in row) - 24) / 2
for r in row:
    put(r, x, 1230, anchor="tl")
    x += r.width + 24

b = pill("2026新版GCP 已施行", F_BLACK, 44, NAVY, bg=rgba(AMBER), padx=36, pady=14)
g, _ = glow(b, 16, AMBER, 0.6)
put(g, W / 2, 1440)
put(pill("AI合成配音", F_MED, 24, (176, 196, 216), bg=(255, 255, 255, 14), border=(255, 255, 255, 70),
         padx=16, pady=6), S.X0 + S.CW, 1590, anchor="tr", op=0.9)

out = (np.clip(cv, 0, 1) * 255 + 0.5).astype(np.uint8)
Image.fromarray(out).save("/projects/sandbox/output/封面_1080x1920.png")
Image.fromarray(out[240:1680]).save("/projects/sandbox/work/build/cover_3x4_check.png")
print("cover written")
