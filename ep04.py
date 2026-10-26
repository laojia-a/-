"""EP04 第五天：逐场景动画。

用法: python tools/ep04.py [--limit 秒数] [--smoke]
输出: build/EP04/EP04_motion.mp4、plan.tsv
"""
import argparse
import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import *  # noqa: E402,F403

E = Episode("EP04")
F = E.frame

# Rocha 2022：MAD 剂量阶梯（mg/日）
MAD = [2.5, 5, 10, 20, 50]


def ec50_inh(d, ec50=0.12):
    """两个真实锚点（0.25 mg >50%，≥5 mg >97%）之间的示意连线，Emax 形状。"""
    return d / (d + ec50)


# ---------------- 通用小件 ----------------

def calendar(ctx, x0, y0, states, cw=150, ch=130, a=1.0):
    """一排台历格：states[i] = (颜色或 None, 强度)。格内只写给药第几天。"""
    for i, (c, k) in enumerate(states):
        x = x0 + i * (cw + 16)
        rrect(ctx, x, y0, cw, ch, 14)
        if c and k > 0:
            color(ctx, c, 0.30 * k * a)
            ctx.fill_preserve()
            glow_spot(ctx, x + cw / 2, y0 + ch / 2, cw * 0.9, c, 0.18 * k * a)
            rrect(ctx, x, y0, cw, ch, 14)
        color(ctx, WHITE, 0.30 * a)
        ctx.set_line_width(2)
        ctx.stroke()
        text(ctx, f"{i + 1}", x + cw / 2, y0 + ch / 2 + 22, 60, c if c and k > 0.5 else GREY, a)
    text(ctx, "给药第几天", x0, y0 - 24, 28, GREY, a, False, "left")


def clock(ctx, x, y, r, hour, minute, a=1.0):
    color(ctx, WHITE, 0.5 * a)
    ctx.set_line_width(3)
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.stroke()
    for k in range(12):
        ang = k / 12 * 2 * math.pi
        ctx.move_to(x + math.sin(ang) * r * 0.86, y - math.cos(ang) * r * 0.86)
        ctx.line_to(x + math.sin(ang) * r * 0.95, y - math.cos(ang) * r * 0.95)
    ctx.stroke()
    for ang, ln, w in [((hour % 12 + minute / 60) / 12 * 2 * math.pi, 0.5, 6),
                       (minute / 60 * 2 * math.pi, 0.75, 4)]:
        color(ctx, AMBER, a)
        ctx.set_line_width(w)
        ctx.move_to(x, y)
        ctx.line_to(x + math.sin(ang) * r * ln, y - math.cos(ang) * r * ln)
        ctx.stroke()


def dots(ctx, x0, y0, n, cols, lit, gap=44, r=11, c=AMBER, colors=None):
    """抽象圆点代表人数，不画人形。lit 为已点亮的个数（可为小数）。"""
    for i in range(n):
        x = x0 + (i % cols) * gap
        y = y0 + (i // cols) * gap
        k = clamp(lit - i)
        cc = colors[i] if colors else c
        ctx.arc(x, y, r, 0, 2 * math.pi)
        color(ctx, GREY, 0.25)
        ctx.fill()
        if k > 0:
            glow_spot(ctx, x, y, r * 3, cc, 0.35 * k)
            ctx.arc(x, y, r, 0, 2 * math.pi)
            color(ctx, cc, k)
            ctx.fill()


# ---------------- 冷开场 ----------------

def s_open(ctx, t, g):
    b = [g.beat(i, 99) for i in range(5)]
    cx0 = W / 2 - 3 * 166 + 8
    if t < b[1]:
        photo(ctx, F("s01"), t, g.dur, z=(1.04, 1.16))
        darken(ctx, 0.3)
        dust(ctx, t, 25, 2, WHITE, 0.12)
        reveal(ctx, "2016.01", W / 2, H * 0.44, 110, WHITE, seg(t, 0.8, 2.0), count=False)
        reveal(ctx, "法国　雷恩", W / 2, H * 0.44 + 90, 46, AMBER, seg(t, 1.6, 2.6))
        tag(ctx, "real", seg(t, 1.0, 2.0), "Kerbrat 2016 NEJM")
        return
    if t < b[2]:
        photo(ctx, F("s02"), t, g.dur, z=(1.02, 1.10))
        darken(ctx, 0.45)
        lit = 84 * ease_io(seg(t, b[1] + 0.4, b[1] + 4.0))
        dots(ctx, W / 2 - 11 * 44 / 2 - 300, H * 0.30, 84, 12, lit)
        x = W / 2 + 260
        text(ctx, f"{int(round(lit))} 人", x, H * 0.40, 96, WHITE, seg(t, b[1] + 0.4, b[1] + 1.0), True, "left")
        reveal(ctx, "单次最高 100 mg", x, H * 0.52, 40, WHITE, seg(t, b[1] + 2.0, b[1] + 2.8), align="left", bold=False)
        reveal(ctx, "连续 10 天最高 20 mg", x, H * 0.52 + 60, 40, WHITE, seg(t, b[1] + 3.0, b[1] + 3.8),
               align="left", bold=False)
        reveal(ctx, "无严重不良事件", x, H * 0.52 + 140, 48, AMBER, seg(t, b[1] + 4.4, b[1] + 5.2), align="left")
        tag(ctx, "real", 1, "Kerbrat 2016 NEJM")
        return
    # 第三句起：台历一直在
    if t < b[3]:
        photo(ctx, F("s03"), t, g.dur, z=(1.04, 1.12))
        darken(ctx, 0.6)
    elif t < b[4]:
        photo(ctx, F("s04"), t, g.dur, z=(1.04, 1.12))
        darken(ctx, 0.5)
    else:
        photo(ctx, F("s05"), t, g.dur, z=(1.04, 1.14))
        darken(ctx, 0.45)
    states = []
    for i in range(6):
        if i < 4:
            states.append((AMBER, ease_out(seg(t, b[2] + 0.6 + i * 0.5, b[2] + 1.1 + i * 0.5))))
        elif i == 4:
            states.append((RED, ease_out(seg(t, b[3] + 0.3, b[3] + 1.3))))
        else:
            states.append((AMBER, ease_out(seg(t, b[4] + 0.3, b[4] + 1.3))))
    calendar(ctx, cx0, H * 0.14, states)
    if t < b[3]:
        cols = [AMBER] * 6 + [GREY] * 2
        dots(ctx, W / 2 - 7 * 60 / 2, H * 0.56, 8, 8, 8 * seg(t, b[2] + 2.6, b[2] + 4.0), gap=60, r=16, colors=cols)
        reveal(ctx, "50 mg/日", W / 2, H * 0.72, 72, WHITE, seg(t, b[2] + 0.4, b[2] + 1.2), count=True)
        reveal(ctx, "6 人用药　2 人安慰剂", W / 2, H * 0.80, 40, AMBER, seg(t, b[2] + 2.8, b[2] + 3.6), bold=False)
        tag(ctx, "real", 1, "Rocha 2022 CPT")
    elif t < b[4]:
        reveal(ctx, "第 5 天晚上", W / 2, H * 0.62, 80, RED, seg(t, b[3] + 0.6, b[3] + 1.4))
        reveal(ctx, "一名受试者因神经系统症状住院", W / 2, H * 0.72, 40, WHITE, seg(t, b[3] + 1.6, b[3] + 2.4), bold=False)
        tag(ctx, "real", 1, "Bird 2017 Pharm Stat")
    else:
        clock(ctx, W * 0.78, H * 0.62, 110, 8, 0, seg(t, b[4] + 0.4, b[4] + 1.2))
        reveal(ctx, "第 6 天　约 8:00", W * 0.36, H * 0.62, 72, AMBER, seg(t, b[4] + 0.6, b[4] + 1.4))
        reveal(ctx, "其余的人照常服下第六剂", W * 0.36, H * 0.72, 40, WHITE, seg(t, b[4] + 1.6, b[4] + 2.4), bold=False)
        tag(ctx, "real", 1, "Bird 2017 Pharm Stat")
        # 静音一拍，黑屏
        if t > g.dur - 1.4:
            darken(ctx, ease_io(seg(t, g.dur - 1.4, g.dur - 0.4)))


# ---------------- 第一幕 ----------------

def s_single(ctx, t, g):
    photo(ctx, F("s01", "EP03"), t, g.dur, z=(1.04, 1.12), pan=((-120, 0), (-160, 0)))
    darken(ctx, 0.45)
    x0, y0, x1, y1 = W * 0.52, H * 0.76, W * 0.92, H * 0.30
    axes(ctx, x0, y0, x1, y1, "时间", "浓度", seg(t, 0.4, 1.2))
    p = ease_io(seg(t, 1.0, 3.6))
    n = int(200 * p)
    pts = []
    for i in range(n + 1):
        tt = i / 200 * 24
        c = (math.exp(-0.25 * tt) - math.exp(-1.6 * tt)) / 0.62
        pts.append((x0 + (x1 - x0) * i / 200, y0 - (y0 - y1) * c))
    polyline(ctx, pts, BLUE, 5)
    reveal(ctx, "单次给药 SAD", W * 0.72, H * 0.20, 48, WHITE, seg(t, 0.6, 1.4))
    reveal(ctx, "吃一次，会发生什么", W * 0.72, H * 0.86, 40, AMBER, seg(t, 2.6, 3.4), bold=False)
    tag(ctx, "schematic", seg(t, 0.4, 1.2))


def conc_multi(tt, tau=24, n=8, k=0.045, ka=0.6):
    c = 0.0
    for j in range(n):
        dt = tt - j * tau
        if dt > 0:
            c += math.exp(-k * dt) - math.exp(-ka * dt)
    return c


def s_accum(ctx, t, g):
    photo(ctx, F("s06"), t, g.dur, z=(1.02, 1.08))
    darken(ctx, 0.35)
    sim_grid(ctx, 0.06)
    b1 = g.beat(1, 99)
    x0, y0, x1, y1 = 260, 880, 1640, 260
    tmax, cmax = 8 * 24, 3.3
    axes(ctx, x0, y0, x1, y1, "天", "浓度")
    for d in range(1, 9):
        text(ctx, f"{d}", x0 + (x1 - x0) * (d - 0.5) / 8, y0 + 40, 26, GREY, 0.8, False)
    p = ease_io(seg(t, 0.6, max(1.2, b1 - 0.4)))
    n = int(600 * p)
    pts = [(x0 + (x1 - x0) * i / 600, y0 - (y0 - y1) * conc_multi(i / 600 * tmax) / cmax) for i in range(n + 1)]
    polyline(ctx, pts, BLUE, 5)
    # 每一剂落下的位置
    for j in range(8):
        q = seg(t, 0.6 + (b1 - 1.0) * j / 8, 0.9 + (b1 - 1.0) * j / 8)
        if q > 0:
            x = x0 + (x1 - x0) * j / 8
            color(ctx, AMBER, 0.6 * q)
            ctx.set_line_width(2)
            ctx.move_to(x, y0)
            ctx.line_to(x, y0 - 30)
            ctx.stroke()
    reveal(ctx, "上一剂还没清除，下一剂又来了", W / 2, 150, 44, WHITE, seg(t, 0.8, 1.6))
    if t > b1:
        ss = max(conc_multi(7 * 24 + h) for h in range(24))
        d1 = max(conc_multi(h) for h in range(24))
        hp = seg(t, b1 + 0.2, b1 + 1.2)
        for v, lab, c in [(d1, "第一天峰值", WHITE), (ss, "稳态峰值", AMBER)]:
            y = y0 - (y0 - y1) * v / cmax
            color(ctx, c, 0.6 * hp)
            ctx.set_dash([12, 10])
            ctx.set_line_width(2)
            ctx.move_to(x0, y)
            ctx.line_to(x1, y)
            ctx.stroke()
            ctx.set_dash([])
            text(ctx, lab, x1 + 14, y + 10, 30, c, hp, False, "left")
        ya = y0 - (y0 - y1) * d1 / cmax
        yb = y0 - (y0 - y1) * ss / cmax
        q = ease_out(seg(t, b1 + 1.2, b1 + 2.2))
        arrow(ctx, x0 + 120, ya, x0 + 120, lerp(ya, yb, 1), AMBER, 4, q, q, 18)
        reveal(ctx, "叠加之后有多高", W * 0.30, H * 0.18 + 70, 36, AMBER, seg(t, b1 + 1.6, b1 + 2.4), bold=False)
        reveal(ctx, "几天到顶", W * 0.50, H * 0.18 + 70, 36, AMBER, seg(t, b1 + 2.6, b1 + 3.4), bold=False)
        reveal(ctx, "药效会不会累积", W * 0.70, H * 0.18 + 70, 36, AMBER, seg(t, b1 + 3.6, b1 + 4.4), bold=False)
        reveal(ctx, "多次给药 MAD", W - 80, H * 0.86, 40, WHITE, seg(t, b1, b1 + 0.8), align="right")
    tag(ctx, "sim", 1)


def s_ladder(ctx, t, g):
    photo(ctx, F("s07"), t, g.dur, z=(1.03, 1.12))
    darken(ctx, 0.55)
    base, x0, sw = H * 0.80, W * 0.16, 250
    for i, d in enumerate(MAD):
        p = ease_out(seg(t, 0.5 + i * 0.7, 1.2 + i * 0.7))
        h = 90 + i * 110
        lift = 70 if i == 4 else 0  # 最后一级悬空
        x = x0 + i * (sw + 20)
        y = base - h - lift
        rrect(ctx, x, y, sw, 36, 8)
        color(ctx, AMBER if i < 4 else WHITE, (0.9 if i < 4 else 0.7) * p)
        ctx.fill()
        if i == 4 and p > 0:
            glow_spot(ctx, x + sw / 2, y + 18, 220, AMBER, 0.15 * p)
        reveal(ctx, f"{d:g} mg", x + sw / 2, y - 30, 52, AMBER if i < 4 else WHITE, p, count=True)
    if t > 0.5 + 3 * 0.7 + 0.8:
        q = seg(t, 0.5 + 3 * 0.7 + 0.8, 0.5 + 4 * 0.7 + 1.2)
        text(ctx, "20 → 50", x0 + 3.5 * (sw + 20) + sw / 2, base + 70, 40, WHITE, q)
    reveal(ctx, "多次给药剂量阶梯", W * 0.08, H * 0.12, 48, WHITE, seg(t, 0.2, 1.0), align="left")
    tag(ctx, "real", 1, "Rocha 2022 CPT")


# ---------------- 第二幕：饱和之后 ----------------

def s_sat(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 12, WHITE, 0.08)
    b1, b2 = g.beat(1, 99), g.beat(2, 99)
    x0, y0, x1, y1 = 300, 860, 1560, 280
    dmax = lerp(5, 50, ease_io(seg(t, b1 + 0.3, b1 + 3.0)))

    def X(d):
        return x0 + (x1 - x0) * d / dmax

    def Y(v):
        return y0 - (y0 - y1) * v

    axes(ctx, x0, y0, x1, y1, "剂量 mg/日", "FAAH 抑制率")
    color(ctx, WHITE, 0.35)
    ctx.set_dash([12, 10])
    ctx.set_line_width(2)
    ctx.move_to(x0, Y(1.0))
    ctx.line_to(x1, Y(1.0))
    ctx.stroke()
    ctx.set_dash([])
    text(ctx, "100%", x0 - 20, Y(1.0) + 10, 28, GREY, 0.8, False, "right")
    text(ctx, "50%", x0 - 20, Y(0.5) + 10, 28, GREY, 0.8, False, "right")
    text(ctx, "0", x0, y0 + 40, 26, GREY, 0.8, False)
    for d in (5, 10, 20, 50):
        if d <= dmax + 0.01:
            text(ctx, f"{d}", X(d), y0 + 40, 28, GREY, 0.8, False)
    # 示意连线
    p = ease_io(seg(t, 0.6, 2.6))
    n = int(400 * p)
    pts = [(X(dmax * i / 400), Y(ec50_inh(dmax * i / 400))) for i in range(n + 1)]
    polyline(ctx, pts, WHITE, 3, 0.7, glow=False)
    # 真实锚点
    anchors = [(0.25, ">50%", 1.4)] + [(d, ">97%", 2.4) for d in (5, 10, 20, 50)]
    for d, lab, ts in anchors:
        if d > dmax + 0.01:
            continue
        q = ease_out(seg(t, ts, ts + 0.6)) if d <= 5 else ease_out(seg(t, b1 + 0.6 + d / 25, b1 + 1.2 + d / 25))
        x, y = X(d), Y(ec50_inh(d))
        glow_spot(ctx, x, y, 34, AMBER, 0.4 * q)
        ctx.arc(x, y, 10 * q, 0, 2 * math.pi)
        color(ctx, AMBER, q)
        ctx.fill()
        if d in (0.25, 5):
            dy = 70 if d == 0.25 else -34
            dx = 60 if d == 0.25 else 0
            text(ctx, f"{d:g} mg　{lab}", x + dx, y + dy, 36, AMBER, q, True, "left" if d == 0.25 else "center")
    reveal(ctx, "答案：A　5 毫克", W / 2, 140, 52, AMBER, seg(t, 0.2, 1.0))
    if t > b1:
        reveal(ctx, "50 ÷ 5 = 10", W * 0.70, H * 0.50, 64, WHITE, seg(t, b1 + 2.6, b1 + 3.4))
        reveal(ctx, "剂量 ×10，靶点作用没有变多", W * 0.70, H * 0.50 + 70, 36, WHITE,
               seg(t, b1 + 3.4, b1 + 4.2), bold=False)
    if t > b2:
        q = ease_io(seg(t, b2 + 0.4, b2 + 3.0))
        m = int(200 * q)
        rp = [(X(5 + 45 * i / 200), Y(0.32 * (i / 200) ** 1.6)) for i in range(m + 1)]
        ctx.set_dash([14, 10])
        polyline(ctx, rp, RED, 4, 0.9, glow=False)
        ctx.set_dash([])
        if rp:
            text(ctx, "其他作用？", rp[-1][0] - 10, rp[-1][1] - 30, 40, RED, seg(t, b2 + 2.4, b2 + 3.0), True, "right")
        tag(ctx, "schematic", seg(t, b2 + 0.4, b2 + 1.0))
    tag(ctx, "real", 1, "Rocha 2022 · 两点之间为示意连线")


def s_enzymes(ctx, t, g):
    photo(ctx, F("s09"), t, g.dur, z=(1.04, 1.16))
    darken(ctx, 0.35)
    reveal(ctx, "除了 FAAH，", W * 0.08, H * 0.20, 48, WHITE, seg(t, 0.6, 1.4), align="left")
    reveal(ctx, "还抑制多种脂肪酶", W * 0.08, H * 0.20 + 70, 56, RED, seg(t, 1.4, 2.2), align="left")
    reveal(ctx, "对照的另一种 FAAH 抑制剂：不会", W * 0.08, H * 0.70, 40, WHITE, seg(t, 3.4, 4.2),
           align="left", bold=False)
    reveal(ctx, "作者的措辞：“有可能”导致神经系统代谢紊乱", W * 0.08, H * 0.70 + 64, 40, AMBER,
           seg(t, 5.0, 5.8), align="left", bold=False)
    tag(ctx, "real", 1, "van Esbroeck 2017 Science")


def s_split(ctx, t, g):
    photo(ctx, F("s10"), t, g.dur, z=(1.02, 1.06))
    darken(ctx, 0.5)
    b1, b2 = g.beat(1, 99), g.beat(2, 99)
    reveal(ctx, "原因：各方看法不一致", W / 2, 120, 44, WHITE, seg(t, 0.2, 1.0))
    # 左右等宽、同字号
    lx, rx, y = W * 0.25, W * 0.75, H * 0.34
    reveal(ctx, "专家委员会认为", lx, y, 52, AMBER, seg(t, 0.8, 1.6))
    reveal(ctx, "20 → 50 mg 跨度太大", lx, y + 110, 40, WHITE, seg(t, 2.2, 3.0), bold=False)
    reveal(ctx, "高剂量下药代可能非线性", lx, y + 180, 40, WHITE, seg(t, 3.6, 4.4), bold=False)
    text(ctx, "据 Rocha 2022、Bird 2017 转述", lx, y + 260, 26, GREY, seg(t, 2.2, 3.0), False)
    if t > b1:
        reveal(ctx, "申办方认为（2022）", rx, y, 52, AMBER, seg(t, b1 + 0.2, b1 + 1.0))
        reveal(ctx, "暴露与剂量是线性的", rx, y + 110, 40, WHITE, seg(t, b1 + 1.4, b1 + 2.2), bold=False)
        text(ctx, "Rocha 2022 CPT", rx, y + 260, 26, GREY, seg(t, b1 + 1.4, b1 + 2.2), False)
    if t > b2:
        q = seg(t, b2 + 0.2, b2 + 1.0)
        rrect(ctx, W / 2 - 300, H * 0.70 - 60, 600, 100, 20)
        color(ctx, BG, 0.85 * q)
        ctx.fill()
        reveal(ctx, "机制至今未明", W / 2, H * 0.70 + 8, 56, WHITE, q)
        text(ctx, "Kerbrat 2016 NEJM", W / 2, H * 0.70 + 80, 28, GREY, q, False)
    tag(ctx, "real", 1, "有争议 · 双方观点并列")


# ---------------- 第三幕：第五天的问题 ----------------

def s_gap(ctx, t, g):
    photo(ctx, F("s03"), t, g.dur, z=(1.06, 1.18))
    darken(ctx, 0.6)
    z = 1 + 0.5 * ease_io(seg(t, 1.0, g.dur - 0.5))
    ctx.save()
    # 推近第 5、6 格之间的缝
    cx0 = W / 2 - 3 * 166 + 8
    gx = cx0 + 5 * 166 - 8
    ctx.translate(gx, H * 0.42)
    ctx.scale(z, z)
    ctx.translate(-gx, -H * 0.42)
    states = [(AMBER, 1)] * 4 + [(RED, 1), (AMBER, 1)]
    calendar(ctx, cx0, H * 0.42 - 65, states)
    ctx.restore()
    reveal(ctx, "第 5 天晚上 → 第 6 天早上", W / 2, H * 0.74, 56, WHITE, seg(t, 1.2, 2.0))
    reveal(ctx, "为什么还照常服药？", W / 2, H * 0.74 + 80, 44, AMBER, seg(t, 2.6, 3.4))


def s_chain(ctx, t, g):
    photo(ctx, F("s11"), t, g.dur, z=(1.03, 1.10))
    darken(ctx, 0.7)
    nodes = ["看到信号", "联系到药", "有权叫停", "停药"]
    xs = [W * (0.16 + 0.226 * i) for i in range(4)]
    y = H * 0.46
    for i, s in enumerate(nodes):
        p = ease_out(seg(t, 0.6 + i * 0.9, 1.3 + i * 0.9))
        rrect(ctx, xs[i] - 150, y - 60, 300, 110, 20)
        color(ctx, WHITE, 0.08 * p)
        ctx.fill_preserve()
        color(ctx, AMBER if i < 3 else WHITE, 0.7 * p)
        ctx.set_line_width(2)
        ctx.stroke()
        text(ctx, s, xs[i], y + 14, 44, WHITE, p)
        if i < 3:
            arrow(ctx, xs[i] + 160, y, xs[i + 1] - 160, y, AMBER, 4, 1, seg(t, 1.2 + i * 0.9, 1.6 + i * 0.9), 16)
    # 任何一环慢了：链条中间断开，"下一剂"按时出现
    k = seg(t, 5.0, 5.8)
    if k > 0:
        i = 1 + int(t * 0.8) % 2  # 断点在中间两环之间轮换，表示"任何一环"
        mx = (xs[i] + xs[i + 1]) / 2
        color(ctx, BG, k)
        ctx.rectangle(mx - 22, y - 20, 44, 40)
        ctx.fill()
        text(ctx, "×", mx, y + 18, 56, RED, k)
        reveal(ctx, "任何一环慢了", W / 2, H * 0.70, 48, WHITE, k)
        reveal(ctx, "下一剂就会按时出现", W / 2, H * 0.70 + 70, 44, AMBER, seg(t, 6.4, 7.2))


def s_timeline(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 21, RED, 0.08)
    x0, x1, y = W * 0.10, W * 0.90, H * 0.48
    days = 9
    pa = seg(t, 0.2, 1.0)
    color(ctx, GREY, 0.6 * pa)
    ctx.set_line_width(2)
    ctx.move_to(x0, y)
    ctx.line_to(x1, y)
    ctx.stroke()

    def X(d):
        return x0 + (x1 - x0) * (d - 1) / (days - 1)

    for d in range(1, days + 1):
        text(ctx, f"{d}", X(d), y + 60, 28, GREY, pa, False)
    text(ctx, "天", x1 + 30, y + 60, 28, GREY, pa, False, "left")
    # 给药点：第 1–6 天早上，之后停止
    for d in range(1, 7):
        q = ease_out(seg(t, 0.6 + d * 0.25, 1.0 + d * 0.25))
        glow_spot(ctx, X(d), y, 30, AMBER, 0.4 * q)
        ctx.arc(X(d), y, 12 * q, 0, 2 * math.pi)
        color(ctx, AMBER, q)
        ctx.fill()
    # 暗红节点：位置为示意
    for k, d in enumerate((5.8, 6.4, 6.9, 7.5, 8.1)):
        q = ease_out(seg(t, 3.0 + k * 0.6, 3.6 + k * 0.6))
        yy = y - 110 - (k % 2) * 60
        color(ctx, RED, 0.6 * q)
        ctx.set_line_width(2)
        ctx.move_to(X(d), y - 14)
        ctx.line_to(X(d), yy)
        ctx.stroke()
        glow_spot(ctx, X(d), yy, 36, RED, 0.45 * q)
        ctx.arc(X(d), yy, 13 * q, 0, 2 * math.pi)
        color(ctx, RED, q)
        ctx.fill()
    text(ctx, "给药", X(1), y - 40, 30, AMBER, pa, False)
    reveal(ctx, "用药 6 人中：5 人中枢神经系统不良事件", W / 2, H * 0.74, 48, WHITE, seg(t, 5.8, 6.6))
    reveal(ctx, "1 人死亡", W / 2, H * 0.74 + 80, 56, RED, seg(t, 6.8, 7.6))
    tag(ctx, "real", 1, "Rocha 2022 · 时间点为示意")


def s_protocol(ctx, t, g):
    photo(ctx, F("s12"), t, g.dur, z=(1.03, 1.12))
    darken(ctx, 0.6)
    px, py, pw = W * 0.24, H * 0.14, W * 0.52
    rrect(ctx, px, py, pw, H * 0.66, 18)
    color(ctx, WHITE, 0.06)
    ctx.fill_preserve()
    color(ctx, WHITE, 0.25)
    ctx.set_line_width(2)
    ctx.stroke()
    text(ctx, "试验方案 · 一整套决定", px + 50, py + 80, 40, AMBER, seg(t, 0.2, 1.0), True, "left")
    rows = ["第一剂：哨兵给药", "第一剂：停止规则", "出现什么信号就暂停", "暂停期间，同组其余人是否继续给药", "谁来做这个决定"]
    for i, r in enumerate(rows):
        b = 1.0 + i * 1.2
        y = py + 170 + i * 100
        hi = i >= 2
        if hi:
            q = ease_out(seg(t, b, b + 0.8))
            rrect(ctx, px + 30, y - 52, (pw - 60) * q, 74, 10)
            color(ctx, AMBER, 0.16 * q)
            ctx.fill()
        reveal(ctx, ("＋ " if hi else "✓ ") + r, px + 50, y, 38, WHITE if hi else GREY, seg(t, b, b + 0.8),
               align="left", bold=hi)
    reveal(ctx, "试验开始前写好，而不是到时候再商量", W / 2, H * 0.92, 44, AMBER, seg(t, g.dur - 4.0, g.dur - 3.2))


# ---------------- 预告 ----------------

def s_next(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 40, 26, AMBER, 0.2, rise=4)
    p = ease_out(seg(t, 0.4, 2.4))
    glow_spot(ctx, W / 2, H * 0.42, 340 * p, AMBER, 0.22)  # 琥珀色外缘光
    ctx.save()
    ctx.translate(W / 2, H * 0.42)
    ctx.rotate(math.pi / 2 + 0.15 * math.sin(t * 0.4))
    capsule(ctx, 0, 0, 120, 300, p)  # 伊布替尼：白色胶囊，只画形状颜色
    ctx.restore()
    reveal(ctx, "半衰期 4–6 小时　一天一次", W / 2, H * 0.70, 48, WHITE, seg(t, 2.0, 2.8))
    reveal(ctx, "下一集　间隔", W / 2, H * 0.86, 44, AMBER, seg(t, g.dur - 2.4, g.dur - 1.4))


G = Group
GROUPS = [
    G(s_open, E.L(1, 2, 3, 4, 5), lead=1.6, tail=2.2, xf=False),
    G(title_scene("EP04", "第五天"), fixed=4.5),
    G(s_single, E.L(6), lead=0.4, tail=0.8),
    G(s_accum, E.L(7, 8), lead=0.4, tail=1.4),
    G(s_ladder, E.L(9), lead=0.4, tail=1.6),
    G(vote_scene(["这个药的靶点叫 FAAH。", "每天多少毫克时，它已经被抑制得差不多了？"],
                 ["A　5 毫克", "B　20 毫克", "C　50 毫克"]), fixed=10),
    G(s_sat, E.L(10, 11, 12), lead=0.4, tail=1.6),
    G(s_enzymes, E.L(13), lead=0.4, tail=1.2),
    G(s_split, E.L(14, 15, 16), lead=0.4, tail=1.8),
    G(s_gap, E.L(17), lead=0.6, tail=1.2),
    G(s_chain, E.L(18), lead=0.4, tail=1.4),
    G(s_timeline, E.L(19), lead=0.6, tail=2.0),
    G(s_protocol, E.L(20), lead=0.4, tail=1.6),
    G(map_scene(1, 3, "超过靶点所需", "靶点饱和之后，加量换不来更多作用"), E.L(21), lead=0.6, tail=1.2),
    G(limits_scene(["FAAH 这个靶点本身就有毒", "非线性药代就是原因", "多次给药试验很危险",
                    "5 毫克就是合适的剂量"], F("s12")), E.L(22, 23, 24, 25), lead=0.8, tail=1.0),
    G(s_next, E.L(26), lead=0.4, tail=1.6),
    G(end_scene(), E.L(27), lead=1.0, tail=1.4),
]


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=float, default=0)
    ap.add_argument("--smoke", action="store_true")
    a = ap.parse_args()
    E.smoke(GROUPS) if a.smoke else E.run(GROUPS, a.limit)
