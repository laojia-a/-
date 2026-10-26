# -*- coding: utf-8 -*-
"""EP01 v3 音效表（冷开场 + 片名）。时间点与 scenes.js 里的公式一一对应。"""


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
