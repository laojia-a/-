"""Low-level drawing helpers: fonts, rich text, shapes, icons, premultiplied compositing."""
import math, re
from functools import lru_cache
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1080, 1920
FD = "/projects/sandbox/work/fonts/"
F_SMILEY = FD + "SmileySans-Oblique.ttf"
F_BLACK = FD + "NotoSansSC-Black.otf"
F_BOLD = FD + "NotoSansSC-Bold.otf"
F_MED = FD + "NotoSansSC-Medium.otf"
F_REG = FD + "NotoSansSC-Regular.otf"

# palette
BG_TOP = (5, 18, 36)
BG_BOT = (9, 37, 66)
TEAL = (34, 211, 197)
TEAL_D = (14, 150, 150)
AMBER = (255, 190, 70)
RED = (255, 92, 92)
GREEN = (74, 222, 128)
WHITE = (255, 255, 255)
MUTED = (160, 186, 212)
DIM = (110, 136, 164)
NAVY = (6, 22, 42)


def rgba(c, a=255):
    return (c[0], c[1], c[2], int(a))


@lru_cache(maxsize=256)
def font(path, size):
    return ImageFont.truetype(path, size)


# ------------------------------------------------------------------ easing
def clamp(x, a=0.0, b=1.0):
    return a if x < a else b if x > b else x


def ease_out(x):
    x = clamp(x)
    return 1 - (1 - x) ** 3


def ease_in_out(x):
    x = clamp(x)
    return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2


def ease_back(x, s=1.70158):
    x = clamp(x)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def prog(t, t0, d=0.45):
    return ease_out((t - t0) / d) if d > 0 else float(t >= t0)


# ------------------------------------------------------------------ layers
class Layer:
    """RGBA image stored premultiplied as float32 for fast compositing."""

    def __init__(self, img):
        if img.mode != "RGBA":
            img = img.convert("RGBA")
        self.img = img
        a = np.asarray(img, dtype=np.float32) * (1 / 255.0)
        self.a = a[..., 3:4].copy()
        self.rgb = a[..., :3] * self.a
        self.w, self.h = img.size
        self._cache = {}

    def scaled(self, s):
        k = round(s, 2)
        if abs(k - 1.0) < 1e-3:
            return self
        if k not in self._cache:
            w, h = max(1, int(self.w * k)), max(1, int(self.h * k))
            self._cache[k] = Layer(resize(self.img, (w, h)))
        return self._cache[k]


def resize(img, size):
    return img.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")


def blit(canvas, layer, x, y, op=1.0, scale=1.0, anchor="tl"):
    if layer is None or op <= 0.004:
        return
    L = layer.scaled(scale) if scale != 1.0 else layer
    if anchor == "c":
        x, y = x - L.w / 2, y - L.h / 2
    elif anchor == "tc":
        x = x - L.w / 2
    elif anchor == "tr":
        x = x - L.w
    elif anchor == "lc":
        y = y - L.h / 2
    x, y = int(round(x)), int(round(y))
    ch, cw = canvas.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(cw, x + L.w), min(ch, y + L.h)
    if x1 <= x0 or y1 <= y0:
        return
    sx, sy = x0 - x, y0 - y
    sub = canvas[y0:y1, x0:x1]
    a = L.a[sy:sy + y1 - y0, sx:sx + x1 - x0]
    rgb = L.rgb[sy:sy + y1 - y0, sx:sx + x1 - x0]
    op = min(1.0, op)
    if op < 0.999:
        sub *= 1 - a * op
        sub += rgb * op
    else:
        sub *= 1 - a
        sub += rgb


# ------------------------------------------------------------------ text
TOKEN = re.compile(r"\n|[A-Za-z0-9.%～~\-+/()（）]+|[ \t]+|.")
NO_LINE_START = set("，。、；：？！”）》·%")


def parse_rich(text):
    runs, hi, buf = [], False, ""
    for ch in text:
        if ch in "{}":
            if buf:
                runs.append((buf, hi))
            buf, hi = "", ch == "{"
        else:
            buf += ch
    if buf:
        runs.append((buf, hi))
    return runs


def _tokens(text, f, fh):
    toks = []
    for s, hi in parse_rich(text):
        for m in TOKEN.finditer(s):
            tk = m.group(0)
            toks.append((tk, hi, 0.0 if tk == "\n" else (fh if hi else f).getlength(tk)))
    return toks


def _wrap(toks, max_w, balance=False):
    if any(tk == "\n" for tk, _, _ in toks):  # explicit breaks win
        out, cur = [], []
        for tk in toks:
            if tk[0] == "\n":
                out.append(cur)
                cur = []
            else:
                cur.append(tk)
        out.append(cur)
        return [ln for part in out for ln in _wrap(part, max_w, balance)]
    total = sum(w for _, _, w in toks)
    if total <= max_w:
        return [toks]
    if balance and total <= 2 * max_w * 0.98:
        # two lines: break after punctuation whenever possible (never split a word mid-way),
        # otherwise fall back to the most balanced character boundary
        for punct_only in (True, False):
            best, bi, acc = 1e9, None, 0
            for i in range(1, len(toks)):
                acc += toks[i - 1][2]
                if toks[i][0] in NO_LINE_START or acc > max_w or total - acc > max_w:
                    continue
                prev = toks[i - 1][0]
                if punct_only and prev not in "，、：；。？！":
                    continue
                cost = abs(acc - total / 2) - (30 if prev in "，；：。？！" else 0)
                if cost < best:
                    best, bi = cost, i
            if bi is not None:
                return [toks[:bi], toks[bi:]]
    lines, cur, cw = [], [], 0
    for tk in toks:
        if cw + tk[2] > max_w and cur and tk[0] not in NO_LINE_START:
            lines.append(cur)
            cur, cw = [], 0
            if tk[0].isspace():
                continue
        cur.append(tk)
        cw += tk[2]
    if cur:
        lines.append(cur)
    return lines


def rich_text(text, path, size, color=WHITE, hi=AMBER, max_w=900, align="left",
              line_h=1.38, hi_path=None, pad=6, balance=False, shadow=False):
    f, fh = font(path, size), font(hi_path or path, size)
    lines = _wrap(_tokens(text, f, fh), max_w, balance)
    widths = [sum(w for _, _, w in L) for L in lines]
    asc, desc = f.getmetrics()
    lh = int(size * line_h)
    w = int(math.ceil(max(widths))) + 2 * pad
    h = lh * (len(lines) - 1) + asc + desc + 2 * pad
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for i, L in enumerate(lines):
        x = pad + ((w - 2 * pad - widths[i]) / 2 if align == "center" else 0)
        y = pad + i * lh + asc
        for tk, ishi, tw in L:
            d.text((x, y), tk, font=fh if ishi else f, fill=rgba(hi if ishi else color), anchor="ls")
            x += tw
    if shadow:
        sh = Image.new("RGBA", img.size, (0, 0, 0, 0))
        sh.putalpha(img.getchannel("A").filter(ImageFilter.GaussianBlur(6)).point(lambda v: int(v * 0.55)))
        base = Image.new("RGBA", (w, h + 4), (0, 0, 0, 0))
        base.alpha_composite(sh, (0, 4))
        base.alpha_composite(img, (0, 0))
        img = base
    return img


def text(s, path, size, color=WHITE, pad=6):
    return rich_text(s, path, size, color, max_w=10000, pad=pad)


# ------------------------------------------------------------------ shapes (supersampled)
SS = 3


def rrect(w, h, r, fill=None, outline=None, width=0):
    img = Image.new("RGBA", (w * SS, h * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([0, 0, w * SS - 1, h * SS - 1], radius=r * SS,
                        fill=fill, outline=outline, width=int(width * SS))
    return resize(img, (w, h))


def grad_rrect(w, h, r, c1, c2, horizontal=True, alpha=255):
    g = np.zeros((h, w, 4), np.uint8)
    k = np.linspace(0, 1, w if horizontal else h)[None, :, None] if horizontal else \
        np.linspace(0, 1, h)[:, None, None]
    col = np.array(c1)[None, None, :] * (1 - k) + np.array(c2)[None, None, :] * k
    g[..., :3] = np.broadcast_to(col, (h, w, 3)).astype(np.uint8)
    g[..., 3] = alpha
    img = Image.fromarray(g, "RGBA")
    mask = rrect(w, h, r, fill=(255, 255, 255, 255)).getchannel("A")
    img.putalpha(Image.fromarray((np.asarray(mask, np.float32) * alpha / 255).astype(np.uint8)))
    return img


def glow(img, radius=18, color=TEAL, strength=1.0, expand=None):
    e = expand if expand is not None else radius * 2
    w, h = img.size
    base = Image.new("RGBA", (w + 2 * e, h + 2 * e), (0, 0, 0, 0))
    a = Image.new("L", base.size, 0)
    a.paste(img.getchannel("A"), (e, e))
    a = a.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: min(255, int(v * strength)))
    col = Image.new("RGBA", base.size, rgba(color))
    col.putalpha(a)
    base.alpha_composite(col)
    base.alpha_composite(img, (e, e))
    return base, e


def circle(d, fill=None, outline=None, width=0):
    img = Image.new("RGBA", (d * SS, d * SS), (0, 0, 0, 0))
    ImageDraw.Draw(img).ellipse([0, 0, d * SS - 1, d * SS - 1], fill=fill, outline=outline,
                                width=int(width * SS))
    return resize(img, (d, d))


def pill(label, path=F_MED, size=30, fg=WHITE, bg=None, border=None, padx=26, pady=12, bw=2, dot=None):
    t = text(label, path, size, fg, pad=0)
    dw = 26 if dot else 0
    w, h = t.width + 2 * padx + dw, t.height + 2 * pady
    img = rrect(w, h, h // 2, fill=bg, outline=border, width=bw if border else 0)
    if dot:
        img.alpha_composite(circle(14, fill=rgba(dot)), (padx, h // 2 - 7))
    img.alpha_composite(t, (padx + dw, pady))
    return img


# ------------------------------------------------------------------ icons (drawn at 4x)
def _canvas(s, k=4):
    img = Image.new("RGBA", (s * k, s * k), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img), s * k


def _done(img, s):
    return resize(img, (s, s))


def icon(name, s=56, color=WHITE, c2=None):
    img, d, S = _canvas(s)
    c = rgba(color)
    lw = max(2, int(S * 0.075))
    if name == "check":
        d.line([(S * .2, S * .52), (S * .42, S * .73), (S * .8, S * .3)], fill=c, width=int(S * .12), joint="curve")
    elif name == "warn":
        d.polygon([(S * .5, S * .08), (S * .95, S * .88), (S * .05, S * .88)], fill=c)
        k = rgba(c2 or NAVY)
        d.rounded_rectangle([S * .455, S * .34, S * .545, S * .64], radius=S * .04, fill=k)
        d.ellipse([S * .45, S * .70, S * .55, S * .80], fill=k)
    elif name == "hospital":
        d.rounded_rectangle([S * .14, S * .2, S * .86, S * .9], radius=S * .08, outline=c, width=lw)
        d.rectangle([S * .44, S * .32, S * .56, S * .66], fill=c)
        d.rectangle([S * .33, S * .43, S * .67, S * .55], fill=c)
        d.rectangle([S * .4, S * .74, S * .6, S * .9], fill=c)
    elif name == "doc":
        d.rounded_rectangle([S * .2, S * .1, S * .8, S * .9], radius=S * .07, outline=c, width=lw)
        for yy in (.32, .48, .64):
            d.line([(S * .32, S * yy), (S * .68, S * yy)], fill=c, width=lw)
    elif name == "pill":
        k = rgba(c2 or AMBER)
        img2 = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        d2 = ImageDraw.Draw(img2)
        d2.rounded_rectangle([S * .12, S * .34, S * .88, S * .66], radius=S * .16, fill=c)
        d2.rectangle([S * .5, S * .34, S * .88, S * .66], fill=(0, 0, 0, 0))
        d2.rounded_rectangle([S * .12, S * .34, S * .88, S * .66], radius=S * .16, outline=c, width=lw)
        img2 = img2.rotate(-35, resample=Image.BICUBIC, center=(S / 2, S / 2))
        img.alpha_composite(img2)
        _ = k
    elif name == "clock":
        d.ellipse([S * .1, S * .1, S * .9, S * .9], outline=c, width=lw)
        d.line([(S * .5, S * .5), (S * .5, S * .26)], fill=c, width=lw)
        d.line([(S * .5, S * .5), (S * .68, S * .6)], fill=c, width=lw)
    elif name == "drop":
        d.polygon([(S * .5, S * .06), (S * .22, S * .55), (S * .78, S * .55)], fill=c)
        d.ellipse([S * .2, S * .36, S * .8, S * .94], fill=c)
    elif name == "snow":
        for ang in (0, 60, 120):
            a = math.radians(ang)
            dx, dy = math.cos(a) * S * .4, math.sin(a) * S * .4
            d.line([(S * .5 - dx, S * .5 - dy), (S * .5 + dx, S * .5 + dy)], fill=c, width=lw)
        d.ellipse([S * .42, S * .42, S * .58, S * .58], fill=c)
    elif name == "shield":
        d.polygon([(S * .5, S * .06), (S * .88, S * .2), (S * .82, S * .6), (S * .5, S * .94),
                   (S * .18, S * .6), (S * .12, S * .2)], fill=c)
        k = rgba(c2 or NAVY)
        d.line([(S * .32, S * .5), (S * .46, S * .64), (S * .7, S * .36)], fill=k, width=int(S * .09), joint="curve")
    elif name == "db":
        d.ellipse([S * .18, S * .1, S * .82, S * .3], outline=c, width=lw)
        d.line([(S * .18, S * .2), (S * .18, S * .8)], fill=c, width=lw)
        d.line([(S * .82, S * .2), (S * .82, S * .8)], fill=c, width=lw)
        d.arc([S * .18, S * .4, S * .82, S * .6], 0, 180, fill=c, width=lw)
        d.arc([S * .18, S * .7, S * .82, S * .9], 0, 180, fill=c, width=lw)
    elif name == "user":
        d.ellipse([S * .32, S * .1, S * .68, S * .46], fill=c)
        d.pieslice([S * .14, S * .52, S * .86, S * 1.24], 180, 360, fill=c)
    elif name == "link":
        d.rounded_rectangle([S * .08, S * .34, S * .56, S * .66], radius=S * .16, outline=c, width=lw)
        d.rounded_rectangle([S * .44, S * .34, S * .92, S * .66], radius=S * .16, outline=c, width=lw)
    elif name == "chart":
        d.line([(S * .12, S * .1), (S * .12, S * .88), (S * .9, S * .88)], fill=c, width=lw)
        d.line([(S * .2, S * .76), (S * .4, S * .3), (S * .6, S * .55), (S * .85, S * .2)], fill=c, width=lw, joint="curve")
    elif name == "folder":
        d.polygon([(S * .1, S * .22), (S * .42, S * .22), (S * .5, S * .32), (S * .9, S * .32),
                   (S * .9, S * .84), (S * .1, S * .84)], outline=c, width=lw)
        d.line([(S * .1, S * .42), (S * .9, S * .42)], fill=c, width=lw)
    elif name == "box":
        d.polygon([(S * .5, S * .1), (S * .9, S * .3), (S * .9, S * .74), (S * .5, S * .94),
                   (S * .1, S * .74), (S * .1, S * .3)], outline=c, width=lw)
        d.line([(S * .1, S * .3), (S * .5, S * .5), (S * .9, S * .3)], fill=c, width=lw)
        d.line([(S * .5, S * .5), (S * .5, S * .94)], fill=c, width=lw)
    elif name == "book":
        d.polygon([(S * .5, S * .26), (S * .1, S * .16), (S * .1, S * .82), (S * .5, S * .92)], outline=c, width=lw)
        d.polygon([(S * .5, S * .26), (S * .9, S * .16), (S * .9, S * .82), (S * .5, S * .92)], outline=c, width=lw)
    elif name == "search":
        d.ellipse([S * .1, S * .1, S * .66, S * .66], outline=c, width=lw)
        d.line([(S * .58, S * .58), (S * .9, S * .9)], fill=c, width=int(lw * 1.4))
    elif name == "loop":
        d.arc([S * .14, S * .14, S * .86, S * .86], 30, 330, fill=c, width=lw)
        d.polygon([(S * .86, S * .22), (S * .94, S * .48), (S * .68, S * .44)], fill=c)
    elif name == "heart":
        d.ellipse([S * .1, S * .16, S * .52, S * .58], fill=c)
        d.ellipse([S * .48, S * .16, S * .9, S * .58], fill=c)
        d.polygon([(S * .13, S * .45), (S * .87, S * .45), (S * .5, S * .88)], fill=c)
    elif name == "star":
        pts = []
        for i in range(10):
            r = S * (.44 if i % 2 == 0 else .19)
            a = math.radians(-90 + i * 36)
            pts.append((S * .5 + r * math.cos(a), S * .53 + r * math.sin(a)))
        d.polygon(pts, fill=c)
    elif name == "share":
        d.polygon([(S * .58, S * .12), (S * .92, S * .44), (S * .58, S * .76), (S * .58, S * .58),
                   (S * .1, S * .62), (S * .3, S * .3), (S * .58, S * .3)], fill=c)
    elif name == "lock":
        d.rounded_rectangle([S * .18, S * .44, S * .82, S * .9], radius=S * .08, fill=c)
        d.arc([S * .3, S * .14, S * .7, S * .66], 180, 360, fill=c, width=lw)
        d.line([(S * .3, S * .4), (S * .3, S * .46)], fill=c, width=lw)
        d.line([(S * .7, S * .4), (S * .7, S * .46)], fill=c, width=lw)
    elif name == "flask":
        d.line([(S * .38, S * .1), (S * .62, S * .1)], fill=c, width=lw)
        d.polygon([(S * .42, S * .12), (S * .58, S * .12), (S * .58, S * .38), (S * .86, S * .88),
                   (S * .14, S * .88), (S * .42, S * .38)], outline=c, width=lw)
        d.polygon([(S * .3, S * .62), (S * .7, S * .62), (S * .82, S * .84), (S * .18, S * .84)], fill=c)
    return _done(img, s)


def icon_badge(name, d=84, bg=TEAL, fg=NAVY, ring=None):
    img = circle(d, fill=rgba(bg))
    if ring:
        img = Image.alpha_composite(img, circle(d, outline=rgba(ring), width=3))
    ic = icon(name, int(d * 0.56), fg, c2=bg)  # inner marks (!, check) take the badge colour
    img.alpha_composite(ic, ((d - ic.width) // 2, (d - ic.height) // 2))
    return img


def num_badge(n, d=84, bg=TEAL, fg=NAVY, path=F_SMILEY, size=None):
    img = circle(d, fill=rgba(bg))
    t = text(str(n), path, size or int(d * 0.62), fg, pad=0)
    f = font(path, size or int(d * 0.62))
    bb = f.getbbox(str(n), anchor="mm")
    dd = ImageDraw.Draw(img)
    dd.text((d / 2, d / 2 + 1), str(n), font=f, fill=rgba(fg), anchor="mm")
    _ = t, bb
    return img
