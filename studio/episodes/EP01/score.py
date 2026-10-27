# -*- coding: utf-8 -*-
"""EP01 一顿饭 v3 配乐（全片 s00–s18）。由 audio/score.py exec 载入，可直接用其中的 I/N/NS/arp/hit_add/sfx_* 等。
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
    hn = I("horn", 60, gain_db=1, send=.55)
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
    oh = I("orchhit", 55); oh.chord(t, NS("D3 A3 D4 F4"), 1.2, 100, 0)
    tm = I("timpani", 47); tm.n(t, N("D2"), 2.0, 108)
    hs = I("str_hi", 49, gain_db=-7, send=.6); hs.chord(t + .3, NS("D5 A5 D6"), se("s02_title") - t, 62)
    hs.auto += [(t, 0), (t + 1.2, 1), (se("s02_title") - .7, 1), (se("s02_title"), 0)]
    hn = I("horn_t", 60, gain_db=2, send=.55)
    hn.seq(t + 1.1, MOTIF, .42, 84)
    hit_add(sfx_chime(N("D6"), .14, 3.0), t + 3.5, 1, 0, .7)


# ======================================================================= 正片（s03–s18）
# 调性规划：第一章 d 小调（河 F 大调、早餐降 B → F）；第二章 a 小调（答案 F 大调）；
# 第三章 g 小调 → G 大调（新产品）→ 矛盾①解开转 D 大调；第四章 c 小调（冲进马桶）→ F 大调（非劣效）→ D 大调（一整条路）；
# 终章：冷开场的弦乐固定音型原样回来，在“并不矛盾”转 D 大调，《剂量》动机完整奏出。

def einout(u):
    u = min(1.0, max(0.0, u)); return 4 * u ** 3 if u < .5 else 1 - (-2 * u + 2) ** 3 / 2

def einv(f, y):
    lo, hi = 0.0, 1.0
    for _ in range(40):
        m = (lo + hi) / 2
        if f(m) < y: lo = m
        else: hi = m
    return (lo + hi) / 2

def seq_until(inst, t, notes, beat, vel, tend, legato=.95):
    """像 Inst.seq，但在 tend 处截断（不越过场景里的停顿/定格）"""
    for nm, bt in notes:
        if t >= tend - .05: break
        if nm is not None:
            d = min(bt * beat * legato, tend - t)
            for m in ([nm] if isinstance(nm, int) else ([N(nm)] if isinstance(nm, str) else nm)):
                inst.n(t, m, d, vel)
        t += bt * beat
    return t

def shared():
    """正片共用乐器（先在这里定好音量和混响发送）"""
    I("harp1", 46, gain_db=-5, send=.5); I("pizz", 45, gain_db=-4, send=.3); I("pizzbass", 45, gain_db=-3, send=.2)
    I("marimba", 12, gain_db=-6, send=.3); I("woodblock", 115, gain_db=-7, send=.2); I("glock", 9, gain_db=-9, send=.5)
    I("flute", 73, gain_db=-8, send=.6); I("clarinet", 71, gain_db=-2, send=.5); I("bassoon", 70, gain_db=-6, send=.4)
    I("bells", 14, gain_db=-3, send=.6); I("str_rise2", 48, gain_db=-4, send=.5)

def card_sting(a, root, chord, motif=None, big=1.0):
    """章节卡：反向渐强 → 冲击 + 定音鼓 + 低铜管 + 合唱；标题出现时一声钟"""
    t = a + .15
    hit_add(sfx_reverse_swell(1.1, N(root) + 24, .24 * big), t - 1.08, 1, 0, .5)
    hit_add(sfx_impact(.5 * big, 44, 3.0, int(a * 10) % 997), t, 1, 0, .4)
    I("timpani", 47).n(t, N(root), 1.8, int(min(118, 88 + 14 * big)))
    I("brass_low", 57).chord(t, [N(root) + 12, N(root) + 19], 2.1, int(min(104, 68 + 12 * big)))
    I("choir_card", 52, gain_db=-6, send=.7).chord(t + .05, NS(chord), 2.7, 64)
    I("str_card", 49, gain_db=-6, send=.6).chord(t, NS(chord), 2.8, 62)
    drum(t, 49, int(min(100, 56 + 22 * big)), kit=48, name="kit_orch")
    hit_add(sfx_chime(N(root) + 48, .1, 2.6), t + .45, 1, .15, .7)
    if motif: I("horn_card", 60, gain_db=0, send=.6).seq(t + .55, motif, .42, 72)

def stab(t, root, ch, vel=100, oh=True, imp=.35):
    """重音：定音鼓 + 低铜管五度 + 管弦齐奏"""
    I("timpani", 47).n(t, N(root), 1.4, vel)
    I("brass_low", 57).chord(t, [N(root) + 12, N(root) + 19], 1.2, max(40, vel - 22))
    if oh: I("orchhit", 55).chord(t, NS(ch), .7, max(40, vel - 12), 0)
    if imp: hit_add(sfx_impact(imp, 50, 2.0, int(t * 13) % 997), t, 1, 0, .35)

def braam(t, root, dur=4.0, g=.45):
    HITS.add(sfx_braam(N(root), dur, g), t); HSEND.add(sfx_braam(N(root), dur, g), t, .4)

def roll(t0, t1, root, v0=40, v1=96, step=.075):
    tm = I("timpani", 47); t = t0; k = 0; n = max(1, int((t1 - t0) / step))
    while t < t1 - .02: tm.n(t, N(root), .1, int(v0 + (v1 - v0) * k / n)); t += step; k += 1

def pulse_inv(t0, t1, prog, b=.6, name="inv", kick_from=1e9, hat_from=1e9, g=1.0):
    """调查律动（源自《监查者》）：合成拨弦 16 分 + 次低音 + 扫频铺底 + 轻 808"""
    bar = 4 * b; k = 0; tb = t0
    pad = I(name + "_pad", 95, gain_db=-11, send=.5)
    while tb < t1 - .05:
        ch = prog[k % len(prog)]
        for qn in range(16):
            tt = tb + qn * b / 4
            if tt >= t1 - .02: break
            synth_add(pluck(ch[qn % 3] + 12 * (qn // 8), .18, 2600, .062 * g), tt, 1, (-.3 if qn % 2 else .3), .25)
        synth_add(sub(ch[0] - 24, min(bar, t1 - tb) * .95, .14 * g), tb, 1, 0, 0)
        pad.chord(tb, ch, min(bar, t1 - tb), 54)
        for qn in range(4):
            tt = tb + qn * b
            if tt >= t1 - .02: break
            if tt >= kick_from and qn in (0, 2): drum(tt, 36, 66, kit=25, name='kit808', gain_db=-8)
            if tt >= hat_from: drum(tt + b / 2, 42, 40, kit=25, name='kit808', gain_db=-8)
        tb += bar; k += 1


# ---------------------------------------------------------------- 第一章 一条河
def m_key():
    shared()
    a, e = ss("s03_key"), se("s03_key")
    card_sting(a, "D2", "D3 A3 D4 F4", motif=[("D4", 1), ("A4", 2)])
    b = 60 / 84; q = b / 2; bar = 4 * b
    td = le("D015") + 1.0                 # 钥匙入锁
    st = cue("D017", "卡住了"); FZ = .6
    # 认识它：竖琴琶音 + 低弦（i – VI – iv – V）
    t0 = ls("D013") - .3
    prog = [NS("D3 F3 A3 D4"), NS("Bb2 D3 F3 Bb3"), NS("G2 Bb2 D3 G3"), NS("A2 C#3 E3 A3")]
    chs = [(t0 + k * bar, prog[k % 4]) for k in range(6)]
    arp(I("harp1", 46), t0, ls("D014") - .1, chs, q, 58, pattern=(0, 1, 2, 3, 2, 1, 2, 3))
    lo = I("c1_low", 49, gain_db=-4, send=.5)
    for tt, ch in chs:
        if tt < ls("D014") - .3: lo.chord(tt, [ch[0] - 12, ch[0]], min(bar, ls("D014") - tt) + .1, 60)
    I("celesta", 8).seq(cue("D013", "钥匙") - .1, [("A5", .5), ("D6", .5), ("F6", 1), ("E6", 2)], q, 52)
    # CYP17：红色的酶 —— 大提琴半音脉冲 + 小二度震音，雄激素流向癌细胞
    t14 = ls("D014") - .15; tg = cue("D014", "合成雄激素")
    dk = I("c1_dark", 49, gain_db=-4, send=.5); dk.chord(t14, NS("D2 A2 D3"), td - t14, 66)
    dk.auto += [(t14, 0), (t14 + 1.0, 1), (td - .1, 1), (td + .3, 0)]
    vc = I("c1_cello", 42, gain_db=-4, send=.3); t = t14; k = 0
    while t < td - .05:
        vc.n(t, [N("D2"), N("D2"), N("Eb2"), N("D2")][k % 4], q * .8, 82 if k % 2 == 0 else 64); t += q; k += 1
    tr = I("c1_trem", 44, gain_db=-5, send=.5); tr.chord(tg - .2, NS("D4 Eb4 A4"), td - tg + .2, 66)
    tr.auto += [(tg - .2, 0), (tg + .8, .5), (ls("D015"), .7), (td - .05, 1), (td + .05, 0)]
    # 燃料：太鼓心跳加速 → 入锁
    tk = I("taiko", 116); t = ls("D015"); gap = .9
    while t < td - .15:
        tk.n(t, N("C2"), .3, 70 + int(26 * (t - ls("D015")) / max(.1, td - ls("D015")))); t += gap; gap = max(.22, gap * .86)
    hit_add(sfx_riser(td - ls("D015"), 200, 3000, .3, 7), ls("D015"), 1, 0, .4)
    # 锁住：降 B 大调（VI）的光
    I("orchhit", 55).chord(td, NS("Bb2 F3 Bb3 D4"), .9, 102, 0); I("timpani", 47).n(td, N("Bb1"), 1.6, 108)
    drum(td, 49, 84, kit=48, name="kit_orch"); braam(td, "Bb1", 4.0, .38)
    lk = I("c1_lock", 49, gain_db=-3, send=.6); lk.chord(td, NS("Bb2 F3 Bb3 D4 F4"), ls("D016") - td + .9, 78)
    lk.auto += [(td, 1), (ls("D016") - .2, .8), (ls("D016") + .9, 0)]
    cl = I("c1_choir", 52, gain_db=-4, send=.7); cl.chord(td + .05, NS("Bb3 D4 F4"), ls("D016") - td + .7, 72)
    cl.auto += [(td, 0), (td + .4, 1), (ls("D016"), .8), (ls("D016") + .7, 0)]
    I("horn", 60).seq(td + .35, [("F4", .6), ("Bb4", .6), ("D5", 1.2)], 1.0, 80)
    # 17 年：时间线每过一年，马林巴上行一格；弦乐断奏推进
    c94, c11, c17 = cue("D016", "1994"), cue("D016", "2011"), cue("D016", "17")
    scale = NS("D4 E4 F4 G4 A4 Bb4 C5 D5 E5 F5 G5 A5 Bb5 C6 D6 E6 F6 A6")
    for i in range(18): I("marimba", 12).n(c94 + (c11 - c94) * einv(einout, i / 17), scale[i], .3, 58 + i)
    t16 = ls("D016") - .1
    pr16 = [(t16, NS("D3 F3 A3 D4")), (t16 + bar, NS("Bb2 D3 F3 Bb3")), (t16 + 2 * bar, NS("G2 Bb2 D3 G3"))]
    arp(I("c1_spic", 48, gain_db=-6, send=.35), t16, c17 - .05, pr16, q, 66, pattern=(0, 2, 1, 3, 2, 1, 3, 2), legato=.5)
    lo2 = I("c1_low2", 49, gain_db=-4, send=.5)
    for tt, ch in pr16:
        if tt < c17 - .2: lo2.chord(tt, [ch[0] - 12, ch[0]], min(bar, c17 - tt) + .05, 64)
    stab(c17, "D2", "D3 F#3 A3 D4", 102)
    yr = I("c1_year", 49, gain_db=-3, send=.6); yr.chord(c17, NS("D2 A2 D3 F#3 A3 D4"), ls("D017") - c17 + .3, 80)
    yr.auto += [(c17, 1), (ls("D017") - .3, .8), (ls("D017") + .3, 0)]
    I("horn_t", 60).seq(c17 + .25, [("D4", 1), ("A4", 1), ("F#4", 2)], .32, 82)
    # 卡住了：低音持续 + 震音渐强 → 定格（MASTER_KEYS 骤停）→ 坠落
    t17 = ls("D017") - .1
    dr = I("c1_drone", 49, gain_db=-4, send=.5); dr.chord(t17, NS("D2 A2 Eb3"), st - t17 + .05, 64)
    tr2 = I("c1_trem2", 44, gain_db=-1, send=.5); tr2.chord(t17 + .3, NS("A3 Bb3 D4"), st - t17 - .25, 60)
    tr2.auto += [(t17, .2), (st - .05, 1), (st, 0)]
    f0 = st + FZ
    hit_add(sfx_whoosh(e - f0 + 1.0, 3000, 120, .3, 17), f0, 1, 0, .4)
    fall = I("c1_fall", 42, gain_db=-4, send=.4)
    for i, m in enumerate(NS("A3 F3 D3 A2 F2 D2")): fall.n(f0 + i * (e - f0 + .6) / 6, m, .5, 80)


def m_river():
    a, e = ss("s04_river"), se("s04_river")
    spl = a + 1.0; tc = cue("D020", "几乎不溶")
    hit_add(sfx_impact(.35, 60, 2.0, 40), spl, 1, 0, .4)
    # 河：6/8 流动琶音（F – C – d – 降 B），竖琴 + 弦乐长音，长笛一句河的旋律
    e8 = .25; bar = 6 * e8; t0 = spl + .1
    prog = [NS("F2 C3 F3 A3 C4"), NS("C2 G2 C3 E3 G3"), NS("D2 A2 D3 F3 A3"), NS("Bb1 F2 Bb2 D3 F3")]
    nbar = int((tc - t0) / bar) + 1
    chs = [(t0 + k * bar, prog[(k // 2) % 4]) for k in range(nbar)]
    arp(I("harp1", 46), t0, tc - .05, [(tt, ch[1:]) for tt, ch in chs], e8, 62, pattern=(0, 1, 2, 3, 2, 1))
    pad = I("c1_river", 49, gain_db=-6, send=.6)
    for tt, ch in chs[::2]: pad.chord(tt, ch[:3], bar * 2 * 1.02, 58)
    pad.auto += [(t0, 0), (t0 + 1.5, 1), (tc - .1, 1), (tc + .1, 0)]
    seq_until(I("flute", 73), ls("D018") + .3, [("C5", 1.5), ("F5", 1.5), ("E5", .5), ("D5", .5), ("C5", 2), ("A4", 1), ("Bb4", 1), ("C5", 3)], .5, 66, tc)
    # 河水一刻不停：拨弦加进来
    pz = I("pizz", 45); t = ls("D019") - .1
    while t < tc - .05:
        cur = [c for c in chs if c[0] <= t + 1e-6][-1][1]
        pz.n(t, cur[1], e8 * .8, 76); pz.n(t + 3 * e8, cur[2], e8 * .8, 62); t += bar
    # 几乎不溶：低音钢琴的不协和 + 冷色长音；石子一颗颗沉底（钢琴下行）
    pn = I("piano", 0)
    pn.chord(tc, NS("D1 D2 Eb2 A2"), 2.5, 96); hit_add(sfx_impact(.3, 70, 1.5, 41), tc, 1, 0, .4)
    cold = I("c1_cold", 99, gain_db=-8, send=.6); cold.chord(tc + .1, NS("D3 A3 E4"), ls("D022") - tc + .3, 58)
    cold.auto += [(tc, 0), (tc + 1.2, 1), (ls("D022") - .1, 1), (ls("D022") + .3, 0)]
    hh = I("c1_harm", 49, gain_db=-5, send=.7); hh.chord(tc + .3, NS("A5 D6 E6"), ls("D022") - tc, 46)
    hh.auto += [(tc + .3, 0), (tc + 2, 1), (ls("D022") - .2, 1), (ls("D022") + .3, 0)]
    for i, m in enumerate(NS("A4 F4 E4 D4 C4 A3 F3 D3")): pn.n(ls("D021") + i * (le("D021") - ls("D021")) / 8, m, 1.4, 58 - i * 2)
    # 88%：震音 + 定音鼓滚奏 → 重音；“一大半”再落一下
    t88, t55 = cue("D022", "88"), cue("D022", "一大半")
    tr = I("c1_trem3", 44, gain_db=-1, send=.5); tr.chord(ls("D022") - .2, NS("D3 A3 D4"), t88 - ls("D022") + .3, 60)
    tr.auto += [(ls("D022") - .2, .3), (t88 - .05, 1), (t88 + .1, 0)]
    roll(t88 - 1.2, t88, "A1", 40, 92, .07)
    stab(t88, "D2", "D3 A3 D4 F4", 112)
    gl = I("c1_88", 49, gain_db=-4, send=.6); gl.chord(t88, NS("D2 A2 D3 F3"), e - t88, 72)
    gl.auto += [(t88, 1), (e - .6, .7), (e + .2, 0)]
    pn.chord(t55, NS("D3 F3 A3"), 2.0, 70); I("timpani", 47).n(t55, N("D2"), 1.2, 92)


def m_bile():
    a, e = ss("s05_bile"), se("s05_bile")
    t23 = ls("D023") - .2; tb = cue("D024", "胆囊收缩"); tmc = cue("D025", "胶束") - .6
    f0 = ls("D027"); ob = cue("D028", "观察")
    # 早餐来了：降 B → F 的日出（呼应“一顿饭”）
    st = I("c1_sun", 49, gain_db=-3, send=.6); cs = I("c1_sunch", 52, gain_db=-4, send=.7)
    st.chord(t23, NS("Bb2 F3 Bb3 D4"), tb - t23 + .4, 70); cs.chord(t23 + .3, NS("Bb3 D4 F4"), tb - t23 + .1, 64)
    for x in (st, cs): x.auto += [(t23, 0), (t23 + 1.0, 1), (tb + .2, 1), (tb + .6, 0)]
    for k, m in enumerate(NS("F4 A4 Bb4 D5 F5 A5 Bb5 D6")): I("harp1", 46).n(t23 + .2 + k * .06, m, 1.6, 78)
    # 胆汁涌入：圆号齐奏 + 弦乐上行 + 定音鼓
    I("timpani", 47).n(tb, N("F2"), 1.6, 104)
    I("c1_horns", 60, gain_db=-4, send=.55).chord(tb, NS("F3 A3 C4 F4"), 2.4, 84)
    sw = I("c1_bile", 48, gain_db=-4, send=.5)
    for i, m in enumerate(NS("F3 G3 A3 Bb3 C4 D4 E4 F4")): sw.n(tb - .6 + i * .09, m, .25, 70 + i * 3)
    # 渡船：96 bpm 轻快进行（F – C – d – 降 B）
    b = 60 / 96; bar = 4 * b; t0 = tb + .4
    prog = [NS("F2 C3 F3 A3"), NS("C2 G2 C3 E3"), NS("D2 A2 D3 F3"), NS("Bb1 F2 Bb2 D3")]
    pb, pz = I("pizzbass", 45), I("pizz", 45); wp = I("c1_ferry", 49, gain_db=-6, send=.55)
    k = 0
    while t0 + k * bar < f0 - .1:
        ch = prog[k % 4]; tbar = t0 + k * bar
        wp.chord(tbar, ch[1:], min(bar, f0 - tbar) * 1.02, 58)
        for qn in range(4):
            tt = tbar + qn * b
            if tt >= f0 - .05: break
            if qn in (0, 2): pb.n(tt, ch[0] + (7 if qn == 2 else 0), b * .7, 78)
            else: pz.chord(tt, ch[2:], b * .5, 58)
        k += 1
    wp.auto += [(t0, 0), (t0 + bar, 1), (f0 - .1, 1), (f0 + .25, 0)]
    gk = I("glock", 9)
    for i, m in enumerate(NS("F6 A6 C7 F6 A6 C7 E7 C7 A6 F6")): gk.n(tmc + i * .14, m, .4, 54)
    t_mel = t0 + bar * max(1, round((ls("D026") - t0) / bar))
    seq_until(I("clarinet", 71), t_mel, [("C5", 1), ("A4", .5), ("Bb4", .5), ("C5", 1), ("F5", 1), ("E5", 1.5), ("D5", .5), ("C5", 2),
                                          ("D5", 1), ("C5", .5), ("Bb4", .5), ("A4", 1), ("G4", 1), ("F4", 3)], b, 74, f0)
    for i in range(9):
        tt = ls("D026") + 2.0 + i * .45 + float(R.uniform(-.1, .1))
        if tt < f0 - .1: hit_add(sfx_chime(int(R.choice(NS("F6 G6 A6 C7 D7"))), .05, 1.6), tt, 1, float(R.uniform(-.5, .5)), .6)
    # 定格：暖色退场，只剩悬置的高音和低音；三个假说各一声钢琴
    fz = I("c1_freeze", 49, gain_db=-6, send=.7); fz.chord(f0 - .05, NS("G5 D6"), ob - f0 + .2, 50)
    fz.auto += [(f0 - .05, 0), (f0 + .6, 1), (ob - .1, 1), (ob + .1, 0)]
    dn = I("c1_fdrone", 49, gain_db=-5, send=.5); dn.chord(f0, NS("D2 A2"), ob - f0 + .1, 60)
    dn.auto += [(f0, 0), (f0 + .8, 1), (ob - .05, 1), (ob + .05, 0)]
    pn = I("piano", 0)
    for tt, m in [(ls("D027") + .1, "D5"), (cue("D027", "胃排空"), "F5"), (cue("D027", "停留更久"), "E5")]:
        pn.n(tt, N(m), 1.6, 66); pn.n(tt, N(m) - 12, 1.6, 50)
    for k, m in enumerate(NS("D4 F4 A4 C5 D5")): I("harp1", 46).n(ls("D028") + .6 + k * .3, m, 1.2, 60)
    # 观察 ≠ 机制
    hit_add(sfx_reverse_swell(1.0, N("D3"), .3), ob - 1.0, 1, 0, .5)
    stab(ob, "D2", "D3 A3 D4 F4", 116); braam(ob, "D2", 4.0, .36)
    oc = I("c1_obs", 52, gain_db=-4, send=.7); oc.chord(ob, NS("D3 A3 D4 F4"), e - ob + .5, 76)
    os_ = I("c1_obs_s", 49, gain_db=-3, send=.6); os_.chord(ob, NS("D2 A2 D3 F3 A3"), e - ob + .5, 80)
    for x in (oc, os_): x.auto += [(ob, 1), (e - .8, .8), (e + .2, 0)]


# ---------------------------------------------------------------- 第二章 十倍与两倍
INV_A = [NS("A3 C4 E4"), NS("F3 A3 C4"), NS("D3 F3 A3"), NS("E3 G#3 B3")]

def m_idcard():
    a, e = ss("s06_idcard"), se("s06_idcard")
    card_sting(a, "A1", "A2 E3 A3 C4", motif=[("A3", 1), ("E4", 2)])
    T0 = le("D032") + .6
    # 调查律动从“身份证”一直走到投票倒计时
    pulse_inv(ls("D029") - .3, T0 - .25, INV_A, .6, "inv", kick_from=cue("D030", "ZYTIGA"), hat_from=ls("D031"))
    lo = I("c2_low", 49, gain_db=-6, send=.5); lo.chord(ls("D029") - .3, NS("A1 E2"), T0 - ls("D029"), 60)
    lo.auto += [(ls("D029") - .3, 0), (ls("D029") + .8, 1), (T0 - .4, 1), (T0 - .1, 0)]
    whoosh_t = cue("D029", "身份证")
    I("bells", 14).n(whoosh_t + .1, N("E5"), 2.0, 70)
    for i, kw in enumerate(["ZYTIGA", "单次", "健康志愿者", "825"]):
        I("celesta", 8).n(cue("D030", kw), NS("E5 A5 C6 E6")[i], .7, 62)
    tr = cue("D031", "峰浓度")
    stab(tr, "A1", "A2 E3 A3 C4", 104)
    I("horn", 60).seq(tr + .1, [("E4", .5), ("A4", 1.5)], .5, 80)


def m_vote():
    a, e = ss("s07_vote"), se("s07_vote")
    T0 = le("D032") + .6; T1 = e - .4; sd = (T1 - T0) / 8
    # 问题：换成真正的患者 → 悬置和弦
    tq = cue("D032", "影响")
    sus = I("c2_sus", 49, gain_db=-5, send=.6); sus.chord(tq - .2, NS("E2 B2 E3 A3 B3"), T0 - tq + .2, 66)
    sus.auto += [(tq - .2, 0), (tq + .6, 1), (T0 - .2, 1), (T0 + .1, 0)]
    I("celesta", 8).seq(tq, [("E5", .5), ("A5", .5), ("B5", 2)], .4, 60)
    # 倒计时 8 拍：木鱼 + 低音 E 持续 + 平行五度半音爬升 + 后半太鼓
    wb, lo, tk = I("woodblock", 115), I("c2_cd", 48, gain_db=-4, send=.4), I("taiko", 116)
    trm = I("c2_cdtr", 44, gain_db=-5, send=.5)
    for j in range(8):
        tj = T0 + j * sd
        wb.n(tj, N("E5") if j % 2 == 0 else N("B4"), .1, 86)
        for h in range(2): lo.n(tj + h * sd / 2, N("E2"), sd / 2 * .8, 70 + j * 4)
        if j >= 3: tk.n(tj, N("C2"), .3, 66 + j * 6)
        trm.chord(tj, [N("E3") + j, N("B3") + j], sd * 1.02, 56 + j * 5)
    trm.auto += [(T0, .4), (T1 - .05, 1), (T1, 0)]
    hit_add(sfx_riser(sd * 3, 300, 4000, .3, 23), T1 - sd * 3, 1, 0, .4)


def m_answer():
    a, e = ss("s08_answer"), se("s08_answer")
    t33 = ls("D033")
    # 答案 C：意料之外的明亮（F 大调）
    stab(t33, "F2", "F3 A3 C4 F4", 114); drum(t33, 49, 96, kit=48, name="kit_orch")
    hit_add(sfx_chime(N("C7"), .14, 2.5), t33 + .02, 1, .3, .6)
    I("c2_ans", 61, gain_db=-5, send=.5).chord(t33, NS("F3 A3 C4 F4"), 1.8, 92)
    I("c2_ansch", 52, gain_db=-5, send=.7).chord(t33 + .05, NS("A3 C4 F4"), 2.2, 72)
    # 第二张身份证：律动回来（F – C – a – G）
    t2x = cue("D034", "2倍")
    pulse_inv(ls("D034") - .2, ls("D037") + .2, [NS("F3 A3 C4"), NS("C3 E3 G3"), NS("A2 C3 E3"), NS("G2 B2 D3")], .6, "inv2",
              kick_from=t2x, hat_from=ls("D035"))
    for i, kw in enumerate(["连续七天", "患者", "高脂餐"]): I("celesta", 8).n(cue("D034", kw), NS("C6 E6 G6")[i], .8, 62)
    stab(t2x, "F2", "F3 C4 F4 A4", 100, oh=False)
    I("horn", 60).seq(t2x + .1, [("C4", .5), ("F4", 1.5)], .5, 84)
    # 全都是真的：三连击，三个向上的和弦（呼应冷开场“全 · 是 · 真”）
    for i, (kw, chd, root) in enumerate([("十七倍", "A2 E3 A3 C4", "A1"), ("十倍", "F2 C3 F3 A3", "F1"), ("两倍", "C3 G3 C4 E4", "C2")]):
        tt = cue("D035", kw)
        I("orchhit", 55).chord(tt, NS(chd), .7, 100 + i * 8, 0); I("timpani", 47).n(tt, N(root), 1.0, 110 + i * 4)
    # 三条连线：竖琴上行刮奏
    for i, kw in enumerate(["谁在吃", "吃几次", "量的是什么"]):
        tt = cue("D036", kw) - .1
        for k, m in enumerate(NS("C4 E4 G4 C5 E5 G5")): I("harp1", 46).n(tt + k * .05, m + i * 2, .9, 70)
    lnk = I("c2_link", 49, gain_db=-5, send=.6); lnk.chord(ls("D036"), NS("C3 G3 C4 E4"), le("D036") - ls("D036") + .6, 64)
    lnk.auto += [(ls("D036"), 0), (ls("D036") + .8, 1), (le("D036") + .2, 1), (le("D036") + .7, 0)]
    # 误用：倍数离开身份证 → 变红、失真
    t37 = ls("D037"); tred = t37 + 1.2
    hit_add(sfx_reverse_swell(1.2, N("A2"), .3), t37 + .1, 1, 0, .5)
    mis = I("c2_mis", 49, gain_db=-4, send=.6); mis.chord(t37 + .1, NS("A2 Bb2 E3"), e - t37, 70)
    mis.auto += [(t37, 0), (t37 + 1.0, 1), (e - .5, 1), (e + .2, 0)]
    trm = I("c2_mistr", 44, gain_db=-4, send=.5); trm.chord(tred, NS("A3 Bb3 Eb4"), e - tred, 72)
    trm.auto += [(tred, .3), (tred + 1.0, 1), (e, 0)]
    braam(tred + .1, "A1", 4.0, .45); I("brass_low", 57).chord(tred + .1, NS("A2 Bb2"), 2.0, 96)


# ---------------------------------------------------------------- 第三章 磨碎的分子
def m_mill():
    a, e = ss("s09_mill"), se("s09_mill")
    card_sting(a, "G1", "G2 D3 G3 Bb3", motif=[("G3", 1), ("D4", 2)])
    tf = cue("D038", "磨得更细"); tks = [tf - .2 + (k - .2) * .55 for k in range(1, 5)]
    ty = cue("D039", "YONSA") - .1; t500 = cue("D039", "500")
    # 晶体：冷色晶莹长音 + g 小调低弦 + 竖琴慢琶音（“既然它溶不开……”）
    cr = I("c3_crys", 98, gain_db=-3, send=.6); cr.chord(a + 2.6, NS("G3 D4 A4"), tf - a - 2.4, 56)
    cr.auto += [(a + 2.6, 0), (a + 3.8, 1), (tf, 1), (tf + .3, 0)]
    t38 = ls("D038") - .3
    th = I("c3_think", 49, gain_db=-4, send=.55); th.chord(t38, NS("G2 D3 Bb3"), tks[0] - t38 + .3, 64)
    th.auto += [(t38, 0), (t38 + 1.0, 1), (tks[0], 1), (tks[0] + .3, 0)]
    arp(I("harp1", 46), t38 + .2, tks[0] - .05, [(0, NS("G3 Bb3 D4 F#4"))], 60 / 84 / 2, 56, pattern=(0, 1, 2, 1, 3, 2, 1, 2))
    # 四级碎裂：每一级更高、更亮；弦乐 16 分音符一路推到压片
    lv = [NS("G2 D3 G3"), NS("Bb2 F3 Bb3"), NS("D3 A3 D4"), NS("G3 D4 G4 Bb4")]
    for k, tk_ in enumerate(tks):
        I("piano", 0).chord(tk_, lv[k], 1.0, 84 + k * 6); I("pizz", 45).chord(tk_, [m + 12 for m in lv[k][:2]], .3, 90)
        I("celesta", 8).n(tk_ + .02, lv[k][-1] + 24, .6, 70)
    I("timpani", 47).n(tks[0], N("G1"), 1.0, 100)
    b16 = 60 / 112 / 4
    gm = [(tks[0], NS("G3 Bb3 D4")), (tks[1], NS("Eb3 G3 Bb3")), (tks[2], NS("C3 Eb3 G3")), (tks[3], NS("D3 F#3 A3"))]
    rs = I("c3_run", 48, gain_db=-3, send=.4)
    arp(rs, tks[0], ty - .02, gm, b16, 70, pattern=(0, 1, 2, 1), legato=.8)
    rs.auto += [(tks[0], .5), (ty - .1, 1), (ty, 0)]
    hit_add(sfx_riser(ty - tks[0], 300, 5000, .3, 31), tks[0], 1, 0, .4)
    # 压成 YONSA：G 大调齐奏 + 钟；“每天 500 毫克”钢片琴
    stab(ty, "G1", "G2 D3 G3 B3 D4", 116); drum(ty, 49, 100, kit=48, name="kit_orch")
    tsb = cue("D040", "都可以") - .1 + .2
    gs = I("c3_g", 49, gain_db=-3, send=.6); gs.chord(ty, NS("G2 D3 G3 B3 D4"), tsb - ty + .3, 78)
    gc = I("c3_gch", 52, gain_db=-4, send=.7); gc.chord(ty + .05, NS("B3 D4 G4"), tsb - ty + .2, 72)
    for x in (gs, gc): x.auto += [(ty, 1), (ls("D040") - .3, .8), (tsb - .3, .6), (tsb + .2, 0)]
    I("celesta", 8).seq(t500, [("G5", .5), ("B5", .5), ("D6", 1), ("B5", .5), ("C6", .5), ("A5", 1), ("G5", 2)], .3, 62)
    t = ls("D040"); k = 0                                   # 说明书那句：拨弦轻轻走着
    while t < tsb - .15: I("pizz", 45).n(t, [N("G3"), N("D4"), N("B3"), N("D4")][k % 4], .25, 62); t += 60 / 96; k += 1
    # 第二张卡飞回 + 印章“随餐均可”（与冷开场同一个降 B 根音）
    hp = I("harp1", 46)
    for k, m in enumerate(NS("Bb3 D4 F4 Bb4 D5 F5")): hp.n(ls("D040") - .1 + k * .05, m, 1.2, 70)
    stab(tsb, "Bb1", "Bb2 F3 Bb3 D4", 112)
    bb = I("c3_bb", 49, gain_db=-4, send=.6); bb.chord(tsb, NS("Bb2 F3 Bb3 D4"), e - tsb + .3, 74)
    bb.auto += [(tsb, 1), (e - .5, .8), (e + .3, 0)]


def m_bars():
    a, e = ss("s10_bars"), se("s10_bars")
    t65, t44, tok = cue("D042", "6.5"), cue("D042", "4.4"), cue("D043", "允许随餐")
    # 测量：马林巴 8 分音符（e – C – G – D），低弦铺底
    b = 60 / 92; bar = 4 * b; t0 = a + .2
    prog = [NS("E3 G3 B3"), NS("C3 E3 G3"), NS("G2 B2 D3"), NS("D3 F#3 A3")]
    chs = [(t0 + k * bar, prog[k % 4]) for k in range(int((e - t0) / bar) + 1)]
    arp(I("marimba", 12), t0, e - .3, chs, b / 2, 56, pattern=(0, 1, 2, 1))
    lo = I("c3_low", 49, gain_db=-6, send=.5)
    for tt, ch in chs:
        if tt < e - .5: lo.chord(tt, [ch[0] - 12, ch[0]], min(bar, e - tt) * 1.02, 58)
    lo.auto += [(t0, 0), (t0 + 1.2, 1), (e - .8, 1), (e + .3, 0)]
    # 但这不等于没有作用
    hit_add(sfx_reverse_swell(.9, N("E3"), .22), ls("D041") - .8, 1, 0, .5)
    I("timpani", 47).n(ls("D041") + .1, N("E2"), 1.2, 84)
    # 两根光柱升起：弦乐上行 + 柱顶一声钟
    for tt, top in [(t65, "B5"), (t44, "G5")]:
        for i, m in enumerate(NS("E4 F#4 G4 A4 B4 C5 D5 E5")): I("str_rise2", 48).n(tt + i * .1, m, .2, 64 + i * 4)
        hit_add(sfx_chime(N(top) + 12, .1, 2.0), tt + .9, 1, .3, .6)
    # 只是小得多 → 依据框：圆号柔和的 G 大调
    I("horn", 60).chord(tok, NS("G3 B3 D4"), 2.2, 70)
    hit_add(sfx_chime(N("D6"), .08, 2.2), tok + .1, 1, -.2, .6)


def m_twins():
    a, e = ss("s11_twins"), se("s11_twins")
    solve = cue("D045", "解开了"); c2, c3 = cue("D045", "不属于"), cue("D045", "具体的产品")
    # 屏障：低音持续 + 拨弦，紧张
    dr = I("c3_bar", 49, gain_db=-5, send=.5); dr.chord(a + .2, NS("E2 B2 F3"), solve - a, 64)
    dr.auto += [(a + .2, 0), (a + 1.2, 1), (solve - .2, 1), (solve + .1, 0)]
    b = 60 / 96; t = a + .3; k = 0
    while t < ls("D045") - .2: I("pizz", 45).n(t, [N("E3"), N("F3"), N("E3"), N("B2")][k % 4], b * .5, 64); t += b; k += 1
    # 两次“互换”撞上屏障
    for t0 in [cue("D044", "不能") - .4, cue("D044", "互换") - .2]:
        tt = t0 + .7
        I("orchhit", 55).chord(tt, NS("E3 F3 B3"), .5, 96, 0); I("timpani", 47).n(tt, N("E2"), .9, 100)
        hit_add(sfx_impact(.3, 64, 1.5, int(tt * 7)), tt, 1, 0, .35)
    # 矛盾①：小二度震音 → 解开，转 D 大调
    tr = I("c3_tr", 44, gain_db=-5, send=.5); tr.chord(ls("D045") - .1, NS("E4 F4 B4"), solve - ls("D045") + .2, 64)
    tr.auto += [(ls("D045") - .1, .3), (solve - .05, 1), (solve + .05, 0)]
    for k, m in enumerate(NS("D4 F#4 A4 D5 F#5 A5 D6")): I("harp1", 46).n(solve + k * .05, m, 1.6, 80)
    hit_add(sfx_chime(N("A6"), .14, 3.0), solve + .05, 1, 0, .7)
    I("timpani", 47).n(solve, N("D2"), 1.4, 104)
    ds = I("c3_d", 49, gain_db=-3, send=.6); ds.chord(solve, NS("D2 A2 D3 F#3 A3"), e - solve + .4, 76)
    dc = I("c3_dch", 52, gain_db=-4, send=.7); dc.chord(solve + .1, NS("D4 F#4 A4"), e - solve + .3, 70)
    for x in (ds, dc): x.auto += [(solve, 0), (solve + .5, 1), (e - .7, .9), (e + .3, 0)]
    I("horn", 60).seq(c2 - .1, [("D4", 1), ("A4", 1), ("G4", .5), ("F#4", .5), ("E4", 1), ("D4", 2)], .36, 82)
    stab(c3, "D2", "D3 F#3 A3 D4", 100, oh=False)


# ---------------------------------------------------------------- 第四章 四分之一
def m_toilet():
    a, e = ss("s12_toilet"), se("s12_toilet")
    card_sting(a, "C2", "C3 G3 C4 Eb4", motif=[("C4", 1), ("G4", 2)])
    t88 = cue("D046", "88"); tflush = cue("D047", "冲进马桶"); t49 = ls("D049"); tsw = cue("D049", "换掉")
    # 第三张卡（¼）落下：钢琴一声（冷开场的第三个根音 A），低弦托住，定音鼓滚向 88%
    I("piano", 0).chord(ls("D046") - .1, NS("A2 E3 A3"), 1.6, 76)
    pre = I("c4_pre", 49, gain_db=-4, send=.55); pre.chord(ls("D046") - .3, NS("A1 E2 A2 C3"), t88 - ls("D046") + .6, 64)
    pre.auto += [(ls("D046") - .3, 0), (ls("D046") + .6, 1), (t88 - .1, 1), (t88 + .3, 0)]
    I("celesta", 8).seq(ls("D046") + .4, [("E6", .5), ("A5", .5), ("C6", 2)], .45, 52)
    roll(t88 - 1.0, t88, "C2", 36, 84, .075)
    # 88%：漩涡 —— 低音 C、震音半音下行、竖琴环形琶音
    stab(t88, "C2", "C3 G3 C4 Eb4", 104, oh=False)
    vx = I("c4_vort", 44, gain_db=-2, send=.55)
    for i, m in enumerate(NS("G4 F#4 F4 E4 Eb4 D4")): vx.chord(t88 + i * 1.2, [N("C4"), m], 1.25, 60)
    vx.auto += [(t88, 0), (t88 + 1.0, 1), (ls("D047") + 2, 1), (ls("D047") + 3, 0)]
    arp(I("harp1", 46), t88 + .2, ls("D047") + .2, [(0, NS("C4 Eb4 G4 C5"))], .11, 52, pattern=(0, 1, 2, 3, 2, 1))
    # 2011 那篇文章：c 小调的讽刺拨弦行进（104 bpm）+ 大管断奏
    b = 60 / 104; t0 = ls("D047") - .1
    walk = NS("C2 G2 Ab2 G2 C2 Eb2 F2 G2")
    t = t0; k = 0; pb = I("pizzbass", 45)
    while t < t49 - .25:
        pb.n(t, walk[k % 8], b * .6, 80); t += b; k += 1
    bn = I("bassoon", 70)
    for tt in [ls("D047") + 1.0, ls("D047") + 1.0 + 4 * b]:
        seq_until(bn, tt, [("C3", .5), ("Eb3", .5), ("G3", .5), ("Ab3", .5), ("G3", 1)], b, 72, t49 - .3)
    lo = I("c4_low", 49, gain_db=-5, send=.5); lo.chord(t0, NS("C2 G2"), t49 - t0, 62)
    lo.auto += [(t0, 0), (t0 + .8, 1), (t49 - .4, 1), (t49 - .1, 0)]
    # “冲进马桶”：刺耳的铜管 + 镲 + 竖琴下滑
    I("c4_harsh", 61, gain_db=-4, send=.45).chord(tflush, NS("C3 Db3 G3 C4"), 1.0, 104)
    I("timpani", 47).n(tflush, N("C2"), 1.2, 112); drum(tflush, 49, 96, kit=48, name="kit_orch")
    for k, m in enumerate(NS("C6 G5 Eb5 C5 G4 Eb4 C4 G3")): I("harp1", 46).n(tflush + .05 + k * .05, m, .8, 74)
    # 2018 摘要高亮
    I("glock", 9).n(ls("D048") + 1.1, N("G6"), .6, 64)
    # 能不能反过来：转 C 大调，钢片琴 + 竖琴 + 高音弦；药片化成光飞向餐盘
    rv = I("c4_rev", 49, gain_db=-5, send=.65); rv.chord(t49 - .1, NS("C3 G3 C4 E4"), e - t49 + .3, 64)
    rv.auto += [(t49 - .1, 0), (t49 + 1.0, 1), (e - .6, 1), (e + .3, 0)]
    arp(I("celesta", 8), t49 + .1, tsw - .1, [(0, NS("C5 E5 G5 C6"))], .2, 50, pattern=(0, 1, 2, 3))
    for k, m in enumerate(NS("C4 E4 G4 C5 E5 G5 C6 E6")): I("harp1", 46).n(tsw + k * .12, m, 1.2, 70)
    hit_add(sfx_reverse_swell(1.2, N("C4"), .2), tsw - .2, 1, 0, .5)
    tq = tsw + .8
    sq = I("c4_q", 49, gain_db=-4, send=.6); sq.chord(tq, NS("F3 C4 G4"), e - tq + .3, 66)
    sq.auto += [(tq, 0), (tq + .4, 1), (e - .4, 1), (e + .3, 0)]
    hit_add(sfx_chime(N("G6"), .1, 2.6), tq, 1, 0, .7)


def m_trial():
    a, e = ss("s13_trial"), se("s13_trial")
    ts = ls("D051") - .1; tb2 = cue("D051", "另一组"); nb = cue("D052", "不劣于"); t52 = ls("D052")
    # 72 个光点：拨弦/钢片琴的上行瀑布（每三点一音）
    pent = NS("F4 G4 A4 C5 D5 F5 G5 A5 C6 D6 F6 G6")
    for i in range(24): I("celesta", 8).n(ls("D050") + i * 3 * .02, pent[i // 2], .4, 48 + i)
    # 试验律动：96 bpm 弦乐断奏（d – 降 B – F – C）
    b = 60 / 96; bar = 4 * b; t0 = ls("D050") + .4; t1 = t52 + .3
    prog = [NS("D3 F3 A3 D4"), NS("Bb2 D3 F3 Bb3"), NS("F2 A2 C3 F3"), NS("C3 E3 G3 C4")]
    chs = [(t0 + k * bar, prog[k % 4]) for k in range(int((t1 - t0) / bar) + 1)]
    sp = I("c4_spic", 48, gain_db=-4, send=.35)
    arp(sp, t0, t1, chs, b / 2, 64, pattern=(0, 2, 1, 3, 2, 1, 3, 2), legato=.5)
    sp.auto += [(t0, .6), (ts, .8), (ts + 1.4, 1), (t1 - .1, 1), (t1 + .2, 0)]
    lo = I("c4_tlow", 49, gain_db=-5, send=.5)
    for tt, ch in chs: lo.chord(tt, [ch[0] - 12, ch[0]], min(bar, t1 - tt) + .05, 60)
    lo.auto += [(t0, 0), (t0 + 1, 1), (t1 - .2, 1), (t1 + .3, 0)]
    tk = I("taiko", 116); t = ts
    while t < t1 - .1: tk.n(t, N("C2"), .3, 72); tk.n(t + 2.5 * b, N("C2"), .3, 56); t += bar
    hit_add(sfx_riser(1.4, 400, 4000, .25, 41), ts, 1, 0, .4)
    I("timpani", 47).n(ts + 1.4, N("D2"), 1.0, 96)
    I("celesta", 8).n(tb2, N("F6"), .8, 66)
    # PSA 下降：小提琴下行 + 合唱 F 大调；“不劣于”圆号奏出动机（F 大调）
    vn = I("c4_vn", 48, gain_db=-1, send=.55)
    for i, m in enumerate(NS("C6 A5 F5 D5 C5 A4")): vn.n(t52 + .5 + i * .42, m, .6, 70)
    ch_ = I("c4_ch", 52, gain_db=-5, send=.7); ch_.chord(t52 + .4, NS("F3 A3 C4"), e - t52, 66)
    ch_.auto += [(t52 + .4, 0), (t52 + 1.4, 1), (e - .5, 1), (e + .3, 0)]
    stab(nb, "F2", "F3 A3 C4 F4", 102, oh=False)
    I("horn", 60).seq(nb + .1, [("F4", 1), ("C5", 1), ("Bb4", .5), ("A4", .5), ("G4", 1), ("F4", 2)], .36, 84)
    fs = I("c4_f", 49, gain_db=-3, send=.6); fs.chord(nb, NS("F2 C3 F3 A3 C4"), e - nb + .6, 76)
    fs.auto += [(nb, 1), (e - .4, .9), (e + .5, 0)]


GATE_KW = ["更多的患者", "更长的时间", "生存", "安全", "监管审评"]

def m_road():
    a, e = ss("s14_road"), se("s14_road")
    t53, t54, t55, t56 = ls("D053"), ls("D054"), ls("D055"), ls("D056")
    gates = [cue("D055", g) for g in GATE_KW]; arr = t56 + 1.6; tne = cue("D056", "不是")
    # 结论只到这里：钢琴单音 + 低弦；“一个指标 · 十二周”一声管钟
    hit_add(sfx_reverse_swell(1.0, N("D3"), .2), a, 1, 0, .5)
    pn = I("piano", 0)
    for i, m in enumerate(NS("D4 F4 A4 E4")): pn.n(t53 + .2 + i * 1.3, m, 1.6, 56)
    so = I("c4_sober", 49, gain_db=-6, send=.55); so.chord(t53 - .2, NS("D2 A2 F3"), t54 - t53 + .4, 60)
    so.auto += [(t53 - .2, 0), (t53 + 1, 1), (t54, 1), (t54 + .6, 0)]
    I("bells", 14).n(cue("D053", "一个指标"), N("D5"), 2.5, 74); I("timpani", 47).n(cue("D053", "一个指标"), N("D2"), 1.2, 84)
    pn.chord(cue("D053", "长期疗效"), NS("Bb2 F3 D4"), 2.0, 60)
    # 一整条路：D 大调的展开（D – A/C# – b – G），渐强
    rd = [(t54 - .1, NS("D2 A2 D3 F#3 A3")), (t54 + 1.3, NS("C#2 A2 C#3 E3 A3")), (t54 + 2.6, NS("B1 F#2 B2 D3 F#3")), (t54 + 3.9, NS("G1 D2 G2 B2 D3"))]
    sw = I("c4_road", 49, gain_db=-3, send=.6); swc = I("c4_roadch", 52, gain_db=-4, send=.7); swb = I("c4_roadbr", 61, gain_db=-6, send=.5)
    for tt, ch in rd:
        sw.chord(tt, ch, 1.35, 78); swc.chord(tt, ch[2:], 1.35, 70); swb.chord(tt, ch[1:4], 1.3, 72)
    for x in (sw, swc, swb): x.auto += [(t54 - .1, .35), (t55 - .2, 1), (t55 + .2, 1), (t55 + .6, 0)]
    hit_add(sfx_riser(t55 - t54, 200, 4000, .3, 51), t54, 1, 0, .4)
    # 五道门：120 bpm 16 分弦乐 + 太鼓；每道门一记铜管，音高一级级往上
    b = .5; s16 = b / 4; tA, tB = t55 - .5, arr
    gchs = [(tA, NS("D3 F#3 A3")), (gates[1] - .1, NS("E3 G3 B3")), (gates[2] - .1, NS("F#3 A3 D4")), (gates[3] - .1, NS("G3 B3 D4")), (gates[4] - .1, NS("A3 C#4 E4"))]
    run = I("c4_run", 48, gain_db=-3, send=.4); arp(run, tA, tB - .05, gchs, s16, 74, pattern=(0, 1, 2, 1), legato=.8)
    run.auto += [(tA, .6), (gates[4], 1), (tB - .1, 1), (tB, 0)]
    tk = I("taiko", 116); t = tA; k = 0
    while t < tB - .05:
        tk.n(t, N("C2"), .3, 92 if k % 4 == 0 else 66); t += b; k += 1
    gtop = NS("D4 E4 F#4 G4 A4")
    for i, tg in enumerate(gates):
        I("c4_gate", 61, gain_db=-4, send=.5).chord(tg, [gtop[i], gtop[i] + (4 if i in (0, 3, 4) else 3), gtop[i] + 7], .8, 96 + i * 4)
        I("timpani", 47).n(tg, [N("D2"), N("E2"), N("F#2"), N("G2"), N("A2")][i], .9, 104 + i * 3)
        drum(tg, 49 if i % 2 == 0 else 57, 76 + i * 6, kit=48, name="kit_orch")
    roll(gates[4] + .3, arr, "A1", 50, 104, .07)
    # 抵达说明书：D 大调全奏；“研究的结论 ≠ 说明书的写法”落在降 B（阻碍终止）
    stab(arr, "D2", "D3 A3 D4 F#4", 120); braam(arr, "D2", 4.5, .4); drum(arr, 49, 108, kit=48, name="kit_orch")
    big = I("c4_arr", 49, gain_db=-2, send=.6); bc = I("c4_arrch", 52, gain_db=-3, send=.7)
    big.chord(arr, NS("D2 A2 D3 F#3 A3 D4"), tne - arr + .3, 84); bc.chord(arr, NS("D3 F#3 A3 D4"), tne - arr + .3, 78)
    for x in (big, bc): x.auto += [(arr, 1), (tne - .3, .85), (tne + .1, 0)]
    I("horn_t", 60).seq(arr + .3, [("D4", 1), ("A4", 1), ("G4", .5), ("F#4", .5), ("E4", 1), ("D4", 2)], .4, 88)
    stab(tne, "Bb1", "Bb2 F3 Bb3 D4", 108)
    nb_ = I("c4_neq", 49, gain_db=-3, send=.6); nb_.chord(tne, NS("Bb1 F2 Bb2 D3 F3"), e - tne + .5, 78)
    nb_.auto += [(tne, 1), (e - .5, .8), (e + .3, 0)]


# ---------------------------------------------------------------- 终章 三句真话
def m_finale():
    a, e = ss("s15_finale"), se("s15_finale")
    card_sting(a, "D2", "D3 A3 D4 F4", motif=[("D4", 1), ("A4", 1), ("F4", 2)], big=1.3)
    t57 = ls("D057"); solve = cue("D061", "并不矛盾"); tq = cue("D061", "三个不同的问题"); t62 = ls("D062")
    hl = [cue("D058", "ZYTIGA"), cue("D059", "YONSA"), cue("D060", "一项研究")]
    # 三张卡回来：冷开场的弦乐固定音型原样回来（100 bpm）
    b = 60 / 100; q = b / 2
    sp, bass, tk = I("c5_spic", 48, gain_db=-5, send=.35), I("cello", 42), I("taiko", 116)
    prog = [(t57 - .1, NS("D3 F3 A3")), (hl[1] - .1, NS("Bb2 D3 F3")), (hl[2] - .1, NS("G2 Bb2 D3")), (cue("D060", "12") - .2, NS("A2 C#3 E3"))]
    pat = [0, 0, 1, 0, 2, 0, 1, 0]; t = t57 - .1; k = 0; t1 = solve - .45
    while t < t1 - 1e-6:
        cur = [c for c in prog if c[0] <= t + 1e-6][-1][1]
        sp.n(t, cur[pat[k % 8]] + 12, q * .55, 74 if k % 2 == 0 else 58)
        if k % 4 == 0: bass.n(t, cur[0] - 12 if cur[0] > N("C3") else cur[0], b * 2 * .95, 76)
        if t > hl[0] and k % 4 == 0: tk.n(t, N("C2"), .3, 66 if k % 8 == 0 else 52)
        t += q; k += 1
    sp.auto += [(t57 - .1, .55), (hl[0], .8), (hl[2], 1), (t1, 1), (t1 + .15, 0)]
    for tt, root in zip(hl, ["D2", "Bb1", "A1"]):
        I("timpani", 47).n(tt, N(root), 1.4, 110); I("brass_low", 57).chord(tt, [N(root) + 12, N(root) + 19], 1.2, 86)
    # 矛盾的电弧：小二度震音（与冷开场相同）
    tr = I("c5_trem", 44, gain_db=-1, send=.5); tr.chord(t57 + .8, NS("D4 Eb4 A4 Bb4"), solve - t57 - .9, 60)
    tr.auto += [(t57 + .8, .15), (hl[2], .5), (solve - .5, 1), (solve - .45, 0)]
    roll(solve - 1.6, solve - .45, "D2", 40, 96, .075)
    # 并不矛盾：BRAAM + 三枚“真” → D 大调，《剂量》动机完整奏出
    braam(solve, "D1", 5.0, .55); hit_add(sfx_impact(1.0, 40, 4.0, 77), solve, 1, 0, .4)
    drum(solve, 49, 110, kit=48, name="kit_orch"); drum(solve, 57, 96, kit=48, name="kit_orch")
    for k, chd in enumerate(["D3 A3 D4", "F#3 A3 F#4", "D3 F#3 A3 D4"]):
        I("orchhit", 55).chord(solve + k * .12, NS(chd), .8, 104 + k * 6, 0); I("timpani", 47).n(solve + k * .12, N("D2"), 1.0, 116)
    mj = I("c5_maj", 49, gain_db=-3, send=.6); mc = I("c5_majch", 52, gain_db=-4, send=.7)
    mj.chord(solve, NS("D2 A2 D3 F#3 A3 D4"), t62 - solve + .5, 82); mc.chord(solve, NS("D3 F#3 A3 D4 F#4"), t62 - solve + .5, 78)
    for x in (mj, mc): x.auto += [(solve, 1), (tq - .3, .8), (t62, .7), (t62 + .5, 0)]
    I("horn", 60).seq(solve + .35, [("D4", .6), ("A4", .6), ("F#4", .9)], 1.0, 80)
    for i, m in enumerate(NS("A5 D6 F#6")): hit_add(sfx_chime(m, .08, 2.2), tq + i * .25, 1, (-.4, 0, .4)[i], .6)
    # 说明书上写的：主题（D – A – b – G – D/F# – e – A – D），圆号 + 弦乐 + 合唱
    bt = .6; t0 = t62 - .1
    th_ch = [NS("D2 A2 D3 F#3"), NS("A1 E2 A2 C#3"), NS("B1 F#2 B2 D3"), NS("G1 D2 G2 B2"), NS("F#1 D2 A2 D3"), NS("E2 B2 E3 G3"), NS("A1 E2 A2 C#3"), NS("D2 A2 D3 F#3")]
    ths = I("c5_theme", 49, gain_db=-3, send=.6); thc = I("c5_themech", 52, gain_db=-4, send=.7)
    for i, ch in enumerate(th_ch):
        tt = t0 + i * 2 * bt
        if tt > e - .6: break
        ths.chord(tt, ch, 2 * bt * 1.02 if i < 7 else e - tt + .5, 76); thc.chord(tt, ch[2:], 2 * bt * 1.02 if i < 7 else e - tt + .5, 68)
    for x in (ths, thc): x.auto += [(t0, 0), (t0 + 1.0, 1), (e - 1.2, .8), (e + .3, 0)]
    mel = [("D5", 1), ("A5", 1), ("G5", .5), ("F#5", .5), ("E5", 1), ("D5", 2), ("F#5", 1), ("B5", 1), ("A5", .5), ("G5", .5), ("F#5", 1),
           ("E5", 1), ("G5", 1), ("E5", 1), ("C#5", 1), ("D5", 4)]
    seq_until(I("c5_hn", 60, gain_db=4, send=.6), t0, mel, bt, 84, e - .3)
    arp(I("harp1", 46), t0, e - .8, [(t0 + i * 2 * bt, ch[1:]) for i, ch in enumerate(th_ch)], bt / 2, 56, pattern=(0, 1, 2, 3, 2, 1, 2, 3))
    for kw, m in [("产品", "A6"), ("人", "D7"), ("吃法", "F#7")]: hit_add(sfx_chime(N(m), .08, 2.4), cue("D062", kw), 1, 0, .6)
    tg = le("D062") + .2
    I("celesta", 8).seq(tg, [("A5", .5), ("D6", 1), ("F#6", 2)], .4, 60)


def m_map():
    a, e = ss("s16_map"), se("s16_map")
    pd = I("c5_map", 89, gain_db=-8, send=.6); pd.chord(a - .3, NS("D3 A3 E4 F#4"), e - a + .5, 64)
    pd.auto += [(a - .3, 0), (a + 1.0, 1), (e - .8, 1), (e + .4, 0)]
    for i, m in enumerate(NS("D6 E6 F#6 A6 B6")): I("celesta", 8).n(a + .2 + i * .2, m, .7, 58)
    I("glock", 9).n(a + 1.45, N("A6"), .8, 60)
    pn = I("piano", 0)
    pn.seq(ls("D063") - .05, [("D5", 1), ("A5", 1), ("G5", .5), ("F#5", .5), ("E5", 1), ("D5", 2)], .42, 66)
    pn.chord(ls("D063") - .05, NS("D3 A3"), 2.4, 52); pn.chord(ls("D063") + 2.4, NS("G2 D3 B3"), 2.4, 50)
    I("musicbox", 10).seq(cue("D063", "这一集"), [("A5", .5), ("F#5", .5), ("D6", 1.5)], .5, 70)


def m_next():
    a, e = ss("s17_next"), se("s17_next")
    t5, t2, tq, t65 = cue("D064", "五倍多"), cue("D064", "两倍多"), cue("D064", "剩下的药"), ls("D065")
    # 下集预告：c 小调，合成低音 + 木鱼钟摆（108 bpm）
    b = 60 / 108; t = a + .1; k = 0
    while t < t65 - .3:
        synth_add(sub(N("C2") + (7 if k % 4 == 2 else 0), b * .9, .16), t, 1, 0, 0)
        I("woodblock", 115).n(t, N("B4") if k % 2 else N("E5"), .1, 60); t += b; k += 1
    tn = I("c6_pad", 49, gain_db=-6, send=.55); tn.chord(a + .1, NS("C3 G3 Eb4"), t65 - a, 60)
    tn.auto += [(a, 0), (a + 1, 1), (t65 - .4, 1), (t65 - .2, 0)]
    for i, m in enumerate(NS("C4 Eb4 G4")): I("pizz", 45).n(a + .2 + i * .12, m, .3, 80)
    for i in range(16): I("pizz", 45).n(t5 - 1.4 + i * .06, NS("C4 D4 Eb4 F4 G4 Ab4 Bb4 C5")[i % 8] + (12 if i >= 8 else 0), .25, 70 + i)
    stab(t5, "C2", "C3 G3 C4 Eb4", 106)
    # 吸收只到两倍多：弦乐上行到一半就停 → 降 A 大调的“泄气”
    for i, m in enumerate(NS("C4 D4 Eb4 F4 G4")): I("str_rise2", 48).n(t2 - 1.2 + i * .3, m, .35, 66 + i * 4)
    I("c6_deflate", 57, gain_db=-5, send=.45).seq(t2, [("C3", .5), ("Bb2", .5), ("Ab2", 2)], .45, 90)
    I("c6_ab", 49, gain_db=-4, send=.6).chord(t2, NS("Ab2 Eb3 Ab3 C4"), tq - t2 + .4, 70)
    # 剩下的药去哪了：低音持续 + 反向渐强接“加倍”
    dr = I("c6_drone", 49, gain_db=-5, send=.5); dr.chord(tq - .2, NS("C2 G2 Db3"), t65 - tq, 62)
    dr.auto += [(tq - .2, 0), (tq + .6, 1), (t65 - .3, 1), (t65 - .2, 0)]
    hit_add(sfx_reverse_swell(1.4, N("C3"), .32), t65 - 1.45, 1, 0, .5)
    # 下一集，加倍：故障 + BRAAM + 两记齐奏（“加”“倍”）
    braam(t65, "C2", 4.5, .5); drum(t65, 49, 108, kit=48, name="kit_orch")
    for k in range(2):
        I("orchhit", 55).chord(t65 + k * .24, NS("C3 G3 C4 Eb4"), .7, 110 + k * 8, 0); I("timpani", 47).n(t65 + k * .24, N("C2"), 1.0, 118)
        I("taiko", 116).n(t65 + k * .24, N("C2"), .3, 110)
    ep2 = I("c6_ep2", 49, gain_db=-4, send=.6); ep2.chord(t65, NS("C2 G2 C3 Eb3 G3"), e - t65 + .6, 76)
    ep2.auto += [(t65, 1), (e - .6, .7), (e + .4, 0)]


def m_end():
    a, e = ss("s18_end"), se("s18_end")
    ts = cue("D067", "一键三连") - .3
    hit_add(sfx_impact(.4, 46, 3.0, 99), a + .2, 1, 0, .4); hit_add(sfx_chime(N("D6"), .12, 3.0), a + .3, 1, 0, .7)
    # 片尾：《剂量》动机（钢琴）+ 弦乐合唱（D – b – G – A – D）
    bt = .6; t0 = a + .6
    chs = [NS("D2 A2 D3 F#3"), NS("B1 F#2 B2 D3"), NS("G1 D2 G2 B2"), NS("A1 E2 A2 C#3"), NS("G1 D2 G2 B2"), NS("A1 E2 A2 C#3"), NS("D2 A2 D3 F#3")]
    es = I("c7_str", 49, gain_db=-5, send=.6); ec = I("c7_ch", 52, gain_db=-6, send=.7)
    for i, ch in enumerate(chs):
        tt = t0 + i * 4 * bt
        if tt > e - 1: break
        dur = 4 * bt * 1.02 if i < len(chs) - 1 else e - tt
        es.chord(tt, ch, dur, 64); ec.chord(tt, ch[2:], dur, 58)
    for x in (es, ec): x.auto += [(t0, 0), (t0 + 1.5, 1), (e - 2.5, 1), (e - .2, 0)]
    pn = I("piano", 0)
    mel = [("D5", 1), ("A5", 1), ("G5", .5), ("F#5", .5), ("E5", 1), ("D5", 4), ("B4", 1), ("D5", 1), ("E5", .5), ("F#5", .5), ("E5", 1), ("C#5", 4),
           ("G5", 2), ("F#5", 2), ("E5", 2), ("D5", 6)]
    seq_until(pn, t0 + .1, mel, bt, 62, e - 1.0)
    for i in range(3): hit_add(sfx_chime(NS("A5 C#6 E6")[i] + 12, .08, 2.0), ts + 1.6 * i * .18 + .25, 1, (-.4, 0, .4)[i], .6)


CUES = [m_paradox, m_meal, m_title, m_key, m_river, m_bile, m_idcard, m_vote, m_answer, m_mill, m_bars, m_twins,
        m_toilet, m_trial, m_road, m_finale, m_map, m_next, m_end]


def MASTER_KEYS():
    k = [(0, 1)]
    # “变的，只是早餐”之前，整个配乐骤停半秒
    z = cue("D011", "只是")
    k += [(ls("D011") - .1, 1), (ls("D011") + .15, 0), (z - .05, 0), (z + .05, 1)]
    # “它就卡住了”：画面定格 0.6 秒，音乐一起停
    st = cue("D017", "卡住了")
    k += [(st - .03, 1), (st + .01, 0), (st + .58, 0), (st + .63, 1)]
    # 倒计时结束 → 答案揭晓前留一口气
    T1 = se("s07_vote") - .4
    k += [(T1 - .05, 1), (T1 + .02, 0), (ls("D033") - .06, 0), (ls("D033") - .02, 1)]
    # “并不矛盾”前压一下
    sv = cue("D061", "并不矛盾")
    k += [(sv - .5, 1), (sv - .38, .12), (sv - .03, .12), (sv, 1)]
    # “下一集，加倍”前的空拍
    t65 = ls("D065")
    k += [(t65 - .3, 1), (t65 - .2, 0), (t65 - .03, 0), (t65, 1)]
    return k + [(DUR + 5, 1)]
