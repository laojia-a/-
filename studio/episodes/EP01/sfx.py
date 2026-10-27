# -*- coding: utf-8 -*-
"""EP01 v3 音效表（全片）。时间点与 act0–act5.js 里的公式一一对应（cue() 同一套按字数比例的估算）。"""


GATE_KW = ["更多的患者", "更长的时间", "生存", "安全", "监管审评"]

def einout(u):
    u = min(1.0, max(0.0, u)); return 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2

def einv(f, y):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if f(m) < y: lo = m
        else: hi = m
    return (lo + hi) / 2


# ------------------------------------------------------------------ 本集专用的声音设计
def splash(gain=.5, seed=0):
    n = secs(1.4); t = np.arange(n) / SR
    body = lp(noise(n, seed), 1800) * np.exp(-t * 7) * .9 + bp(noise(n, seed + 1), 2500, 9000) * np.exp(-t * 14) * .4
    thump = np.sin(2 * np.pi * (90 + 80 * np.exp(-t * 30)) * t) * np.exp(-t * 10) * .6
    return ((body + thump) * gain).astype(np.float32)

def bubbles(dur=1.5, seed=0, dens=14, gain=.25, f0=700, f1=2200):
    n = secs(dur + .3); y = np.zeros(n, np.float32); r = np.random.default_rng(seed)
    for _ in range(int(dens * dur)):
        i = int(r.uniform(0, secs(dur))); b = sfx_drip(r.uniform(.3, 1), r.uniform(f0, f1), int(r.integers(0, 999)))
        y[i:i + len(b)] += b[: n - i]
    return (y * gain).astype(np.float32)

def crack(gain=.45, seed=0):
    n = secs(.9); t = np.arange(n) / SR; r = np.random.default_rng(seed)
    snap = hp(noise(n, seed), 2500) * np.exp(-t * 60) * .9
    ring = sum(np.sin(2 * np.pi * r.uniform(2500, 7000) * t) * np.exp(-t * r.uniform(9, 20)) * r.uniform(.1, .3) for _ in range(6))
    return ((snap + ring) * gain).astype(np.float32)

def clack(gain=.6, seed=0):
    """金属锁扣：短促的高频击打 + 低频回弹"""
    n = secs(.8); t = np.arange(n) / SR
    m = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a for f, d, a in [(820, 16, .5), (1960, 24, .35), (3300, 34, .2)])
    k = lp(noise(n, seed), 4000) * np.exp(-t * 80) * .7
    thud = np.sin(2 * np.pi * (60 + 40 * np.exp(-t * 25)) * t) * np.exp(-t * 9) * .7
    return ((m + k + thud) * gain).astype(np.float32)

def zap(dur=.5, seed=0, gain=.4):
    n = secs(dur); t = np.arange(n) / SR
    buzz = np.sign(np.sin(2 * np.pi * 120 * t)) * .15 + np.sin(2 * np.pi * 240 * t) * .2
    return ((crackle_arc(dur, seed, .9) + bp(buzz.astype(np.float32), 200, 4000)) * np.exp(-t * 4) * gain).astype(np.float32)

def hum(dur, f=60, gain=.1, seed=0):
    n = secs(dur); t = np.arange(n) / SR
    x = sum(np.sin(2 * np.pi * f * k * t) * a for k, a in [(1, .5), (2, .3), (3, .25), (5, .12)]) + bp(noise(n, seed), 800, 3000) * .05
    m = .8 + .2 * np.sin(2 * np.pi * 7.3 * t)
    return (stereo((x * m).astype(np.float32), 1) * gain).astype(np.float32)

def swirl(dur, seed=0, gain=.3, f_hi=2400, f_lo=300):
    """漩涡 / 冲水：带通噪声，中心频率周期摆动并整体下行，夹着低沉的咕噜"""
    n = secs(dur); t = np.arange(n) / SR; x = pink(n, seed); out = np.zeros(n, np.float32); B = 2048; zi = None
    for i in range(0, n, B):
        u = i / n; fc = f_hi * (f_lo / f_hi) ** u * (1 + .35 * np.sin(2 * np.pi * 1.7 * t[i]))
        b, a = signal.butter(2, [max(60, fc * .6) / (SR / 2), min(fc * 1.7, SR * .45) / (SR / 2)], 'band')
        y, zi = signal.lfilter(b, a, x[i:i + B], zi=zi if zi is not None else np.zeros(max(len(a), len(b)) - 1)); out[i:i + B] = y
    e = np.minimum(1, t / .3) * np.minimum(1, (dur - t) / .6)
    return ((out * e + bubbles(dur, seed + 7, 6, .5, 200, 600)[:n]) * gain).astype(np.float32)

def stream(dur, seed=0, gain=.12):
    """肠道里的“河”：流水底噪"""
    n = secs(dur); t = np.arange(n) / SR
    x = bp(pink(n, seed), 250, 2200) * (.75 + .25 * np.sin(2 * np.pi * t / 4.3)) + bp(noise(n, seed + 1), 3000, 8000) * .06 * (.5 + .5 * np.sin(2 * np.pi * t / 1.7))
    return (stereo(x.astype(np.float32), 1) * gain).astype(np.float32)

def whir(dur=1.0, f0=300, f1=900, gain=.12):
    n = secs(dur); t = np.linspace(0, 1, n); f = f0 * (f1 / f0) ** t; ph = 2 * np.pi * np.cumsum(f) / SR
    y = (np.sin(ph) + .4 * np.sin(2 * ph) + .2 * np.sign(np.sin(3 * ph))) * np.minimum(1, t * 8) * np.minimum(1, (1 - t) * 10)
    return (lp(y.astype(np.float32), 3000) * gain).astype(np.float32)

def scan(dur=1.2, gain=.12, f0=700, f1=2200):
    n = secs(dur); t = np.linspace(0, 1, n); f = f0 * (f1 / f0) ** t; ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * (.6 + .4 * np.sin(2 * np.pi * 30 * t * dur)) * np.sin(np.pi * t) + bp(noise(n, 3), 2000, 7000) * .15 * np.sin(np.pi * t)
    return (y * gain).astype(np.float32)

def pop(gain=.3, seed=0):
    n = secs(.25); t = np.arange(n) / SR
    y = bp(noise(n, seed), 1500, 7000) * np.exp(-t * 120) * .8 + np.sin(2 * np.pi * (220 + 300 * np.exp(-t * 60)) * t) * np.exp(-t * 30) * .7
    return (y * gain).astype(np.float32)

def fill(dur=1.6, gain=.2, seed=0):
    n = secs(dur); t = np.linspace(0, 1, n); x = noise(n, seed); out = np.zeros(n, np.float32); B = 2048; zi = None
    for i in range(0, n, B):
        fc = 300 + 1500 * t[i]; b, a = signal.butter(2, fc / (SR / 2))
        y, zi = signal.lfilter(b, a, x[i:i + B], zi=zi if zi is not None else np.zeros(2)); out[i:i + B] = y
    return ((out * .6 + bubbles(dur, seed + 3, 16, .5, 500, 1600)[:n]) * np.minimum(1, t * 6) * np.minimum(1, (1 - t) * 6) * gain).astype(np.float32)

def marker(dur=.5, gain=.12, seed=0):
    n = secs(dur); t = np.linspace(0, 1, n)
    return (bp(noise(n, seed), 2200, 6000) * (.6 + .4 * np.sin(2 * np.pi * 18 * t * dur)) * np.sin(np.pi * t) * gain).astype(np.float32)

def tape_stop(dur=.5, gain=.25):
    n = secs(dur); t = np.linspace(0, 1, n); f = 220 * (1 - t) ** 2 + 30; ph = 2 * np.pi * np.cumsum(f) / SR
    return ((np.sin(ph) + .5 * np.sign(np.sin(ph))) * (1 - t) * gain * .5).astype(np.float32)


def build_sfx():
    # ---------------- s00 三句真话
    a = ss("s00_paradox")
    amb(lp(pink(secs(se("s00_paradox") - a + 1), 1), 180) * .35, a, 1.0, 1.2, 1.0)   # 低频空气
    fx(sfx_whoosh(1.2, 120, 2400, .3, 2), a + .1, .45)                               # 光柱升起
    fx(sfx_beep(110, .6, .25), a + .25, .3)
    # 光爆 → 粒子聚成分子
    fx(sfx_impact(.5, 70, 2.0, 3), ls("D001") - .2, .55)
    fx(shimmer(1.6, 4, 2500, 8000, 90, .35), ls("D001") - .15, .5)
    fx(sfx_chime(86, .25, 2.4), ls("D001") + .95, .35)
    # 三张卡飞入 + 印章
    for k, (lid, kw, pan) in enumerate([("D002", "空腹", -.5), ("D003", "都可以", .5), ("D004", "四分之一", 0)]):
        t0 = ls(lid) - .05
        fx(sfx_whoosh(.55, 300, 5000, .35, 10 + k), t0 - .1, .55, pan)
        fx(sfx_paper(.5, .45, 20 + k), t0 + .5, .5, pan)
        ts = cue(lid, kw) - (.1 if lid == "D003" else 0)
        fx(sfx_stamp(1.0, 30 + k), ts + .05, .55, pan)
    # 矛盾：电弧爆裂 + 故障
    fx(crackle_arc(ls("D006") - ls("D005") + .5, 40, .5), ls("D005") - .1, .55)
    for k in range(5): fx(sfx_glitch(.18, .4, 41 + k), ls("D005") + .2 + k * .45 + R.uniform(0, .15), .35, R.uniform(-.6, .6))
    # 全 · 是 · 真
    for k, kw in enumerate(["全", "是", "真"]):
        fx(sfx_stamp(.9, 50 + k), cue("D006", kw), .45, (-.5, 0, .5)[k])
    fx(sfx_whoosh(1.4, 6000, 300, .3, 55), cue("D006", "真") + .2, .35)
    # 结尾碎裂
    fx(shimmer(1.4, 56, 3000, 9000, 120, .3), se("s00_paradox") - .9, .45)
    fx(sfx_glitch(.4, .5, 57), se("s00_paradox") - .25, .5)

    # ---------------- s01 一顿饭
    a = ss("s01_meal")
    fx(shimmer(2.2, 60, 1500, 6000, 70, .3), a + .1, .45)                            # 碎片旋涡
    fx(sfx_whoosh(2.4, 200, 1800, .35, 61, rev=True), a + .2, .45)
    amb((lp(pink(secs(ls("D008") - a + 1), 62), 260) * .4 + sine(55, secs(ls("D008") - a + 1)) * .03).astype(np.float32), a, 1.0, 1.0, 1.0)
    # 曲线冲顶 → ×17
    t17 = cue("D008", "17倍")
    fx(sfx_whoosh(t17 - cue("D008", "血液"), 200, 7000, .4, 63), cue("D008", "血液"), .5)
    n = secs(t17 - cue("D008", "峰值")); tt = np.arange(n) / SR; f = 200 * (12 ** (tt / (n / SR))); ph = 2 * np.pi * np.cumsum(f) / SR
    fx((np.sin(ph) * .12 * np.minimum(1, tt / .3)).astype(np.float32), cue("D008", "峰值"), .45)   # 计数上扬
    for i in range(16): fx(sfx_tick(.12, 64 + i), cue("D008", "峰值") + .3 + i * (t17 - cue("D008", "峰值") - .3) / 16, .45)
    fx(sfx_glitch(.5, .6, 80), t17 - .02, .4)
    fx(sfx_impact(.8, 46, 3.0, 81), t17, .6)
    # 药 · 剂量 · 早餐
    fx(sfx_impact(.35, 90, 1.2, 82), ls("D009") + .05, .45)
    fx(sfx_impact(.35, 80, 1.2, 83), ls("D010") + .05, .45)
    tz = cue("D011", "只是")
    fx(sfx_whoosh(.4, 600, 5000, .3, 84), tz - .2, .4)
    fx(sfx_chime(88, .22, 2.4), tz + .05, .4)
    fx(sfx_paper(.35, .3, 85), tz, .35)
    # 凭什么：乱码重写声 + 收成光缝
    for i in range(14): fx(sfx_type(.18, 90 + i), cue("D012", "改写") + i * .07, .35)
    fx(sfx_riser(1.6, 300, 6000, .4, 95), se("s01_meal") - 1.5, .45)

    # ---------------- s02 片名
    t = ss("s02_title")
    fx(sfx_whoosh(1.0, 6000, 400, .4, 100), t - .05, .45)
    fx(sfx_glitch(.3, .4, 101), t + .05, .35)
    fx(sfx_whoosh(1.4, 400, 5000, .25, 102), t + .9, .3)       # 扫光
    fx(sfx_chime(86, .2, 3.0), t + 3.5, .3)

    def card(a, seed):   # 章节卡：黑场里一道光线拉开
        fx(sfx_whoosh(1.2, 5000, 300, .32, seed), a - .1, .4)
        fx(sfx_whoosh(1.3, 300, 4500, .22, seed + 1), a + .15, .3)
        fx(shimmer(1.2, seed + 2, 4000, 9000, 50, .2), a + .4, .3)

    # ---------------- s03 钥匙与锁
    a, e = ss("s03_key"), se("s03_key")
    card(a, 200)
    amb(lp(pink(secs(e - a), 201), 220) * .3, a, 1.0, 1.5, 1.0)
    fx(shimmer(1.6, 202, 2500, 8000, 60, .25), a + 1.6, .4)                       # 分子浮现
    fx(shimmer(.9, 203, 5000, 10000, 70, .2), cue("D013", "钥匙") - .2, .35)
    t14 = ls("D014") - .2
    td = le("D015") + 1.0
    amb(hum(td - t14 + .5, 55, .12, 204), t14, .5, 1.0, .4)                          # 酶的低鸣
    fx(sfx_whoosh(.8, 200, 2000, .3, 205), t14 - .1, .4)
    tg = cue("D014", "合成雄激素")
    amb(bp(noise(secs(td - tg), 206), 1500, 6000) * .05, tg, .6, .8, .3)            # 雄激素流动的嘶嘶声
    amb(amb_crackle(td - ls("D015") + 1.5, .1, 207), ls("D015"), .5, .8, .6)        # 癌细胞“发热”
    fx(sfx_whoosh(1.4, 300, 3500, .4, 208), le("D015") - .3, .5)                    # 钥匙飞向锁孔
    fx(clack(.7, 209), td, .6); fx(sfx_impact(.5, 60, 2.0, 210), td, .45)
    fx(shimmer(1.2, 211, 3000, 8000, 80, .3), td + .05, .4)
    c94, c11 = cue("D016", "1994"), cue("D016", "2011")
    fx(sfx_whoosh(c11 - c94 + .3, 300, 3000, .2, 212), c94, .3)
    for i in range(18): fx(sfx_tick(.25, 213 + i), c94 + (c11 - c94) * einv(einout, i / 17), .35)
    fx(sfx_whoosh(.7, 4000, 600, .3, 231), cue("D016", "17") - .2, .4)
    st = cue("D017", "卡住了")
    fx(sfx_glitch(.45, .4, 232), st - .02, .4); fx(tape_stop(.35, .3), st, .4)
    fx(sfx_glitch(.2, .4, 233), st + .58, .4)

    # ---------------- s04 一条河
    a, e = ss("s04_river"), se("s04_river")
    amb(stream(se("s05_bile") - a + 1, 240, .14), a - .3, .8, 1.5, 1.5)            # 河水：贯穿 s04–s05
    fx(sfx_whoosh(.9, 2000, 400, .3, 241), a + .1, .4)
    fx(splash(.6, 242), a + 1.0, .55); fx(bubbles(1.6, 243, 18, .5), a + 1.0, .45)
    fl = ls("D019")
    fx(sfx_whoosh(2.5, 300, 1200, .25, 244), fl, .3)                               # 水流加速
    tc = cue("D020", "几乎不溶")
    fx(crack(.4, 245), tc, .42); fx(bp(noise(secs(.6), 246), 800, 5000) * np.exp(-np.arange(secs(.6)) / SR * 6) * .3, tc + .02, .45)
    fx(shimmer(1.0, 247, 3000, 8000, 60, .2), tc + .05, .35)
    for i in range(7): fx(sfx_drip(.5, 260 + i * 25, 248 + i), ls("D021") + .6 + i * .55, .3, float(R.uniform(-.5, .5)))   # 石子落底
    ui_blip(cue("D018", "被吸收") - .2, .14, 1800)
    t88 = cue("D022", "88")
    fx(whir(1.1, 250, 900, .2), t88 - .8, .5); fx(sfx_tick(.4, 249), t88 + .3, .4)
    fx(whir(.9, 300, 700, .16), cue("D022", "一大半") - .2, .45)
    ui_blip(ls("D022") - .1, .12, 1400)

    # ---------------- s05 早餐、胆汁、胶束
    a, e = ss("s05_bile"), se("s05_bile")
    fx(sfx_whoosh(1.6, 300, 2500, .3, 260), ls("D023") - .3, .4); fx(sfx_chime(91, .12, 2.6), ls("D023") + .3, .3)
    fx(splash(.4, 261), ls("D023") + 1.1, .45); fx(bubbles(1.2, 262, 14, .4), ls("D023") + 1.1, .35)
    fx(crack(.3, 263), ls("D023") + 1.3, .35)
    tb = cue("D024", "胆囊收缩")
    fx(sfx_door(.5, 264), tb - 1.1, .45)                                          # 闸门滑开（锁扣落在 tb 附近）
    fx(sfx_whoosh(2.2, 150, 1500, .4, 265), tb - .1, .5)                          # 胆汁涌入
    amb(lp(pink(secs(6.0), 266), 500) * .25, tb, .5, .4, 2.0)
    tm_ = cue("D025", "胶束") - .6
    fx(bubbles(1.6, 267, 22, .5, 1400, 3200), tm_, .4)                             # 胶束成形
    fx(shimmer(1.4, 268, 4000, 9000, 50, .2), tm_ + .2, .3)
    for i in range(10):
        tt = ls("D026") + 2.0 + i * .42 + float(R.uniform(-.1, .1))
        if tt < ls("D027") - .1: fx(sfx_drip(.4, float(R.uniform(900, 1500)), 270 + i), tt, .3, float(R.uniform(-.6, .6)))   # 渡船靠岸
    f0 = ls("D027")
    fx(tape_stop(.6, .3), f0 - .05, .45); fx(sfx_impact(.3, 60, 1.6, 281), f0, .35)
    for i, tt in enumerate([ls("D027") + .1, cue("D027", "胃排空"), cue("D027", "停留更久")]):
        fx(sfx_paper(.35, .4, 282 + i), tt - .05, .4, (-.5, 0, .5)[i]); ui_blip(tt, .12, 1600 + i * 300)
    fx(sfx_scribble(1.6, .3, 285), ls("D028") + .6, .3)
    ob = cue("D028", "观察")
    fx(sfx_stamp(.9, 286), ob, .5); fx(sfx_whoosh(.8, 5000, 300, .3, 287), ob - .25, .4)

    # ---------------- s06 身份证
    a, e = ss("s06_idcard"), se("s06_idcard")
    card(a, 300)
    amb(amb_room(se("s08_answer") - a, .06, 301, 60), a, .6, 1.5, 1.0)              # 档案室底噪：贯穿第二章
    tid = cue("D029", "身份证")
    fx(sfx_whoosh(1.0, 3000, 400, .35, 302), tid - .3, .45)
    fx(scan(1.2, .5), tid, .35)
    for i, kw in enumerate(["ZYTIGA", "单次", "健康志愿者", "825"]):
        tt = cue("D030", kw)
        for k in range(3): fx(sfx_type(.22, 303 + i * 5 + k), tt - .05 + k * .06, .28)
        ui_blip(tt + .2, .1, 1900 + i * 200)
    fx(sfx_stamp(.6, 330), cue("D031", "峰浓度"), .4)

    # ---------------- s07 弹幕投票
    a, e = ss("s07_vote"), se("s07_vote")
    T0 = le("D032") + .6; T1 = e - .4; sd = (T1 - T0) / 8
    fx(sfx_whoosh(.9, 300, 3000, .3, 340), cue("D032", "真正的患者") - .2, .4)
    fx(sfx_glitch(.18, .3, 341), cue("D032", "影响"), .3)
    k0 = le("D032") + .1
    for i in range(3): fx(pop(.5, 342 + i), k0 + i * .18 + .1, .4, (-.6, 0, .6)[i])
    for j in range(8): fx(sfx_beep(880 if j < 7 else 1320, .09, .3), T0 + j * sd, .25)

    # ---------------- s08 答案
    a, e = ss("s08_answer"), se("s08_answer")
    fx(sfx_whoosh(.6, 600, 8000, .3, 350), a - .3, .4)                             # 白闪
    t33 = ls("D033")
    fx(sfx_chime(96, .2, 2.0), t33, .4); fx(sfx_whoosh(1.0, 3000, 300, .3, 351), t33 + .05, .35)
    fx(sfx_whoosh(.9, 300, 3500, .35, 352), ls("D034") - .05, .45)                  # 第二张身份证滑入
    for i, kw in enumerate(["连续七天", "患者", "高脂餐", "2倍"]):
        tt = cue("D034", kw)
        for k in range(3): fx(sfx_type(.22, 353 + i * 4 + k), tt - .05 + k * .06, .28)
    for i, kw in enumerate(["十七倍", "十倍", "两倍"]): fx(sfx_stamp(.65, 370 + i), cue("D035", kw), .42, (-.5, -.1, .5)[i])
    for i, kw in enumerate(["谁在吃", "吃几次", "量的是什么"]): fx(sfx_whoosh(.6, 800, 6000, .3, 374 + i), cue("D036", kw) - .1, .35)
    t37 = ls("D037")
    fx(sfx_whoosh(1.4, 400, 3000, .3, 378), t37 + .1, .4)
    for k in range(6): fx(sfx_glitch(.2, .45, 379 + k), t37 + 1.25 + k * .32 + float(R.uniform(0, .1)), .4, float(R.uniform(-.6, .6)))
    fx(bp(osc_sq(55, secs(2.0), .3), 100, 2500) * np.linspace(0, 1, secs(2.0)) ** .5 * np.linspace(1, 0, secs(2.0)) * .25, t37 + 1.2, .4)  # 失真嗡鸣

    # ---------------- s09 磨碎的分子
    a, e = ss("s09_mill"), se("s09_mill")
    card(a, 400)
    amb(amb_room(se("s11_twins") - a, .05, 401, 50), a, .6, 1.5, 1.0)        # 实验室底噪：贯穿第三章
    fx(shimmer(1.4, 402, 3000, 8000, 50, .25), a + 2.6, .35)
    tf = cue("D038", "磨得更细")
    for k in range(1, 5): fx(crack(.36 + k * .05, 403 + k), tf - .2 + (k - .2) * .55, .38, float(R.uniform(-.3, .3)))
    t0, ty = cue("D039", "做成了") - .3, cue("D039", "YONSA") - .1
    fx(swirl(ty - t0 + .2, 410, .4, 5000, 1200), t0, .35); fx(shimmer(ty - t0, 411, 4000, 10000, 90, .25), t0, .35)
    fx(sfx_impact(.4, 70, 2.0, 412), ty, .42); fx(clack(.35, 413), ty + .02, .3)
    fx(sfx_whoosh(.9, 300, 4000, .35, 414), ls("D040") - .2, .45); fx(sfx_paper(.5, .45, 415), ls("D040") + .4, .45)
    fx(sfx_stamp(.8, 416), cue("D040", "都可以") + .1, .45)

    # ---------------- s10 两组光柱
    a, e = ss("s10_bars"), se("s10_bars")
    ui_blip(ls("D041") + .1, .12, 1200)
    for kw in ["6.5", "4.4"]:
        tt = cue("D042", kw); fx(sfx_whoosh(1.1, 200, 3000, .35, 420 + len(kw)), tt - .05, .4); fx(shimmer(.8, 422 + len(kw), 4000, 9000, 60, .2), tt + .6, .3)
    fx(sfx_click(.4, 3000, 425), cue("D043", "允许随餐") - .2, .35); fx(sfx_click(.4, 2600, 426), cue("D043", "允许随餐"), .35)

    # ---------------- s11 不能互换 → 矛盾①解开
    a, e = ss("s11_twins"), se("s11_twins")
    solve = cue("D045", "解开了")
    amb(hum(solve - a + .5, 60, .1, 430), a + .2, .55, .8, .5)                       # 屏障电流
    for k, t0 in enumerate([cue("D044", "不能") - .4, cue("D044", "互换") - .2]):
        fx(sfx_whoosh(.7, 400, 4000, .3, 431 + k), t0, .35, (-.5, .5)[k]); fx(zap(.6, 433 + k, .6), t0 + .7, .5)
    fx(sfx_stamp(.6, 436), cue("D044", "不能"), .4)
    amb(crackle_arc(solve - ls("D045") + .3, 437, .25), ls("D045") - .1, .4, .2, .2)
    fx(sfx_whoosh(1.4, 300, 6000, .3, 438), solve - .1, .4); fx(shimmer(1.8, 439, 3000, 9000, 90, .3), solve, .4)
    fx(sfx_stamp(.8, 440), solve + .05, .45)

    # ---------------- s12 漩涡 · 冲进马桶
    a, e = ss("s12_toilet"), se("s12_toilet")
    card(a, 500)
    fx(sfx_whoosh(1.0, 4000, 400, .35, 501), ls("D046") - .2, .45); fx(sfx_paper(.5, .45, 502), ls("D046") + .5, .4)
    t88 = cue("D046", "88")
    fx(sfx_whoosh(.9, 300, 3000, .3, 503), t88 - .7, .35)
    amb(swirl(ls("D049") - t88 + 1.2, 504, .3, 2000, 500), t88 - .6, .5, .8, 1.0)  # 漩涡水声
    fx(whir(1.0, 250, 900, .2), t88 - .3, .45)
    fx(sfx_whoosh(.8, 3000, 300, .3, 505), ls("D047") - .1, .4); fx(sfx_paper(.6, .4, 506), ls("D047") + .3, .4)
    k0, k1 = cue("D047", "标题") - .2, cue("D047", "冲进马桶") + .1
    title = "Flushing oral oncology drugs down the toilet"
    for i, ch in enumerate(title):
        if ch != " ": fx(sfx_type(.28, 510 + i), k0 + (k1 - k0) * (i + 1) / len(title), .3)
    tfl = cue("D047", "冲进马桶")
    fx(swirl(2.6, 560, .8, 3000, 200), tfl - .1, .5); fx(splash(.3, 561), tfl + .2, .35)
    fx(sfx_whoosh(.8, 300, 3000, .3, 562), ls("D048") - .1, .4); fx(sfx_paper(.5, .4, 563), ls("D048") + .3, .4)
    title2 = "Despite a large food effect…"
    for i, ch in enumerate(title2):
        if ch != " ": fx(sfx_type(.26, 570 + i), ls("D048") + .1 + 1.1 * (i + 1) / len(title2), .3)
    fx(marker(.5, .3, 600), ls("D048") + 1.15, .35)
    tsw = cue("D049", "换掉")
    fx(sfx_whoosh(.8, 2000, 300, .3, 601), ls("D049") - .2, .35)
    fx(shimmer(1.6, 602, 3000, 9000, 90, .3), tsw - .2, .4); fx(sfx_whoosh(1.4, 300, 5000, .3, 603), tsw - .1, .35)
    fx(sfx_ping(1320, .3, 1.0), tsw + 1.2, .3)                                      # 落在盘子上
    fx(sfx_impact(.25, 80, 1.5, 604), tsw + .8, .35)

    # ---------------- s13 72 名患者 → PSA
    a, e = ss("s13_trial"), se("s13_trial")
    amb(amb_room(e - a, .05, 610, 50), a, .5, 1.0, 1.0)
    for i in range(72): fx(sfx_tick(.18, 611 + i), ls("D050") + i * .02 + .2, .25, float(R.uniform(-.7, .7)))
    ts = ls("D051") - .1
    fx(scan(1.4, .6, 500, 1800), ts, .35); fx(sfx_whoosh(1.4, 300, 4000, .3, 690), ts, .35)
    for i in range(12): fx(sfx_click(.3, float(R.uniform(2000, 4000)), 691 + i), ts + .1 + i * .11, .3, float(R.uniform(-.6, .6)))
    fx(sfx_ping(1100, .3, .8), ts + .7, .3, -.4); fx(sfx_ping(1480, .3, .8), cue("D051", "另一组"), .3, .4)
    fx(sfx_whoosh(.8, 400, 3000, .3, 705), ls("D052") - .2, .35)
    fx(sfx_scribble(2.5, .25, 706), ls("D052") + .5, .3)
    fx(sfx_chime(93, .12, 2.4), cue("D052", "不劣于"), .35)

    # ---------------- s14 一整条路
    a, e = ss("s14_road"), se("s14_road")
    fx(sfx_whoosh(1.0, 3000, 300, .3, 720, rev=True), a + .2, .35)
    ui_blip(ls("D053") + .1, .12, 1500)
    t54 = ls("D054")
    fx(sfx_whoosh(2.6, 100, 1500, .45, 721), t54 - .2, .5)                         # 路从脚下伸向远方
    amb(amb_wind(e - t54 + .5, .22, 722), t54 - .2, .5, 1.5, 1.0)
    for i, g in enumerate(GATE_KW):
        tg = cue("D055", g)
        fx(sfx_whoosh(.9, 300, 5000, .45, 723 + i), tg + .25, .45, (-.4, .4)[i % 2]); fx(hum(.7, 120, .15, 730 + i), tg - .2, .3)
    arr = ls("D056") + 1.6
    fx(sfx_impact(.6, 50, 3.0, 740), arr, .45)
    fx(sfx_stamp(.8, 741), ls("D056") + 1.3, .45)
    fx(sfx_stamp(.6, 742), cue("D056", "不是"), .4)

    # ---------------- s15 终章：三句真话
    a, e = ss("s15_finale"), se("s15_finale")
    card(a, 800)
    amb(lp(pink(secs(e - a), 801), 260) * .35, a, 1.0, 1.5, 1.5)
    t57 = ls("D057")
    for i in range(3):
        tt = t57 - .2 + i * .25
        fx(sfx_whoosh(.6, 300, 5000, .35, 802 + i), tt - .1, .45, (-.6, .6, 0)[i]); fx(sfx_paper(.45, .4, 805 + i), tt + .45, .4, (-.6, .6, 0)[i])
    solve = cue("D061", "并不矛盾")
    amb(crackle_arc(solve - t57 - .6, 808, .1), t57 + .8, .35, 1.0, .2)
    for k in range(5): fx(sfx_glitch(.16, .35, 809 + k), t57 + 1.4 + k * 1.7 + float(R.uniform(0, .4)), .3, float(R.uniform(-.6, .6)))
    for i, (lid, kw) in enumerate([("D058", "ZYTIGA"), ("D059", "YONSA"), ("D060", "一项研究")]):
        tt = cue(lid, kw); ui_blip(tt, .12, 1500 + 250 * i)
        for k in range(4): fx(sfx_type(.25, 815 + i * 4 + k), tt + .2 + k * .06, .3)
    for k in range(3): fx(sfx_stamp(.7, 830 + k), solve + k * .12, .38, (-.6, .6, 0)[k])
    fx(sfx_glitch(.3, .5, 833), solve - .05, .4); fx(sfx_whoosh(1.6, 6000, 300, .35, 834), solve + .1, .4)
    fx(shimmer(2.0, 835, 3000, 9000, 110, .3), solve + .05, .4)
    fx(sfx_whoosh(1.6, 300, 2500, .3, 836), ls("D062") - .3, .4)
    for kw in ["产品", "人", "吃法"]: fx(shimmer(.8, 837 + len(kw), 4000, 9000, 60, .2), cue("D062", kw) - .1, .3)

    # ---------------- s16 剂量地图
    a, e = ss("s16_map"), se("s16_map")
    for i in range(5): fx(sfx_ping(1200 + i * 180, .25, .7), a + .25 + i * .2, .3, -.6 + i * .3)
    fx(sfx_chime(93, .1, 2.0), a + 1.45, .3)

    # ---------------- s17 下集预告
    a, e = ss("s17_next"), se("s17_next")
    fx(sfx_glitch(.45, .55, 900), a - .2, .5)
    for i in range(3): fx(pop(.5, 901 + i), a + .2 + i * .12, .35)
    t5, t2 = cue("D064", "五倍多"), cue("D064", "两倍多")
    for i in range(16): fx(pop(.35, 905 + i), t5 - 1.4 + i * .06, .3, -.6 + i * .08)
    fx(fill(1.6, .7, 930), t2 - 1.2, .4)
    fx(sfx_tick(.4, 931), t5 + .1, .3)
    fx(sfx_whoosh(1.0, 2000, 200, .3, 932), t2, .35)
    t65 = ls("D065")
    fx(sfx_glitch(.5, .6, 933), t65 - .02, .5); fx(sfx_impact(.6, 45, 3.0, 934), t65, .45)
    fx(sfx_whoosh(1.0, 300, 6000, .3, 935), t65 + .25, .35)

    # ---------------- s18 片尾
    a, e = ss("s18_end"), se("s18_end")
    fx(sfx_whoosh(1.4, 300, 4000, .3, 950), a + .1, .35)
    ts = cue("D067", "一键三连") - .3
    for i in range(3): fx(pop(.4, 951 + i), ts + 1.6 * i * .18 + .2, .35, (-.5, 0, .5)[i])
    ui_blip(cue("D067", "支线进行中"), .12, 1700)
