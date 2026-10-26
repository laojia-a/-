"""各集共用：旁白读取、时长、通用场景（片头、投票、剂量地图、边界、片尾）。"""
import math
import subprocess
from pathlib import Path

import motion as M
from motion import *  # noqa: F401,F403

ROOT = Path(__file__).resolve().parent.parent


class Episode:
    def __init__(self, ep):
        self.ep = ep
        self.base = ROOT / "build" / ep
        self.narr = {}
        for line in (self.base / "narration.tsv").read_text(encoding="utf-8").splitlines():
            lid, _s, t = line.split("\t", 2)
            self.narr[lid] = t

    def frame(self, shot, ep=None):
        ep = ep or self.ep
        return ROOT / "build" / ep / "frames" / f"{ep}_{shot}.png"

    def line_dur(self, lid):
        mp3 = self.base / "tts" / f"{lid}.mp3"
        if mp3.exists():
            r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                "-of", "csv=p=0", str(mp3)], capture_output=True, text=True)
            return float(r.stdout) + 0.45
        return max(2.4, len(self.narr.get(lid, "")) / 4.2 + 0.6)

    def L(self, *nums):
        return [f"{self.ep}_{n:03d}" for n in nums]

    def smoke(self, groups, n=6):
        """每个场景抽几个时间点绘制一遍，快速发现报错，不编码视频。"""
        M.plan(groups, self.narr, self.line_dur)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, M.W, M.H)
        for i, g in enumerate(groups):
            for k in range(n + 1):
                g.scene(cairo.Context(surf), g.dur * k / n, g)
        print(f"{self.ep} smoke ok: {len(groups)} 个场景")

    def stills(self, groups, times):
        """按全片时间点输出静帧到 preview/，用于检查画面，不含字幕。"""
        starts, _subs, total = M.plan(groups, self.narr, self.line_dur)
        out_dir = self.base / "preview"
        out_dir.mkdir(exist_ok=True)
        surf = cairo.ImageSurface(cairo.FORMAT_ARGB32, M.W, M.H)
        for t in times:
            g0, g = [s for s in starts if s[0] <= t][-1]
            ctx = cairo.Context(surf)
            g.scene(ctx, t - g0, g)
            M.vignette(ctx, 0.55)
            p = out_dir / f"still_{t:06.1f}.png"
            surf.write_to_png(str(p))
            print(p.name, f"{g.scene.__name__}  组内 {t - g0:.1f}s")
        print(f"全片 {total:.1f}s")

    def run(self, groups, limit=0):
        out = self.base / f"{self.ep}_motion.mp4"
        starts, total = M.render(out, groups, self.narr, self.line_dur,
                                 int(limit * M.FPS) if limit else None)
        with (self.base / "plan.tsv").open("w", encoding="utf-8") as f:
            for g0, g in starts:
                for lid, b in zip(g.lines, g.beats):
                    f.write(f"{lid}\t{g0 + b:.3f}\n")
        # 音效时间表，mix.py 读取
        with (self.base / "sfx_plan.tsv").open("w", encoding="utf-8") as f:
            for g0, g in starts:
                for name, at, *vol in g.sfx:
                    lt = at if isinstance(at, (int, float)) else g.beat(at[0], 0) + at[1]
                    f.write(f"{name}\t{g0 + lt:.3f}\t{vol[0] if vol else 0.6}\n")
        print(f"{out}  {total / 60:.1f} 分钟")


# ---------- 通用图形 ----------

def capsule(ctx, x, y, w=46, h=110, a=1.0, tint=None):
    if a <= 0.001:
        return
    rrect(ctx, x - w / 2, y - h / 2, w, h, w / 2)
    g = cairo.LinearGradient(x - w / 2, 0, x + w / 2, 0)
    if tint:
        r, gg, b, _ = rgba(tint)
        g.add_color_stop_rgba(0, r * 0.7, gg * 0.7, b * 0.7, a)
        g.add_color_stop_rgba(0.4, r, gg, b, a)
        g.add_color_stop_rgba(1, r * 0.5, gg * 0.5, b * 0.5, a)
    else:
        g.add_color_stop_rgba(0, 0.85, 0.85, 0.85, a)
        g.add_color_stop_rgba(0.4, 1, 1, 1, a)
        g.add_color_stop_rgba(1, 0.6, 0.6, 0.62, a)
    ctx.set_source(g)
    ctx.fill()


def tablet(ctx, x, y, w=150, h=72, c="#7A4E9C", imprint="", a=1.0, angle=0.0, film=True):
    """椭圆药片俯视图，颜色与刻字按标签 §3。刻字做凹刻效果：暗色字＋下沿高光。"""
    if a <= 0.001:
        return
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(angle)
    # 投影
    ctx.save()
    ctx.translate(6, 10)
    ctx.scale(w / 2, h / 2)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()
    ctx.set_source_rgba(0, 0, 0, 0.45 * a)
    ctx.fill()
    # 片身：径向渐变，左上受光
    ctx.save()
    ctx.scale(w / 2, h / 2)
    ctx.arc(0, 0, 1, 0, 2 * math.pi)
    ctx.restore()
    r, g, b, _ = rgba(c)
    grad = cairo.RadialGradient(-w * 0.18, -h * 0.25, 2, 0, 0, w * 0.6)
    lift = 0.35 if film else 0.18
    grad.add_color_stop_rgba(0, min(1, r + lift), min(1, g + lift), min(1, b + lift), a)
    grad.add_color_stop_rgba(0.55, r, g, b, a)
    grad.add_color_stop_rgba(1, r * 0.55, g * 0.55, b * 0.55, a)
    ctx.set_source(grad)
    ctx.fill_preserve()
    color(ctx, "#000000", 0.25 * a)
    ctx.set_line_width(1.5)
    ctx.stroke()
    if imprint:
        size = h * 0.42
        font(ctx, size, True)
        adv = ctx.text_extents(imprint)[4]
        ctx.set_source_rgba(1, 1, 1, 0.22 * a)  # 凹槽下沿高光
        ctx.move_to(-adv / 2 + 1, size * 0.36 + 2)
        ctx.show_text(imprint)
        ctx.set_source_rgba(r * 0.45, g * 0.45, b * 0.45, 0.85 * a)
        ctx.move_to(-adv / 2, size * 0.36)
        ctx.show_text(imprint)
    ctx.restore()


# 标签 §3 的片色（见《系列制作规范》已核产品外观表）
ZYTIGA_500 = "#6E4A93"   # 紫色薄膜衣片，刻 AA / 500
YONSA_125 = "#E9E5DC"    # 白色至类白色，刻 125 FP


def cylinder(ctx, x, y, w, h, level, c, a=1.0):
    color(ctx, WHITE, 0.35 * a)
    ctx.set_line_width(3)
    ctx.move_to(x, y - h)
    ctx.line_to(x, y)
    ctx.line_to(x + w, y)
    ctx.line_to(x + w, y - h)
    ctx.stroke()
    lh = h * level
    if lh < 1:
        return
    g = cairo.LinearGradient(0, y - lh, 0, y)
    g.add_color_stop_rgba(0, *rgba(c, 0.9 * a))
    g.add_color_stop_rgba(1, *rgba(c, 0.4 * a))
    ctx.set_source(g)
    ctx.rectangle(x + 4, y - lh, w - 8, lh)
    ctx.fill()
    color(ctx, c, a)  # 液面高光线
    ctx.set_line_width(2)
    ctx.move_to(x + 4, y - lh)
    ctx.line_to(x + w - 4, y - lh)
    ctx.stroke()


def bars(ctx, t, items, x0, base_y, scale, start, bw=120, gap=60, label_y=50,
         fmt=lambda v: f"×{v:g}", stagger=0.5):
    """items: [(标签, 数值, 颜色)]，依次生长并滚动数字。"""
    for i, (lab, v, c) in enumerate(items):
        p = ease_out(seg(t, start + i * stagger, start + i * stagger + 1.4))
        x = x0 + i * (bw + gap)
        h = v * scale * p
        g = cairo.LinearGradient(0, base_y - h, 0, base_y)
        g.add_color_stop_rgba(0, *rgba(c, 0.95))
        g.add_color_stop_rgba(1, *rgba(c, 0.35))
        ctx.set_source(g)
        rrect(ctx, x, base_y - max(h, 1), bw, max(h, 1), 8)
        ctx.fill()
        if p > 0.05:
            text(ctx, countup(fmt(v), seg(t, start + i * stagger, start + i * stagger + 1.4)),
                 x + bw / 2, base_y - h - 20, 40, c, min(1, p * 2))
        text(ctx, lab, x + bw / 2, base_y + label_y, 28, GREY, min(1, p * 3), False)


def axes(ctx, x0, y0, x1, y1, xl, yl, a=1.0, c=GREY):
    color(ctx, c, 0.6 * a)
    ctx.set_line_width(2)
    ctx.move_to(x0, y1 - 20)
    ctx.line_to(x0, y0)
    ctx.line_to(x1 + 20, y0)
    ctx.stroke()
    text(ctx, yl, x0 - 20, y1 - 40, 30, c, 0.9 * a, False, "left")
    text(ctx, xl, x1, y0 + 50, 30, c, 0.9 * a, False, "right")


# ---------- 通用场景工厂 ----------

def title_scene(ep_no, name):
    def s(ctx, t, g):
        fill_bg(ctx)
        dust(ctx, t, 50, 11, AMBER, 0.28, rise=6)
        p = seg(t, 0.3, 1.6)
        glow_spot(ctx, W / 2, H * 0.46, 700 * ease_out(p), AMBER, 0.10)
        reveal(ctx, "剂量", W / 2, H * 0.50, 180, WHITE, p)
        reveal(ctx, f"{ep_no}　{name}", W / 2, H * 0.50 + 110, 44, AMBER, seg(t, 1.0, 2.0))
        text(ctx, "支线进行中", W - 80, H - 80, 30, GREY, seg(t, 1.6, 2.4), False, "right")
        if t > g.dur - 0.8:
            darken(ctx, seg(t, g.dur - 0.8, g.dur))
    return s


def vote_scene(q_lines, opts):
    def s(ctx, t, g):
        fill_bg(ctx)
        dust(ctx, t, 30, 8, BLUE, 0.15)
        reveal(ctx, "弹幕投票", W / 2, 200, 40, AMBER, seg(t, 0, 0.6))
        for i, q in enumerate(q_lines):
            reveal(ctx, q, W / 2, 320 + i * 80, 54, WHITE, seg(t, 0.3 + i * 0.3, 1.1 + i * 0.3))
        y0 = 320 + len(q_lines) * 80 + 80
        for i, o in enumerate(opts):
            p = seg(t, 1.2 + i * 0.35, 1.9 + i * 0.35)
            y = y0 + i * 120
            rrect(ctx, W / 2 - 400, y - 62, 800, 92, 20)
            color(ctx, WHITE, 0.06 * ease_out(p))
            ctx.fill()
            reveal(ctx, o, W / 2 - 340, y, 44, WHITE, p, align="left")
        p = seg(t, 2.0, g.dur - 0.3)
        color(ctx, GREY, 0.3)
        ctx.rectangle(W / 2 - 400, 990, 800, 6)
        ctx.fill()
        color(ctx, AMBER, 0.9)
        ctx.rectangle(W / 2 - 400, 990, 800 * (1 - p), 6)
        ctx.fill()
        text(ctx, f"{max(0, math.ceil(g.dur - 0.3 - t))}", W / 2 + 440, 1005, 34, AMBER, 1, True, "left")
    return s


MAP = ["剂量", "暴露", "效应", "风险", "决策"]


def map_scene(hi_from, hi_to, label, caption):
    """点亮 MAP[hi_from..hi_to] 之间的一段。"""
    def s(ctx, t, g):
        fill_bg(ctx)
        dust(ctx, t, 40, 29, AMBER, 0.15)
        n = len(MAP)
        xs = [W * (0.14 + 0.18 * i) for i in range(n)]
        y = H * 0.48
        for i in range(n - 1):
            p = seg(t, 0.4 + i * 0.3, 0.9 + i * 0.3)
            hi = hi_from <= i < hi_to
            arrow(ctx, xs[i] + 95, y, xs[i + 1] - 95, y, AMBER if hi else GREY, 4 if hi else 2,
                  1 if hi else 0.5, p, 16)
        for i, w in enumerate(MAP):
            p = ease_out(seg(t, 0.2 + i * 0.3, 0.8 + i * 0.3))
            hi = hi_from <= i <= hi_to
            glow_spot(ctx, xs[i], y - 16, 150, AMBER if hi else WHITE, (0.22 if hi else 0.04) * p)
            text(ctx, w, xs[i], y, 56, AMBER if hi else GREY, p)
        q = seg(t, 2.0, 3.0)
        reveal(ctx, label, (xs[hi_from] + xs[hi_to]) / 2, y - 80, 36, AMBER, q)
        reveal(ctx, caption, W / 2, H * 0.72, 48, WHITE, seg(t, 2.6, 3.6))
    return s


def limits_scene(items, photo_path=None):
    def s(ctx, t, g):
        if photo_path:
            photo(ctx, photo_path, t, g.dur, z=(1.02, 1.10))
            darken(ctx, 0.6)
        else:
            fill_bg(ctx)
            dust(ctx, t, 30, 41, WHITE, 0.1)
        reveal(ctx, "这一集不能推出", W * 0.12, H * 0.20, 52, AMBER, seg(t, 0, 0.8), align="left")
        for i, it in enumerate(items):
            b = g.beat(i, 99)
            p = seg(t, b, b + 0.7)
            a = 1.0 if t < g.beat(i + 1, 999) else 0.45
            y = H * 0.36 + i * 120
            reveal(ctx, "×", W * 0.12, y, 52, RED, p, a, align="left")
            reveal(ctx, it, W * 0.12 + 80, y, 46, WHITE, p, a, align="left", bold=False)
    return s


SERIF_ZH = "Source Han Serif SC"   # 该族名在本机解析到 Heavy 字重
SERIF_EN = "Georgia"
SUBTITLE_ZH = "每一个剂量，都是一次决定"
SUBTITLE_EN = "EVERY DOSE IS A DECISION"


def stext(ctx, s, x, y, size, family, c=WHITE, a=1.0, align="center", track=0.0, bold=False,
          fill=None):
    """衬线字，可加字距 track（像素）。fill 传入 cairo 图案时用它填充（金属质感等）。"""
    if a <= 0.001 or not s:
        return 0
    ctx.select_font_face(family, cairo.FONT_SLANT_NORMAL,
                         cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)
    advs = [ctx.text_extents(ch)[4] for ch in s]
    w = sum(advs) + track * (len(s) - 1)
    xx = x - w / 2 if align == "center" else x - w if align == "right" else x
    ctx.new_path()
    cx = xx
    for ch, adv in zip(s, advs):
        ctx.move_to(cx, y)
        ctx.text_path(ch)
        cx += adv + track
    if fill is not None:
        ctx.set_source(fill)
    else:
        color(ctx, c, a)
    ctx.fill()
    return w


_glyphs = {}


def glyph_points(s, size, family="Georgia", step=8, limit=900, seed=0):
    """把一个字形栅格化，返回以字形中心为原点的内部采样点 (N,2)，用于粒子聚合成字。"""
    key = (s, size, family, step, limit, seed)
    if key in _glyphs:
        return _glyphs[key]
    gw, gh = int(size * 1.4 * max(1, len(s))), int(size * 1.4)
    gw += (-gw) % 4
    surf = cairo.ImageSurface(cairo.FORMAT_A8, gw, gh)
    c = cairo.Context(surf)
    c.select_font_face(family, cairo.FONT_SLANT_NORMAL, cairo.FONT_WEIGHT_BOLD)
    c.set_font_size(size)
    e = c.text_extents(s)
    c.move_to(gw / 2 - e.x_bearing - e.width / 2, gh / 2 - e.y_bearing - e.height / 2)
    c.show_text(s)
    surf.flush()
    a = np.frombuffer(surf.get_data(), np.uint8).reshape(gh, surf.get_stride())[:, :gw]
    ys, xs = np.nonzero(a[::step, ::step] > 128)
    pts = np.stack([xs * step - gw / 2, ys * step - gh / 2], 1).astype(float)
    if len(pts) > limit:
        pts = pts[np.random.default_rng(seed).choice(len(pts), limit, replace=False)]
    _glyphs[key] = pts
    return pts


def letterbox(ctx, p):
    """2.39:1 宽银幕黑边，p 为进度。"""
    bar = (H - W / 2.39) / 2 * ease_io(p)
    if bar > 0.5:
        ctx.set_source_rgba(0, 0, 0, 1)
        ctx.rectangle(0, 0, W, bar)
        ctx.rectangle(0, H - bar, W, bar)
        ctx.fill()


def flare(ctx, x, y, width, a=1.0, c=AMBER):
    """变形镜头横向光晕。"""
    if a <= 0.001 or width < 1:
        return
    for hh, al in ((26, 0.10), (8, 0.35), (2, 0.9)):
        g = cairo.LinearGradient(x - width / 2, 0, x + width / 2, 0)
        g.add_color_stop_rgba(0, *rgba(c, 0))
        g.add_color_stop_rgba(0.5, *rgba(WHITE if hh == 2 else c, al * a))
        g.add_color_stop_rgba(1, *rgba(c, 0))
        ctx.set_source(g)
        ctx.rectangle(x - width / 2, y - hh / 2, width, hh)
        ctx.fill()
    glow_spot(ctx, x, y, 160, WHITE, 0.25 * a)


def cinematic_title(ep_no, zh, en):
    """好莱坞式片名卡，全系列复用：光缝 → 宽银幕 → 金属片名 → 副题 → 集名。约 10 秒。"""
    zh_title = "剂量"

    def s(ctx, t, g):
        fill_bg(ctx, "#050608")
        dust(ctx, t, 70, 51, AMBER, 0.20, rise=4)
        cy = H * 0.47
        # 光缝拉开
        fw = W * 1.6 * ease_out(seg(t, 0.0, 1.2))
        flare(ctx, W / 2, cy, fw, 1 - 0.85 * seg(t, 1.2, 3.0))
        dim = 1 - seg(t, 5.4, 6.2)  # 系列名完全退场，再出集名
        # 主标题：金属渐变 + 扫光
        p = ease_out(seg(t, 0.9, 2.8))
        if p > 0:
            size = 230 * lerp(1.08, 1.0, p)
            metal = cairo.LinearGradient(0, cy - size * 0.85, 0, cy + size * 0.1)
            metal.add_color_stop_rgba(0, 1.0, 0.93, 0.78, p * dim)
            metal.add_color_stop_rgba(0.45, 0.91, 0.64, 0.24, p * dim)
            metal.add_color_stop_rgba(0.55, 0.55, 0.36, 0.12, p * dim)
            metal.add_color_stop_rgba(1, 0.95, 0.78, 0.45, p * dim)
            glow_spot(ctx, W / 2, cy - size * 0.35, 520 * p, AMBER, 0.10 * p * dim)
            stext(ctx, zh_title, W / 2, cy + size * 0.05, size, SERIF_ZH, track=60 * lerp(2, 1, p), fill=metal)
            sw = seg(t, 2.2, 3.8)
            if 0 < sw < 1:
                sx = lerp(W * 0.25, W * 0.75, ease_io(sw))
                hl = cairo.LinearGradient(sx - 90, 0, sx + 90, 0)
                hl.add_color_stop_rgba(0, 1, 1, 1, 0)
                hl.add_color_stop_rgba(0.5, 1, 1, 1, 0.75 * math.sin(sw * math.pi))
                hl.add_color_stop_rgba(1, 1, 1, 1, 0)
                stext(ctx, zh_title, W / 2, cy + size * 0.05, size, SERIF_ZH, track=60, fill=hl)
        q = ease_out(seg(t, 2.6, 3.8))
        stext(ctx, "DOSE", W / 2, cy + 120, 54, SERIF_EN, AMBER, q * dim, track=lerp(80, 46, q))
        r = seg(t, 3.8, 4.8)
        stext(ctx, SUBTITLE_ZH, W / 2, cy + 200, 38, SERIF_ZH, WHITE, 0.85 * r * dim, track=8)
        stext(ctx, SUBTITLE_EN, W / 2, cy + 248, 22, SERIF_EN, GREY, 0.9 * r * dim, track=10)
        # 集名单独一拍
        e = ease_out(seg(t, 6.0, 7.0)) * (1 - seg(t, g.dur - 1.6, g.dur - 0.8))
        if e > 0:
            stext(ctx, ep_no, W / 2, H * 0.36, 40, SERIF_EN, AMBER, e, track=24)
            stext(ctx, zh, W / 2, H * 0.36 + 150, 120, SERIF_ZH, WHITE, e, track=30)
            stext(ctx, en.upper(), W / 2, H * 0.36 + 220, 30, SERIF_EN, GREY, e, track=22)
        text(ctx, "支线进行中", W - 90, H - 170, 28, GREY, seg(t, 7.2, 8.0) * 0.9, False, "right")
        letterbox(ctx, seg(t, 0.4, 1.6))
        if t > g.dur - 0.9:
            darken(ctx, seg(t, g.dur - 0.9, g.dur))
    return s


def sanlian(ctx, x, y, p, gap=230):
    """B站一键三连：点赞、投币、收藏。"""
    labels = ["点赞", "投币", "收藏"]
    for i, lab in enumerate(labels):
        q = ease_out(seg(p, i * 0.2, i * 0.2 + 0.5))
        if q <= 0:
            continue
        cx = x + (i - 1) * gap
        glow_spot(ctx, cx, y, 110, AMBER, 0.18 * q)
        color(ctx, AMBER, q)
        ctx.set_line_width(5)
        if i == 0:   # 大拇指
            rrect(ctx, cx - 30, y - 14, 58, 52, 10)
            ctx.stroke()
            ctx.rectangle(cx - 48, y - 12, 12, 48)
            ctx.fill()
            ctx.move_to(cx - 18, y - 14)
            ctx.line_to(cx - 4, y - 46)
            ctx.line_to(cx + 8, y - 40)
            ctx.line_to(cx + 4, y - 14)
            ctx.stroke()
        elif i == 1:  # 硬币
            ctx.arc(cx, y, 40, 0, 2 * math.pi)
            ctx.stroke()
            text(ctx, "币", cx, y + 15, 40, AMBER, q, True, "center", False)
        else:         # 星
            ctx.new_path()
            for k in range(10):
                rr = 44 if k % 2 == 0 else 18
                ang = -math.pi / 2 + k * math.pi / 5
                ctx.line_to(cx + rr * math.cos(ang), y + rr * math.sin(ang))
            ctx.close_path()
            ctx.stroke()
        text(ctx, lab, cx, y + 92, 32, WHITE, q, False)


def end_scene(sanlian_at=10.5):
    """片尾。sanlian_at：旁白开始后第几秒亮出一键三连（对上"喜欢这期的话"）。"""
    def s(ctx, t, g):
        fill_bg(ctx)
        dust(ctx, t, 60, 37, AMBER, 0.25, rise=5)
        p = seg(t, 0.2, 1.4)
        glow_spot(ctx, W / 2, H * 0.30, 800 * ease_out(p), AMBER, 0.08)
        stext(ctx, "剂量", W / 2, H * 0.34, 150, SERIF_ZH, WHITE, ease_out(p), track=40)
        stext(ctx, "DOSE", W / 2, H * 0.34 + 80, 36, SERIF_EN, AMBER, seg(t, 0.8, 1.8), track=40)
        stext(ctx, SUBTITLE_ZH, W / 2, H * 0.34 + 150, 36, SERIF_ZH, WHITE, 0.85 * seg(t, 1.2, 2.2), track=8)
        b = g.beat(0, 0) + sanlian_at
        sanlian(ctx, W / 2, H * 0.66, seg(t, b, b + 2.5))
        text(ctx, "支线进行中", W / 2, H * 0.92, 32, GREY, seg(t, 1.8, 2.8), False)
        if t > g.dur - 1.0:
            darken(ctx, seg(t, g.dur - 1.0, g.dur))
    return s
