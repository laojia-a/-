# -*- coding: utf-8 -*-
"""EP01 一顿饭 v3 配乐（冷开场 + 片名）。由 audio/score.py exec 载入，可直接用其中的 I/N/NS/arp/hit_add/sfx_* 等。
调性：D 小调。三句话＝弦乐固定音型逐层加厚；矛盾＝小二度震音 + 定音鼓滚奏；
“全都是真的”＝三连击后转 D 大调（逻辑闭合的那一下）；一顿饭＝日出式的降 B → F 大调；×17＝BRAAM。"""

PUNCT = r"[\s，。、：；！？“”‘’（）()…—\-,.!?:;《》·]"
def cue(i, kw, after=False):
    """与 scenes.js 的 cue() 相同：按去标点字数比例估算句内关键词时刻（全局秒）。"""
    l = LN[i]; s = l["sub"].replace("\n", "")
    k = s.find(kw)
    if k < 0: return l["start"]
    pre = len(re.sub(PUNCT, "", s[: k + (len(kw) if after else 0)])); tot = len(re.sub(PUNCT, "", s)) or 1
    return l["start"] + (l["end"] - l["start"]) * pre / tot

MOTIF = [("D4", 1), ("A4", 1), ("G4", .5), ("F4", .5), ("E4", 1), ("D4", 2)]   # 《剂量》动机


def m_paradox():
    a, e = ss("s00_paradox"), se("s00_paradox")
    # 开场：低音脉冲 + 空间人声铺底
    hit_add(sfx_impact(.55, 38, 3.2, 2), a + .15, 1, 0, .4)
    lo = I("str_low", 49, gain_db=-3, send=.5)
    lo.chord(a + .2, NS("D2 A2"), ls("D005") - a, 66)
    lo.auto += [(a, 0), (a + 1.6, .8), (ls("D002"), 1), (ls("D005"), 1), (ls("D005") + .3, 0)]
    pad = I("spacevoice", 91, gain_db=-7, send=.6)
    pad.chord(a + .4, NS("D3 F3 A3 E4"), ls("D002") - a + .4, 64)
    pad.auto += [(a, 0), (a + 1.5, 1), (ls("D002") + .2, .6), (ls("D002") + 1.2, 0)]
    # 分子聚合：反向渐强落在第一句，钢片琴闪烁
    hit_add(sfx_reverse_swell(1.5, N("D3"), .35), ls("D001") - 1.45, 1, 0, .5)
    ch = I("choir", 52, gain_db=-5, send=.65)
    ch.chord(ls("D001") - .05, NS("D3 A3 D4 F4"), 2.4, 70); ch.auto += [(ls("D001") - .1, 0), (ls("D001") + .5, 1), (ls("D002") + .3, 0)]
    cel = I("celesta", 8, gain_db=-8, send=.6)
    t = ls("D001") - .2
    while t < ls("D001") + 1.6: cel.n(t, int(R.choice(NS("D6 F6 A6 C7 D7 E6"))), .8, int(R.integers(40, 64))); t += float(R.uniform(.07, .16))
    # 三句话：弦乐固定音型（100 bpm 八分音符），每张卡加一层
    b = 60 / 100; q = b / 2
    sp = I("str_spic", 48, gain_db=-5, send=.35)
    bass = I("cello", 42, gain_db=-4, send=.35)
    tk = I("taiko", 116, gain_db=-6, send=.3)
    t0, t1 = ls("D002") - .1, ls("D005") - .05
    prog = [(ls("D002") - .1, NS("D3 F3 A3")), (ls("D003") - .1, NS("Bb2 D3 F3")), (ls("D004") - .1, NS("G2 Bb2 D3")), (cue("D004", "四分之一") - .2, NS("A2 C#3 E3"))]
    pat = [0, 0, 1, 0, 2, 0, 1, 0]
    t = t0; k = 0
    while t < t1 - 1e-6:
        cur = [c for c in prog if c[0] <= t + 1e-6][-1][1]
        sp.n(t, cur[pat[k % 8]] + 12, q * .55, 74 if k % 2 == 0 else 58)
        if k % 4 == 0: bass.n(t, cur[0] - 12 if cur[0] > N("C3") else cur[0], b * 2 * .95, 76)
        if t > ls("D003") - .1 and k % 4 == 0: tk.n(t, N("C2"), .3, 70 if k % 8 == 0 else 54)
        t += q; k += 1
    sp.auto += [(t0, .55), (ls("D003"), .8), (ls("D004"), 1), (t1, 1), (t1 + .2, 0)]
    # 每个印章落下：定音鼓 + 低铜管
    tm = I("timpani", 47, gain_db=-1, send=.4); br = I("brass_low", 57, gain_db=-6, send=.45)
    for tt, root in [(cue("D002", "空腹"), "D2"), (cue("D003", "都可以") - .1, "Bb1"), (cue("D004", "四分之一") - .2, "A1")]:
        tm.n(tt, N(root), 1.4, 112); br.chord(tt, [N(root) + 12, N(root) + 19], 1.2, 88)
        hit_add(sfx_impact(.45, 52, 2.0, int(tt * 10)), tt, 1, 0, .35)
    # 矛盾：小二度震音 + 定音鼓滚奏渐强
    tr = I("tremolo", 44, gain_db=-4, send=.5)
    tr.chord(ls("D005") - .05, NS("D4 Eb4 A4 Bb4"), ls("D006") - ls("D005") + .1, 70)
    tr.auto += [(ls("D005") - .1, .2), (ls("D006"), 1), (ls("D006") + .05, 0)]
    t = ls("D005") + .2; k = 0
    while t < cue("D006", "全") - .03: tm.n(t, N("D2"), .1, min(96, 40 + k * 2)); t += .075; k += 1
    hit_add(sfx_riser(ls("D006") - ls("D005"), 300, 3200, .35, 8), ls("D005"), 1, 0, .4)
    # 全 · 是 · 真：三连击 → D 大调
    oh = I("orchhit", 55, gain_db=-5, send=.4)
    for kw, chd in [("全", "D3 A3 D4"), ("是", "F3 A3 F4"), ("真", "D3 F#3 A3 D4")]:
        tt = cue("D006", kw)
        oh.chord(tt, NS(chd), .8, 112 if kw == "真" else 96, 0); tm.n(tt, N("D2"), 1.0, 118); tk.n(tt, N("C2"), .3, 110)
    hit = cue("D006", "真")
    HITS.add(sfx_braam(N("D1"), 5.0, .55), hit); HSEND.add(sfx_braam(N("D1"), 5.0, .55), hit, .4)
    hit_add(sfx_impact(1.0, 40, 4.0, 77), hit, 1, 0, .4)
    drum(hit, 49, 108, kit=48, name="kit_orch")
    maj = I("str_major", 49, gain_db=-3, send=.6); chm = I("choir_major", 52, gain_db=-4, send=.7)
    maj.chord(hit, NS("D2 A2 D3 F#3 A3 D4"), e - hit + .6, 82); chm.chord(hit, NS("D3 F#3 A3 D4 F#4"), e - hit + .6, 78)
    hn = I("horn", 60, gain_db=-5, send=.55)
    hn.seq(hit + .35, [("D4", .6), ("A4", .6), ("F#4", .9)], 1.0, 78)
    for nm in ("str_major", "choir_major"):
        INST[nm].auto += [(hit, 1), (e - .5, .9), (e + .3, 0)]


def m_meal():
    a, e = ss("s01_meal"), se("s01_meal")
    # 白闪转场：风声 + 闪光
    hit_add(sfx_whoosh(1.1, 300, 6000, .35, 31), a - .55, 1, 0, .4)
    hit_add(sfx_chime(N("A6"), .16, 3.0), a + .05, 1, .2, .7)
    # 日出：降 B → F，合唱与弦乐长音，竖琴刮奏揭示“蛋黄”
    st = I("str_sun", 49, gain_db=-3, send=.6); cs = I("choir_sun", 52, gain_db=-4, send=.7)
    t_sun = ls("D007") - .1
    st.chord(t_sun, NS("Bb2 F3 Bb3 D4"), 2.2, 70); st.chord(t_sun + 2.2, NS("F2 C3 F3 A3 C4"), ls("D008") - t_sun - 1.9, 74)
    cs.chord(t_sun + .3, NS("Bb3 D4 F4"), 1.9, 66); cs.chord(t_sun + 2.2, NS("A3 C4 F4"), ls("D008") - t_sun - 1.9, 70)
    for nm in ("str_sun", "choir_sun"): INST[nm].auto += [(t_sun, 0), (t_sun + 1.2, 1), (ls("D008") + .6, .7), (ls("D008") + 1.4, 0)]
    hp = I("harp", 46, gain_db=-5, send=.5)
    tg = cue("D007", "饭") - .3
    for k, m in enumerate(NS("F4 A4 C5 F5 A5 C6 F6 A6")): hp.n(tg + k * .055, m, 1.6, 82)
    cel = I("celesta", 8)
    for k, m in enumerate(NS("C6 F6 A6 C7")): cel.n(tg + .5 + k * .18, m, 1.2, 56)
    # ×17：上行音阶 + 滚奏 + 太鼓加速 → BRAAM
    t17 = cue("D008", "17倍")
    up = I("str_rise", 48, gain_db=-4, send=.5)
    t_r = cue("D008", "血液")
    sc = NS("D3 E3 F3 G3 A3 Bb3 C4 D4 E4 F4 G4 A4")
    for i, m in enumerate(sc): up.n(t_r + i * (t17 - t_r) / len(sc), m, (t17 - t_r) / len(sc) * 1.1, 62 + i * 4)
    tm = I("timpani", 47)
    t = t_r; k = 0
    while t < t17 - .03: tm.n(t, N("A1"), .1, min(100, 44 + k)); t += .07; k += 1
    tk = I("taiko", 116); gap = .6; t = ls("D008")
    while t < t17 - .1: tk.n(t, N("C2"), .3, 84); t += gap; gap = max(.14, gap * .86)
    hit_add(sfx_riser(t17 - t_r, 200, 5000, .45, 19), t_r, 1, 0, .45)
    HITS.add(sfx_braam(N("A1"), 5.5, .62), t17); HSEND.add(sfx_braam(N("A1"), 5.5, .62), t17, .4)
    hit_add(sfx_impact(1.0, 38, 4.5, 21), t17, 1, 0, .45)
    oh = I("orchhit", 55); oh.chord(t17, NS("D3 A3 D4 F4"), 1.0, 124, 0)
    drum(t17, 49, 115, kit=48, name="kit_orch"); drum(t17, 57, 100, kit=48, name="kit_orch")
    big = I("str_big", 48, gain_db=-2, send=.5); chb = I("choir_big", 52, gain_db=-3, send=.65)
    big.chord(t17, NS("D2 A2 D3 F3 A3"), ls("D009") - t17 - .2, 90); chb.chord(t17, NS("D3 A3 D4 F4"), ls("D009") - t17 - .2, 82)
    for nm in ("str_big", "choir_big"): INST[nm].auto += [(t17, 1), (ls("D009") - 1.0, .8), (ls("D009") - .3, 0)]
    ring = sine(1760, secs(3.0)) * np.minimum(1, np.arange(secs(3.0)) / secs(.2)) * np.linspace(1, 0, secs(3.0)) ** 2 * .03
    HITS.add(ring, t17 + .2)
    # 药没变 · 剂量没变：两下低音钢琴 + 定音鼓；“只是早餐”前全体静音，随后一声音乐盒
    pn = I("piano", 0, gain_db=-2, send=.35)
    for tt, chd in [(ls("D009") + .05, "D2 A2 D3"), (ls("D010") + .05, "D2 A2 F3")]:
        pn.chord(tt, NS(chd), 1.6, 92); tm.n(tt, N("D2"), 1.2, 104)
    lo = I("str_low2", 49, gain_db=-5, send=.5); lo.chord(ls("D009"), NS("D2 A2"), cue("D011", "只是") - ls("D009") - .3, 60)
    mb = I("musicbox", 10, gain_db=-6, send=.6)
    tz = cue("D011", "只是")
    mb.seq(tz, [("A5", .5), ("F5", .5), ("D6", 1.5)], .5, 70)
    wp = I("warmpad", 89, gain_db=-9, send=.6); wp.chord(tz, NS("D3 F3 A3 C4"), ls("D012") - tz + .2, 58)
    # 凭什么改写一个剂量：低音持续 + 震音，反向渐强接片名
    dr = I("str_drone", 49, gain_db=-4, send=.5); dr.chord(ls("D012") - .2, NS("D2 A2 D3"), e - ls("D012") + .2, 64)
    tq = I("tremolo2", 44, gain_db=-6, send=.5); tq.chord(ls("D012"), NS("A3 D4 E4"), e - ls("D012"), 60)
    tq.auto += [(ls("D012"), .3), (e - .1, 1), (e, 0)]
    hit_add(sfx_reverse_swell(2.0, N("D3"), .4), e - 2.0, 1, 0, .5)


def m_title():
    t = ss("s02_title") + .05
    hit_add(sfx_braam(N("D2"), 5.5, .55), t, 1.0, 0, .45)
    hit_add(sfx_impact(.9, 40, 4.0, 41), t, 1.0, 0, .35)
    oh = I("orchhit", 55); oh.chord(t, NS("D3 A3 D4 F4"), 1.2, 112, 0)
    tm = I("timpani", 47); tm.n(t, N("D2"), 2.0, 122)
    hs = I("str_hi", 49, gain_db=-7, send=.6); hs.chord(t + .3, NS("D5 A5 D6"), se("s02_title") - t, 62)
    hs.auto += [(t, 0), (t + 1.2, 1), (se("s02_title") - .7, 1), (se("s02_title"), 0)]
    hn = I("horn_t", 60, gain_db=-4, send=.55)
    hn.seq(t + 1.1, MOTIF, .42, 84)
    hit_add(sfx_chime(N("D6"), .14, 3.0), t + 3.5, 1, 0, .7)


CUES = [m_paradox, m_meal, m_title]


def MASTER_KEYS():
    # “变的，只是早餐”之前，整个配乐骤停半秒
    z = cue("D011", "只是")
    return [(0, 1), (ls("D011") - .1, 1), (ls("D011") + .15, 0), (z - .05, 0), (z + .05, 1), (DUR + 5, 1)]
