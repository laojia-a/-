"""Scene graph for the BE-CRA Douyin video. Every scene draws itself at local time t."""
import json, math
import numpy as np
from PIL import Image, ImageDraw
from gfx import *

TL = json.load(open("/projects/sandbox/work/build/timeline.json"))
TOTAL = TL["total"]
X0, CW = 90, 900          # content column
SUB_TOP = 1392            # subtitle box top


# ====================================================================== background
def make_background():
    y = np.linspace(0, 1, H)[:, None, None]
    top, bot = np.array(BG_TOP) / 255, np.array(BG_BOT) / 255
    bg = (top * (1 - y) + bot * y) * np.ones((1, W, 1))
    yy, xx = np.mgrid[0:H, 0:W]
    for cx, cy, r, col, k in [(900, 260, 700, TEAL, 0.10), (120, 1650, 800, (40, 90, 200), 0.12)]:
        d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / r
        g = np.clip(1 - d, 0, 1) ** 2 * k
        bg = bg * (1 - g[..., None]) + (np.array(col) / 255) * g[..., None]
    grid = np.zeros((H, W), np.float32)
    grid[::60, :] = 1
    grid[:, ::60] = 1
    bg += grid[..., None] * 0.018
    v = np.sqrt(((xx - W / 2) / (W * 0.75)) ** 2 + ((yy - H / 2) / (H * 0.75)) ** 2)
    bg *= (1 - np.clip(v - 0.55, 0, 1) * 0.45)[..., None]
    return np.clip(bg, 0, 1).astype(np.float32)


def make_network(h=2600, n=80, seed=3):
    rng = np.random.default_rng(seed)
    pts = np.c_[rng.uniform(0, W, n), rng.uniform(0, h, n)]
    S = 2
    img = Image.new("RGBA", (W * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    allp = np.vstack([pts, pts + [0, h], pts - [0, h]])
    for i in range(len(allp)):
        for j in range(i + 1, len(allp)):
            dist = np.hypot(*(allp[i] - allp[j]))
            if dist < 230:
                a = int(55 * (1 - dist / 230))
                d.line([tuple(allp[i] * S), tuple(allp[j] * S)], fill=(120, 220, 230, a), width=2)
    for p in allp:
        r = rng.uniform(2.5, 5.5) * S
        a = int(rng.uniform(90, 170))
        d.ellipse([p[0] * S - r, p[1] * S - r, p[0] * S + r, p[1] * S + r], fill=(150, 235, 240, a))
    return Layer(resize(img, (W, h))), h


# ====================================================================== shared components
class Subtitles:
    def __init__(self):
        self.items = []
        for s in TL["scenes"]:
            L = s["lines"]
            for i, ln in enumerate(L):
                t0 = ln["start"] - 0.04
                t1 = L[i + 1]["start"] - 0.02 if i + 1 < len(L) else s["end"] - 0.22
                self.items.append((t0, t1, ln["sub"]))
        self.cache = {}

    def layer(self, txt):
        if txt not in self.cache:
            t = rich_text(txt, F_BOLD, 50, WHITE, AMBER, max_w=820, align="center", balance=True,
                          line_h=1.32, pad=0)
            box = rrect(t.width + 60, t.height + 30, 26, fill=(3, 12, 26, 165),
                        outline=(255, 255, 255, 22), width=2)
            box.alpha_composite(t, (30, 15))
            self.cache[txt] = Layer(box)
        return self.cache[txt]

    def draw(self, cv, gt):
        for t0, t1, txt in self.items:
            if t0 <= gt < t1:
                a = prog(gt, t0, 0.12) * (1 - prog(gt, t1 - 0.1, 0.1))
                L = self.layer(txt)
                blit(cv, L, W / 2, SUB_TOP + (1 - a) * 10, op=a, anchor="tc")


class Header:
    def __init__(self):
        self.pill = Layer(pill("BE试验 · CRA职责全景", F_MED, 28, (205, 240, 235), bg=(255, 255, 255, 14),
                               border=(34, 211, 197, 110), dot=TEAL, padx=22, pady=9))
        self.track = Layer(rrect(CW, 6, 3, fill=(255, 255, 255, 26)))
        self.fill_img = rrect(CW, 6, 3, fill=rgba(TEAL))

    def draw(self, cv, gt, op):
        blit(cv, self.pill, X0, 192, op=op)
        blit(cv, self.track, X0, 262, op=op)
        w = int(CW * clamp(gt / TOTAL))
        if w > 6:
            blit(cv, Layer(self.fill_img.crop((0, 0, w, 6))), X0, 262, op=op)


class Stepper:
    LABELS = ["启动前", "进行中", "结束后"]

    def __init__(self):
        self.v = {}
        for i, lb in enumerate(self.LABELS):
            on = pill(lb, F_BOLD, 32, NAVY, bg=rgba(TEAL), padx=34, pady=10)
            g, e = glow(on, 14, TEAL, 0.8)
            self.v[(i, "on")] = (Layer(g), e)
            self.v[(i, "done")] = (Layer(pill(lb, F_BOLD, 32, TEAL, bg=(34, 211, 197, 26),
                                                border=rgba(TEAL, 200), padx=34, pady=10)), 0)
            self.v[(i, "todo")] = (Layer(pill(lb, F_BOLD, 32, DIM, bg=(255, 255, 255, 8),
                                                border=(255, 255, 255, 50), padx=34, pady=10)), 0)
        self.w = self.v[(0, "todo")][0].w
        self.line = Layer(rrect(60, 4, 2, fill=(255, 255, 255, 60)))
        self.line_on = Layer(rrect(60, 4, 2, fill=rgba(TEAL)))

    def draw(self, cv, active, put, op=1.0):
        gap = 60
        tot = 3 * self.w + 2 * gap
        x = (W - tot) / 2
        y = 300
        for i in range(3):
            st = "on" if i == active else "done" if i < active else "todo"
            L, e = self.v[(i, st)]
            put(cv, L, x - e, y - e, op)
            if i < 2:
                put(cv, self.line_on if i < active else self.line, x + self.w, y + 29, op)
            x += self.w + gap


class Card:
    """Rounded card: badge + title + optional rich detail. Normal and active looks."""

    def __init__(self, title, detail, badge, accent=TEAL, w=CW, title_size=40, detail_size=30,
                 title_color=WHITE, min_h=0, pad_y=50):
        bd = badge.width
        tx = 30 + bd + 28
        tw = w - tx - 34
        ti = rich_text(title, F_BOLD, title_size, title_color, accent, max_w=tw, pad=0)
        de = rich_text(detail, F_REG, detail_size, (186, 205, 224), AMBER, max_w=tw, pad=0,
                       hi_path=F_BOLD, line_h=1.32) if detail else None
        ch = ti.height + (10 + de.height if de else 0)
        h = max(min_h, bd + pad_y, ch + pad_y)
        self.w, self.h = w, h

        def compose(active):
            fill = (accent[0], accent[1], accent[2], 34) if active else (255, 255, 255, 15)
            line = rgba(accent, 230) if active else (255, 255, 255, 34)
            img = rrect(w, h, 28, fill=fill, outline=line, width=3 if active else 2)
            img.alpha_composite(badge, (30, (h - bd) // 2))
            y = (h - ch) // 2
            img.alpha_composite(ti, (tx, y))
            if de:
                img.alpha_composite(de, (tx, y + ti.height + 10))
            if active:
                g, e = glow(img, 16, accent, 0.55)
                return g, e
            return img, 0

        a, self.ea = compose(True)
        n, _ = compose(False)
        self.L_on, self.L_off = Layer(a), Layer(n)
        self.check = Layer(icon_badge("check", 34, GREEN, NAVY))
        self.badge_d = bd

    def draw(self, cv, put, x, y, t, t_in, a0=None, a1=None, op=1.0, done_check=True):
        p = prog(t, t_in, 0.45)
        if p <= 0:
            return
        yy = y + (1 - p) * 40
        k = 0.0
        if a0 is not None:
            k = prog(t, a0, 0.25) * (1 - (prog(t, a1, 0.35) if a1 is not None else 0))
        put(cv, self.L_off, x, yy, op * p * (1 - k))
        if k > 0:
            put(cv, self.L_on, x - self.ea, yy - self.ea, op * p * k)
        if done_check and a1 is not None and t > a1:
            s = ease_back(prog(t, a1, 0.3))
            put(cv, self.check, x + 30 + self.badge_d - 22, yy + (self.h - self.badge_d) / 2 - 8,
                op * p, scale=max(0.05, s))


# ====================================================================== scene base
class Scene:
    def __init__(self, S):
        self.S = S
        self.dur = S["end"] - S["start"]
        self.L = [ln["start"] - S["start"] for ln in S["lines"]]
        self.Le = [ln["end"] - S["start"] for ln in S["lines"]]
        self.k, self.dy = 1.0, 0.0
        self.built = False

    def put(self, cv, layer, x, y, op=1.0, scale=1.0, anchor="tl"):
        blit(cv, layer, x, y + self.dy, op * self.k, scale, anchor)

    def frame(self, cv, t):
        if not self.built:
            self.build()
            self.built = True
        e = prog(t, self.dur - 0.32, 0.32) if self.S["name"] != "outro" else 0.0
        self.k, self.dy = 1 - e, -26 * e
        self.draw(cv, t)

    def line_mid(self, i, f=0.5):
        return self.L[i] + (self.Le[i] - self.L[i]) * f


def title_block(kicker, title, kicker_color=TEAL, title_hi=TEAL, size=68):
    k = text(kicker, F_SMILEY, 40, kicker_color, pad=0) if isinstance(kicker, str) else kicker
    t = rich_text(title, F_BLACK, size, WHITE, title_hi, max_w=CW, pad=0)
    return Layer(k), Layer(t)


# ---------------------------------------------------------------------- hook
class Hook(Scene):
    def build(self):
        self.top = Layer(pill("临床试验 · 职场干货", F_MED, 34, TEAL, bg=(34, 211, 197, 24),
                              border=rgba(TEAL, 170), padx=30, pady=12))
        self.t1 = Layer(text("BE试验", F_SMILEY, 150, TEAL))
        g, self.e2 = glow(text("CRA", F_SMILEY, 310, WHITE), 30, TEAL, 0.65)
        self.t2 = Layer(g)
        self.t3 = Layer(text("每天到底在忙什么？", F_BLACK, 86, WHITE))
        self.chips = [Layer(pill(s, F_BOLD, 34, c, bg=(c[0], c[1], c[2], 30), border=rgba(c, 200),
                                 padx=26, pady=12))
                      for s, c in [("新人入门清单", TEAL), ("资深避坑指南", AMBER), ("2026新版GCP", (130, 180, 255))]]
        # faint PK curve across the screen
        S = 2
        img = Image.new("RGBA", (W * S, 900 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        self.curve_pts = []
        for i in range(0, 241):
            tt = i / 10
            c = 1.32 * (math.exp(-0.16 * tt) - math.exp(-0.75 * tt))
            x, y = 60 + tt / 24 * 980, 860 - c * 760
            self.curve_pts.append((x, y))
        d.line([(x * S, y * S) for x, y in self.curve_pts], fill=(34, 211, 197, 70), width=7 * S, joint="curve")
        self.curve = Layer(resize(img, (W, 900)))
        dot, self.de = glow(circle(22, fill=rgba(TEAL)), 14, TEAL, 1.2)
        self.dot = Layer(dot)

    def draw(self, cv, t):
        self.put(cv, self.curve, 0, 470, 0.9)
        u = (t * 0.16) % 1.0
        idx = int(u * (len(self.curve_pts) - 1))
        x, y = self.curve_pts[idx]
        self.put(cv, self.dot, x - 11 - self.de, 470 + y - 11 - self.de, 0.9)
        self.put(cv, self.top, W / 2, 300, 1.0, anchor="tc")
        self.put(cv, self.t1, W / 2, 470, 1.0, anchor="c")
        s = 1 + 0.015 * math.sin(t * 2.4)
        self.put(cv, self.t2, W / 2, 700, 1.0, scale=s, anchor="c")
        self.put(cv, self.t3, W / 2, 935, 1.0, anchor="c")
        widths = [c.w for c in self.chips]
        gap = 22
        x = (W - sum(widths) - gap * 2) / 2
        for i, c in enumerate(self.chips):
            p = prog(t, self.L[2] + i * 0.18, 0.4)
            if p > 0:
                self.put(cv, c, x + c.w / 2, 1100, p, scale=0.7 + 0.3 * ease_back(p), anchor="c")
            x += c.w + gap


# ---------------------------------------------------------------------- BE basics
class BE(Scene):
    PX0, PX1, PY0, PY1 = 175, 940, 590, 930

    def cmap(self, tt, c):
        return (self.PX0 + tt / 24 * (self.PX1 - self.PX0), self.PY1 - c / 1.12 * (self.PY1 - self.PY0))

    @staticmethod
    def conc(tt, which):
        if which == "T":
            return 1.13 * (math.exp(-0.17 * tt) - math.exp(-1.55 * tt))
        return 1.16 * (math.exp(-0.165 * tt) - math.exp(-1.38 * tt))

    def build(self):
        self.k1, self.t1 = title_block("BIOEQUIVALENCE", "BE是什么？", size=80)
        self.sub = Layer(text("仿制药 vs 参比制剂", F_MED, 32, MUTED, pad=0))
        self.panel = Layer(rrect(CW, 560, 30, fill=(255, 255, 255, 12), outline=(255, 255, 255, 30), width=2))
        # axes (absolute coords inside a full-width image placed at y=470)
        oy = 470
        img = Image.new("RGBA", (W, 560), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        ax = (255, 255, 255, 110)
        d.line([(self.PX0, self.PY0 - 30 - oy), (self.PX0, self.PY1 - oy), (self.PX1 + 12, self.PY1 - oy)], fill=ax, width=3)
        f = font(F_MED, 24)
        for h in (0, 4, 8, 12, 16, 20, 24):
            x, _ = self.cmap(h, 0)
            d.line([(x, self.PY1 - oy), (x, self.PY1 - oy + 8)], fill=ax, width=2)
            d.text((x, self.PY1 - oy + 14), str(h), font=f, fill=rgba(MUTED), anchor="ma")
        d.text((self.PX1 + 10, self.PY1 - oy + 48), "时间（h）", font=f, fill=rgba(MUTED), anchor="ra")
        d.text((self.PX0 - 4, self.PY0 - oy - 64), "血药浓度", font=font(F_BOLD, 26), fill=rgba(MUTED), anchor="la")
        fl = font(F_BOLD, 28)
        for i, (lab, col) in enumerate([("受试制剂 T", TEAL), ("参比制剂 R", AMBER)]):
            yy = 120 + i * 46
            d.line([(640, yy), (690, yy)], fill=rgba(col), width=6)
            d.text((704, yy), lab, font=fl, fill=rgba(WHITE), anchor="lm")
        self.axes = Layer(img)
        self.curve_cache = {}
        # AUC fill + Cmax annotation
        S = 2
        img = Image.new("RGBA", (W * S, 560 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        pts = [self.cmap(i / 10, self.conc(i / 10, "T")) for i in range(241)]
        poly = [(x * S, (y - oy) * S) for x, y in pts] + [(self.PX1 * S, (self.PY1 - oy) * S), (self.PX0 * S, (self.PY1 - oy) * S)]
        d.polygon(poly, fill=(34, 211, 197, 46))
        self.auc = Layer(resize(img, (W, 560)))
        self.auc_lab = Layer(text("AUC → 吸收程度", F_BOLD, 32, TEAL))
        tpk = max(range(241), key=lambda i: self.conc(i / 10, "T")) / 10
        self.pk = self.cmap(tpk, self.conc(tpk, "T"))
        img = Image.new("RGBA", (W * S, 560 * S), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        y = (self.pk[1] - oy) * S
        x = self.PX0 * S
        while x < self.pk[0] * S:
            d.line([(x, y), (min(x + 14 * S, self.pk[0] * S), y)], fill=(255, 190, 70, 220), width=3 * S)
            x += 24 * S
        self.cmax_line = Layer(resize(img, (W, 560)))
        self.cmax_lab = Layer(text("Cmax → 吸收速度", F_BOLD, 32, AMBER))
        self.pk_dot = Layer(circle(20, fill=rgba(AMBER), outline=rgba(WHITE), width=3))
        self.samp_t = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 16, 24]
        self.sdot = Layer(circle(16, fill=rgba(WHITE), outline=rgba(TEAL), width=4))
        # chips
        self.chips = []
        for lab, ic in [("健康受试者", "user"), ("随机交叉", "loop"), ("密集采血", "drop")]:
            t = text(lab, F_BOLD, 32, WHITE, pad=0)
            ib = icon_badge(ic, 46, TEAL, NAVY)
            w, h = 22 + 46 + 12 + t.width + 26, 66
            img = rrect(w, h, 33, fill=(255, 255, 255, 16), outline=rgba(TEAL, 150), width=2)
            img.alpha_composite(ib, (12, 10))
            img.alpha_composite(t, (12 + 46 + 14, (h - t.height) // 2))
            self.chips.append(Layer(img))
        # CI panel
        self.ci_y = 1128
        self.ci_panel = Layer(rrect(CW, 228, 28, fill=(255, 255, 255, 12), outline=(255, 255, 255, 30), width=2))
        self.ci_title = Layer(rich_text("几何均值比（T/R）的{90%置信区间}", F_BOLD, 30, WHITE, TEAL, pad=0))
        self.ci_note = Layer(text("示意数据", F_REG, 22, DIM, pad=0))
        self.A0, self.A1 = 250, 930
        img = Image.new("RGBA", (W, 228), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        b0, b1 = self.cx(80), self.cx(125)
        d.rectangle([b0, 62, b1, 170], fill=(34, 211, 197, 34))
        for xx in (b0, b1):
            d.line([(xx, 56), (xx, 176)], fill=rgba(TEAL, 200), width=3)
        xx = self.cx(100)
        for yy in range(58, 176, 14):
            d.line([(xx, yy), (xx, yy + 7)], fill=(255, 255, 255, 120), width=2)
        f = font(F_MED, 24)
        for v, lab in [(80, "80.00%"), (100, "100%"), (125, "125.00%")]:
            d.text((self.cx(v), 182), lab, font=f, fill=rgba(MUTED), anchor="ma")
        fb = font(F_BOLD, 28)
        d.text((X0 + 26, 92), "Cmax", font=fb, fill=rgba(WHITE), anchor="lm")
        d.text((X0 + 26, 140), "AUC", font=fb, fill=rgba(WHITE), anchor="lm")
        self.ci_static = Layer(img)
        band = Image.new("RGBA", (W, 228), (0, 0, 0, 0))
        ImageDraw.Draw(band).rectangle([b0, 62, b1, 170], outline=rgba(GREEN, 255), width=4)
        g, e = glow(band, 12, GREEN, 0.9, expand=0)
        self.ci_glow = Layer(g)
        self.badge = Layer(pill("✓ 落在区间内 → 等效".replace("✓ ", ""), F_BOLD, 28, NAVY, bg=rgba(GREEN), padx=20, pady=8))
        self.ci_rows = [(92, 91.6, 108.3, 99.6), (140, 95.1, 104.6, 99.7)]

    def cx(self, v):
        return self.A0 + (math.log(v) - math.log(70)) / (math.log(140) - math.log(70)) * (self.A1 - self.A0)

    def curves(self, p):
        key = round(p, 2)
        if key not in self.curve_cache:
            S = 2
            img = Image.new("RGBA", (W * S, 560 * S), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            n = max(2, int(240 * key))
            for which, col in (("R", AMBER), ("T", TEAL)):
                pts = [self.cmap(i / 10, self.conc(i / 10, which)) for i in range(n + 1)]
                d.line([(x * S, (y - 470) * S) for x, y in pts], fill=rgba(col), width=6 * S, joint="curve")
            self.curve_cache[key] = Layer(resize(img, (W, 560)))
        return self.curve_cache[key]

    def ci_bars(self, g):
        key = ("ci", round(g, 2))
        if key not in self.curve_cache:
            g = key[1]
            img = Image.new("RGBA", (W * 2, 228 * 2), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            for yy, lo, hi, pe in self.ci_rows:
                c = self.cx(pe)
                a, b = c + (self.cx(lo) - c) * g, c + (self.cx(hi) - c) * g
                d.line([(a * 2, yy * 2), (b * 2, yy * 2)], fill=rgba(WHITE), width=10)
                if g > 0.05:
                    for xx in (a, b):
                        d.line([(xx * 2, (yy - 13) * 2), (xx * 2, (yy + 13) * 2)], fill=rgba(WHITE), width=8)
                d.ellipse([(c - 10) * 2, (yy - 10) * 2, (c + 10) * 2, (yy + 10) * 2], fill=rgba(TEAL),
                          outline=rgba(WHITE), width=4)
            self.curve_cache[key] = Layer(resize(img, (W, 228)))
        return self.curve_cache[key]

    def draw(self, cv, t):
        L = self.L
        p = prog(t, 0.05, 0.4)
        self.put(cv, self.k1, X0, 300 + (1 - p) * 20, p)
        self.put(cv, self.t1, X0, 344 + (1 - p) * 20, p)
        self.put(cv, self.sub, X0 + self.t1.w + 24, 384, prog(t, 0.3, 0.4))
        pp = prog(t, 0.25, 0.5)
        self.put(cv, self.panel, X0, 470, pp)
        self.put(cv, self.axes, 0, 470, pp)
        cp = clamp((t - L[1]) / 2.2)
        if cp > 0:
            self.put(cv, self.curves(ease_in_out(cp)), 0, 470)
        a = prog(t, L[2] + 0.2, 0.5)
        if a > 0:
            self.put(cv, self.auc, 0, 470, a * 0.95)
            self.put(cv, self.auc_lab, 262, self.PY1 - 56, prog(t, self.line_mid(2, 0.6), 0.4))
            self.put(cv, self.cmax_line, 0, 470, a)
            self.put(cv, self.pk_dot, self.pk[0], self.pk[1], a, anchor="c")
            self.put(cv, self.cmax_lab, self.pk[0] + 26, self.pk[1] - 52, prog(t, self.line_mid(2, 0.25), 0.4))
        for i, st in enumerate(self.samp_t):
            q = prog(t, L[3] + 1.0 + i * 0.07, 0.25)
            if q > 0:
                x, y = self.cmap(st, self.conc(st, "T"))
                self.put(cv, self.sdot, x, y, q, scale=max(0.1, ease_back(q)), anchor="c")
        widths = [c.w for c in self.chips]
        x = (W - sum(widths) - 2 * 20) / 2
        for i, c in enumerate(self.chips):
            q = prog(t, L[3] + i * 0.55, 0.4)
            if q > 0:
                self.put(cv, c, x + c.w / 2, 1066, q, scale=0.75 + 0.25 * ease_back(q), anchor="c")
            x += c.w + 20
        q = prog(t, L[4], 0.45)
        if q > 0:
            y = self.ci_y + (1 - q) * 30
            self.put(cv, self.ci_panel, X0, y, q)
            self.put(cv, self.ci_title, X0 + 26, y + 16, q)
            self.put(cv, self.ci_note, X0 + 26, y + 188, q * 0.9)
            self.put(cv, self.ci_static, 0, y, q)
            gq = ease_out((t - L[4] - 0.4) / 0.8)
            if gq > 0:
                self.put(cv, self.ci_bars(gq), 0, y, q)
            gl = prog(t, L[5] + 0.6, 0.35)
            if gl > 0:
                pulse = 0.65 + 0.35 * math.sin((t - L[5]) * 5)
                self.put(cv, self.ci_glow, 0, y, gl * pulse)
                self.put(cv, self.badge, X0 + CW - 44 - self.badge.w / 2, y + 12, gl,
                         scale=0.8 + 0.2 * ease_back(gl), anchor="tc")


# ---------------------------------------------------------------------- CRA role
class CRA(Scene):
    def build(self):
        self.k1, self.t1 = title_block("CLINICAL RESEARCH ASSOCIATE", "CRA 是谁？", size=80)
        self.sub = Layer(text("临床监查员", F_MED, 32, MUTED, pad=0))

        def node(label, w, h, size, fill, fg, outline=None, grad=None):
            img = grad_rrect(w, h, h // 2 - 8, *grad) if grad else rrect(w, h, 26, fill=fill, outline=outline, width=2)
            tx = text(label, F_BOLD if not grad else F_BLACK, size, fg, pad=0)
            img.alpha_composite(tx, ((w - tx.width) // 2, (h - tx.height) // 2))
            return img

        self.nA = Layer(node("申办者 / CRO", 400, 92, 40, (255, 255, 255, 18), WHITE, (255, 255, 255, 70)))
        b = node("CRA · 临床监查员", 470, 112, 46, None, NAVY, grad=(TEAL, (60, 190, 235)))
        g, self.eB = glow(b, 22, TEAL, 0.8)
        self.nB = Layer(g)
        self.nC = Layer(node("主要研究者 · 临床试验机构（I期病房）", 760, 92, 34, (255, 255, 255, 18), WHITE,
                             (255, 255, 255, 70)))

        def arrow(h, both, label):
            img = Image.new("RGBA", (420, h), (0, 0, 0, 0))
            d = ImageDraw.Draw(img)
            c = rgba(TEAL, 230)
            d.line([(40, 10 if both else 2), (40, h - 12)], fill=c, width=5)
            d.polygon([(28, h - 16), (52, h - 16), (40, h - 1)], fill=c)
            if both:
                d.polygon([(28, 16), (52, 16), (40, 1)], fill=c)
            d.text((66, h / 2), label, font=font(F_MED, 28), fill=rgba(MUTED), anchor="lm")
            return Layer(img)

        self.aAB = arrow(50, False, "委派")
        self.aBC = arrow(50, True, "监查 · 沟通 · 核查")
        # quote card
        q = rich_text("“在临床试验中，{监查和数据管理}\n是主要的质量控制活动。”", F_BOLD, 42, WHITE, AMBER,
                      max_w=830, pad=0, line_h=1.45)
        tag = pill("2026版GCP · 第四十一条", F_BOLD, 26, NAVY, bg=rgba(TEAL), padx=18, pady=7)
        h = 30 + tag.height + 18 + q.height + 30
        self.qh = h
        for nm, act in (("q_off", False), ("q_on", True)):
            img = rrect(CW, h, 28, fill=(255, 255, 255, 14) if not act else (255, 190, 70, 22),
                        outline=(255, 255, 255, 40) if not act else rgba(AMBER, 220), width=2 if not act else 3)
            img.alpha_composite(tag, (36, 30))
            img.alpha_composite(q, (36, 30 + tag.height + 18))
            setattr(self, nm, Layer(img))
        # two lines
        self.two = []
        for ic, col, l1, l2 in [("shield", TEAL, "参与者的", "权益和安全"), ("db", AMBER, "数据的", "可靠性")]:
            img = rrect(440, 150, 28, fill=(col[0], col[1], col[2], 26), outline=rgba(col, 200), width=3)
            img.alpha_composite(icon_badge(ic, 80, col, NAVY), (26, 35))
            img.alpha_composite(text(l1, F_MED, 28, MUTED, pad=0), (126, 26))
            img.alpha_composite(text(l2, F_BLACK, 42, WHITE, pad=0), (126, 66))
            self.two.append(Layer(img))

    def draw(self, cv, t):
        L = self.L
        p = prog(t, 0.05, 0.4)
        self.put(cv, self.k1, X0, 300 + (1 - p) * 20, p)
        self.put(cv, self.t1, X0, 344 + (1 - p) * 20, p)
        self.put(cv, self.sub, X0 + self.t1.w + 24, 384, prog(t, 0.3, 0.4))
        a = prog(t, 0.2, 0.45)
        self.put(cv, self.nA, W / 2, 478 + (1 - a) * 20, a, anchor="tc")
        a2 = prog(t, L[0] + 0.35, 0.4)
        self.put(cv, self.aAB, W / 2 - 40, 572, a2)
        b = prog(t, L[0] + 0.55, 0.45)
        if b > 0:
            self.put(cv, self.nB, W / 2, 624 - self.eB + (1 - b) * 20, b, scale=0.9 + 0.1 * ease_back(b), anchor="tc")
        c = prog(t, L[0] + 1.1, 0.45)
        self.put(cv, self.aBC, W / 2 - 40, 738, c)
        self.put(cv, self.nC, W / 2, 790 + (1 - c) * 20, c, anchor="tc")
        qy = 910
        q = prog(t, L[1], 0.45)
        if q > 0:
            y = qy + (1 - q) * 30
            k = prog(t, L[2], 0.3)
            self.put(cv, self.q_off, X0, y, q * (1 - k))
            self.put(cv, self.q_on, X0, y, q * k)
        y2 = qy + self.qh + 20
        for i, Lr in enumerate(self.two):
            t_in = L[4] if i == 0 else self.line_mid(4, 0.55)
            r = prog(t, t_in, 0.4)
            if r > 0:
                self.put(cv, Lr, X0 + i * 460 + 220, y2 + 75, r, scale=0.85 + 0.15 * ease_back(r), anchor="c")


# ---------------------------------------------------------------------- generic list scenes
class ListScene(Scene):
    """kicker/title + stacked cards that appear on their narration lines."""
    step = None
    kicker = ""
    title = ""
    accent = TEAL
    items = []          # (line_index, badge_img_fn, title, detail)
    gap = 18
    badge_d = 84
    card_kw = {}
    inline_kicker = False

    def build(self):
        self.stepper = Stepper() if self.step is not None else None
        kc = self.accent
        self.kL, self.tL = title_block(self.kicker, self.title, kc, kc, size=self.title_size())
        self.cards = [Card(ti, de, bf(self.badge_d), accent=self.accent, **self.card_kw)
                      for _, bf, ti, de in self.items]
        self.extra_build()

    def title_size(self):
        return 66

    def extra_build(self):
        pass

    def layout_top(self):
        return (395, 440, 560) if self.step is not None else (300, 346, 490)

    def draw(self, cv, t):
        ky, ty, cy = self.layout_top()
        if self.stepper:
            self.stepper.draw(cv, self.step, self.put, prog(t, 0.0, 0.3))
        p = prog(t, 0.05, 0.4)
        if self.inline_kicker:
            self.put(cv, self.kL, X0, ty + self.tL.h / 2 - self.kL.h / 2 + (1 - p) * 20, p)
            self.put(cv, self.tL, X0 + self.kL.w + 22, ty + (1 - p) * 20, p)
        else:
            self.put(cv, self.kL, X0, ky + (1 - p) * 20, p)
            self.put(cv, self.tL, X0, ty + (1 - p) * 20, p)
        y = cy
        n = len(self.items)
        for j, (li, _, _, _) in enumerate(self.items):
            c = self.cards[j]
            t_in = self.L[li] if li is not None else 0.4 + j * 0.15
            nxt = self.items[j + 1][0] if j + 1 < n else None
            a1 = (self.L[nxt] if nxt is not None else None)
            c.draw(cv, self.put, X0, y, t, t_in, a0=t_in, a1=a1)
            y += c.h + self.gap
        self.extra_draw(cv, t, y)

    def extra_draw(self, cv, t, y):
        pass


def ib(name, col=TEAL):
    return lambda d=84: icon_badge(name, d, col, NAVY)


def nb(n, col=TEAL):
    return lambda d=84: num_badge(n, d, col, NAVY)


class Pre(ListScene):
    step, kicker, title = 0, "STEP 01", "启动前｜把好{入口关}"
    items = [
        (1, ib("hospital"), "评估I期病房", "资质 · 抢救条件 · 超低温冰箱、离心机等设备"),
        (2, ib("doc"), "确认合规文件", "伦理批件 · BE备案 · 临床试验登记与信息公示"),
        (3, ib("pill"), "核对两种制剂", "受试制剂T / 参比制剂R：来源、检验报告、运输温度"),
        (4, ib("clock"), "开好启动会", "流程图 · {采血时间窗} · 样本处理流程，讲透练熟"),
    ]


class Post(ListScene):
    step, kicker, title = 2, "STEP 03", "结束后｜{闭环}与迎检"
    items = [
        (1, ib("snow"), "样本冷链转运", "干冰/温控箱 · 交接单 · 全程温度记录"),
        (2, ib("box"), "药物清点回收", "接收、发放、回收、退还/销毁，账物相符"),
        (3, ib("lock"), "数据库锁定 · 文件归档", "疑问关闭、锁库，必备记录完整归档"),
    ]

    def extra_build(self):
        img = grad_rrect(CW, 150, 36, (20, 120, 130), (14, 70, 110))
        img2 = rrect(CW, 150, 36, outline=rgba(TEAL, 230), width=3)
        img.alpha_composite(img2)
        img.alpha_composite(icon_badge("shield", 96, TEAL, NAVY), (44, 27))
        tx = text("随时迎接核查", F_BLACK, 62, WHITE, pad=0)
        img.alpha_composite(tx, (170, (150 - tx.height) // 2 - 4))
        g, self.be = glow(img, 20, TEAL, 0.7)
        self.banner = Layer(g)

    def extra_draw(self, cv, t, y):
        q = prog(t, self.line_mid(3, 0.55), 0.45)
        if q > 0:
            self.put(cv, self.banner, W / 2, y + 30 + 75, q, scale=0.85 + 0.15 * ease_back(q), anchor="c")


class Senior(ListScene):
    kicker, title, accent = None, "BE核查{五大雷区}", AMBER
    gap = 14
    badge_d = 72
    card_kw = dict(title_size=38, detail_size=29, pad_y=40)
    items = [
        (1, nb(1, RED), "身份真实性", "身份核验 · 联网筛查 · 有无重复入组"),
        (2, nb(2, RED), "时间链", "给药 → 采血 → 离心 → 冻存，逻辑是否自洽"),
        (3, nb(3, RED), "样本链", "温度 · 冻融 · 交接，不能有断点"),
        (4, nb(4, RED), "分析数据", "稽查轨迹 · 手动积分 · 重新进样，均需有据"),
        (5, nb(5, RED), "药物溯源", "参比制剂来源凭证 · 留样"),
    ]

    def build(self):
        k = pill("资深必看", F_BLACK, 34, NAVY, bg=rgba(AMBER), padx=24, pady=8)
        wi = icon("warn", 40, NAVY, AMBER)
        img = Image.new("RGBA", (k.width + 54, k.height), (0, 0, 0, 0))
        img.alpha_composite(rrect(k.width + 54, k.height, k.height // 2, fill=rgba(AMBER)))
        img.alpha_composite(wi, (16, (k.height - 40) // 2))
        img.alpha_composite(text("资深必看", F_BLACK, 34, NAVY, pad=0), (64, (k.height - 50) // 2 + 2))
        self.kicker = img
        super().build()

    def title_size(self):
        return 76


class GCP(ListScene):
    kicker, title, accent = None, "2026新版{GCP}", AMBER
    items = [
        (1, ib("user", AMBER), "术语更新", "“受试者” → “{试验参与者}”"),
        (2, ib("chart", AMBER), "核心理念", "{质量源于设计} · {基于风险}的质量管理"),
        (3, ib("db", AMBER), "新增专章", "第五章「数据治理」：元数据、稽查轨迹、计算机化系统"),
        (4, ib("box", AMBER), "BE留样｜第二十八条", "主要研究者{随机抽取}，至少保存至药品上市后{2年}，\n不得返还申办者"),
    ]
    gap = 14
    badge_d = 72
    card_kw = dict(title_size=38, detail_size=29, pad_y=40)
    inline_kicker = True

    def build(self):
        self.kicker = pill("NEW", F_BLACK, 34, NAVY, bg=rgba(AMBER), padx=22, pady=8)
        super().build()

    def title_size(self):
        return 84

    def layout_top(self):
        return (0, 296, 500)

    def extra_build(self):
        self.date = Layer(rich_text("{2026年9月1日}起施行 · 2020版同时废止", F_MED, 34, MUTED, AMBER, pad=0,
                                    max_w=CW, hi_path=F_BOLD))
        img = rrect(CW, 96, 48, fill=(255, 190, 70, 30), outline=rgba(AMBER, 220), width=3)
        tx = rich_text("→ 监查计划和核查清单，{该更新了}", F_BOLD, 38, WHITE, AMBER, pad=0, max_w=CW)
        img.alpha_composite(tx, ((CW - tx.width) // 2, (96 - tx.height) // 2))
        self.banner = Layer(img)

    def draw(self, cv, t):
        super().draw(cv, t)
        p = prog(t, self.L[0] + 0.4, 0.45)
        self.put(cv, self.date, X0, 428 + (1 - p) * 16, p)

    def extra_draw(self, cv, t, y):
        q = prog(t, self.L[6], 0.4)
        if q > 0:
            self.put(cv, self.banner, W / 2, y + 6 + 48, q, scale=0.9 + 0.1 * ease_back(q), anchor="c")


class Newbie(ListScene):
    kicker, title = "FOR NEWCOMERS", "给新人的{3条}建议"
    gap = 24
    badge_d = 96
    card_kw = dict(title_size=46, detail_size=32, pad_y=56)
    items = [
        (1, nb(1), "吃透方案", "流程图、{采血时间表}烂熟于心"),
        (2, nb(2), "回到源记录", "不只看EDC，每个数据都能追溯到源头"),
        (3, nb(3), "问题闭环", "每个问题都要有始有终、留痕可查"),
    ]

    def title_size(self):
        return 84

    def extra_build(self):
        self.steps = []
        for s in ["发现", "沟通", "整改", "跟踪", "记录"]:
            self.steps.append(Layer(pill(s, F_BOLD, 32, NAVY, bg=rgba(TEAL), padx=22, pady=10)))
        self.arrow = Layer(text("→", F_BOLD, 34, TEAL, pad=0))

    def extra_draw(self, cv, t, y):
        ws = [s.w for s in self.steps]
        gap = 12 + self.arrow.w + 12
        x = (W - sum(ws) - gap * 4) / 2
        yy = y + 40
        for i, s in enumerate(self.steps):
            q = prog(t, self.line_mid(3, 0.15) + i * 0.22, 0.35)
            if q > 0:
                self.put(cv, s, x + s.w / 2, yy + 30, q, scale=0.7 + 0.3 * ease_back(q), anchor="c")
                if i < 4:
                    self.put(cv, self.arrow, x + s.w + 12, yy + 8, q)
            x += s.w + gap


# ---------------------------------------------------------------------- during (timeline)
class During(Scene):
    nodes = [
        (1, "doc", "知情同意", "{先签署、后筛选} · 版本/签名/日期逐一核对"),
        (2, "search", "筛选入组", "联网筛查，排除“职业受试者”"),
        (3, "pill", "给药", "时间精确到分钟 · {检查口腔}"),
        (4, "drop", "采血", "记录实际时间，超窗如实记录"),
        (5, "snow", "样本处理", "离心 → 分装 → 冻存全程计时，温度可追溯"),
        (6, "warn", "安全性", "严重不良事件：获知后{立即书面报告}\n申办者和伦理审查委员会"),
    ]
    XL = 140

    def build(self):
        self.stepper = Stepper()
        self.kL, self.tL = title_block("STEP 02", "进行中｜CRA{最忙}的时候", size=66)
        self.N = []
        for li, ic, ti, de in self.nodes:
            off = Image.alpha_composite(circle(72, fill=(10, 32, 58, 255)), circle(72, outline=(255, 255, 255, 70), width=3))
            ico = icon(ic, 40, DIM, (10, 32, 58))
            off.alpha_composite(ico, (16, 16))
            on = icon_badge(ic, 72, TEAL, NAVY)
            gon, e = glow(on, 16, TEAL, 1.0)
            tdim = text(ti, F_BOLD, 40, DIM, pad=0)
            ton = text(ti, F_BOLD, 40, WHITE, pad=0)
            dd = rich_text(de, F_REG, 30, (186, 205, 224), AMBER, max_w=740, pad=0, hi_path=F_BOLD,
                           line_h=1.32)
            hh = 54 + dd.height + 34
            hi = rrect(CW + 20, hh, 24, fill=(34, 211, 197, 22), outline=(34, 211, 197, 90), width=2)
            self.N.append(dict(li=li, off=Layer(off), on=Layer(on), glow=Layer(gon), e=e,
                               tdim=Layer(tdim), ton=Layer(ton), de=Layer(dd), dh=dd.height, hi=Layer(hi)))
        y = 580
        for n in self.N:
            n["y"] = y
            y += max(118, 54 + n["dh"] + 22)
        self.track = Layer(rrect(6, self.N[-1]["y"] - self.N[0]["y"], 3, fill=(255, 255, 255, 40)))
        self.fill = rrect(6, self.N[-1]["y"] - self.N[0]["y"], 3, fill=rgba(TEAL))
        st = Image.new("RGBA", (330, 120), (0, 0, 0, 0))
        st.alpha_composite(rrect(330, 120, 18, outline=rgba(RED), width=7))
        tx = text("禁止改时间", F_BLACK, 52, RED, pad=0)
        st.alpha_composite(tx, ((330 - tx.width) // 2, (120 - tx.height) // 2 - 4))
        self.stamp = Layer(st.rotate(11, resample=Image.BICUBIC, expand=True))
        self.stamp_t = next(v for k, v in TL["events"] if k == "stamp") - self.S["start"]

    def draw(self, cv, t):
        self.stepper.draw(cv, 1, self.put, prog(t, 0.0, 0.3))
        p = prog(t, 0.05, 0.4)
        self.put(cv, self.kL, X0, 395 + (1 - p) * 20, p)
        self.put(cv, self.tL, X0, 440 + (1 - p) * 20, p)
        base = prog(t, 0.3, 0.5)
        y0 = self.N[0]["y"] + 36
        self.put(cv, self.track, self.XL - 3, y0, base * 0.9)
        # progress fill down to the current node
        cur, f = -1, 0.0
        for i, n in enumerate(self.N):
            if t >= self.L[n["li"]]:
                cur = i
        if cur >= 0:
            yprev = self.N[max(0, cur - 1)]["y"]
            ycur = self.N[cur]["y"]
            k = prog(t, self.L[self.N[cur]["li"]], 0.5)
            yy = yprev + (ycur - yprev) * k if cur > 0 else ycur
            hgt = int(yy - self.N[0]["y"])
            if hgt > 4:
                self.put(cv, Layer(self.fill.crop((0, 0, 6, hgt))), self.XL - 3, y0)
        for i, n in enumerate(self.N):
            a = base * prog(t, 0.35 + i * 0.08, 0.4)
            reached = t >= self.L[n["li"]]
            r = prog(t, self.L[n["li"]], 0.35) if reached else 0
            nxt = self.L[self.N[i + 1]["li"]] if i + 1 < len(self.N) else self.dur + 1
            active = r * (1 - prog(t, nxt, 0.3))
            y = n["y"]
            if active > 0:
                self.put(cv, n["hi"], X0 - 30, y - 14, active * 0.9)
            self.put(cv, n["off"], self.XL - 36, y, a * (1 - r))
            if r > 0:
                pulse = 1 + 0.05 * math.sin(t * 6) * active
                self.put(cv, n["glow"], self.XL, y + 36, r * (0.5 + 0.5 * active), scale=pulse, anchor="c")
                self.put(cv, n["on"], self.XL, y + 36, r, scale=0.8 + 0.2 * ease_back(r), anchor="c")
            self.put(cv, n["tdim"], self.XL + 62, y - 2, a * (1 - r))
            self.put(cv, n["ton"], self.XL + 62 + (1 - r) * 20, y - 2, r)
            self.put(cv, n["de"], self.XL + 62 + (1 - r) * 30, y + 54, r)
        q = clamp((t - self.stamp_t) / 0.18)
        if q > 0:
            s = 1.7 - 0.7 * ease_out(q)
            n4 = self.N[3]
            self.put(cv, self.stamp, 795, n4["y"] + 38, min(1, q * 1.3), scale=s, anchor="c")


# ---------------------------------------------------------------------- outro
class Outro(Scene):
    def build(self):
        g, self.e = glow(icon_badge("shield", 180, TEAL, NAVY), 34, TEAL, 0.9)
        self.shield = Layer(g)
        self.l1 = Layer(text("CRA不是跑腿的", F_BLACK, 88, WHITE))
        g2, _ = glow(text("是试验质量的守门人", F_SMILEY, 112, TEAL), 22, TEAL, 0.55)
        self.l2 = Layer(g2)
        self.cta = []
        for ic, col, lab in [("heart", RED, "点赞"), ("star", AMBER, "收藏"), ("share", TEAL, "转给做BE的同事")]:
            b = Image.alpha_composite(circle(124, fill=(col[0], col[1], col[2], 40)), circle(124, outline=rgba(col), width=4))
            b.alpha_composite(icon(ic, 64, col), (30, 30))
            lt = text(lab, F_BOLD, 32, WHITE, pad=0)
            img = Image.new("RGBA", (max(124, lt.width), 124 + 16 + lt.height), (0, 0, 0, 0))
            img.alpha_composite(b, ((img.width - 124) // 2, 0))
            img.alpha_composite(lt, ((img.width - lt.width) // 2, 140))
            self.cta.append(Layer(img))
        foot = ("依据：《药物临床试验质量管理规范》（2026年修订）及BE相关技术指导原则\n"
                "仅供学习交流，具体以官方原文、试验方案和SOP为准")
        lines = [text(s, F_REG, 24, DIM, pad=0) for s in foot.split("\n")]
        img = Image.new("RGBA", (max(l.width for l in lines), sum(l.height for l in lines) + 10), (0, 0, 0, 0))
        y = 0
        for l in lines:
            img.alpha_composite(l, ((img.width - l.width) // 2, y))
            y += l.height + 10
        self.foot = Layer(img)

    def draw(self, cv, t):
        L = self.L
        a = prog(t, 0.0, 0.5)
        self.put(cv, self.shield, W / 2, 440, a, scale=0.8 + 0.2 * ease_back(a) + 0.02 * math.sin(t * 2), anchor="c")
        b = prog(t, L[0], 0.45)
        self.put(cv, self.l1, W / 2, 650 + (1 - b) * 24, b, anchor="c")
        c = prog(t, L[1], 0.5)
        self.put(cv, self.l2, W / 2, 800 + (1 - c) * 24, c, scale=0.9 + 0.1 * ease_back(c), anchor="c")
        xs = [W / 2 - 300, W / 2, W / 2 + 300]
        for i, L2 in enumerate(self.cta):
            q = prog(t, L[2] + 0.15 + i * 0.35, 0.4)
            if q > 0:
                self.put(cv, L2, xs[i], 1000, q, scale=0.7 + 0.3 * ease_back(q), anchor="tc")
        self.put(cv, self.foot, W / 2, 1262, prog(t, L[2] + 0.8, 0.6), anchor="tc")


SCENE_CLASSES = dict(hook=Hook, be=BE, cra=CRA, pre=Pre, during=During, post=Post,
                     senior=Senior, gcp=GCP, newbie=Newbie, outro=Outro)
