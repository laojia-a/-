"""EP01 一顿饭 v2：逐场景动画，全部 cairo 代码绘制，不依赖生成图。

用法:
  python tools/ep01.py --smoke            每个场景抽帧绘制一遍，查报错
  python tools/ep01.py --stills 3,40,95   输出若干全片时间点的静帧到 preview/
  python tools/ep01.py --limit 60         只渲染前 60 秒
  python tools/ep01.py                    全片 → EP01_motion.mp4 + plan.tsv + sfx_plan.tsv

所有运动都是时间 t 的解析函数（不存帧间状态），所以交叉淡化、抽帧、预览都画得对。
画面节拍用 E.cue(g, 句, "关键词") 对上配音里念到的词。
"""
import argparse
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403
from common import (ZYTIGA_500, YONSA_125, SERIF_EN, SERIF_ZH, glyph_points,  # noqa: E402
                    cinematic_title, vote_scene, map_scene, end_scene, flare, stext)

E = Episode("EP01")
cue = E.cue
TAU = 2 * math.pi
WATER = "#0D1B24"
ZYTIGA_250 = "#ECE8DF"   # ZYTIGA 250 mg：白色至类白色椭圆素片，刻 AA250（标签 §3）
NEURONTIN_Y = "#E2B437"  # NEURONTIN 300 mg：黄色硬胶囊（标签 §16）


def fade(t, a, b, c, d):
    """a→b 淡入，c→d 淡出。"""
    return seg(t, a, b) * (1 - seg(t, c, d))


def ellipse(ctx, x, y, rx, ry):
    ctx.save()
    ctx.translate(x, y)
    ctx.scale(max(rx, 0.01), max(ry, 0.01))
    ctx.arc(0, 0, 1, 0, TAU)
    ctx.restore()


def dot(ctx, x, y, r, c, a):
    if a <= 0.003:
        return
    ctx.arc(x, y, r, 0, TAU)
    color(ctx, c, a)
    ctx.fill()


def dashed(ctx, x0, y0, x1, y1, c, a, w=2, dash=(12, 10)):
    color(ctx, c, a)
    ctx.set_line_width(w)
    ctx.set_dash(list(dash))
    ctx.move_to(x0, y0)
    ctx.line_to(x1, y1)
    ctx.stroke()
    ctx.set_dash([])


def lines(ctx, rows, x, y, gap, p0, step, t, align="left", a=1.0):
    """rows: [(文字, 字号, 颜色, 粗体)]，逐行上浮。"""
    for k, (s, size, c, bold) in enumerate(rows):
        reveal(ctx, s, x, y + k * gap, size, c, seg(t, p0 + k * step, p0 + k * step + 0.7),
               a, align=align, bold=bold)


# =====================================================================
# 分子：醋酸阿比特龙二维骨架（甾体 A/B/C 六元环 + D 五元环，3β-乙酰氧基，
# Δ5、Δ16 双键，17 位 3-吡啶基）。键长 1，坐标 y 向下。
# =====================================================================

def _build_mol():
    s3 = math.sqrt(3)

    def hexv(cx, cy):  # 顶、左上、左下、底、右下、右上
        return [(cx, cy - 1), (cx - s3 / 2, cy - .5), (cx - s3 / 2, cy + .5),
                (cx, cy + 1), (cx + s3 / 2, cy + .5), (cx + s3 / 2, cy - .5)]

    A, B, C = hexv(0, 0), hexv(s3, 0), hexv(1.5 * s3, -1.5)
    at = dict(C1=A[0], C2=A[1], C3=A[2], C4=A[3], C5=A[4], C10=A[5],
              C6=B[3], C7=B[4], C8=B[5], C9=B[0],
              C11=C[1], C12=C[0], C13=C[5], C14=C[4])
    pcx, pcy = at["C13"][0] + 1 / (2 * math.tan(math.radians(36))), -1.5
    R = 1 / (2 * math.sin(math.radians(36)))

    def pent(deg):
        r = math.radians(deg)
        return (pcx + R * math.cos(r), pcy - R * math.sin(r))

    at.update(C17=pent(72), C16=pent(0), C15=pent(-72))
    at["C18"] = (at["C13"][0], at["C13"][1] - 1)
    at["C19"] = (at["C10"][0], at["C10"][1] - 1)
    c3 = at["C3"]
    at["O3"] = (c3[0] - s3 / 2, c3[1] + .5)
    at["Cac"] = (at["O3"][0] - s3 / 2, at["O3"][1] - .5)
    at["Oac"] = (at["Cac"][0], at["Cac"][1] - 1)
    at["Me"] = (at["Cac"][0] - s3 / 2, at["Cac"][1] + .5)
    ux, uy = math.cos(math.radians(72)), -math.sin(math.radians(72))
    c17 = at["C17"]
    pc = (c17[0] + 2 * ux, c17[1] + 2 * uy)
    for k in range(6):
        r = math.radians(252 + 60 * k)
        at[f"P{k}"] = (pc[0] + math.cos(r), pc[1] - math.sin(r))
    at["P2"] = at["P2"]  # P2 为吡啶 N（与连接碳 P0 间位）
    ring_c = {"A": (0, 0), "B": (s3, 0), "C": (1.5 * s3, -1.5), "D": (pcx, pcy), "P": pc}
    single = ["C1-C2", "C2-C3", "C3-C4", "C4-C5", "C5-C10", "C10-C1", "C6-C7", "C7-C8",
              "C8-C9", "C9-C10", "C9-C11", "C11-C12", "C12-C13", "C13-C14", "C14-C8",
              "C13-C17", "C16-C15", "C15-C14", "C13-C18", "C10-C19", "C3-O3", "O3-Cac",
              "Cac-Me", "C17-P0", "P0-P1", "P2-P3", "P4-P5"]
    double = [("C5-C6", "B"), ("C17-C16", "D"), ("Cac-Oac", None),
              ("P1-P2", "P"), ("P3-P4", "P"), ("P5-P0", "P")]
    hetero = {"O3": "O", "Oac": "O", "P2": "N"}
    xs = [p[0] for p in at.values()]
    ys = [p[1] for p in at.values()]
    c0 = ((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
    return at, single, double, hetero, ring_c, pc, c0


MOL_AT, MOL_S, MOL_D, MOL_HET, MOL_RING, MOL_PYR, MOL_C0 = _build_mol()


def mol_xy(p, cx, cy, s):
    return cx + (p[0] - MOL_C0[0]) * s, cy + (p[1] - MOL_C0[1]) * s


def _mol_segments():
    """返回骨架上所有线段（键长 1 坐标），含双键内线；杂原子端缩短给字母留位。"""
    out = []

    def trim(a, b):
        (x0, y0), (x1, y1) = MOL_AT[a], MOL_AT[b]
        if a in MOL_HET:
            x0, y0 = lerp(x0, x1, 0.28), lerp(y0, y1, 0.28)
        if b in MOL_HET:
            x1, y1 = lerp(x1, x0, 0.28), lerp(y1, y0, 0.28)
        return (x0, y0), (x1, y1)

    for b in MOL_S:
        out.append(trim(*b.split("-")))
    for b, ring in MOL_D:
        a, c = b.split("-")
        p, q = trim(a, c)
        out.append((p, q))
        mx, my = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy)
        nx, ny = -dy / L, dx / L
        if ring:
            rc = MOL_RING[ring]
            if (rc[0] - mx) * nx + (rc[1] - my) * ny < 0:
                nx, ny = -nx, -ny
            o, sh = 0.17, 0.16
        else:
            o, sh = 0.17, 0.0
        p2 = (lerp(p[0], q[0], sh) + nx * o, lerp(p[1], q[1], sh) + ny * o)
        q2 = (lerp(q[0], p[0], sh) + nx * o, lerp(q[1], p[1], sh) + ny * o)
        out.append((p2, q2))
    return out


MOL_SEGS = _mol_segments()


def _mol_points(n=1400, seed=3):
    lens = np.array([math.hypot(q[0] - p[0], q[1] - p[1]) for p, q in MOL_SEGS])
    rng = np.random.default_rng(seed)
    idx = rng.choice(len(MOL_SEGS), n, p=lens / lens.sum())
    u = rng.random(n)
    pts = np.array([[lerp(MOL_SEGS[i][0][0], MOL_SEGS[i][1][0], k),
                     lerp(MOL_SEGS[i][0][1], MOL_SEGS[i][1][1], k)] for i, k in zip(idx, u)])
    # 杂原子处加一小团
    het = np.array([MOL_AT[k] for k in MOL_HET])
    m = n // 12
    pts[:m] = het[rng.integers(0, len(het), m)] + rng.normal(0, 0.08, (m, 2))
    return pts


MOL_PTS = _mol_points()


def draw_mol(ctx, cx, cy, s, a=1.0, c=WHITE, glow=0.0, w=None):
    if a <= 0.003:
        return
    ctx.set_line_cap(cairo.LINE_CAP_ROUND)
    for lw, al in ((s * 0.22, 0.10 * glow), (w or max(2.0, s * 0.05), 1.0)):
        if al <= 0:
            continue
        color(ctx, AMBER if al < 1 else c, a * al)
        ctx.set_line_width(lw)
        for p, q in MOL_SEGS:
            ctx.move_to(*mol_xy(p, cx, cy, s))
            ctx.line_to(*mol_xy(q, cx, cy, s))
        ctx.stroke()
    for k, lab in MOL_HET.items():
        x, y = mol_xy(MOL_AT[k], cx, cy, s)
        text(ctx, lab, x, y + s * 0.2, s * 0.5, AMBER if lab == "N" else c, a, True, "center", False)


# 星云粒子（每个粒子一个目标点）
_rng = np.random.default_rng(11)
NEB_N = len(MOL_PTS)
NEB_R = 60 + 560 * np.sqrt(_rng.random(NEB_N))
NEB_TH = _rng.random(NEB_N) * TAU
NEB_ARM = (np.floor(_rng.random(NEB_N) * 3) * TAU / 3)
NEB_DEL = _rng.random(NEB_N) * 1.4
NEB_SZ = 0.8 + _rng.random(NEB_N) * 1.8
NEB_JIT = _rng.normal(0, 1, (NEB_N, 2))


def nebula_xy(t, cx, cy, burst):
    th = NEB_TH * 0.35 + NEB_ARM + NEB_R * 0.0065 + t * 0.22
    r = NEB_R * burst
    return cx + r * np.cos(th), cy + r * np.sin(th) * 0.42


# =====================================================================
# 冷开场
# =====================================================================

LOCK = (W * 0.70, H * 0.47)
KEY_S = 52.0


def key_pose(p_insert):
    """分子从画面中央（键长 80）移向锁孔，吡啶环对准锁孔。"""
    s = lerp(80, KEY_S, ease_io(p_insert))
    cx0, cy0 = W * 0.5, H * 0.47
    kx = LOCK[0] - (MOL_PYR[0] - MOL_C0[0]) * KEY_S
    ky = LOCK[1] - (MOL_PYR[1] - MOL_C0[1]) * KEY_S
    e = ease_io(p_insert)
    return lerp(cx0, kx, e), lerp(cy0, ky, e), s


def draw_lock(ctx, t, x, y, a, active):
    """CYP17 的示意锁：锁体 + 锁梁；active>0 时锁孔里有光，并往外流出“雄激素”光点。"""
    if a <= 0.003:
        return
    bw, bh = 250, 220
    color(ctx, GREY, 0.8 * a)
    ctx.set_line_width(10)
    ctx.arc(x, y - bh / 2, 85, math.pi, 0)
    ctx.stroke()
    rrect(ctx, x - bw / 2, y - bh / 2, bw, bh, 26)
    g = cairo.LinearGradient(x - bw / 2, 0, x + bw / 2, 0)
    g.add_color_stop_rgba(0, 0.16, 0.17, 0.19, a)
    g.add_color_stop_rgba(0.5, 0.25, 0.26, 0.29, a)
    g.add_color_stop_rgba(1, 0.12, 0.13, 0.15, a)
    ctx.set_source(g)
    ctx.fill_preserve()
    color(ctx, GREY, 0.6 * a)
    ctx.set_line_width(2)
    ctx.stroke()
    glow_spot(ctx, x, y, 120, AMBER, 0.45 * active * a)
    dot(ctx, x, y, 26, "#000000", 0.85 * a)
    dot(ctx, x, y, 22, AMBER, 0.9 * active * a)
    # 雄激素：从锁右侧流出的光点，active 熄灭后流尽
    for k in range(26):
        life = (t * 0.45 + k / 26) % 1.0
        born = t - life / 0.45
        on = active if born > 0 else 0
        px = x + bw / 2 + 20 + life * 280
        py = y + math.sin(life * 7 + k) * 40 * life
        dot(ctx, px, py, 5, AMBER, 0.8 * on * a * (1 - life))
    text(ctx, "CYP17", x, y - 278, 40, WHITE, a, True)
    text(ctx, "雄激素合成所需的一道酶", x, y - 234, 28, GREY, a, False)
    text(ctx, "雄激素", x + bw / 2 + 170, y - 70, 30, AMBER, a * max(active, 0.25), False)


def s_key(ctx, t, g):
    fill_bg(ctx, "#050608")
    dust(ctx, t, 50, 2, WHITE, 0.10, rise=3)
    b1 = g.beat(1, 99)
    t_in0, t_in1 = cue(g, 1, "它要堵住", off=0.4), cue(g, 1, "补给线")
    p_in = seg(t, t_in0, t_in1)
    cx, cy, s = key_pose(p_in)
    # 1) 光点 → 星云 → 收拢成分子
    seed = ease_out(seg(t, 0.1, 0.9))
    burst = ease_out(seg(t, 0.8, 3.2))
    glow_spot(ctx, W / 2, H / 2, 40 + 260 * seed * (1 - 0.6 * burst), WHITE,
              0.5 * seed * (1 - burst * 0.7) * (1 - seg(t, 4.0, 6.0)))
    conv = np.clip((t - 3.0 - NEB_DEL) / 2.2, 0, 1)
    conv = conv * conv * (3 - 2 * conv)
    nx, ny = nebula_xy(t, W / 2, H / 2, burst)
    tx = cx + (MOL_PTS[:, 0] - MOL_C0[0]) * s + NEB_JIT[:, 0] * 2.5 * (1 - conv)
    ty = cy + (MOL_PTS[:, 1] - MOL_C0[1]) * s + NEB_JIT[:, 1] * 2.5 * (1 - conv)
    px, py = nx + (tx - nx) * conv, ny + (ty - ny) * conv
    solid = seg(t, 5.6, 7.0)
    pa = (0.25 + 0.6 * burst) * (1 - 0.75 * solid)
    if seed > 0.5:
        for i in range(NEB_N):
            c = AMBER if i % 9 == 0 else WHITE
            ctx.rectangle(px[i], py[i], NEB_SZ[i], NEB_SZ[i])
            color(ctx, c, pa * (0.6 + 0.4 * math.sin(t * 2 + i)))
            ctx.fill()
    draw_mol(ctx, cx, cy, s, solid, WHITE, glow=solid)
    reveal(ctx, "醋酸阿比特龙", W / 2, H * 0.80, 36, WHITE, seg(t, 6.4, 7.2) * (1 - seg(t, b1, b1 + 0.6)),
           bold=False)
    # 2) 锁：出现 → 钥匙插入 → 光熄灭
    la = seg(t, b1, b1 + 1.0) * (1 - seg(t, g.dur - 0.9, g.dur))
    active = 1 - seg(t, t_in1 + 0.2, t_in1 + 1.2)
    draw_lock(ctx, t, LOCK[0], LOCK[1], la, active)
    if p_in > 0:  # 插入后钥匙在锁孔前面
        draw_mol(ctx, cx, cy, s, 1, WHITE, glow=0.6)
    # 3) 1994 → 2011
    ty0 = cue(g, 1, "一九九四")
    q = seg(t, ty0, ty0 + 0.8)
    if q > 0:
        y = H * 0.80
        x0, x1 = W * 0.28, W * 0.72
        r = ease_io(seg(t, ty0 + 0.4, cue(g, 1, "用了十七年")))
        color(ctx, AMBER, 0.35 * q)
        ctx.set_line_width(3)
        ctx.move_to(x0, y)
        ctx.line_to(lerp(x0, x1, r), y)
        ctx.stroke()
        dot(ctx, x0, y, 9, AMBER, q)
        dot(ctx, x1, y, 9, AMBER, seg(r, 0.95, 1))
        reveal(ctx, "1994", x0, y - 30, 52, AMBER, q)
        text(ctx, "首篇论文（小鼠实验）", x0, y + 50, 26, GREY, q, False)
        reveal(ctx, "2011", x1, y - 30, 52, AMBER, seg(r, 0.9, 1))
        text(ctx, "FDA 批准", x1, y + 50, 26, GREY, seg(r, 0.9, 1), False)
        reveal(ctx, "17 年", W / 2, y - 30, 44, WHITE, seg(t, cue(g, 1, "用了十七年"), cue(g, 1, "用了十七年") + 1),
               count=True)
        tag(ctx, "real", q * (1 - seg(t, g.dur - 0.9, g.dur)), "PubMed · Drugs@FDA")


def s_tablet(ctx, t, g):
    fill_bg(ctx, "#050608")
    dust(ctx, t, 40, 4, WHITE, 0.08, rise=2)
    cx, cy, s = key_pose(1)
    pc = ease_io(seg(t, 0.0, 1.6))
    # 分子压缩到中央，化作一颗药片
    mx, my = lerp(cx, W / 2, pc), lerp(cy, H * 0.45, pc)
    draw_mol(ctx, mx, my, s * (1 - 0.92 * pc), 1 - seg(t, 1.2, 1.7), WHITE, glow=0.8)
    flash = fade(t, 1.4, 1.65, 1.65, 2.4)
    glow_spot(ctx, W / 2, H * 0.45, 380, AMBER, 0.5 * flash)
    t_fall = cue(g, 0, "取决于")
    fall = seg(t, t_fall, t_fall + 2.6)
    e = fall * fall
    ap = seg(t, 1.5, 2.0)
    y = H * 0.45 + e * 520
    sc = 1 - 0.75 * e
    tablet(ctx, W / 2, y, 300 * lerp(0.7, 1, ease_out(ap)) * sc, 146 * lerp(0.7, 1, ease_out(ap)) * sc,
           ZYTIGA_500, "AA", ap * (1 - 0.85 * e), -0.08 + fall * 0.6)
    la = ap * (1 - seg(t, t_fall, t_fall + 0.8))
    text(ctx, "ZYTIGA　醋酸阿比特龙 500 mg", W / 2, H * 0.45 + 150, 34, WHITE, la, False)
    tag(ctx, "real", la, "ZYTIGA 标签 §3")


def s_sun(ctx, t, g):
    fill_bg(ctx, "#050608")
    rise = ease_out(seg(t, 0.2, 3.2))
    push = ease_io(seg(t, 1.6, g.dur))
    cy = lerp(H * 0.86, H * 0.50, rise)
    r = lerp(90, 150, push)
    # 地平线与天光
    glow_spot(ctx, W / 2, cy, 900 * rise, AMBER, 0.16 * rise)
    color(ctx, AMBER, 0.25 * (1 - push))
    ctx.set_line_width(1.5)
    ctx.move_to(0, H * 0.70)
    ctx.line_to(W, H * 0.70)
    ctx.stroke()
    # 蛋白：随推镜浮现的不规则白色轮廓
    wa = seg(t, 1.8, 3.4)
    if wa > 0:
        ctx.new_path()
        for k in range(73):
            th = k / 72 * TAU
            rr = r * 2.5 * (1 + 0.12 * math.sin(3 * th + 1) + 0.07 * math.sin(5 * th + 2))
            ctx.line_to(W / 2 + 30 + rr * math.cos(th) * 1.25, cy + 10 + rr * math.sin(th) * 0.95)
        ctx.close_path()
        gw = cairo.RadialGradient(W / 2, cy, r, W / 2, cy, r * 3.2)
        gw.add_color_stop_rgba(0, 0.95, 0.93, 0.88, 0.85 * wa)
        gw.add_color_stop_rgba(1, 0.75, 0.73, 0.68, 0.55 * wa)
        ctx.set_source(gw)
        ctx.fill()
    # 蛋黄
    gy = cairo.RadialGradient(W / 2 - r * 0.3, cy - r * 0.35, r * 0.1, W / 2, cy, r)
    gy.add_color_stop_rgba(0, 1.0, 0.86, 0.45, rise)
    gy.add_color_stop_rgba(0.7, 0.93, 0.60, 0.12, rise)
    gy.add_color_stop_rgba(1, 0.80, 0.45, 0.08, rise)
    ctx.set_source(gy)
    ctx.arc(W / 2, cy, r, 0, TAU)
    ctx.fill()
    glow_spot(ctx, W / 2 - r * 0.35, cy - r * 0.4, r * 0.35, WHITE, 0.35 * rise)
    if wa < 1:  # 地平线下的部分被遮住（日出），蛋白出现后撤掉
        ctx.set_source_rgba(0.02, 0.024, 0.03, 1 - wa)
        ctx.rectangle(0, H * 0.70, W, H * 0.30)
        ctx.fill()


def pk(x, ka=1.6, ke=0.28):
    return math.exp(-ke * x) - math.exp(-ka * x)


PK_PEAK = max(pk(x / 100) for x in range(1, 2400))
PK_TMAX = 24
X0, X1, Y0 = 260, 1660, 860


def pk_pts(scale, unit, prog, n=240):
    pts = []
    for i in range(int(n * prog) + 1):
        xx = i / n * PK_TMAX
        pts.append((X0 + (X1 - X0) * xx / PK_TMAX, Y0 - unit * scale * pk(xx) / PK_PEAK))
    return pts


Q_PTS = glyph_points("?", 640, SERIF_EN, step=9, limit=900, seed=5)


def s_curve(ctx, t, g):
    fill_bg(ctx, "#050608")
    dust(ctx, t, 25, 5, WHITE, 0.10)
    b1 = g.beat(1, 99)
    t17 = cue(g, 0, "十七倍")
    unit = lerp(70, 40, ease_io(seg(t, t17 - 1.4, t17 + 0.4)))
    end = seg(t, g.dur - 1.5, g.dur - 0.3)     # 坍缩成光缝
    dim = 1 - 0.7 * seg(t, b1, b1 + 1.0)
    ca = dim * (1 - end)
    # 蛋黄落到地平线左端，变成原点
    yolk = 1 - seg(t, 0, 0.9)
    if yolk > 0:
        yy = lerp(Y0, H * 0.5, yolk)
        xx = lerp(X0, W / 2, yolk)
        dot(ctx, xx, yy, 150 * yolk + 6, AMBER, 0.9)
    ax = ease_io(seg(t, 0.3, 1.4))
    color(ctx, GREY, 0.6 * ca)
    ctx.set_line_width(2)
    ctx.move_to(X0, Y0)
    ctx.line_to(lerp(X0, X1 + 20, ax), Y0)
    ctx.stroke()
    text(ctx, "血药浓度", X0 - 10, 150, 28, GREY, ax * ca, False, "left")
    text(ctx, "时间", X1, Y0 + 46, 28, GREY, ax * ca, False, "right")
    pf = ease_io(seg(t, cue(g, 0, "同一颗药"), cue(g, 0, "同一颗药") + 2.2))
    pe = ease_io(seg(t, cue(g, 0, "高脂早餐"), t17 + 0.2))
    pts_f = pk_pts(1, unit, pf)
    pts_e = pk_pts(17, unit, pe)
    polyline(ctx, pts_f, WHITE, 4, ca)
    polyline(ctx, pts_e, AMBER, 5, ca)
    text(ctx, "空腹", X0 + 190, Y0 - unit * 1.0 - 12, 30, WHITE, pf * ca, False, "left")
    px = X0 + (X1 - X0) * 1.75 / PK_TMAX
    q = seg(t, t17 - 0.2, t17 + 1.0)
    reveal(ctx, "×17", px + 60, Y0 - unit * 17 + 70, 120, AMBER, q, ca, align="left", count=True)
    reveal(ctx, "峰浓度 Cmax　高脂餐 825 kcal（57% 脂肪）", px + 66, Y0 - unit * 17 + 130, 32, AMBER,
           seg(t, t17 + 0.4, t17 + 1.4), ca, align="left", bold=False)
    text(ctx, "健康志愿者单次服药　曲线形状为示意，倍数来自标签", X1, Y0 + 92, 24, GREY,
         seg(t, t17, t17 + 1) * ca, False, "right")
    tag(ctx, "real", seg(t, t17 - 0.2, t17 + 0.6) * ca, "ZYTIGA 标签 §12.3")
    # 问号：粒子从餐后曲线飞出聚成问号，结尾坍缩成横向光缝
    qa = seg(t, b1 + 0.2, b1 + 2.4)
    if qa > 0 and pts_e:
        n = len(Q_PTS)
        rng = np.random.default_rng(9)
        src = np.array(pts_e)[rng.integers(0, len(pts_e), n)]
        dl = rng.random(n) * 0.5
        k = np.clip((t - b1 - 0.2 - dl * 1.5) / 1.6, 0, 1)
        k = k * k * (3 - 2 * k)
        gx, gy = W * 0.74 + Q_PTS[:, 0], H * 0.44 + Q_PTS[:, 1]
        x = src[:, 0] + (gx - src[:, 0]) * k + np.sin(t * 1.5 + dl * 20) * 3
        y = src[:, 1] + (gy - src[:, 1]) * k + np.cos(t * 1.3 + dl * 20) * 3
        ce = ease_io(end)
        x = x + (W / 2 + (x - W * 0.74) * 3.2 - x) * ce
        y = y + (H * 0.47 - y) * ce
        for i in range(n):
            ctx.rectangle(x[i], y[i], 2.4, 2.4)
            color(ctx, AMBER if i % 5 == 0 else WHITE, 0.75 * (k[i] * 0.7 + 0.3) * (1 - end * 0.6))
            ctx.fill()
    if end > 0:
        flare(ctx, W / 2, H * 0.47, W * 1.2 * ease_out(end), end)


# =====================================================================
# 第一幕 一条河
# =====================================================================

TOP, BOT = 400, 880          # 河道上下沿
BANK0, BANK1 = 720, 1240     # 吸收岸
GATE_X = 1790
NSEG = 10

_r = np.random.default_rng(21)
NST = 170
ST_Y = TOP + 14 + _r.random(NST) * (BOT - TOP - 28)
ST_X = _r.random(NST) * (W + 300)
ST_V = 50 + 160 * np.sin(np.pi * (ST_Y - TOP) / (BOT - TOP))
ST_L = 25 + _r.random(NST) * 70
ST_A = 0.06 + _r.random(NST) * 0.16


def river_bg(ctx, t, gold=None, lit=None, a=1.0, gate=1.0):
    """gold: 胆汁前锋 x（None 表示没有）；lit: 吸收岸各段亮度。"""
    fill_bg(ctx, "#07090B")
    # 岸
    color(ctx, "#15110D", a)
    ctx.rectangle(0, TOP - 70, W, 70)
    ctx.fill()
    # 水
    gw = cairo.LinearGradient(0, TOP, 0, BOT)
    gw.add_color_stop_rgba(0, 0.05, 0.11, 0.14, a)
    gw.add_color_stop_rgba(1, 0.03, 0.06, 0.08, a)
    ctx.set_source(gw)
    ctx.rectangle(0, TOP, W, BOT - TOP)
    ctx.fill()
    color(ctx, "#05080A", a)
    ctx.rectangle(0, BOT, W, 70)
    ctx.fill()
    for k in range(12):  # 水下缓慢漂移的光斑
        cx = (k * 173 + t * (18 + k * 2)) % (W + 400) - 200
        cy = TOP + 60 + (k * 97) % (BOT - TOP - 120) + math.sin(t * 0.3 + k) * 20
        glow_spot(ctx, cx, cy, 160 + (k % 4) * 40, "#4F8FB0", 0.05 * a)
    if gold is not None and gold > 0:
        gg = cairo.LinearGradient(gold - 260, 0, gold, 0)
        gg.add_color_stop_rgba(0, *rgba(AMBER, 0.16 * a))
        gg.add_color_stop_rgba(1, *rgba(AMBER, 0))
        color(ctx, AMBER, 0.16 * a)
        ctx.rectangle(0, TOP, max(0, gold - 260), BOT - TOP)
        ctx.fill()
        ctx.set_source(gg)
        ctx.rectangle(max(0, gold - 260), TOP, min(260, gold), BOT - TOP)
        ctx.fill()
    # 水流纹
    ctx.set_line_width(2)
    xs = (ST_X + ST_V * t) % (W + 300) - 150
    for i in range(NST):
        color(ctx, "#7FA3B8", ST_A[i] * a)
        ctx.move_to(xs[i], ST_Y[i])
        ctx.line_to(xs[i] - ST_L[i], ST_Y[i])
        ctx.stroke()
    # 吸收岸：底色常亮一点，被渡船送到的段落亮起
    sw = (BANK1 - BANK0) / NSEG
    for k in range(NSEG):
        lv = 0.25 + 0.75 * (lit[k] if lit is not None else 0)
        x = BANK0 + k * sw
        color(ctx, AMBER, (0.25 + 0.55 * lv) * a)
        ctx.rectangle(x + 3, TOP - 8, sw - 6, 8)
        ctx.fill()
        glow_spot(ctx, x + sw / 2, TOP - 4, sw * 0.9, AMBER, 0.12 * lv * a)
    # 河尽头的暗门
    if gate > 0:
        gd = cairo.LinearGradient(GATE_X - 80, 0, W, 0)
        gd.add_color_stop_rgba(0, 0, 0, 0, 0)
        gd.add_color_stop_rgba(0.5, 0, 0, 0, 0.85 * gate * a)
        gd.add_color_stop_rgba(1, 0, 0, 0, gate * a)
        ctx.set_source(gd)
        ctx.rectangle(GATE_X - 80, TOP - 70, W - GATE_X + 80, BOT - TOP + 140)
        ctx.fill()
        color(ctx, GREY, 0.35 * gate * a)
        ctx.set_line_width(3)
        ctx.move_to(GATE_X, BOT + 40)
        ctx.line_to(GATE_X, TOP - 30)
        ctx.stroke()


# 晶体（“石子”）
_c = np.random.default_rng(31)
NCR = 70
CR_DX = _c.uniform(-60, 60, NCR)
CR_BED = _c.uniform(790, 868, NCR)
CR_SINK = _c.uniform(1.0, 2.2, NCR)
CR_V = _c.uniform(62, 112, NCR)
CR_SZ = _c.uniform(8, 17, NCR)
CR_ROT = _c.random(NCR) * TAU
CR_SPIN = _c.uniform(-0.5, 0.5, NCR)
CR_SHAPE = [sorted(_c.random(int(_c.integers(4, 7))) * TAU) for _ in range(NCR)]
CR_RAD = [0.7 + 0.5 * _c.random(len(s)) for s in CR_SHAPE]
DROP_X, DROP_Y = 300, 440


def cry_pos(i, tau, slow=1.0):
    x = DROP_X + CR_DX[i] * 2.6 * ease_out(min(1, tau / 0.8)) + CR_V[i] * slow * max(0, tau - 0.5)
    y = lerp(DROP_Y, CR_BED[i], ease_out(min(1, tau / CR_SINK[i]))) + math.sin(tau * 0.8 + i) * 3
    return x, y


def crystal(ctx, x, y, s, rot, a, c="#B9C4CE", metal=0.0):
    if a <= 0.003:
        return
    i = int(abs(rot * 1000)) % NCR
    ctx.new_path()
    for th, rr in zip(CR_SHAPE[i], CR_RAD[i]):
        ctx.line_to(x + s * rr * math.cos(th + rot), y + s * rr * math.sin(th + rot))
    ctx.close_path()
    color(ctx, c, 0.75 * a)
    ctx.fill_preserve()
    color(ctx, WHITE, 0.5 * a)
    ctx.set_line_width(1.2)
    ctx.stroke()
    if metal > 0:  # 硬币般的金属闪光
        tw = max(0.0, math.sin(rot * 3 + x * 0.02)) ** 8
        glow_spot(ctx, x, y, s * 2.4, AMBER, 0.55 * metal * tw * a)


def crystals(ctx, t, t0, slow=1.0, skip=(), a=1.0, metal=0.0, gate_count=None):
    """画一次药片崩解出的整群晶体；返回已流出暗门的个数。"""
    out = 0
    if t < t0:
        return 0
    for i in range(NCR):
        if i in skip:
            continue
        tau = t - t0
        x, y = cry_pos(i, tau, slow)
        if x > GATE_X + 60:
            out += 1
            continue
        fa = 1 - seg(x, GATE_X - 40, GATE_X + 60)
        crystal(ctx, x, y, CR_SZ[i], CR_ROT[i] + CR_SPIN[i] * tau, a * fa, metal=metal)
    return out


# 胶束（“渡船”）
NMIC = 26
MIC_ORDER = list(np.argsort(CR_V))[:NMIC]   # 慢的晶体先被装上船
MIC_DT = 0.33


def mic_state(j, t, tm, t2, slow):
    """第 j 艘渡船：(x, y, 半径, 透明度, 到岸时刻, 岸段)。"""
    i = MIC_ORDER[j]
    c = tm + j * MIC_DT
    cx, cy = cry_pos(i, c - t2, slow)
    bx = clamp(cx + 140 + (j * 53) % 120, BANK0 + 25, BANK1 - 25)
    arr = c + 3.0
    p = ease_io(seg(t, c + 0.5, arr))
    x = lerp(cx, bx, p) + math.sin(t * 1.2 + j) * 6 * (1 - p)
    y = lerp(cy, TOP + 26, p)
    r = 26 * ease_out(seg(t, c, c + 0.6))
    al = 1 - seg(t, arr, arr + 0.7)
    segk = int((bx - BANK0) / (BANK1 - BANK0) * NSEG)
    return x, y, r, al, arr, min(NSEG - 1, segk), c, i


def micelle(ctx, t, x, y, r, a, cargo=None):
    if a <= 0.003 or r < 1:
        return
    glow_spot(ctx, x, y, r * 1.9, AMBER, 0.14 * a)
    dot(ctx, x, y, r * 0.8, AMBER, 0.08 * a)
    for k in range(16):
        th = k / 16 * TAU + t * 0.4
        dot(ctx, x + r * math.cos(th), y + r * math.sin(th), 4.2, AMBER, 0.9 * a)
    if cargo is not None:
        crystal(ctx, x, y, cargo, t * 0.3, a * 0.9)


def bank_lit(t, tm, t2, slow):
    lit = [0.0] * NSEG
    for j in range(NMIC):
        _x, _y, _r, _a, arr, k, _c, _i = mic_state(j, t, tm, t2, slow)
        lit[k] = min(1.0, lit[k] + 0.6 * ease_out(seg(t, arr, arr + 0.8)))
    return lit


def sparks(ctx, t, x, t0, n=5, c=AMBER):
    p = seg(t, t0, t0 + 1.6)
    if 0 < p < 1:
        for k in range(n):
            dx = (k - n / 2) * 9
            dot(ctx, x + dx * (1 + p), TOP - 10 - p * (90 + 20 * k), 3.5, c, 0.9 * (1 - p))


def river_times(g):
    t1 = g.beat(1, 99) + 0.4                      # 第一颗药落水崩解
    t2 = cue(g, 3, "早餐来了", after=True) + 0.9   # 第二颗（随早餐）
    tb = cue(g, 3, "胆囊收缩")                      # 胆汁闸门打开
    tm = cue(g, 4, "胶束", off=-0.6)                # 渡船开始装货
    return t1, t2, tb, tm


SLOW_FED = 0.55


def s_river(ctx, t, g):
    t1, t2, tb, tm = river_times(g)
    b = [g.beat(i, 99) for i in range(6)]
    gold = 180 + 300 * (t - tb) if t > tb else None
    lit = bank_lit(t, tm, t2, SLOW_FED) if t > tm else None
    # 俯冲：画面从放大回到常态
    dive = ease_out(seg(t, 0, 1.8))
    ctx.save()
    z = lerp(1.6, 1.0, dive)
    ctx.translate(DROP_X, DROP_Y)
    ctx.scale(z, z)
    ctx.translate(-DROP_X, -DROP_Y)
    river_bg(ctx, t, gold, lit, a=dive)
    ctx.restore()
    tag(ctx, "schematic", dive)
    reveal(ctx, "吸收最好的一段", (BANK0 + BANK1) / 2, TOP - 92, 30, AMBER,
           fade(t, cue(g, 0, "吸收最好"), cue(g, 0, "吸收最好") + 0.8, b[1] + 3, b[1] + 4), bold=False)
    # 第一颗药：俯冲、漂在水面、落水崩解
    fl = ease_io(seg(t, 0, 1.6))
    ta = 1 - seg(t, t1, t1 + 0.4)
    tablet(ctx, lerp(W / 2, DROP_X, fl), lerp(H * 0.35, DROP_Y, fl) + math.sin(t * 2) * 3,
           lerp(260, 110, fl), lerp(126, 54, fl), ZYTIGA_500, "AA", ta, -0.1)
    n_out = crystals(ctx, t, t1, 1.0, a=1 - seg(t, b[3], b[3] + 1.5))
    if t1 < t < t1 + 0.6:
        glow_spot(ctx, DROP_X, DROP_Y, 160, WHITE, 0.3 * (1 - seg(t, t1, t1 + 0.6)))
    # 第一句文字：几乎不溶于水
    q = fade(t, b[1] + 0.4, b[1] + 1.2, b[2] - 0.2, b[2] + 0.5)
    lines(ctx, [("醋酸阿比特龙", 44, WHITE, True), ("practically insoluble in water　几乎不溶于水", 32, AMBER, False)],
          130, 200, 58, b[1] + 0.4, 0.4, t, a=1 - seg(t, b[2] - 0.2, b[2] + 0.5))
    tag(ctx, "real", q, "ZYTIGA 标签 §11")
    # 暗门计数：粪便 ~88%
    c0 = b[2] + 0.5
    qc = fade(t, c0, c0 + 0.8, b[3] - 0.3, b[3] + 0.6)
    if qc > 0:
        # 数字随晶体流出暗门滚动，并保证念到“百分之八十八”时停在 88%
        say = cue(g, 2, "百分之八十八", after=True)
        frac = max(min(1.0, n_out / NCR), ease_out(seg(t, c0, say)))
        text(ctx, "放射性标记研究", 1600, 150, 28, GREY, qc, False, "center")
        text(ctx, f"粪便　约 {round(88 * frac)}%", 1600, 220, 52, AMBER, qc)
        reveal(ctx, "其中原形醋酸阿比特龙约 55%", 1600, 280, 30, AMBER,
               seg(t, cue(g, 2, "其中一大半"), cue(g, 2, "其中一大半") + 0.8), qc, bold=False)
        tag(ctx, "real", qc, "ZYTIGA 标签 §12.3")
    # 早餐来了：上游一枚小蛋黄，胆汁闸门
    eb = fade(t, b[3], b[3] + 0.8, b[5], b[5] + 1)
    if eb > 0:
        glow_spot(ctx, 200, 190, 120, AMBER, 0.25 * eb)
        dot(ctx, 200, 190, 30, AMBER, eb)
        text(ctx, "早餐", 200, 260, 28, AMBER, eb, False)
    open_ = ease_out(seg(t, tb, tb + 1.0))
    if open_ > 0:
        color(ctx, AMBER, 0.6 * open_)
        ctx.rectangle(178, TOP - 70, 44, 70)
        ctx.fill()
        reveal(ctx, "胆汁", 290, TOP - 92, 30, AMBER, fade(t, tb + 0.3, tb + 1.0, b[4] + 2, b[4] + 3), bold=False)
        for k in range(70):  # 胆汁油滴
            s0 = tb + k * 0.09
            tau = t - s0
            if tau < 0 or tau > 7:
                continue
            x = 200 + (140 + (k * 37) % 120) * tau
            y = lerp(TOP + 6, TOP + 30 + (k * 71) % (BOT - TOP - 60), ease_out(min(1, tau / 1.4)))
            ctx.arc(x, y, 3 + (k % 5), 0, TAU)
            color(ctx, AMBER, 0.55 * (1 - tau / 7))
            ctx.set_line_width(1.5)
            ctx.stroke()
    # 第二颗药（随早餐）
    if t > b[3]:
        fp = seg(t, t2 - 0.9, t2)
        tablet(ctx, DROP_X, lerp(160, DROP_Y, fp * fp), 110, 54, ZYTIGA_500, "AA",
               seg(t, t2 - 0.9, t2 - 0.6) * (1 - seg(t, t2, t2 + 0.4)), 0.2)
    captured = {MIC_ORDER[j] for j in range(NMIC) if t >= tm + j * MIC_DT}
    crystals(ctx, t, t2, SLOW_FED, skip=captured)
    # 渡船
    for j in range(NMIC):
        x, y, r, al, arr, k, c, i = mic_state(j, t, tm, t2, SLOW_FED)
        if t < c:
            continue
        micelle(ctx, t, x, y, r, al, CR_SZ[i] * 0.6 * (1 - seg(t, arr - 0.6, arr)))
        if t > arr:
            sparks(ctx, t, x, arr)
    j0 = mic_state(0, t, tm, t2, SLOW_FED)
    reveal(ctx, "胶束 micelle", j0[0], j0[1] - 52, 30, AMBER,
           fade(t, j0[6] + 0.4, j0[6] + 1.0, j0[4] - 0.5, j0[4]), bold=False)
    # 解释不唯一
    if t > b[5] - 0.3:
        dk = seg(t, b[5], b[5] + 0.8)
        darken_rect(ctx, 0, 90, W, 230, 0.55 * dk)
        hyp = [("胆汁胶束增溶？", b[5] + 0.2), ("胃排空变慢？", cue(g, 5, "胃排空")),
               ("在肠道停留更久？", cue(g, 5, "停留更久"))]
        for k, (s, at) in enumerate(hyp):
            reveal(ctx, s, W * (0.22 + 0.28 * k), 200, 44, WHITE, seg(t, at, at + 0.8))
        ob = cue(g, 5, "光看这一条曲线")
        r = seg(t, ob, ob + 0.9)
        if r > 0:
            darken(ctx, 0.45 * r)
            reveal(ctx, "观察　≠　机制", W / 2, H * 0.56, 96, WHITE, r)


def darken_rect(ctx, x, y, w, h, a):
    if a > 0.003:
        ctx.set_source_rgba(0.027, 0.035, 0.043, a)
        ctx.rectangle(x, y, w, h)
        ctx.fill()


# 身份卡
HEAD = ["产品", "给药", "人群", "餐型", "结果"]
CW, CH, CG = 300, 210, 22


def card(ctx, t, cy, vals, times, hi=(), a=1.0, head=1.0):
    x0 = W / 2 - (5 * CW + 4 * CG) / 2
    for i, h in enumerate(HEAD):
        x = x0 + i * (CW + CG)
        on = i in hi
        rrect(ctx, x, cy - CH / 2, CW, CH, 18)
        color(ctx, AMBER if on else WHITE, (0.10 if on else 0.05) * a * head)
        ctx.fill_preserve()
        color(ctx, AMBER if on else GREY, (0.85 if on else 0.35) * a * head)
        ctx.set_line_width(3 if on else 2)
        ctx.stroke()
        if on:
            glow_spot(ctx, x + CW / 2, cy, CW * 0.8, AMBER, 0.10 * a)
        text(ctx, h, x + CW / 2, cy - CH / 2 + 48, 28, GREY, a * head, False)
        if not vals:
            continue
        rows = vals[i] if isinstance(vals[i], tuple) else (vals[i],)
        ts = times[i] if isinstance(times[i], tuple) else (times[i],) * len(rows)
        for k, s in enumerate(rows):
            yy = cy + 22 + (k - (len(rows) - 1) / 2) * 52
            reveal(ctx, s, x + CW / 2, yy, 40 if len(s) < 7 else 34, AMBER if (on or i == 4) else WHITE,
                   seg(t, ts[k], ts[k] + 0.6), a)


def x_card(i):
    return W / 2 - (5 * CW + 4 * CG) / 2 + i * (CW + CG) + CW / 2


def s_card1(ctx, t, g):
    river_bg(ctx, t + 80, None, [0.6] * NSEG)
    darken(ctx, 0.62)
    rise = ease_out(seg(t, 0.0, 1.2))
    cy = H * 0.50 + (1 - rise) * 160
    reveal(ctx, "先给“×17”写一张身份卡", W / 2, H * 0.22, 50, WHITE, seg(t, 0.2, 1.0))
    ts = [cue(g, 0, "ZYTIGA"), cue(g, 0, "单次"), cue(g, 0, "健康志愿者"),
          (cue(g, 0, "高脂餐"), cue(g, 0, "八百二十五")),
          (cue(g, 0, "峰浓度"), cue(g, 0, "总暴露"))]
    card(ctx, t, cy, ["ZYTIGA", "单次", "健康志愿者", ("高脂餐", "825 kcal"), ("Cmax ×17", "AUC ×10")],
         ts, a=rise, head=rise)
    tag(ctx, "real", rise, "ZYTIGA 标签 §12.3")


def s_card2(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 25, 7, WHITE, 0.08)
    reveal(ctx, "答案：C　小得多", W / 2, 120, 50, AMBER, seg(t, 0.1, 0.8))
    card(ctx, t, 330, ["ZYTIGA", "单次", "健康志愿者", ("高脂餐", "825 kcal"), ("Cmax ×17", "AUC ×10")],
         [-9] * 5, a=0.6)
    sl = ease_out(seg(t, 0.6, 1.6))
    cy2 = 680 + (1 - sl) * 260
    ts = [cue(g, 0, "同一份"), cue(g, 0, "每天服药"), cue(g, 0, "患者"), cue(g, 0, "高脂餐"),
          cue(g, 0, "两倍")]
    card(ctx, t, cy2, ["ZYTIGA", ("每日", "连续 7 天"), "前列腺癌患者", "高脂餐", "AUC ×2"],
         ts, hi={1, 2, 4} if t > cue(g, 0, "两倍") + 0.6 else (), a=sl, head=sl)
    # 三条线：人群、次数、指标
    links = [(2, "人群", cue(g, 1, "谁在吃")), (1, "次数", cue(g, 1, "吃几次")), (4, "指标", cue(g, 1, "量的是什么"))]
    for i, lab, at in links:
        p = ease_out(seg(t, at, at + 0.7))
        if p <= 0:
            continue
        x = x_card(i)
        y0, y1 = 330 + CH / 2 + 6, cy2 - CH / 2 - 6
        color(ctx, AMBER, 0.9 * p)
        ctx.set_line_width(4)
        ctx.move_to(x, y0)
        ctx.line_to(x, lerp(y0, y1, p))
        ctx.stroke()
        text(ctx, lab, x + 18, (y0 + y1) / 2 + 12, 34, AMBER, p, True, "left")
    tag(ctx, "real", 1, "ZYTIGA 标签 §12.3")


# =====================================================================
# 第二幕：磨盘、柱子、两颗药
# =====================================================================

def gear(ctx, x, y, r, teeth, ang, a):
    ctx.new_path()
    n = teeth * 4
    for k in range(n + 1):
        th = ang + k / n * TAU
        rr = r if (k // 2) % 2 == 0 else r * 0.86
        ctx.line_to(x + rr * math.cos(th), y + rr * math.sin(th))
    ctx.close_path()
    g = cairo.RadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
    g.add_color_stop_rgba(0, 0.45, 0.46, 0.50, a)
    g.add_color_stop_rgba(1, 0.16, 0.17, 0.19, a)
    ctx.set_source(g)
    ctx.fill_preserve()
    color(ctx, AMBER, 0.45 * a)
    ctx.set_line_width(2)
    ctx.stroke()
    dot(ctx, x, y, r * 0.22, "#07090B", a)
    color(ctx, GREY, 0.6 * a)
    ctx.set_line_width(3)
    ctx.arc(x, y, r * 0.55, 0, TAU)
    ctx.stroke()


MILL = (840, 590)
YT = (1480, 600)   # YONSA 药片成形处
NSAND = 360
_s = np.random.default_rng(41)
SA_K = _s.integers(0, 40, NSAND)
SA_DX = _s.normal(0, 1, (NSAND, 2))
SA_TGT = np.stack([_s.normal(0, 0.42, NSAND), _s.normal(0, 0.40, NSAND)], 1)


def s_mill(ctx, t, g):
    river_bg(ctx, t + 40, gate=0.4)
    tag(ctx, "schematic", 1)
    ty = cue(g, 0, "YONSA")
    form = seg(t, ty - 0.4, ty + 1.6)
    ga = seg(t, 0.2, 1.0) * (1 - 0.6 * seg(t, ty + 1.0, ty + 2.0))
    gear(ctx, MILL[0], MILL[1], 150, 14, t * 0.5, ga)
    gear(ctx, MILL[0] + 228, MILL[1] - 100, 92, 9, -t * 0.5 * 150 / 92 + 0.2, ga)
    # 石子从上游流向磨盘，过磨盘后碎成细沙
    for k in range(40):
        s0 = k * 0.35 - 2.5
        tau = t - s0
        if tau < 0:
            continue
        x = -40 + 150 * tau
        y = MILL[1] + 40 + math.sin(k * 1.7) * 90
        if x < MILL[0] - 40:
            crystal(ctx, x, y, CR_SZ[k], CR_ROT[k] + tau * 0.6, 1)
            continue
        tg = (x - (MILL[0] - 40)) / 150      # 过磨盘后的秒数
        for m in np.nonzero(SA_K == k)[0]:
            sx = MILL[0] + 60 + tg * 120 + SA_DX[m, 0] * 30 * min(1, tg)
            sy = y + SA_DX[m, 1] * 40 * min(1, tg)
            fx, fy = YT[0] + SA_TGT[m, 0] * 120, YT[1] + SA_TGT[m, 1] * 60
            fe = ease_io(form)
            sx, sy = lerp(sx, fx, fe), lerp(sy, fy, fe)
            al = (1 - seg(tg, 3, 6)) * (1 - form) + 0.0
            dot(ctx, sx, sy, 2.2, "#DCE6EE", 0.8 * max(al, 0))
    ap = ease_out(seg(t, ty + 0.6, ty + 1.8))
    if form > 0:
        glow_spot(ctx, YT[0], YT[1], 260, WHITE, 0.25 * fade(t, ty, ty + 1.2, ty + 1.2, ty + 2.2))
    tablet(ctx, YT[0], YT[1], 220 * lerp(0.8, 1, ap), 108 * lerp(0.8, 1, ap), YONSA_125, "125 FP", ap, 0.06,
           film=False)
    text(ctx, "YONSA　醋酸阿比特龙 125 mg　微粉化", YT[0], YT[1] + 130, 32, WHITE, ap, False)
    t5 = cue(g, 0, "每天五百毫克")
    reveal(ctx, "每日 500 mg", YT[0], 230, 56, AMBER, seg(t, t5, t5 + 0.8), count=True)
    tf = cue(g, 0, "可以随餐")
    reveal(ctx, "说明书：可随餐，也可不随餐", YT[0], 300, 36, AMBER, seg(t, tf, tf + 0.8), bold=False)
    tag(ctx, "real", ap, "YONSA 标签 §2、§11")


def s_bars(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 19, WHITE, 0.08)
    reveal(ctx, "高脂餐让暴露变成空腹的几倍", W / 2, 130, 48, WHITE, seg(t, 0, 0.8))
    text(ctx, "各自与各自的空腹相比", W / 2, 186, 28, GREY, seg(t, 0.4, 1.2), False)
    base, sc = 780, 26
    ty = cue(g, 0, "高脂餐仍然")
    zx, yx = W * 0.32, W * 0.68
    bars(ctx, t, [("峰浓度 Cmax", 17, AMBER), ("总暴露 AUC", 10, AMBER)], zx - 155, base, sc, 0.3,
         bw=130, gap=50, label_y=44)
    bars(ctx, t, [("峰浓度 Cmax", 6.5, AMBER), ("总暴露 AUC", 4.4, AMBER)], yx - 155, base, sc, ty,
         bw=130, gap=50, label_y=44)
    # 空腹 = 1 的虚线：YONSA 的柱子矮，但不是零
    da = seg(t, cue(g, 0, "只是小得多"), cue(g, 0, "只是小得多") + 0.8) + 0.35 * seg(t, 0.3, 1.0)
    dashed(ctx, W * 0.14, base - sc, W * 0.86, base - sc, WHITE, 0.55 * min(1, da))
    text(ctx, "空腹 = 1", W * 0.14 - 10, base - sc + 10, 26, WHITE, min(1, da), False, "right")
    pa = seg(t, 0.2, 0.9)
    tablet(ctx, zx - 110, base + 120, 110, 54, ZYTIGA_500, "AA", pa, -0.05)
    text(ctx, "ZYTIGA", zx + 10, base + 132, 38, WHITE, pa, True, "left")
    pb = seg(t, ty - 0.4, ty + 0.4)
    tablet(ctx, yx - 110, base + 120, 90, 44, YONSA_125, "125 FP", pb, 0.05, film=False)
    text(ctx, "YONSA", yx + 10, base + 132, 38, WHITE, pb, True, "left")
    tj = cue(g, 0, "允许随餐")
    q = seg(t, tj, tj + 0.8)
    if q > 0:
        color(ctx, AMBER, 0.7 * q)
        ctx.set_line_width(2)
        rrect(ctx, yx - 230, 250, 460, base + 175 - 250, 24)
        ctx.stroke()
        text(ctx, "随餐与否：依据它自己的整套研究", yx, 300, 30, AMBER, q, False)
    tag(ctx, "real", 1, "ZYTIGA / YONSA 标签 §12.3")


def s_twins(ctx, t, g):
    fill_bg(ctx, "#060709")
    dust(ctx, t, 30, 23, WHITE, 0.08)
    b1 = g.beat(1, 99)
    sp = ease_io(seg(t, b1, b1 + 1.4))
    slit = 0.4 + 0.6 * seg(t, b1, b1 + 1.2)
    gl = cairo.LinearGradient(W / 2 - 40 - 200 * sp, 0, W / 2 + 40 + 200 * sp, 0)
    gl.add_color_stop_rgba(0, 1, 1, 1, 0)
    gl.add_color_stop_rgba(0.5, 1, 0.92, 0.75, 0.22 * slit)
    gl.add_color_stop_rgba(1, 1, 1, 1, 0)
    ctx.set_source(gl)
    ctx.rectangle(0, 0, W, H)
    ctx.fill()
    color(ctx, WHITE, 0.8 * slit * (1 - 0.85 * seg(t, b1 + 0.2, b1 + 1.0)))
    ctx.rectangle(W / 2 - 1.5, H * 0.12, 3, H * 0.70)
    ctx.fill()
    pa = ease_out(seg(t, 0.1, 1.0))
    dim = 1 - 0.6 * sp
    tablet(ctx, lerp(W * 0.33, W * 0.20, sp), H * 0.48, 320, 156, ZYTIGA_500, "AA", pa * dim, -0.06)
    tablet(ctx, lerp(W * 0.67, W * 0.80, sp), H * 0.48, 220, 108, YONSA_125, "125 FP", pa * dim, 0.05, film=False)
    text(ctx, "ZYTIGA 500 mg", lerp(W * 0.33, W * 0.20, sp), H * 0.48 + 140, 30, GREY, pa * dim, False)
    text(ctx, "YONSA 125 mg", lerp(W * 0.67, W * 0.80, sp), H * 0.48 + 140, 30, GREY, pa * dim, False)
    tw = cue(g, 0, "不能和")
    q = fade(t, tw, tw + 0.8, b1, b1 + 0.6)
    reveal(ctx, "YONSA 说明书：不能与其他阿比特龙产品互换", W / 2, H * 0.17, 46, AMBER, q)
    tag(ctx, "real", q, "YONSA 标签 §2")
    reveal(ctx, "食物效应不属于一个分子", W / 2, H * 0.44, 66, WHITE, seg(t, b1 + 0.3, b1 + 1.2))
    t2 = cue(g, 1, "它属于")
    reveal(ctx, "它属于一个具体的产品", W / 2, H * 0.44 + 100, 66, AMBER, seg(t, t2, t2 + 0.9))


# =====================================================================
# 第三幕：冲进下水道的药
# =====================================================================

def paper(ctx, x, y, w, h, rows, p, src_a=1.0):
    if p <= 0.003:
        return
    e = ease_out(p)
    rrect(ctx, x, y + (1 - e) * 30, w, h, 14)
    color(ctx, "#E9E3D6", 0.92 * e)
    ctx.fill()
    yy = y + (1 - e) * 30 + 58
    for s, size, c, bold in rows:
        text(ctx, s, x + 36, yy, size, c, e, bold, "left", False)
        yy += size + 18


def s_drain(ctx, t, g):
    river_bg(ctx, t + 120, gate=1.0)
    b1 = g.beat(1, 99)
    dens = 0.3 + 0.7 * seg(t, b1 - 2, b1 + 4)
    # 一串串带金属光的晶体流向暗门
    for k in range(120):
        if (k * 0.618) % 1 > dens:
            continue
        ph = (k * 0.37) % 1
        tau = (t * 0.12 + ph) % 1.0
        x = -60 + tau * (GATE_X + 120)
        y = 600 + math.sin(k * 2.3) * 220 + math.sin(t + k) * 6
        fa = 1 - seg(x, GATE_X - 40, GATE_X + 60)
        crystal(ctx, x, y, CR_SZ[k % NCR] * 0.9, CR_ROT[k % NCR] + t * 0.5, fa * 0.9, metal=1.0)
    tag(ctx, "schematic", 1)
    p1 = seg(t, cue(g, 0, "写了一篇文章"), cue(g, 0, "写了一篇文章") + 0.8)
    paper(ctx, 120, 90, 820, 210, [
        ("J Clin Oncol　2011", 26, "#5A5348", False),
        ("Flushing oral oncology drugs down the toilet", 34, "#1B1A18", True),
        ("把口服抗癌药冲进马桶　　Ratain MJ（芝加哥大学）", 28, "#5A5348", False)],
        p1 * (1 - 0.5 * seg(t, b1, b1 + 1)))
    tag(ctx, "real", p1 * (1 - seg(t, b1, b1 + 0.6)), "PMID 21931020")
    p2 = seg(t, b1 + 0.2, b1 + 1.0)
    paper(ctx, W - 120 - 760, 90, 760, 210, [
        ("Szmulewitz 等　J Clin Oncol　2018", 26, "#5A5348", False),
        ("关键试验：一直空腹给药", 36, "#1B1A18", True),
        ("尽管食物效应很大", 30, "#5A5348", False)], p2)
    tag(ctx, "real", p2, "PMID 29590007")
    tq = cue(g, 1, "能不能少吃")
    q = seg(t, tq, tq + 0.9)
    if q > 0:
        darken(ctx, 0.5 * q)
        reveal(ctx, "能不能少吃一点药？", W / 2, H * 0.60, 90, WHITE, q)


_d = np.random.default_rng(51)
NP = 72
P_R = np.sqrt(_d.random(NP)) * 150
P_TH = _d.random(NP) * TAU
P_W = _d.uniform(0.2, 0.5, NP) * np.where(_d.random(NP) < 0.5, -1, 1)


def plate(ctx, x, y, a, food=False):
    ellipse(ctx, x, y, 120, 40)
    color(ctx, "#D9D4CA", 0.18 * a)
    ctx.fill_preserve()
    color(ctx, WHITE, 0.55 * a)
    ctx.set_line_width(2)
    ctx.stroke()
    ellipse(ctx, x, y, 78, 24)
    color(ctx, WHITE, 0.25 * a)
    ctx.stroke()
    if food:  # 清淡早餐：一片吐司、几颗浆果
        ctx.save()
        ctx.translate(x - 20, y - 6)
        ctx.rotate(-0.15)
        rrect(ctx, -46, -18, 92, 36, 12)
        color(ctx, "#C99A5B", 0.9 * a)
        ctx.fill()
        ctx.restore()
        for k in range(3):
            dot(ctx, x + 50 + k * 16, y - 4 + (k % 2) * 8, 8, "#7E4A8C", 0.9 * a)


def s_trial(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 25, 53, WHITE, 0.08)
    b1 = g.beat(1, 99)
    tn = cue(g, 0, "纳入")
    tsplit = cue(g, 0, "一组每天")
    sp = np.clip((t - tsplit - np.arange(NP) * 0.015) / 1.6, 0, 1)
    sp = sp * sp * (3 - 2 * sp)
    up = ease_io(seg(t, b1, b1 + 1.2))   # 第二句：两队上移、缩小，让出曲线
    ya = lerp(1.0, 0.0, up)
    # 72 个光点：先成方阵，再散成两股缓慢旋转的光流（不可逐个点数）
    for i in range(NP):
        q = seg(t, tn - 0.3 + i * 0.012, tn + 0.3 + i * 0.012)
        gx = W / 2 + (i % 12 - 5.5) * 42
        gy = 300 + (i // 12 - 2.5) * 42
        side = -1 if i % 2 == 0 else 1
        cx = W / 2 + side * W * 0.24
        th = P_TH[i] + P_W[i] * t
        fx = cx + P_R[i] * math.cos(th)
        fy = 330 + P_R[i] * math.sin(th) * 0.5
        x, y = lerp(gx, fx, sp[i]), lerp(gy, fy, sp[i])
        y = lerp(y, y * 0.5 + 60, up)
        c = AMBER if side > 0 and sp[i] > 0.5 else WHITE
        dot(ctx, x, y, 7, c, 0.85 * q * (1 - 0.5 * up))
    reveal(ctx, "随机 II 期　n = 72", W / 2, 120, 44, AMBER, fade(t, tn, tn + 0.8, tsplit, tsplit + 0.8), count=True)
    # 两组
    pa = seg(t, tsplit + 0.6, tsplit + 1.4) * (1 - up)
    pb = seg(t, cue(g, 0, "另一组"), cue(g, 0, "另一组") + 0.8) * (1 - up)
    lx, rx = W / 2 - W * 0.24, W / 2 + W * 0.24
    yy = 600
    for k in range(4):
        tablet(ctx, lx - 150 + k * 100, yy, 84, 40, ZYTIGA_250, "AA250", pa, 0.0, film=False)
    plate(ctx, lx, yy + 110, pa)
    text(ctx, "1000 mg　空腹", lx, yy + 210, 40, WHITE, pa)
    tablet(ctx, rx, yy, 84, 40, ZYTIGA_250, "AA250", pb, 0.0, film=False)
    plate(ctx, rx, yy + 110, pb, food=True)
    text(ctx, "250 mg　低脂早餐", rx, yy + 210, 40, AMBER, pb)
    text(ctx, "药片按 ZYTIGA 250 mg 规格示意", W / 2, yy + 268, 24, GREY, max(pa, pb) * (1 - up), False)
    tag(ctx, "real", max(pa, seg(t, tn, tn + 0.8)), "Szmulewitz 2018 JCO · PMID 29590007")
    # 第二句：12 周 PSA 两条曲线几乎重合（形状示意）
    if up > 0:
        x0, x1, y0, y1 = 520, 1400, 470, 820
        color(ctx, GREY, 0.6 * up)
        ctx.set_line_width(2)
        ctx.move_to(x0, y0 - 20)
        ctx.line_to(x0, y1)
        ctx.line_to(x1 + 20, y1)
        ctx.stroke()
        text(ctx, "PSA", x0 - 16, y0 - 30, 28, GREY, up, False, "left")
        text(ctx, "12 周", x1, y1 + 44, 28, GREY, up, False, "right")
        for k, (c, off) in enumerate([(BLUE, 0), (WHITE, 10)]):
            pp = ease_io(seg(t, b1 + 0.6 + k * 0.3, b1 + 3.0 + k * 0.3))
            pts = [(x0 + (x1 - x0) * i / 100, y0 + 20 + off * (i / 100) + 240 * (1 - math.exp(-i / 28)))
                   for i in range(int(100 * pp) + 1)]
            if k == 0:
                polyline(ctx, pts, c, 4, up)
            elif len(pts) > 1:
                ctx.set_dash([14, 10])
                polyline(ctx, pts, c, 3, up, glow=False)
                ctx.set_dash([])
        text(ctx, "250 mg + 低脂早餐", x1 + 30, y0 + 270, 28, BLUE, seg(t, b1 + 3, b1 + 3.6), False, "left")
        text(ctx, "1000 mg 空腹", x1 + 30, y0 + 310, 28, WHITE, seg(t, b1 + 3.3, b1 + 3.9), False, "left")
        tn2 = cue(g, 1, "不劣于")
        reveal(ctx, "12 周 PSA 下降：非劣效", (x0 + x1) / 2, y1 + 110, 50, AMBER, seg(t, tn2, tn2 + 0.8))
        tag(ctx, "schematic", up)


SIGNS = ["更多患者", "更长时间", "生存", "安全", "监管审评"]


def s_road(ctx, t, g):
    fill_bg(ctx, "#060709")
    dust(ctx, t, 50, 61, AMBER, 0.12, rise=3)
    b1 = g.beat(1, 99)
    tr = cue(g, 0, "一个好想法")
    tend = cue(g, 0, "一整条路", after=True)
    # 开头：两条曲线收成一点
    k = seg(t, 0, 1.0)
    if k < 1:
        for c, off in ((BLUE, 0), (WHITE, 10)):
            pts = [(lerp(520 + 880 * i / 60, W / 2, ease_io(k)),
                    lerp(580 + off * i / 60 + 240 * (1 - math.exp(-i / 17)), H * 0.86, ease_io(k)))
                   for i in range(61)]
            polyline(ctx, pts, c, 3, 1 - k, glow=False)
    out = 1 - seg(t, b1, b1 + 1.0)
    dot(ctx, W / 2, H * 0.86, 10, AMBER, seg(t, 0.6, 1.0) * (1 - seg(t, tr, tr + 0.6)))
    t1 = cue(g, 0, "一个指标")
    reveal(ctx, "一个指标　·　十二周", W / 2, H * 0.22, 52, WHITE, seg(t, t1, t1 + 0.7), out)
    t2 = cue(g, 0, "长期疗效")
    reveal(ctx, "长期疗效：还需要研究", W / 2, H * 0.22 + 76, 40, GREY, seg(t, t2, t2 + 0.8), out, bold=False)
    # 路：从脚下的点伸向远方的消失点
    pull = ease_io(seg(t, b1 + 0.3, g.dur))         # 第二句：拉远
    vx, vy = W / 2, H * 0.36
    rp = ease_io(seg(t, tr, tend))
    if rp > 0:
        ctx.save()
        z = lerp(1, 0.42, pull)
        ctx.translate(W / 2, H * 0.62)
        ctx.scale(z, z)
        ctx.translate(-W / 2, -H * 0.62)
        by = H * 0.86
        fy = lerp(by, vy, rp)
        fw = lerp(360, 6, rp)
        ctx.move_to(W / 2 - 360, by)
        ctx.line_to(W / 2 - fw, fy)
        ctx.line_to(W / 2 + fw, fy)
        ctx.line_to(W / 2 + 360, by)
        ctx.close_path()
        gr = cairo.LinearGradient(0, vy, 0, by)
        gr.add_color_stop_rgba(0, *rgba(AMBER, 0.05))
        gr.add_color_stop_rgba(1, *rgba(AMBER, 0.22))
        ctx.set_source(gr)
        ctx.fill()
        dashed(ctx, W / 2, by, W / 2, fy, AMBER, 0.5, 3, (18, 16))
        for i, s in enumerate(SIGNS):
            d = (i + 1) / (len(SIGNS) + 1.2)
            if rp < d:
                continue
            ts = lerp(tr, tend, d)
            lit = fade(t, ts, ts + 0.5, b1 + 1.5 + i * 0.4, b1 + 2.3 + i * 0.4) * 0.8 + 0.2
            side = -1 if i % 2 == 0 else 1
            y = lerp(by, vy, d)
            hw = lerp(360, 6, d)
            sc = lerp(1, 0.35, d)
            x = W / 2 + side * (hw + 50 * sc)
            color(ctx, GREY, 0.8)
            ctx.set_line_width(3 * sc)
            ctx.move_to(x, y)
            ctx.line_to(x, y - 120 * sc)
            ctx.stroke()
            bw = text_w(ctx, s, 34 * sc, True) + 40 * sc
            bx = x - bw if side < 0 else x
            rrect(ctx, bx, y - 175 * sc, bw, 60 * sc, 8 * sc)
            color(ctx, AMBER, 0.22 * lit)
            ctx.fill_preserve()
            color(ctx, AMBER, 0.9 * lit)
            ctx.set_line_width(2)
            ctx.stroke()
            glow_spot(ctx, bx + bw / 2, y - 145 * sc, 120 * sc, AMBER, 0.18 * lit)
            text(ctx, s, bx + bw / 2, y - 133 * sc, 34 * sc, WHITE, 0.4 + 0.6 * lit, True, "center", False)
        # 尽头：一本说明书的轮廓
        la = seg(t, tend - 0.6, tend + 0.4)
        if la > 0:
            lx, ly = vx, vy - 40
            glow_spot(ctx, lx, ly, 120, AMBER, 0.3 * la)
            rrect(ctx, lx - 30, ly - 40, 60, 80, 6)
            color(ctx, AMBER, 0.9 * la)
            ctx.set_line_width(2.5)
            ctx.stroke()
            for kk in range(4):
                ctx.move_to(lx - 18, ly - 22 + kk * 14)
                ctx.line_to(lx + 18, ly - 22 + kk * 14)
            ctx.set_line_width(1.5)
            ctx.stroke()
            text(ctx, "说明书", lx, ly - 60, 26, AMBER, la, False)
        ctx.restore()
    # 拉远后：路成了地图上的一段
    ma = seg(t, b1 + 1.2, g.dur)
    if ma > 0:
        from common import MAP
        xs = [W * (0.14 + 0.18 * i) for i in range(len(MAP))]
        for i, w in enumerate(MAP):
            text(ctx, w, xs[i], H * 0.30, 44, GREY, ma * 0.7, True)


def s_next(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 30, 31, WHITE, 0.10)
    # 左：900 mg（3 粒）→ 4800 mg（16 粒）NEURONTIN 300 mg 黄色胶囊
    for i in range(3):
        p = ease_out(seg(t, 0.3 + i * 0.15, 0.8 + i * 0.15))
        capsule(ctx, 200 + i * 60, 360 - (1 - p) * 40, 40, 96, p, NEURONTIN_Y)
    text(ctx, "900 mg/日", 260, 460, 32, WHITE, seg(t, 0.6, 1.2), False)
    t5 = cue(g, 0, "五倍多")
    for i in range(16):
        p = ease_out(seg(t, t5 - 1.2 + i * 0.07, t5 - 0.8 + i * 0.07))
        capsule(ctx, 140 + i * 46, 640 - (1 - p) * 40, 34, 82, p, NEURONTIN_Y)
    text(ctx, "4800 mg/日", 485, 735, 32, WHITE, seg(t, t5 - 0.4, t5 + 0.2), False)
    reveal(ctx, "剂量 ×5.3", 485, 830, 56, AMBER, seg(t, t5, t5 + 0.8), count=True)
    # 右：两只量筒，虚线是“按剂量应到的位置”
    base, hh = 820, 520
    l0 = 0.15
    ta = cue(g, 0, "吸收进去")
    lv = ease_io(seg(t, ta, ta + 2.0))
    cylinder(ctx, 1160, base, 150, hh, l0, AMBER, seg(t, 0.4, 1.0))
    cylinder(ctx, 1420, base, 150, hh, l0 * lerp(1, 2.4, lv), AMBER, seg(t, 0.6, 1.2))
    da = seg(t, t5, t5 + 0.8)
    dashed(ctx, 1405, base - hh * l0 * 5.33, 1590, base - hh * l0 * 5.33, WHITE, 0.6 * da)
    text(ctx, "按剂量应到这里", 1600, base - hh * l0 * 5.33 + 10, 26, WHITE, da, False, "left")
    reveal(ctx, "吸收 ×2.4", 1495, base - hh * l0 * 2.4 - 30, 48, AMBER, seg(t, ta + 1.6, ta + 2.4), count=True)
    text(ctx, "按说明书生物利用度估算", 1370, base + 50, 24, GREY, seg(t, ta + 1.6, ta + 2.4), False)
    tag(ctx, "real", seg(t, ta + 1.6, ta + 2.4), "NEURONTIN 标签")
    tq = cue(g, 0, "剩下的药")
    tn = cue(g, 0, "下一集")
    reveal(ctx, "剩下的药去哪了？", W / 2, 190, 64, WHITE, fade(t, tq, tq + 0.8, tn, tn + 0.5))
    if t > tn:
        darken(ctx, 0.8 * seg(t, tn, tn + 0.8))
    reveal(ctx, "下一集　加倍", W / 2, H * 0.50, 80, WHITE, seg(t, tn + 0.3, tn + 1.1))


_END = {}


def s_end(ctx, t, g):
    if id(g) not in _END:
        _END[id(g)] = end_scene(cue(g, 0, "喜欢这期") - g.beat(0))
    _END[id(g)](ctx, t, g)


L = E.L
GROUPS = [
    Group(s_key, L(1, 2), lead=5.0, tail=1.0, xf=False,
          sfx=[("nebula", 0.0, 0.7), ("lock", lambda g: cue(g, 1, "补给线"), 0.6)]),
    Group(s_tablet, L(3), lead=0.2, tail=0.8, sfx=[("drop", lambda g: cue(g, 0, "取决于"), 0.6)]),
    Group(s_sun, L(4), lead=1.4, tail=1.2, sfx=[("sunrise", 0.0, 0.6)]),
    Group(s_curve, L(5, 6), lead=0.6, tail=1.7, sfx=[("rise17", lambda g: cue(g, 0, "高脂早餐"), 0.5)]),
    Group(cinematic_title("EP01", "一顿饭", "One Meal"), fixed=10, xf=False,
          sfx=[("title_boom", 0.05, 0.8), ("title_whoosh", 0.4, 0.5)]),
    Group(s_river, L(7, 8, 9, 10, 11, 12), lead=1.4, tail=0.8,
          sfx=[("river", 0.0, 0.35), ("river", (2, 0.0), 0.3), ("river", (4, 0.0), 0.3),
               ("bile", lambda g: cue(g, 3, "胆囊收缩"), 0.5)]),
    Group(s_card1, L(13), lead=0.4, tail=1.6),
    Group(vote_scene(["换成真正的前列腺癌患者，每天吃，连续一周，", "高脂餐的影响会是？"],
                     ["A　还是约 10 倍", "B　更大", "C　小得多"]), fixed=15),
    Group(s_card2, L(14, 15), lead=0.3, tail=1.4, sfx=[("reveal", 0.1, 0.6)]),
    Group(s_mill, L(16), lead=0.6, tail=0.8),
    Group(s_bars, L(17), lead=0.4, tail=1.2),
    Group(s_twins, L(18, 19), lead=0.3, tail=1.8),
    Group(s_drain, L(20, 21), lead=0.6, tail=0.8, sfx=[("coins", 0.3, 0.45)]),
    Group(s_trial, L(22, 23), lead=0.3, tail=1.2),
    Group(s_road, L(24, 25), lead=0.3, tail=1.6, sfx=[("road", lambda g: cue(g, 0, "一个好想法"), 0.5)]),
    Group(map_scene(0, 1, "食物", "剂量没变，暴露变了"), L(26), lead=0.6, tail=1.2),
    Group(s_next, L(27), lead=0.4, tail=1.4),
    Group(s_end, L(28), lead=1.0, tail=1.6),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=float, default=0, help="只渲染前 N 秒")
    ap.add_argument("--smoke", action="store_true", help="每个场景抽帧绘制，查报错")
    ap.add_argument("--stills", default="", help="逗号分隔的全片秒数，输出静帧到 preview/")
    args = ap.parse_args()
    if args.smoke:
        E.smoke(GROUPS, 8)
    elif args.stills:
        E.stills(GROUPS, [float(x) for x in args.stills.split(",")])
    else:
        E.run(GROUPS, args.limit)


if __name__ == "__main__":
    main()
