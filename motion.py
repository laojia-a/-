"""《剂量》动效引擎：cairo 逐帧绘制，管道送 ffmpeg 编码。

一集 = 若干 Group（一个场景 + 若干句旁白）。场景函数 draw(ctx, t, g) 在 g.dur 秒内
自行完成动画；g.beats 是每句旁白在本组内的起始时间，用来让画面节拍对上旁白。
"""
import math
import re
import subprocess
import textwrap
from pathlib import Path

import cairo
import numpy as np

W, H, FPS = 1920, 1080, 25
XF = 0.6  # 组间交叉淡化秒数

BG = "#0B0D10"
AMBER = "#E8A33D"
BLUE = "#5AA9E6"
RED = "#B23A3A"
WHITE = "#F2F2F2"
GREY = "#8A8F98"
FONT = "Microsoft YaHei"


# ---------- 数学与缓动 ----------

def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def seg(t, a, b):
    """t 在 [a,b] 内的线性进度 0..1"""
    if b <= a:
        return 1.0 if t >= a else 0.0
    return clamp((t - a) / (b - a))


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_io(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def lerp(a, b, x):
    return a + (b - a) * x


# ---------- 颜色与文字 ----------

def rgba(c, a=1.0):
    c = c.lstrip("#")
    return (int(c[0:2], 16) / 255, int(c[2:4], 16) / 255, int(c[4:6], 16) / 255, a)


def color(ctx, c, a=1.0):
    ctx.set_source_rgba(*rgba(c, a))


def font(ctx, size, bold=True):
    ctx.select_font_face(FONT, cairo.FONT_SLANT_NORMAL,
                         cairo.FONT_WEIGHT_BOLD if bold else cairo.FONT_WEIGHT_NORMAL)
    ctx.set_font_size(size)


def text_w(ctx, s, size, bold=True):
    font(ctx, size, bold)
    return ctx.text_extents(s)[4]


def text(ctx, s, x, y, size=48, c=WHITE, a=1.0, bold=True, align="center", shadow=True):
    if a <= 0.001 or not s:
        return 0
    font(ctx, size, bold)
    adv = ctx.text_extents(s)[4]
    xx = x - adv / 2 if align == "center" else x - adv if align == "right" else x
    if shadow:
        ctx.set_source_rgba(0, 0, 0, 0.55 * a)
        ctx.move_to(xx + 2, y + 3)
        ctx.show_text(s)
    color(ctx, c, a)
    ctx.move_to(xx, y)
    ctx.show_text(s)
    return adv


_NUM = re.compile(r"\d+(?:\.\d+)?")


def countup(s, p):
    """把字符串里的数字按进度 p 从 0 滚到目标值，保持小数位数。"""
    p = ease_out(p)

    def rep(m):
        v = m.group(0)
        dec = len(v.split(".")[1]) if "." in v else 0
        return f"{float(v) * p:.{dec}f}"

    return _NUM.sub(rep, s) if p < 1 else s


def reveal(ctx, s, x, y, size, c, p, a=1.0, align="center", bold=True, count=False):
    """上浮淡入的文字；count=True 时数字滚动。"""
    e = ease_out(p)
    if count:
        s = countup(s, seg(p, 0, 1))
    text(ctx, s, x, y + (1 - e) * 24, size, c, a * e, bold, align)


# ---------- 背景、照片、质感 ----------

def fill_bg(ctx, c=BG):
    color(ctx, c)
    ctx.paint()


_imgs = {}


def load_png(path):
    path = str(path)
    if path not in _imgs:
        _imgs[path] = cairo.ImageSurface.create_from_png(path) if Path(path).exists() else None
    return _imgs[path]


def photo(ctx, path, t, dur, z=(1.03, 1.12), pan=((0, 0), (0, 0)), a=1.0):
    """关键帧做持续的推镜与平移。z 为相对铺满画面的缩放起止。"""
    img = load_png(path)
    if img is None:
        fill_bg(ctx)
        return
    iw, ih = img.get_width(), img.get_height()
    p = ease_io(t / dur) * 0.85 + (t / dur) * 0.15  # 起止柔和但中途不停
    s = max(W / iw, H / ih) * lerp(z[0], z[1], p)
    cx = W / 2 + lerp(pan[0][0], pan[1][0], p)
    cy = H / 2 + lerp(pan[0][1], pan[1][1], p)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.scale(s, s)
    ctx.translate(-iw / 2, -ih / 2)
    ctx.set_source_surface(img, 0, 0)
    ctx.get_source().set_filter(cairo.FILTER_GOOD)
    ctx.paint_with_alpha(a)
    ctx.restore()


def darken(ctx, a):
    ctx.set_source_rgba(0, 0, 0, a)
    ctx.paint()


def vignette(ctx, strength=0.6):
    g = cairo.RadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, strength)
    ctx.set_source(g)
    ctx.paint()


def glow_spot(ctx, x, y, r, c=AMBER, a=0.25):
    g = cairo.RadialGradient(x, y, 0, x, y, r)
    g.add_color_stop_rgba(0, *rgba(c, a))
    g.add_color_stop_rgba(1, *rgba(c, 0))
    ctx.set_source(g)
    ctx.arc(x, y, r, 0, 2 * math.pi)
    ctx.fill()


_grain = []


def grain(ctx, frame):
    if not _grain:
        rng = np.random.default_rng(7)
        for _ in range(6):
            v = rng.integers(0, 16, (H // 2, W // 2), dtype=np.uint8)
            arr = np.zeros((H // 2, W // 2, 4), np.uint8)
            arr[..., 0] = arr[..., 1] = arr[..., 2] = arr[..., 3] = v
            surf = cairo.ImageSurface.create_for_data(arr, cairo.FORMAT_ARGB32, W // 2, H // 2)
            _grain.append((arr, surf))
    surf = _grain[frame % len(_grain)][1]
    ctx.save()
    ctx.scale(2, 2)
    ctx.set_source_surface(surf, 0, 0)
    ctx.paint_with_alpha(0.55)
    ctx.restore()


def dust(ctx, t, n=40, seed=1, c=WHITE, a=0.35, rise=12, size=(1.2, 3.5)):
    """缓慢漂浮的尘埃光点，让静帧有空气感。"""
    rng = np.random.default_rng(seed)
    xs, ys = rng.random(n) * W, rng.random(n) * H
    sp, ph = rng.random(n) * 0.6 + 0.4, rng.random(n) * 6.28
    rs = rng.random(n) * (size[1] - size[0]) + size[0]
    for i in range(n):
        x = (xs[i] + math.sin(t * 0.3 * sp[i] + ph[i]) * 30) % W
        y = (ys[i] - t * rise * sp[i]) % H
        al = a * (0.5 + 0.5 * math.sin(t * 1.3 * sp[i] + ph[i]))
        glow_spot(ctx, x, y, rs[i] * 3, c, al)


def steam(ctx, t, x0, y0, width=500, n=10, a=0.06):
    """从餐盘升起的热气。"""
    rng = np.random.default_rng(3)
    for i in range(n):
        ph = rng.random() * 10
        life = (t * 0.25 + ph) % 1.0
        x = x0 + (rng.random() - 0.5) * width + math.sin(t * 0.8 + ph) * 40
        y = y0 - life * 420
        r = 60 + life * 160
        glow_spot(ctx, x, y, r, WHITE, a * math.sin(life * math.pi))


def sim_grid(ctx, a=0.10):
    color(ctx, BLUE, a)
    ctx.set_line_width(1)
    for x in range(0, W, 60):
        ctx.move_to(x + 0.5, 0)
        ctx.line_to(x + 0.5, H)
    for y in range(0, H, 60):
        ctx.move_to(0, y + 0.5)
        ctx.line_to(W, y + 0.5)
    ctx.stroke()


def tag(ctx, kind, a=1.0, src="来源见简介"):
    if a <= 0.001:
        return
    if kind == "real":
        text(ctx, f"真实数据 · {src}", W - 70, 80, 28, AMBER, 0.9 * a, False, "right")
    elif kind == "sim":
        color(ctx, BLUE, 0.9 * a)
        ctx.set_line_width(2)
        ctx.rectangle(60, 46, 104, 48)
        ctx.stroke()
        text(ctx, "模拟", 112, 82, 30, BLUE, a, True, "center", False)
    elif kind == "schematic":
        text(ctx, "示意 · 非真实曲线", 70, 80, 28, BLUE, 0.9 * a, False, "left")


# ---------- 图形 ----------

def polyline(ctx, pts, c, w=4, a=1.0, glow=True):
    if len(pts) < 2:
        return
    if glow:
        color(ctx, c, 0.18 * a)
        ctx.set_line_width(w * 4)
        ctx.set_line_cap(cairo.LINE_CAP_ROUND)
        ctx.set_line_join(cairo.LINE_JOIN_ROUND)
        ctx.move_to(*pts[0])
        for p in pts[1:]:
            ctx.line_to(*p)
        ctx.stroke()
    color(ctx, c, a)
    ctx.set_line_width(w)
    ctx.move_to(*pts[0])
    for p in pts[1:]:
        ctx.line_to(*p)
    ctx.stroke()


def arrow(ctx, x0, y0, x1, y1, c=WHITE, w=4, a=1.0, p=1.0, head=22):
    """按进度 p 生长的箭头。"""
    if p <= 0:
        return
    x1, y1 = lerp(x0, x1, ease_out(p)), lerp(y0, y1, ease_out(p))
    color(ctx, c, a)
    ctx.set_line_width(w)
    ctx.move_to(x0, y0)
    ctx.line_to(x1, y1)
    ctx.stroke()
    ang = math.atan2(y1 - y0, x1 - x0)
    ctx.move_to(x1, y1)
    ctx.line_to(x1 - head * math.cos(ang - 0.45), y1 - head * math.sin(ang - 0.45))
    ctx.line_to(x1 - head * math.cos(ang + 0.45), y1 - head * math.sin(ang + 0.45))
    ctx.close_path()
    ctx.fill()


def rrect(ctx, x, y, w, h, r=16):
    ctx.new_sub_path()
    ctx.arc(x + w - r, y + r, r, -math.pi / 2, 0)
    ctx.arc(x + w - r, y + h - r, r, 0, math.pi / 2)
    ctx.arc(x + r, y + h - r, r, math.pi / 2, math.pi)
    ctx.arc(x + r, y + r, r, math.pi, 3 * math.pi / 2)
    ctx.close_path()


# ---------- 字幕 ----------

def sub_chunks(s, maxlen=24):
    """按标点切成单行字幕块，去掉块尾标点。"""
    parts = re.findall(r"[^，。！？；：]+[，。！？；：]?", s)
    chunks, cur = [], ""
    for p in parts:
        if len(cur) + len(p) <= maxlen:
            cur += p
        else:
            if cur:
                chunks.append(cur)
            cur = p
    if cur:
        chunks.append(cur)
    out = []
    for c in chunks:
        out += textwrap.wrap(c, maxlen) if len(c) > maxlen + 4 else [c]
    return [c.rstrip("，。；：") for c in out if c.strip()]


def subtitle(ctx, s, a=1.0):
    if not s or a <= 0.001:
        return
    g = cairo.LinearGradient(0, H - 230, 0, H)
    g.add_color_stop_rgba(0, 0, 0, 0, 0)
    g.add_color_stop_rgba(1, 0, 0, 0, 0.55 * a)
    ctx.set_source(g)
    ctx.rectangle(0, H - 230, W, 230)
    ctx.fill()
    text(ctx, s, W / 2, H - 78, 42, WHITE, a, False, "center", True)


# ---------- 组装 ----------

class Group:
    """lead: 旁白开始前的留白秒数；tail: 旁白结束后的留白。
    sfx: [(音效名, 时间, 音量)]，时间为组内秒数，或 (句号, 偏移) 表示第几句旁白起点之后。"""

    def __init__(self, scene, lines=(), fixed=None, xf=True, lead=0.0, tail=0.0, sfx=()):
        self.scene, self.lines, self.fixed, self.xf = scene, list(lines), fixed, xf
        self.lead, self.tail, self.sfx = lead, tail, list(sfx)
        self.dur, self.beats = 0.0, []

    def beat(self, i, default=0.0):
        return self.beats[i] if i < len(self.beats) else default


def plan(groups, narr, line_dur):
    """计算每组时长与组内节拍；返回 [(全局起点, 组)] 和字幕时间表。"""
    t, starts, subs = 0.0, [], []
    for g in groups:
        g.beats, local = [], g.lead
        for lid in g.lines:
            d = line_dur(lid)
            g.beats.append(local)
            chunks = sub_chunks(narr.get(lid, ""))
            total = sum(len(c) for c in chunks) or 1
            ct = t + local
            for c in chunks:
                cd = (d - 0.4) * len(c) / total
                subs.append((ct, ct + cd, c))
                ct += cd
            local += d
        g.dur = g.fixed if g.fixed else local + g.tail
        starts.append((t, g))
        t += g.dur
    return starts, subs, t


def render(out_path, groups, narr, line_dur, frames_limit=None):
    starts, subs, total = plan(groups, narr, line_dur)
    nframes = int(total * FPS)
    if frames_limit:
        nframes = min(nframes, frames_limit)
    proc = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "bgra",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
         str(out_path)],
        stdin=subprocess.PIPE,
    )
    out = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    tmp = cairo.ImageSurface(cairo.FORMAT_ARGB32, W, H)
    si, gi = 0, 0
    for f in range(nframes):
        t = f / FPS
        while gi + 1 < len(starts) and t >= starts[gi + 1][0]:
            gi += 1
        g0, g = starts[gi]
        lt = t - g0
        ctx = cairo.Context(out)
        g.scene(ctx, lt, g)
        if gi > 0 and g.xf and lt < XF:
            pg0, pg = starts[gi - 1]
            c2 = cairo.Context(tmp)
            pg.scene(c2, t - pg0, pg)
            ctx.set_source_surface(tmp, 0, 0)
            ctx.paint_with_alpha(1 - ease_io(lt / XF))
        vignette(ctx, 0.55)
        grain(ctx, f)
        while si < len(subs) and subs[si][1] < t:
            si += 1
        if si < len(subs) and subs[si][0] <= t <= subs[si][1]:
            s0, s1, s = subs[si]
            subtitle(ctx, s, min(1, (t - s0) / 0.15, (s1 - t) / 0.15))
        out.flush()
        proc.stdin.write(out.get_data())
        if f % (FPS * 10) == 0:
            print(f"  {t:6.1f}s / {total:.1f}s", flush=True)
    proc.stdin.close()
    proc.wait()
    return starts, total
