"""EP02 加倍：逐场景动画。

用法: python tools/ep02.py [--limit 秒数]
输出: build/EP02/EP02_motion.mp4、plan.tsv
"""
import argparse
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

E = Episode("EP02")
F = E.frame

# 加巴喷丁标签：日剂量与近似生物利用度
GABA = [(900, 0.60), (1200, 0.47), (2400, 0.34), (3600, 0.33), (4800, 0.27)]


# ---------------- 冷开场 ----------------

def s_open(ctx, t, g):
    b1, b2, b3 = g.beat(1, 99), g.beat(2, 99), g.beat(3, 99)
    if t < b2:
        photo(ctx, F("s02") if t > b1 else F("s01"), t, g.dur, z=(1.06, 1.14))
        darken(ctx, 0.35)
        dust(ctx, t, 25, 3, WHITE, 0.15)
        if t < b1:
            # 一粒胶囊落下并轻弹
            p = seg(t, 0.4, 1.4)
            y = H * 0.30 + (H * 0.18) * (1 - abs(math.cos(p * math.pi * 1.5)) * (1 - p))
            capsule(ctx, W / 2, y, 70, 170, ease_out(seg(t, 0.2, 0.6)))
            reveal(ctx, "加巴喷丁", W / 2, H * 0.78, 56, WHITE, seg(t, 1.2, 2.0))
        else:
            for i in range(5):
                p = ease_out(seg(t, b1 + 0.2 + i * 0.3, b1 + 0.7 + i * 0.3))
                capsule(ctx, W / 2 - 280 + i * 140, H * 0.36 - (1 - p) * 90, 70, 170, p)
            reveal(ctx, "900 mg/日", W * 0.26, H * 0.74, 60, WHITE, seg(t, b1 + 1.0, b1 + 1.8), count=True)
            reveal(ctx, "4800 mg/日", W * 0.74, H * 0.74, 60, WHITE, seg(t, b1 + 1.6, b1 + 2.4), count=True)
            reveal(ctx, "× 5.3", W / 2, H * 0.74, 64, AMBER, seg(t, b1 + 2.6, b1 + 3.4), count=True)
            tag(ctx, "real", seg(t, b1 + 1.0, b1 + 1.8), "NEURONTIN 标签")
        return
    # 第三句起：两个量筒，右边本该到 5 倍，却只升到 2.4 倍
    fill_bg(ctx)
    dust(ctx, t, 30, 6, AMBER, 0.15)
    base, hmax, w = H * 0.80, 600, 180
    scale = hmax / 2900  # 刻度：540×5.33 的"按比例"虚线留在画面内
    p1 = ease_io(seg(t, b2 + 0.3, b2 + 1.6))
    cylinder(ctx, W * 0.34 - w / 2, base, w, hmax, 540 * scale * p1 / hmax, AMBER)
    ideal = 540 * 5.33
    pg = seg(t, b2 + 1.6, b2 + 2.6)
    if pg > 0:  # "应该"到达的虚线
        y = base - ideal * scale
        color(ctx, WHITE, 0.5 * pg)
        ctx.set_dash([14, 10])
        ctx.set_line_width(2)
        ctx.move_to(W * 0.66 - w / 2 - 30, y)
        ctx.line_to(W * 0.66 + w / 2 + 30, y)
        ctx.stroke()
        ctx.set_dash([])
        text(ctx, "如果按比例 ×5.3", W * 0.66 + w / 2 + 50, y + 12, 30, WHITE, 0.7 * pg, False, "left")
    p2 = ease_io(seg(t, b2 + 2.2, b2 + 4.2))
    cylinder(ctx, W * 0.66 - w / 2, base, w, hmax, 1296 * scale * p2 / hmax, AMBER)
    reveal(ctx, "约 540 mg", W * 0.34, base + 70, 40, AMBER, seg(t, b2 + 1.0, b2 + 1.8), count=True)
    reveal(ctx, "约 1296 mg", W * 0.66, base + 70, 40, AMBER, seg(t, b2 + 3.6, b2 + 4.4), count=True)
    reveal(ctx, "实际 ×2.4", W * 0.66 + w / 2 + 50, base - 1296 * scale + 12, 48, AMBER,
           seg(t, b2 + 4.0, b2 + 4.8), align="left", count=True)
    text(ctx, "900 mg/日", W * 0.34, base + 120, 28, GREY, p1, False)
    text(ctx, "4800 mg/日", W * 0.66, base + 120, 28, GREY, p1, False)
    tag(ctx, "real", 1, "NEURONTIN 标签 · 剂量 × 近似生物利用度")
    q = seg(t, b3, b3 + 0.8)
    if q > 0:
        darken(ctx, 0.55 * q)
        reveal(ctx, "剩下的药去哪了？", W / 2, H * 0.46, 80, WHITE, q)


# ---------------- 第一幕：三种曲线 ----------------

DOSES = [10, 20, 40]
SETS = [("比例", 1.0, WHITE), ("超比例", math.log(3, 2), RED), ("亚比例", math.log(1.5, 2), AMBER)]


def auc(d, beta):
    return 100 * (d / 10) ** beta


def s_three(ctx, t, g):
    fill_bg(ctx)
    sim_grid(ctx, 0.07)
    b = [g.beat(i, 99) for i in range(7)]
    # 阶段：0-3 线性坐标；4 归一化；5 双对数；6 "只描述"
    x0, y0, x1, y1 = 300, 860, 1500, 220
    mode_norm = ease_io(seg(t, b[4], b[4] + 1.5))
    mode_log = ease_io(seg(t, b[5], b[5] + 1.5))
    ylab = "AUC / 剂量" if mode_norm > 0.5 and mode_log < 0.5 else ("log AUC" if mode_log > 0.5 else "AUC")
    xlab = "log 剂量" if mode_log > 0.5 else "剂量 mg"
    axes(ctx, x0, y0, x1, y1, xlab, ylab)

    def xmap(d):
        lin = (d - 0) / 45
        lg = (math.log(d) - math.log(8)) / (math.log(48) - math.log(8))
        return x0 + (x1 - x0) * lerp(lin, lg, mode_log)

    def ymap(d, beta):
        lin = auc(d, beta) / 1000
        norm = (auc(d, beta) / d) / 25
        lg = (math.log(auc(d, beta)) - math.log(60)) / (math.log(1000) - math.log(60))
        v = lerp(lerp(lin, norm, mode_norm), lg, mode_log) if mode_log > 0 else lerp(lin, norm, mode_norm)
        return y0 - (y0 - y1) * v

    # 刻度
    for d in DOSES:
        text(ctx, str(d), xmap(d), y0 + 40, 28, GREY, 0.8, False)
    for k, (name, beta, c) in enumerate(SETS):
        p = ease_io(seg(t, b[k + 1] + 0.2, b[k + 1] + 1.8))
        if p <= 0:
            continue
        ds = [10 + 30 * i / 120 for i in range(int(120 * p) + 1)]
        pts = [(xmap(d), ymap(d, beta)) for d in ds]
        polyline(ctx, pts, c, 5)
        for d in DOSES:
            if d <= ds[-1] + 0.01:
                ctx.arc(xmap(d), ymap(d, beta), 10, 0, 2 * math.pi)
                color(ctx, c, 1)
                ctx.fill()
        lx, ly = pts[-1]
        text(ctx, name, lx + 30, ly + 12, 36, c, p, True, "left")
        if mode_log > 0.6:
            text(ctx, f"β = {beta:.2f}", lx + 30, ly + 56, 30, c, mode_log, False, "left")
    reveal(ctx, "剂量 10 → 20 → 40 mg，总暴露会怎样？", W / 2, 130, 46, WHITE, seg(t, 0.2, 1.0))
    if mode_norm > 0.6 and mode_log < 0.3:
        reveal(ctx, "比例 = 一条平线", W * 0.80, H * 0.30, 40, WHITE, seg(t, b[4] + 1.6, b[4] + 2.4))
    if mode_log > 0.6:
        reveal(ctx, "幂模型：斜率 β = 1 即比例", W * 0.80, H * 0.24, 38, WHITE, seg(t, b[5] + 1.6, b[5] + 2.4))
    q = seg(t, b[6], b[6] + 0.8)
    if q > 0:
        darken(ctx, 0.55 * q)
        reveal(ctx, "β 只描述，不解释", W / 2, H * 0.48, 90, AMBER, q)
    tag(ctx, "sim", 1)


# ---------------- 第二幕：入口与出口 ----------------

def s_doors(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 12, WHITE, 0.08)
    b0, b1, b2 = g.beat(0, 0), g.beat(1, 99), g.beat(2, 99)
    q0 = seg(t, 0.2, 1.0)
    reveal(ctx, "答案：C　光凭曲线，分不出来", W / 2, 120, 46, AMBER, q0)
    cx, cy = W / 2, H * 0.55
    # 中间的血液池
    pool_level = 0.55
    if t > b2:  # 两种方式都让水位降低
        pool_level = 0.55 - 0.2 * ease_io(seg(t, b2 + 0.8, b2 + 2.4))
    rrect(ctx, cx - 260, cy - 180, 520, 360, 40)
    color(ctx, WHITE, 0.25)
    ctx.set_line_width(3)
    ctx.stroke()
    lh = 360 * pool_level
    grd = cairo.LinearGradient(0, cy + 180 - lh, 0, cy + 180)
    grd.add_color_stop_rgba(0, *rgba(AMBER, 0.8))
    grd.add_color_stop_rgba(1, *rgba(AMBER, 0.25))
    ctx.set_source(grd)
    ctx.rectangle(cx - 255, cy + 178 - lh, 510, lh)
    ctx.fill()
    text(ctx, "血液里的药", cx, cy - 210, 34, WHITE, seg(t, b1, b1 + 0.8), False)
    # 入口与出口
    pin = seg(t, b1 + 0.6, b1 + 1.4)
    pout = seg(t, b1 + 2.4, b1 + 3.2)
    narrow = ease_io(seg(t, b2 + 0.6, b2 + 2.0))
    wide = ease_io(seg(t, b2 + 2.4, b2 + 3.8))
    gin = 120 * (1 - 0.65 * narrow)
    gout = 120 * (1 + 0.6 * wide)
    for side, gap, p, lab, sub in [(-1, gin, pin, "入口 F", "生物利用度"), (1, gout, pout, "出口 CL", "清除率")]:
        x = cx + side * 260
        color(ctx, WHITE, 0.9 * p)
        ctx.set_line_width(8)
        ctx.move_to(x, cy - 180)
        ctx.line_to(x, cy - gap / 2)
        ctx.move_to(x, cy + gap / 2)
        ctx.line_to(x, cy + 180)
        ctx.stroke()
        text(ctx, lab, x + side * 140, cy - 40, 44, AMBER if side < 0 else BLUE, p)
        text(ctx, sub, x + side * 140, cy + 14, 30, GREY, p, False)
        # 粒子流
        if p > 0.5:
            rng = np.random.default_rng(5 + side)
            n = int(16 * gap / 120)
            for i in range(n):
                ph = (t * 0.6 + rng.random()) % 1.0
                yy = cy + (rng.random() - 0.5) * gap * 0.8
                xx = (x - 220 + ph * 220) if side < 0 else (x + ph * 220)
                glow_spot(ctx, xx, yy, 10, AMBER, 0.7 * math.sin(ph * math.pi))
    if t > b2 + 0.6:
        text(ctx, "入口变窄", cx - 520, cy + 260, 34, AMBER, seg(t, b2 + 1.0, b2 + 1.6))
        text(ctx, "或　出口开大", cx + 520, cy + 260, 34, BLUE, seg(t, b2 + 2.8, b2 + 3.4))
        reveal(ctx, "两种机制，几乎一样的曲线", W / 2, H * 0.94, 40, WHITE, seg(t, b2 + 4.0, b2 + 4.8))
    tag(ctx, "schematic", seg(t, b1, b1 + 1))


def s_transporter(ctx, t, g):
    photo(ctx, F("s06"), t, g.dur, z=(1.04, 1.16), pan=((40, 0), (-40, 0)))
    darken(ctx, 0.35)
    # 排队的分子：剂量越大，排不上的越多
    gates = [W * 0.30, W * 0.50, W * 0.70]
    rng = np.random.default_rng(11)
    crowd = 18 + int(40 * ease_io(seg(t, 3.0, g.dur - 1)))
    for i in range(crowd):
        gx = gates[i % 3]
        q = i // 3
        x = gx + (rng.random() - 0.5) * 60
        y = H * 0.30 - q * 26 + math.sin(t * 2 + i) * 4
        if y < 40:
            continue
        passing = q == 0 and (t * 1.2 + i * 0.3) % 1.0
        if passing:
            y = H * 0.30 + passing * 260
        glow_spot(ctx, x, y, 14, AMBER, 0.75)
    for gx in gates:
        rrect(ctx, gx - 40, H * 0.36, 80, 120, 14)
        color(ctx, WHITE, 0.35)
        ctx.set_line_width(3)
        ctx.stroke()
    reveal(ctx, "转运蛋白数量有限", W * 0.08, H * 0.82, 52, WHITE, seg(t, 0.8, 1.6), align="left")
    reveal(ctx, "剂量越大，排不上队的越多", W * 0.08, H * 0.82 + 66, 36, AMBER, seg(t, 2.0, 3.0),
           align="left", bold=False)
    tag(ctx, "schematic", 1)


def s_fbars(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 14, WHITE, 0.08)
    b1 = g.beat(1, 99)
    absorbed = ease_io(seg(t, b1, b1 + 1.4))  # 0: 显示 F；1: 显示吸收量
    base, x0, bw, gap = H * 0.80, W * 0.18, 150, 90
    reveal(ctx, "每日剂量越大，吸收比例越低……" if absorbed < 0.5 else "……但吸收的总量仍在上升",
           W / 2, 140, 48, WHITE if absorbed < 0.5 else AMBER, seg(t, 0.2, 1.0) if absorbed < 0.5 else seg(t, b1, b1 + 0.8))
    for i, (d, f) in enumerate(GABA):
        p = ease_out(seg(t, 0.6 + i * 0.35, 1.8 + i * 0.35))
        hf = f * 900
        ha = d * f / 1400 * 600
        h = lerp(hf, ha, absorbed) * p
        x = x0 + i * (bw + gap)
        c = AMBER
        grd = cairo.LinearGradient(0, base - h, 0, base)
        grd.add_color_stop_rgba(0, *rgba(c, 0.95))
        grd.add_color_stop_rgba(1, *rgba(c, 0.3))
        ctx.set_source(grd)
        rrect(ctx, x, base - max(h, 1), bw, max(h, 1), 10)
        ctx.fill()
        lab = f"{f * 100:.0f}%" if absorbed < 0.5 else f"{d * f:.0f} mg"
        text(ctx, lab, x + bw / 2, base - h - 22, 40, AMBER, p)
        text(ctx, f"{d}", x + bw / 2, base + 50, 32, WHITE, p, False)
    text(ctx, "mg/日", x0 + 5 * (bw + gap) - 40, base + 50, 28, GREY, 1, False, "left")
    text(ctx, "生物利用度" if absorbed < 0.5 else "≈ 吸收量 = 剂量 × 生物利用度",
         W - 80, H * 0.30, 32, GREY, 1, False, "right")
    q = seg(t, b1 + 2.4, b1 + 3.4)
    if q > 0:
        reveal(ctx, "比例下降 ≠ 总量封顶", W * 0.62, H * 0.40, 56, WHITE, q)
    tag(ctx, "real", 1, "NEURONTIN 标签 · 算术演示")


def s_pgp(ctx, t, g):
    photo(ctx, F("s07"), t, g.dur, z=(1.05, 1.15))
    darken(ctx, 0.35)
    p = seg(t, 0.8, 1.6)
    reveal(ctx, "外排蛋白 P-gp：把药泵回肠道", W * 0.08, H * 0.20, 48, WHITE, p, align="left")
    # 两种转运体并排对照
    q = seg(t, g.dur * 0.45, g.dur * 0.45 + 1.0)
    if q > 0:
        darken(ctx, 0.4 * q)
        rows = [("摄取转运体饱和", "→ 吸收比例下降", AMBER), ("外排转运体饱和", "→ 泵回去的少了，暴露可能升高", BLUE)]
        for i, (a, b, c) in enumerate(rows):
            y = H * 0.48 + i * 120
            reveal(ctx, a, W * 0.12, y, 46, c, seg(t, g.dur * 0.45 + i * 0.6, g.dur * 0.45 + 1.0 + i * 0.6), align="left")
            reveal(ctx, b, W * 0.42, y, 40, WHITE, seg(t, g.dur * 0.45 + 0.3 + i * 0.6, g.dur * 0.45 + 1.3 + i * 0.6),
                   align="left", bold=False)
        reveal(ctx, "同样叫“饱和”，方向可以相反", W / 2, H * 0.80, 44, WHITE, seg(t, g.dur * 0.45 + 2.2, g.dur * 0.45 + 3.0))
    tag(ctx, "schematic", 1)


# ---------------- 第三幕 ----------------

def s_toll(ctx, t, g):
    b1 = g.beat(1, 99)
    if t < b1:
        photo(ctx, F("s10"), t, g.dur, z=(1.03, 1.12))
        darken(ctx, 0.3)
        dust(ctx, t, 40, 15, AMBER, 0.2, rise=-8)
        reveal(ctx, "“多吃一片，代谢就崩溃”？", W / 2, H * 0.30, 60, WHITE, seg(t, 1.0, 2.0))
        return
    fill_bg(ctx)
    sim_grid(ctx, 0.05)
    x0, y0, x1, y1 = 320, 860, 1580, 260
    axes(ctx, x0, y0, x1, y1, "浓度", "代谢速度")
    km = 2.0
    p = ease_io(seg(t, b1 + 0.3, b1 + 3.0))
    pts = [(x0 + (x1 - x0) * i / 300, y0 - (y0 - y1) * (c / (km + c)) / (14 / (km + 14)))
           for i in range(int(300 * p) + 1) for c in [i / 300 * 14]]
    polyline(ctx, pts, BLUE, 5)
    # Vmax 渐近线
    if p > 0.6:
        yv = y0 - (y0 - y1) / (14 / (km + 14))
        color(ctx, WHITE, 0.4)
        ctx.set_dash([12, 10])
        ctx.set_line_width(2)
        ctx.move_to(x0, yv)
        ctx.line_to(x1, yv)
        ctx.stroke()
        ctx.set_dash([])
        text(ctx, "上限", x1 + 10, yv + 10, 30, WHITE, 0.7, False, "left")
    # 滑动的点：没有断崖
    if p >= 1:
        s = (math.sin((t - b1 - 3.0) * 0.6 - math.pi / 2) + 1) / 2
        c = s * 14
        px = x0 + (x1 - x0) * c / 14
        py = y0 - (y0 - y1) * (c / (km + c)) / (14 / (km + 14))
        glow_spot(ctx, px, py, 40, AMBER, 0.4)
        ctx.arc(px, py, 12, 0, 2 * math.pi)
        color(ctx, AMBER, 1)
        ctx.fill()
    reveal(ctx, "平滑过渡，没有“崩塌”的开关", W / 2, 140, 46, WHITE, seg(t, b1 + 2.0, b1 + 2.8))
    tag(ctx, "schematic", 1)


def s_ci(ctx, t, g):
    fill_bg(ctx)
    sim_grid(ctx, 0.07)
    b1 = g.beat(1, 99)
    xl, xr = 260, 1660
    lo, hi = 0.6, 1.4

    def X(v):
        return xl + (xr - xl) * (v - lo) / (hi - lo)

    y = H * 0.36
    color(ctx, GREY, 0.6)
    ctx.set_line_width(2)
    ctx.move_to(xl, y + 260)
    ctx.line_to(xr, y + 260)
    ctx.stroke()
    for v in (0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3):
        text(ctx, f"{v:.1f}", X(v), y + 300, 26, GREY, 0.8, False)
    text(ctx, "β", xr + 30, y + 270, 32, GREY, 1, False, "left")
    # 预设界限
    pb = seg(t, 0.4, 1.2)
    for v in (0.839, 1.161):
        color(ctx, AMBER, 0.8 * pb)
        ctx.set_dash([12, 8])
        ctx.set_line_width(3)
        ctx.move_to(X(v), y - 80)
        ctx.line_to(X(v), y + 260)
        ctx.stroke()
        ctx.set_dash([])
    text(ctx, "预设界限 0.84–1.16", X(1.0), y - 110, 34, AMBER, pb)
    cis = [(0.91, 1.08, "落在界限内 → 成比例", WHITE), (0.70, 1.20, "跨出界限 → 可能不成比例，也可能看不清", RED)]
    for i, (a, b, lab, c) in enumerate(cis):
        p = ease_out(seg(t, 1.4 + i * 1.6, 2.6 + i * 1.6))
        yy = y + 40 + i * 110
        mid = (a + b) / 2
        color(ctx, c, 1)
        ctx.set_line_width(6)
        ctx.move_to(X(lerp(mid, a, p)), yy)
        ctx.line_to(X(lerp(mid, b, p)), yy)
        ctx.stroke()
        ctx.arc(X(mid), yy, 10, 0, 2 * math.pi)
        ctx.fill()
        text(ctx, lab, X(b) + 30, yy + 12, 30, c, seg(t, 2.4 + i * 1.6, 3.2 + i * 1.6), False, "left")
    q = seg(t, b1, b1 + 0.8)
    if q > 0:
        darken(ctx, 0.6 * q)
        cards = [("成比例", WHITE), ("不成比例", RED), ("信息不足", BLUE)]
        for i, (s, c) in enumerate(cards):
            pp = ease_out(seg(t, b1 + 0.3 + i * 0.4, b1 + 1.1 + i * 0.4))
            x = W / 2 + (i - 1) * 440
            rrect(ctx, x - 190, H * 0.40 - 100 + (1 - pp) * 40, 380, 200, 22)
            color(ctx, c, 0.10 * pp)
            ctx.fill_preserve()
            color(ctx, c, 0.7 * pp)
            ctx.set_line_width(2)
            ctx.stroke()
            text(ctx, s, x, H * 0.40 + 16 + (1 - pp) * 40, 54, c, pp)
        reveal(ctx, "“没看出差异” ≠ “证明了一样”", W / 2, H * 0.74, 48, WHITE, seg(t, b1 + 2.4, b1 + 3.2))
    tag(ctx, "sim", 1)


def s_return(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 30, 16, AMBER, 0.14)
    base, hmax, w = H * 0.78, 520, 160
    scale = hmax / 2900
    cylinder(ctx, W * 0.36 - w / 2, base, w, hmax, 540 * scale / hmax, AMBER)
    cylinder(ctx, W * 0.64 - w / 2, base, w, hmax, 1296 * scale / hmax, AMBER)
    reveal(ctx, "看到不成比例之后，", W / 2, H * 0.22, 56, WHITE, seg(t, 1.6, 2.4))
    reveal(ctx, "忍住，不马上下结论", W / 2, H * 0.22 + 84, 56, AMBER, seg(t, 2.4, 3.2))


def s_next(ctx, t, g):
    img = F("s03", "EP03")
    photo(ctx, img, t, g.dur, z=(1.04, 1.14))
    darken(ctx, 0.3)
    dust(ctx, t, 30, 19, AMBER, 0.2)
    reveal(ctx, "同一个分子", W / 2, H * 0.22, 64, WHITE, seg(t, 1.2, 2.2))
    reveal(ctx, "下一集　第一剂", W / 2, H * 0.90 - 40, 44, AMBER, seg(t, g.dur - 2.2, g.dur - 1.2))


G = Group
GROUPS = [
    G(s_open, E.L(1, 2, 3, 4), lead=1.6, tail=1.0, xf=False),
    G(title_scene("EP02", "加倍"), fixed=4.5),
    G(s_three, E.L(5, 6, 7, 8, 9, 10, 11), lead=0.4, tail=1.4),
    G(vote_scene(["剂量加大，吸收比例反而下降，", "最可能的原因是？"],
                 ["A　肝脏代谢加快了", "B　肠道吸收“通道”不够用了", "C　光看这条曲线，分不出来"]), fixed=10),
    G(s_doors, E.L(12, 13, 14), tail=1.6),
    G(s_transporter, E.L(15), lead=0.4, tail=0.8),
    G(s_fbars, E.L(16, 17), tail=1.6),
    G(s_pgp, E.L(18), tail=1.6),
    G(s_toll, E.L(19, 20), tail=1.6),
    G(s_ci, E.L(21, 22), tail=1.6),
    G(s_return, E.L(23), tail=1.2),
    G(map_scene(0, 1, "剂量本身", "剂量加倍，暴露不一定加倍"), E.L(24), lead=0.6, tail=1.2),
    G(limits_scene(["加巴喷丁加量没有用", "暴露 ×2.4 = 疗效 ×2.4", "不成比例都是肝脏代谢饱和",
                    "可以自行调整剂量"]), E.L(25, 26, 27, 28), lead=0.8, tail=1.0),
    G(s_next, E.L(29), lead=0.4, tail=1.6),
    G(end_scene(), E.L(30), lead=1.0, tail=1.4),
]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=float, default=0)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    E.smoke(GROUPS) if a.smoke else E.run(GROUPS, a.limit)
