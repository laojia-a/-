"""EP01 一顿饭：逐场景动画。

用法: python tools/ep01.py [--limit 秒数]
输出: build/EP01/EP01_motion.mp4（无声画面）、build/EP01/plan.tsv（每句旁白的起点，给配音混音用）
没有配音时按约 4.2 字/秒估算时长；配音生成后重跑即自动对齐。
"""
import argparse
import math
import subprocess
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
from motion import *  # noqa: E402,F403
import motion as M  # noqa: E402
from common import tablet, ZYTIGA_500, YONSA_125  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
EP = "EP01"
BASE = ROOT / "build" / EP
FR = BASE / "frames"


def F(s):
    return FR / f"{EP}_{s}.png"


def load_narr():
    d = {}
    for line in (BASE / "narration.tsv").read_text(encoding="utf-8").splitlines():
        lid, _s, t = line.split("\t", 2)
        d[lid] = t
    return d


NARR = load_narr()


def line_dur(lid):
    mp3 = BASE / "tts" / f"{lid}.mp3"
    if mp3.exists():
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                            "-of", "csv=p=0", str(mp3)], capture_output=True, text=True)
        return float(r.stdout) + 0.45
    return max(2.4, len(NARR.get(lid, "")) / 4.2 + 0.6)


def L(*nums):
    return [f"{EP}_{n:03d}" for n in nums]


# ---------------- 场景 ----------------

def s_breakfast(ctx, t, g):
    photo(ctx, F("s01"), t, g.dur, z=(1.18, 1.04), pan=((-60, 40), (0, 0)))
    steam(ctx, t, W * 0.48, H * 0.55, 700, 12, 0.07)
    dust(ctx, t, 30, 2, AMBER, 0.25)
    b1 = g.beat(1, 99)
    p = seg(t, b1 + 0.3, b1 + 1.2)
    if p > 0:
        darken(ctx, 0.25 * p)
        reveal(ctx, "标准高脂餐", W / 2, H * 0.40, 64, AMBER, p)
        reveal(ctx, "900–1000 kcal　约一半热量来自脂肪", W / 2, H * 0.40 + 90, 40, WHITE,
               seg(t, b1 + 0.9, b1 + 1.8))
        tag(ctx, "real", p, "ICH M13A 2024")
    b2 = g.beat(2, 99)
    q = seg(t, b2, b2 + 0.8)
    if q > 0:  # 第三句淡出数字，镜头推向药片
        darken(ctx, 0.2 * q)
        glow_spot(ctx, W * 0.72, H * 0.62, 260 * ease_out(q), AMBER, 0.18 * q)


def pk(x, ka=1.6, ke=0.28):
    return math.exp(-ke * x) - math.exp(-ka * x)


PK_PEAK = max(pk(x / 100) for x in range(1, 2400))


def s_curves(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 5, WHITE, 0.12)
    x0, y0, x1, y1 = 260, 860, 1660, 200  # 坐标区
    tmax = 24
    p_fast = ease_io(seg(t, 0.2, 2.0))
    p_fed = ease_io(seg(t, 1.2, 4.2))
    # 纵轴随餐后曲线升高而缩放：从容纳空腹曲线到容纳 17 倍
    cur_peak = 1 + 16 * ease_io(seg(t, 1.8, 4.0))
    ymax = max(1.35, cur_peak * 1.15)
    color(ctx, GREY, 0.6)
    ctx.set_line_width(2)
    ctx.move_to(x0, y1 - 20)
    ctx.line_to(x0, y0)
    ctx.line_to(x1 + 20, y0)
    ctx.stroke()
    text(ctx, "血药浓度", x0 - 20, y1 - 40, 30, GREY, 0.9, False, "left")
    text(ctx, "时间", x1, y0 + 50, 30, GREY, 0.9, False, "right")

    def curve(scale, prog, c, w):
        pts = []
        n = int(240 * prog)
        for i in range(n + 1):
            xx = i / 240 * tmax
            v = pk(xx) / PK_PEAK * scale
            pts.append((x0 + (x1 - x0) * xx / tmax, y0 - (y0 - y1) * v / ymax))
        polyline(ctx, pts, c, w)
        return pts

    curve(1, p_fast, WHITE, 4)
    pts = curve(17, p_fed, AMBER, 5)
    text(ctx, "空腹", x0 + 160, y0 - (y0 - y1) * 1.05 / ymax - 20, 30, WHITE, p_fast, False, "left")
    if p_fed > 0.3:
        px = x0 + (x1 - x0) * 2.0 / tmax
        py = y0 - (y0 - y1) * 17 / ymax
        q = seg(t, 3.4, 4.4)
        reveal(ctx, "峰浓度 ×17", px + 70, py + 20, 72, AMBER, q, align="left", count=True)
        text(ctx, "高脂餐后", px + 70, py + 80, 32, AMBER, 0.8 * q, False, "left")
    # 总暴露：餐后曲线下面积缓慢填充
    q2 = seg(t, g.dur - 3.2, g.dur - 2.0)
    if q2 > 0 and pts:
        ctx.move_to(pts[0][0], y0)
        for p in pts:
            ctx.line_to(*p)
        ctx.line_to(pts[-1][0], y0)
        ctx.close_path()
        color(ctx, AMBER, 0.16 * q2)
        ctx.fill()
        reveal(ctx, "总暴露 AUC ×10", x1 - 40, y0 - 120, 56, AMBER, q2, align="right", count=True)
    tag(ctx, "real", 1, "ZYTIGA 标签 §12.3")
    text(ctx, "健康人单次给药　高脂餐 57% 脂肪、825 kcal　曲线形状为示意，倍数来自标签",
         x1, y0 + 100, 26, GREY, 0.8, False, "right")


def s_boxes(ctx, t, g, warn=False):
    photo(ctx, F("s03"), t, g.dur, z=(1.04, 1.12), pan=((40, 0), (-40, 0)))
    dust(ctx, t, 25, 9, AMBER, 0.2)
    if warn:
        p = seg(t, 0.4, 1.4)
        darken(ctx, 0.3 * p)
        reveal(ctx, "不能与其他阿比特龙产品自行互换", W / 2, H * 0.30, 56, AMBER, p)
        tag(ctx, "real", p, "YONSA 标签 §2、§17")
        return
    # 真实片形：ZYTIGA 500 mg 紫色椭圆薄膜衣片（AA），YONSA 125 mg 白色椭圆片（125 FP）
    pz = ease_out(seg(t, 0.2, 1.2))
    py = ease_out(seg(t, 1.2, 2.2))
    tablet(ctx, W * 0.36, H * 0.56 - (1 - pz) * 30, 230, 112, ZYTIGA_500, "AA", pz, -0.08)
    tablet(ctx, W * 0.64, H * 0.56 - (1 - py) * 30, 150, 74, YONSA_125, "125 FP", py, 0.06, film=False)
    text(ctx, "阿比特龙 500 mg", W * 0.36, H * 0.56 + 120, 30, GREY, pz, False)
    text(ctx, "阿比特龙 125 mg", W * 0.64, H * 0.56 + 120, 30, GREY, py, False)
    p = seg(t, 0.6, 1.6)
    reveal(ctx, "ZYTIGA", W * 0.36, H * 0.22, 48, WHITE, p)
    reveal(ctx, "必须空腹", W * 0.36, H * 0.22 + 64, 40, WHITE, seg(t, 1.0, 2.0))
    reveal(ctx, "YONSA", W * 0.64, H * 0.22, 48, AMBER, seg(t, 1.6, 2.6))
    reveal(ctx, "可随餐或不随餐", W * 0.64, H * 0.22 + 64, 40, AMBER, seg(t, 2.0, 3.0))
    b = g.beat(1, 99)
    q = seg(t, b, b + 1.2)
    if q > 0:
        darken(ctx, 0.45 * q)
        reveal(ctx, "同一种成分", W / 2, H * 0.52, 110, WHITE, q)
    tag(ctx, "real", p, "ZYTIGA / YONSA 标签")


def s_title(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 50, 11, AMBER, 0.28, rise=6)
    p = seg(t, 0.3, 1.6)
    glow_spot(ctx, W / 2, H * 0.46, 700 * ease_out(p), AMBER, 0.10)
    reveal(ctx, "剂量", W / 2, H * 0.50, 180, WHITE, p)
    reveal(ctx, "EP01　一顿饭", W / 2, H * 0.50 + 110, 44, AMBER, seg(t, 1.0, 2.0))
    text(ctx, "支线进行中", W - 80, H - 80, 30, GREY, seg(t, 1.6, 2.4), False, "right")
    if t > g.dur - 0.8:  # 片头末尾淡出到黑
        darken(ctx, seg(t, g.dur - 0.8, g.dur))


def s_insert(ctx, t, g):
    photo(ctx, F("s04"), t, g.dur, z=(1.05, 1.16), pan=((0, 30), (0, -30)))
    darken(ctx, 0.35)
    rows = [("ZYTIGA", "空腹：服药前 2 小时、服药后 1 小时不进食"),
            ("YONSA", "可随餐，也可不随餐")]
    for i, (k, v) in enumerate(rows):
        p = seg(t, 0.5 + i * 0.9, 1.4 + i * 0.9)
        y = H * 0.34 + i * 130
        reveal(ctx, k, W * 0.20, y, 52, AMBER if i else WHITE, p, align="left")
        reveal(ctx, v, W * 0.36, y, 40, WHITE, p, align="left", bold=False)
    b = g.beat(1, 99)
    q = seg(t, b + 0.6, b + 1.6)
    reveal(ctx, "每日 1000 mg", W * 0.30, H * 0.70, 64, WHITE, q, count=True)
    reveal(ctx, "每日 500 mg", W * 0.70, H * 0.70, 64, AMBER, seg(t, b + 1.0, b + 2.0), count=True)
    tag(ctx, "real", 1, "现行标签 §2")


CARD_HEAD = ["产品", "剂量", "人群", "餐型", "指标"]


def draw_card(ctx, t, vals, start, y=H * 0.46, hi=None, a=1.0, head_p=1.0):
    n = len(CARD_HEAD)
    cw, gap = 300, 26
    x0 = W / 2 - (n * cw + (n - 1) * gap) / 2
    for i, h in enumerate(CARD_HEAD):
        x = x0 + i * (cw + gap)
        p = seg(t, start + i * 0.45, start + i * 0.45 + 0.6)
        rrect(ctx, x, y - 120, cw, 230, 18)
        color(ctx, WHITE, 0.05 * a * head_p)
        ctx.fill_preserve()
        color(ctx, AMBER if hi and i in hi else GREY, (0.7 if hi and i in hi else 0.35) * a * head_p)
        ctx.set_line_width(2)
        ctx.stroke()
        text(ctx, h, x + cw / 2, y - 60, 30, GREY, a * head_p, False)
        if vals:
            reveal(ctx, vals[i], x + cw / 2, y + 40, 42 if len(vals[i]) < 6 else 34,
                   AMBER if hi and i in hi else WHITE, p, a)


def s_card(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 4, WHITE, 0.1)
    reveal(ctx, "先给“17 倍”写一张身份卡", W / 2, H * 0.22, 52, WHITE, seg(t, 0.2, 1.0))
    draw_card(ctx, t, None, 0, head_p=ease_out(seg(t, 0.4, 1.4)))
    b = g.beat(1, 99)
    draw_card(ctx, t, ["ZYTIGA", "单次", "健康志愿者", "高脂餐", "Cmax ×17"], b + 0.2)
    q = seg(t, g.dur - 1.6, g.dur - 0.6)
    reveal(ctx, "少一栏，这个数字就会被误用", W / 2, H * 0.80, 40, AMBER, q)
    tag(ctx, "real", 1, "ZYTIGA 标签 §12.3")


VOTE_OPTS = ["A　还是约 10 倍", "B　更大", "C　小得多"]


def s_vote(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 30, 8, BLUE, 0.15)
    reveal(ctx, "弹幕投票", W / 2, 200, 40, AMBER, seg(t, 0, 0.6))
    reveal(ctx, "换成真正的患者，每天吃，连续一周，", W / 2, 320, 54, WHITE, seg(t, 0.3, 1.1))
    reveal(ctx, "高脂餐的影响会是？", W / 2, 400, 54, WHITE, seg(t, 0.6, 1.4))
    for i, o in enumerate(VOTE_OPTS):
        p = seg(t, 1.2 + i * 0.35, 1.9 + i * 0.35)
        y = 560 + i * 120
        rrect(ctx, W / 2 - 360, y - 62, 720, 92, 20)
        color(ctx, WHITE, 0.06 * ease_out(p))
        ctx.fill()
        reveal(ctx, o, W / 2 - 300, y, 46, WHITE, p, align="left")
    # 倒计时进度条
    p = seg(t, 2.0, g.dur - 0.3)
    color(ctx, GREY, 0.3)
    ctx.rectangle(W / 2 - 360, 960, 720, 6)
    ctx.fill()
    color(ctx, AMBER, 0.9)
    ctx.rectangle(W / 2 - 360, 960, 720 * (1 - p), 6)
    ctx.fill()
    text(ctx, f"{max(0, math.ceil(g.dur - 0.3 - t))}", W / 2 + 400, 975, 34, AMBER, 1, True, "left")


def bars(ctx, t, items, x0, base_y, scale, start, bw=120, gap=60, label_y=50):
    """items: [(标签, 数值, 颜色)]，柱子依次生长并滚动数字。"""
    for i, (lab, v, c) in enumerate(items):
        p = ease_out(seg(t, start + i * 0.5, start + i * 0.5 + 1.4))
        x = x0 + i * (bw + gap)
        h = v * scale * p
        g = M.cairo.LinearGradient(0, base_y - h, 0, base_y)
        g.add_color_stop_rgba(0, *rgba(c, 0.95))
        g.add_color_stop_rgba(1, *rgba(c, 0.35))
        ctx.set_source(g)
        rrect(ctx, x, base_y - max(h, 1), bw, max(h, 1), 8)
        ctx.fill()
        if p > 0.05:
            text(ctx, "×" + countup(f"{v:g}", seg(t, start + i * 0.5, start + i * 0.5 + 1.4)),
                 x + bw / 2, base_y - h - 20, 44, c, min(1, p * 2))
        text(ctx, lab, x + bw / 2, base_y + label_y, 30, GREY, min(1, p * 3), False)


def s_patients(ctx, t, g):
    photo(ctx, F("s10"), t, g.dur, z=(1.04, 1.12))
    darken(ctx, 0.55)
    # 揭晓投票：C 亮起
    p = seg(t, 0.2, 1.0)
    reveal(ctx, "答案：C　小得多", W / 2, 170, 48, AMBER, p)
    draw_card(ctx, t, ["ZYTIGA", "每日 × 7 天", "前列腺癌患者", "高脂餐", "AUC ×2"],
              0.8, y=H * 0.38, hi={1, 2}, a=1)
    b = g.beat(1, 99)
    q = seg(t, b, b + 0.8)
    if q > 0:
        bars(ctx, t, [("健康人 单次", 10, WHITE), ("患者 连续 7 天", 2, AMBER)],
             W / 2 - 150, H * 0.86, 20, b + 0.2, bw=120, gap=60, label_y=44)
        reveal(ctx, "人群、给药次数、指标都变了", W / 2 + 520, H * 0.76, 36, WHITE, seg(t, b + 1.6, b + 2.4))
    tag(ctx, "real", 1, "ZYTIGA 标签 §12.3")


def s_gut(ctx, t, g):
    photo(ctx, F("s05"), t, g.dur, z=(1.03, 1.14), pan=((0, -20), (0, 30)))
    dust(ctx, t, 60, 13, WHITE, 0.22, rise=-18, size=(1.5, 4))
    p = seg(t, 1.0, 2.0)
    reveal(ctx, "难溶于水", W * 0.18, H * 0.25, 56, WHITE, p, align="left")
    reveal(ctx, "大部分还没溶解，就离开了吸收最好的肠段", W * 0.18, H * 0.25 + 72, 34, WHITE,
           seg(t, 1.6, 2.6), align="left", bold=False)


def s_micelle(ctx, t, g):
    photo(ctx, F("s06"), t, g.dur, z=(1.05, 1.15))
    darken(ctx, 0.45)
    rng = np.random.default_rng(21)
    nm, nd = 7, 42
    mc = [(W * (0.18 + 0.64 * rng.random()), H * (0.25 + 0.45 * rng.random())) for _ in range(nm)]
    start = 0.6
    for j, (mx, my) in enumerate(mc):
        pj = ease_out(seg(t, start + j * 0.3, start + j * 0.3 + 1.2))
        r = 70 * pj
        mx += math.sin(t * 0.5 + j) * 14
        my += math.cos(t * 0.4 + j) * 10
        mc[j] = (mx, my)
        if r > 1:
            glow_spot(ctx, mx, my, r * 1.6, AMBER, 0.12)
            for k in range(22):  # 胶束表面的头基
                ang = k / 22 * 2 * math.pi + t * 0.2
                ctx.arc(mx + r * math.cos(ang), my + r * math.sin(ang), 5, 0, 2 * math.pi)
                color(ctx, AMBER, 0.85)
                ctx.fill()
    for i in range(nd):
        sx, sy = W * rng.random(), H * (0.15 + 0.7 * rng.random())
        j = i % nm
        cap = ease_io(seg(t, 2.2 + i * 0.06, 3.6 + i * 0.06))
        tx = mc[j][0] + 30 * math.cos(i * 2.4)
        ty = mc[j][1] + 30 * math.sin(i * 2.4)
        x, y = lerp(sx, tx, cap), lerp(sy, ty, cap)
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(i + t * 0.3)
        ctx.rectangle(-6, -6, 12, 12)
        color(ctx, WHITE, 0.85)
        ctx.fill()
        ctx.restore()
    reveal(ctx, "胆汁 → 胶束 → 把药包进来", W / 2, H * 0.14, 50, AMBER, seg(t, 1.0, 2.0))
    b = g.beat(1, 99)
    q = seg(t, b, b + 1.0)
    if q > 0:
        darken(ctx, 0.4 * q)
        reveal(ctx, "这只是一种合理解释", W / 2, H * 0.44, 56, WHITE, q)
        reveal(ctx, "胃排空变慢　肠道停留更久　……", W / 2, H * 0.44 + 80, 38, GREY, seg(t, b + 0.8, b + 1.8), bold=False)
        reveal(ctx, "机制 ≠ 观察", W / 2, H * 0.66, 72, AMBER, seg(t, b + 2.4, b + 3.4))
    tag(ctx, "schematic", 1)


def s_micronized(ctx, t, g):
    photo(ctx, F("s08"), t, g.dur, z=(1.20, 1.02))  # 拉远：从颗粒到整体
    dust(ctx, t, 40, 17, AMBER, 0.2)
    p = seg(t, 1.0, 2.0)
    reveal(ctx, "YONSA：微粉化原料", W * 0.08, H * 0.24, 56, AMBER, p, align="left")
    reveal(ctx, "颗粒更细　每日 500 mg", W * 0.08, H * 0.24 + 74, 38, WHITE, seg(t, 1.6, 2.6), align="left", bold=False)
    tag(ctx, "real", p, "YONSA 标签 §11")


def s_bars(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 19, WHITE, 0.1)
    reveal(ctx, "高脂餐 vs 空腹", W / 2, 140, 48, WHITE, seg(t, 0, 0.8))
    base = H * 0.80
    text(ctx, "ZYTIGA", W * 0.33, base + 110, 40, WHITE, seg(t, 0.3, 1.0))
    text(ctx, "YONSA", W * 0.67, base + 110, 40, AMBER, seg(t, 1.8, 2.5))
    bars(ctx, t, [("峰浓度", 17, WHITE), ("总暴露", 10, WHITE)], W * 0.33 - 150, base, 30, 0.4)
    bars(ctx, t, [("峰浓度", 6.5, AMBER), ("总暴露", 4.4, AMBER)], W * 0.67 - 150, base, 30, 1.9)
    b = g.beat(1, 99)
    q = seg(t, b, b + 1.0)
    if q > 0:
        darken(ctx, 0.55 * q)
        reveal(ctx, "食物效应属于具体产品，", W / 2, H * 0.45, 64, WHITE, q)
        reveal(ctx, "不属于成分", W / 2, H * 0.45 + 96, 64, AMBER, seg(t, b + 0.5, b + 1.5))
    tag(ctx, "real", 1, "ZYTIGA / YONSA 标签 §12.3")


GRID = {"R空腹": 100, "R餐后": 200, "T空腹": 102, "T餐后": 198}


def s_grid(ctx, t, g):
    fill_bg(ctx)
    sim_grid(ctx, 0.08 * ease_out(seg(t, 0, 1.0)))
    b0, b1, b2, b3 = (g.beat(i, 99) for i in range(4))
    cw, ch, gap = 360, 230, 40
    cx, cy = W / 2 + 60, H / 2 + 20
    xs = [cx - cw - gap / 2, cx + gap / 2]
    ys = [cy - ch - gap / 2, cy + gap / 2]
    cols, rows = ["参比 R", "试验 T"], ["空腹", "餐后"]
    for ci, cn in enumerate(cols):
        text(ctx, cn, xs[ci] + cw / 2, ys[0] - 40, 40, WHITE, seg(t, 0.4, 1.2))
    for ri, rn in enumerate(rows):
        text(ctx, rn, xs[0] - 50, ys[ri] + ch / 2 + 14, 40, WHITE, seg(t, 0.6, 1.4), True, "right")
    for ri in range(2):
        for ci in range(2):
            p = ease_out(seg(t, 0.5 + (ri * 2 + ci) * 0.2, 1.3 + (ri * 2 + ci) * 0.2))
            rrect(ctx, xs[ci], ys[ri] + (1 - p) * 30, cw, ch, 18)
            color(ctx, BLUE, 0.10 * p)
            ctx.fill_preserve()
            color(ctx, BLUE, 0.6 * p)
            ctx.set_line_width(2)
            ctx.stroke()
            key = ("R" if ci == 0 else "T") + rows[ri]
            q = seg(t, b2 + 0.3 + (ri * 2 + ci) * 0.3, b2 + 1.3 + (ri * 2 + ci) * 0.3)
            reveal(ctx, str(GRID[key]), xs[ci] + cw / 2, ys[ri] + ch / 2 + 30, 80, WHITE, q, count=True)
    # 竖箭头 FE、横箭头 BE
    pf = seg(t, b1 + 0.2, b1 + 1.2)
    pb = seg(t, b1 + 1.6, b1 + 2.6)
    arrow(ctx, xs[0] - 160, ys[0] + 40, xs[0] - 160, ys[1] + ch - 40, AMBER, 5, 1, pf)
    text(ctx, "FE 食物效应", xs[0] - 190, ys[1] + ch + 60, 34, AMBER, pf, True, "center")
    arrow(ctx, xs[0] + 40, ys[1] + ch + 70, xs[1] + cw - 40, ys[1] + ch + 70, WHITE, 5, 1, pb)
    text(ctx, "BE 生物等效", xs[1] + cw + 30, ys[1] + ch + 84, 34, WHITE, pb, True, "left")
    # 两个比值
    q = seg(t, b2 + 2.0, b2 + 3.0)
    reveal(ctx, "R 餐后 / 空腹 = 2.00", W * 0.84, H * 0.36, 40, AMBER, q, count=True)
    reveal(ctx, "餐后 T / R = 0.99", W * 0.84, H * 0.36 + 70, 40, WHITE, seg(t, b2 + 2.6, b2 + 3.6), count=True)
    r = seg(t, b3, b3 + 1.0)
    if r > 0:
        darken(ctx, 0.5 * r)
        reveal(ctx, "强食物效应 与 制剂等效", W / 2, H * 0.46, 64, WHITE, r)
        reveal(ctx, "可以同时成立", W / 2, H * 0.46 + 96, 64, AMBER, seg(t, b3 + 0.5, b3 + 1.5))
    tag(ctx, "sim", 1)


def s_emax(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 20, 23, WHITE, 0.1)
    x0, y0, x1, y1 = 360, 860, 1560, 260
    color(ctx, GREY, 0.6)
    ctx.set_line_width(2)
    ctx.move_to(x0, y1 - 20)
    ctx.line_to(x0, y0)
    ctx.line_to(x1 + 20, y0)
    ctx.stroke()
    text(ctx, "效应", x0 - 20, y1 - 40, 30, GREY, 1, False, "left")
    text(ctx, "暴露", x1, y0 + 50, 30, GREY, 1, False, "right")
    reveal(ctx, "暴露 ×10　=　疗效 ×10 ？", W / 2, 150, 60, WHITE, seg(t, 0.2, 1.0))
    b = g.beat(1, 99)
    p = ease_io(seg(t, b, b + 2.2))

    def emax(x):
        return x / (x + 1.2)

    pts = [(x0 + (x1 - x0) * i / 200, y0 - (y0 - y1) * emax(i / 200 * 12) / emax(12) * 0.95)
           for i in range(int(200 * p) + 1)]
    polyline(ctx, pts, BLUE, 5)
    if p >= 1:
        for xx, lab in [(1.0, "暴露 1"), (10.0, "暴露 10")]:
            q = seg(t, b + 2.4 + (xx > 1) * 0.8, b + 3.2 + (xx > 1) * 0.8)
            px = x0 + (x1 - x0) * xx / 12
            py = y0 - (y0 - y1) * emax(xx) / emax(12) * 0.95
            ctx.arc(px, py, 12 * ease_out(q), 0, 2 * math.pi)
            color(ctx, AMBER, q)
            ctx.fill()
            text(ctx, lab, px, y0 + 50, 30, AMBER, q, False)
        q = seg(t, b + 4.6, b + 5.6)
        reveal(ctx, "暴露 ≠ 效应", W / 2 + 200, H * 0.62, 72, AMBER, q)
    tag(ctx, "schematic", 1)


def s_paper(ctx, t, g):
    photo(ctx, F("s04"), t, g.dur, z=(1.10, 1.22), pan=((30, 0), (-30, 0)))
    darken(ctx, 0.55)
    b0, b1, b2 = (g.beat(i, 99) for i in range(3))
    reveal(ctx, "Szmulewitz 等　J Clin Oncol 2018", W / 2, H * 0.20, 44, AMBER, seg(t, 0.5, 1.4))
    reveal(ctx, "随机 II 期　n = 72", W / 2, H * 0.20 + 70, 38, WHITE, seg(t, 1.2, 2.0), count=True)
    reveal(ctx, "250 mg + 低脂早餐", W * 0.32, H * 0.42, 46, AMBER, seg(t, b0 + 3.0, b0 + 4.0))
    reveal(ctx, "1000 mg 空腹", W * 0.68, H * 0.42, 46, WHITE, seg(t, b0 + 3.6, b0 + 4.6))
    q = seg(t, b1, b1 + 1.0)
    if q > 0:
        # 两条 PSA 下降线几乎重叠
        for i, (c, off) in enumerate([(AMBER, 0), (WHITE, 14)]):
            pp = ease_io(seg(t, b1 + 0.3 + i * 0.3, b1 + 2.3 + i * 0.3))
            pts = [(W * 0.25 + 900 * k / 100, H * 0.52 + off + 220 * (1 - math.exp(-k / 30)))
                   for k in range(int(100 * pp) + 1)]
            polyline(ctx, pts, c, 4)
        reveal(ctx, "12 周 PSA 下降：非劣效", W / 2, H * 0.90 - 60, 44, AMBER, seg(t, b1 + 2.0, b1 + 3.0))
    r = seg(t, b2, b2 + 0.8)
    if r > 0:
        darken(ctx, 0.6 * r)
        reveal(ctx, "这是一项研究，不是用药方法", W / 2, H * 0.44, 60, WHITE, r)
        reveal(ctx, "请勿自行减量", W / 2, H * 0.44 + 96, 60, RED, seg(t, b2 + 0.6, b2 + 1.4))
    tag(ctx, "real", 1, "PMID 29590007")


MAP = ["剂量", "暴露", "效应", "风险", "决策"]


def s_map(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 40, 29, AMBER, 0.15)
    n = len(MAP)
    xs = [W * (0.14 + 0.18 * i) for i in range(n)]
    y = H * 0.48
    for i in range(n - 1):
        p = seg(t, 0.4 + i * 0.3, 0.9 + i * 0.3)
        hi = i == 0
        arrow(ctx, xs[i] + 95, y, xs[i + 1] - 95, y, AMBER if hi else GREY, 4 if hi else 2,
              1 if hi else 0.5, p, 16)
    for i, s in enumerate(MAP):
        p = ease_out(seg(t, 0.2 + i * 0.3, 0.8 + i * 0.3))
        hi = i <= 1
        glow_spot(ctx, xs[i], y - 16, 150, AMBER if hi else WHITE, (0.22 if hi else 0.04) * p)
        text(ctx, s, xs[i], y, 56, AMBER if hi else GREY, p)
    q = seg(t, 2.0, 3.0)
    reveal(ctx, "食物", (xs[0] + xs[1]) / 2, y - 80, 36, AMBER, q)
    reveal(ctx, "剂量没变，暴露变了", W / 2, H * 0.72, 48, WHITE, seg(t, 2.6, 3.6))


LIMITS = ["阿比特龙随餐吃会中毒", "难溶的药都应该随餐吃", "成分一样就能换着吃", "高脂餐是危险的"]


def s_limits(ctx, t, g):
    photo(ctx, F("s11"), t, g.dur, z=(1.02, 1.10))
    darken(ctx, 0.55)
    reveal(ctx, "这一集不能推出", W * 0.14, H * 0.20, 52, AMBER, seg(t, 0, 0.8), align="left")
    for i, s in enumerate(LIMITS):
        b = g.beat(i, 99)
        p = seg(t, b, b + 0.7)
        nxt = g.beat(i + 1, 999)
        a = 1.0 if t < nxt else 0.45
        y = H * 0.36 + i * 120
        reveal(ctx, "×", W * 0.14, y, 52, RED, p, a, align="left")
        reveal(ctx, s, W * 0.14 + 80, y, 48, WHITE, p, a, align="left", bold=False)


def capsule(ctx, x, y, w=46, h=110, a=1.0):
    rrect(ctx, x - w / 2, y - h / 2, w, h, w / 2)
    g = M.cairo.LinearGradient(x - w / 2, 0, x + w / 2, 0)
    g.add_color_stop_rgba(0, 0.85, 0.85, 0.85, a)
    g.add_color_stop_rgba(0.4, 1, 1, 1, a)
    g.add_color_stop_rgba(1, 0.6, 0.6, 0.62, a)
    ctx.set_source(g)
    ctx.fill()


def cylinder(ctx, x, y, w, h, level, c, a=1.0):
    color(ctx, WHITE, 0.35 * a)
    ctx.set_line_width(3)
    ctx.move_to(x, y - h)
    ctx.line_to(x, y)
    ctx.line_to(x + w, y)
    ctx.line_to(x + w, y - h)
    ctx.stroke()
    lh = h * level
    g = M.cairo.LinearGradient(0, y - lh, 0, y)
    g.add_color_stop_rgba(0, *rgba(c, 0.9 * a))
    g.add_color_stop_rgba(1, *rgba(c, 0.4 * a))
    ctx.set_source(g)
    ctx.rectangle(x + 4, y - lh, w - 8, lh)
    ctx.fill()


def s_next(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 30, 31, WHITE, 0.12)
    # 左：1 粒变 5 粒；右：量筒只升到约 2.4 倍
    p1 = ease_out(seg(t, 0.3, 0.9))
    capsule(ctx, W * 0.16, H * 0.42, a=p1)
    for i in range(5):
        p = ease_out(seg(t, 1.2 + i * 0.25, 1.6 + i * 0.25))
        capsule(ctx, W * 0.30 + i * 64, H * 0.42 - (1 - p) * 60, a=p)
    reveal(ctx, "剂量 ×5", W * 0.30 + 128, H * 0.62, 56, WHITE, seg(t, 2.6, 3.4))
    lv = ease_io(seg(t, 3.0, 5.0))
    cylinder(ctx, W * 0.62, H * 0.70, 140, 500, 0.16, AMBER)
    cylinder(ctx, W * 0.74, H * 0.70, 140, 500, 0.16 + (0.385 - 0.16) * lv, AMBER)
    reveal(ctx, "吸收 ×2.4", W * 0.74 + 70, H * 0.80, 56, AMBER, seg(t, 4.4, 5.2), count=True)
    q = seg(t, g.dur - 1.6, g.dur - 0.6)
    reveal(ctx, "下一集　加倍", W / 2, H * 0.92, 44, WHITE, q)
    tag(ctx, "real", seg(t, 4.4, 5.2), "NEURONTIN 标签")


def s_end(ctx, t, g):
    fill_bg(ctx)
    dust(ctx, t, 60, 37, AMBER, 0.25, rise=5)
    p = seg(t, 0.2, 1.4)
    glow_spot(ctx, W / 2, H * 0.44, 800 * ease_out(p), AMBER, 0.08)
    reveal(ctx, "剂量", W / 2, H * 0.46, 150, WHITE, p)
    reveal(ctx, "一颗新药，从第一剂到说明书", W / 2, H * 0.46 + 100, 42, AMBER, seg(t, 1.2, 2.2))
    reveal(ctx, "支线进行中", W / 2, H * 0.80, 40, GREY, seg(t, g.beat(0) + 4, g.beat(0) + 5))
    if t > g.dur - 1.0:
        darken(ctx, seg(t, g.dur - 1.0, g.dur))


GROUPS = [
    Group(s_breakfast, L(1, 2, 3), lead=2.2, tail=0.4, xf=False),
    Group(s_curves, L(4), tail=2.6),
    Group(s_boxes, L(5, 6), tail=1.2),
    Group(s_title, fixed=4.5),
    Group(s_insert, L(7, 8), lead=0.4, tail=0.8),
    Group(s_card, L(9, 10), tail=1.6),
    Group(s_vote, fixed=10),
    Group(s_patients, L(11, 12), tail=1.4),
    Group(s_gut, L(13), lead=0.6, tail=0.6),
    Group(s_micelle, L(14, 15), tail=1.8),
    Group(s_micronized, L(16), tail=0.4),
    Group(s_bars, L(17, 18), lead=0.3, tail=1.4),
    Group(lambda c, t, g: s_boxes(c, t, g, warn=True), L(19), tail=0.6),
    Group(s_grid, L(20, 21, 22, 23), tail=1.6),
    Group(s_emax, L(24, 25), tail=1.4),
    Group(s_paper, L(26, 27, 28), tail=1.0),
    Group(s_map, L(29), lead=0.6, tail=1.2),
    Group(s_limits, L(30, 31, 32, 33), lead=0.8, tail=1.0),
    Group(s_next, L(34), lead=0.4, tail=1.6),
    Group(s_end, L(35), lead=1.0, tail=1.4),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=float, default=0, help="只渲染前 N 秒，用于预览")
    args = ap.parse_args()
    out = BASE / f"{EP}_motion.mp4"
    starts, total = render(out, GROUPS, NARR, line_dur,
                           int(args.limit * FPS) if args.limit else None)
    # 记录每句旁白在全片中的起点，配音混音用
    with (BASE / "plan.tsv").open("w", encoding="utf-8") as f:
        for g0, g in starts:
            for lid, b in zip(g.lines, g.beats):
                f.write(f"{lid}\t{g0 + b:.3f}\n")
    print(f"{out}  {total / 60:.1f} 分钟")


if __name__ == "__main__":
    main()
