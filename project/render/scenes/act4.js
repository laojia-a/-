// 推演分隔 → 第六章：未来简史（2030 源头即真相 / 2035 每秒一次 / 2040 数字孪生 / 2047 阿格斯）
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2,
  rgba, text, measure, typeText, scrambleText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt, chapterCard } from '../engine.js';
import { dust, drawEye, drawGlobe } from './act0.js';
import { stamp } from './act1.js';

function hazard(c, y, h, t, a) {
  c.save(); c.globalAlpha = a; c.beginPath(); c.rect(0, y, W, h); c.clip(); c.fillStyle = '#f2c230'; c.fillRect(0, y, W, h);
  c.fillStyle = '#111'; const off = (t * 120) % 80; for (let x = -200; x < W + 200; x += 80) { c.beginPath(); c.moveTo(x + off, y + h); c.lineTo(x + off + 40, y + h); c.lineTo(x + off + 40 + h, y); c.lineTo(x + off + h, y); c.closePath(); c.fill(); }
  c.restore();
}
function warp(c, t, k, col = '#9fe9ff') { // 超空间拉丝
  if (k <= 0) return; const r = rng(66); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i++) {
    const a = r() * TAU, d0 = r(); const sp = .4 + r() * 1.6; const d = ((d0 + t * sp * .6) % 1);
    const r0 = Math.pow(d, 2.2) * 1400, r1 = r0 + (40 + 900 * k) * d;
    c.strokeStyle = rgba(col, (.15 + .6 * d) * k); c.lineWidth = 1 + 2 * d;
    c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); c.stroke();
  }
  c.restore();
}

// ============================================================ s14 推演分隔
def('s14_extrap', {
  post: { bloom: .6, thr: .72, ca: .0025, vig: .5, grain: .04 },
  draw(S) {
    const c = S.ctx, t = S.t; const L51 = S.L('L051');
    c.fillStyle = '#05060a'; c.fillRect(0, 0, W, H);
    const a = smooth(p(t, 0, .4)) * (1 - smooth(p(t, S.dur - 1.6, S.dur - .9)));
    hazard(c, 120, 46, t, a); hazard(c, H - 166, 46, -t, a);
    text(c, 'EXTRAPOLATION', W / 2, 360, { size: 110, family: 'Orbitron', weight: 900, color: '#f2c230', align: 'center', ls: 16, alpha: a });
    text(c, '以下内容为基于现实趋势的推演', W / 2, 430, { size: 38, family: 'SHSans', weight: 700, color: '#fff', align: 'center', ls: 8, alpha: a });
    // 未来 → 历史 翻牌
    const flip = p(t, L51.s + 2.4, L51.s + 3.2);
    const ang = flip * Math.PI; const sy = Math.abs(Math.cos(ang));
    c.save(); c.translate(W / 2, 640); c.scale(1, Math.max(.02, sy)); c.globalAlpha = a * smooth(p(t, L51.s, L51.s + .6));
    const word = flip < .5 ? '未 来' : '历 史', en = flip < .5 ? 'FUTURE' : 'HISTORY';
    panel(c, -330, -110, 660, 220, { fill: 'rgba(20,24,34,.95)', stroke: flip < .5 ? C.cyan : C.amber, lw: 3, r: 12 });
    text(c, word, 0, 40, { size: 120, family: 'SHSerif', weight: 900, color: flip < .5 ? C.cyan : C.amber, align: 'center', ls: 10 });
    c.restore();
    text(c, (flip < .5 ? 'FUTURE · 对你们' : 'HISTORY · 对我'), W / 2, 800, { size: 28, family: 'JB', weight: 700, color: rgba('#fff', .7), align: 'center', ls: 8, alpha: a * smooth(p(t, L51.s + .3, L51.s + .9)) });
    // 超空间
    const wk = smooth(p(t, S.dur - 2.0, S.dur));
    warp(c, t, wk);
    S.post.flash = Math.max(S.post.flash, eIn(p(t, S.dur - .5, S.dur)) * .9);
  },
});
transition('s15_2030', { type: 'white', d: .6 });

// ============================================================ s15 2030 源头即真相
function hospitalIcon(c, x, y, s, a) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(62,230,255,.12)'; c.strokeStyle = C.cyan; c.lineWidth = 3;
  rrect(c, -110, -150, 220, 220, 10); c.fill(); c.stroke();
  c.fillStyle = C.cyan; c.fillRect(-12, -120, 24, 70); c.fillRect(-35, -97, 70, 24);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) { c.strokeRect(-80 + i * 60, -30 + j * 45, 40, 30); }
  c.restore();
}
function dbIcon(c, x, y, s, a) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); c.strokeStyle = C.green; c.lineWidth = 3; c.fillStyle = 'rgba(70,242,160,.1)';
  for (let k = 0; k < 3; k++) { c.beginPath(); c.ellipse(0, -90 + k * 70, 100, 26, 0, 0, TAU); c.fill(); c.stroke(); }
  c.beginPath(); c.moveTo(-100, -90); c.lineTo(-100, 50); c.moveTo(100, -90); c.lineTo(100, 50); c.stroke();
  c.beginPath(); c.ellipse(0, 50, 100, 26, 0, 0, Math.PI); c.stroke();
  c.restore();
}
def('s15_2030', {
  post: (S) => { const d = smooth(p(S.t, S.L('L054').s + 1.4, S.L('L054').s + 2.4)); return { bloom: lerp(.7, .3, d), thr: lerp(.66, .86, d), ca: .0018, vig: .5, grain: .035, tint: [.96, 1.02, 1.06] }; },
  draw(S) {
    const c = S.ctx, t = S.t; const L52 = S.L('L052'), L53 = S.L('L053'), L54 = S.L('L054');
    c.fillStyle = radial(c, W / 2, H / 2, 1200, [[0, '#071526'], [1, '#02050a']]); c.fillRect(0, 0, W, H);
    dust(c, t, 160, '#7fe8ff', .3, 31);
    // ---- 数据诞生 → 签名 → 流入数据库
    const fA = env(t, 2.0, L54.s + .3, .6, .6);
    if (fA > 0) {
      c.save(); c.globalAlpha = fA;
      const hx = 330, hy = 560, dx = 1600, dy = 560;
      hospitalIcon(c, hx, hy, 1.1, smooth(p(t, 2.6, 3.4))); text(c, '医院 · 电子病历 EHR', hx, hy + 140, { size: 30, family: 'SHSans', weight: 700, color: C.cyan, align: 'center' });
      dbIcon(c, dx, hy + 20, 1.1, smooth(p(t, 3.0, 3.8))); text(c, '试验数据库', dx, hy + 140, { size: 30, family: 'SHSans', weight: 700, color: C.green, align: 'center' });
      // 管道
      const curve = (u) => [lerp(hx + 130, dx - 130, u), hy - 40 - Math.sin(u * Math.PI) * 220];
      c.strokeStyle = rgba(C.cyan, .25); c.lineWidth = 16; c.lineCap = 'round'; c.beginPath(); for (let u = 0; u <= 1; u += .02) { const [x, y] = curve(u); if (u === 0) c.moveTo(x, y); else c.lineTo(x, y); } c.stroke();
      c.strokeStyle = rgba(C.cyan, .7); c.lineWidth = 2; c.stroke();
      // 背景数据包流
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const u = ((t * .22 + i / 26) % 1); const [x, y] = curve(u); c.fillStyle = rgba(i % 3 ? C.cyan : C.green, .7); c.fillRect(x - 5, y - 5, 10, 10); }
      c.restore();
      // 主角数据：128/82
      const born = smooth(p(t, L52.s + .4, L52.s + 1.2));
      const sign = eOut(p(t, L52.s + 5.6, L52.s + 6.8));
      const fly = eInOut(p(t, L52.s + 7.4, L52.e + .8));
      const [px, py] = fly > 0 ? curve(fly) : [hx, hy - 260];
      const bx = fly > 0 ? px : hx, by = fly > 0 ? py - 90 : hy - 280;
      c.save(); c.translate(bx, by); const sc = lerp(1, .7, fly); c.scale(sc, sc);
      panel(c, -170, -70, 340, 140, { fill: 'rgba(6,20,34,.95)', stroke: C.cyan, lw: 3, r: 14, alpha: born });
      text(c, '128/82', 0, 18, { size: 66, family: 'JB', weight: 800, color: '#fff', align: 'center', alpha: born });
      text(c, 'mmHg · 设备 BP-07 · 09:31:07', 0, 54, { size: 18, family: 'JB', color: rgba(C.cyan, .85), align: 'center', alpha: born });
      if (sign > 0) {
        c.save(); c.globalAlpha = sign; c.strokeStyle = C.gold; c.lineWidth = 3; c.setLineDash([10, 6]); c.lineDashOffset = -t * 30; rrect(c, -190, -90, 380, 180, 18); c.stroke(); c.restore();
        c.save(); c.globalAlpha = sign; c.strokeStyle = C.gold; c.fillStyle = C.gold; c.lineWidth = 4; c.beginPath(); c.arc(165, -84, 12, Math.PI, 0); c.stroke(); rrect(c, 149, -84, 32, 26, 4); c.fill(); c.restore();
        scrambleText(c, 'SHA-256 9f3a·c41e·77d0·b2e9', -180, -104, sign, 4, { size: 20, family: 'JB', color: C.gold, alpha: sign });
      }
      c.restore();
      // 注记
      const n1 = env(t, L52.s + .9, L52.s + 5.2, .4, .4); text(c, '数据在诞生的那一刻——', W / 2, 190, { size: 44, family: 'SHSerif', weight: 700, color: '#fff', align: 'center', alpha: n1 });
      const n2 = env(t, L52.s + 5.4, L53.s, .4, .4); text(c, '签名 · 加密 · 留下痕迹', W / 2, 190, { size: 50, family: 'SHSerif', weight: 900, color: C.gold, align: 'center', alpha: n2, ls: 6 });
      // 没有抄写
      const nA = env(t, L53.s - .1, L54.s + .2, .3, .4);
      if (nA > 0) {
        c.fillStyle = `rgba(2,5,10,${.6 * nA})`; c.fillRect(0, 0, W, H);
        ['没有抄写', '就没有抄错'].forEach((w, i) => {
          const k = smooth(p(t, L53.s + i * .9, L53.s + .5 + i * .9));
          text(c, w, W / 2 + (i ? 260 : -260), H / 2 + 30, { size: 96, family: 'SHSerif', weight: 900, color: i ? C.cyan : '#fff', align: 'center', alpha: nA * k });
        });
      }
      c.restore();
    }
    // ---- 合二为一 + 词典
    const mA = smooth(p(t, L54.s - .3, L54.s + .4));
    if (mA > 0) {
      c.save(); c.globalAlpha = mA; c.fillStyle = 'rgba(2,5,10,.9)'; c.fillRect(0, 0, W, H);
      const m = eInOut(p(t, L54.s + .3, L54.s + 2.0));
      const sepx = lerp(380, 0, m);
      const docs = [[-sepx, '源数据', 'SOURCE', C.cyan], [sepx, '副本', 'COPY · CRF', C.amber]];
      for (const [ox, zh, en, col] of docs) {
        c.save(); c.translate(W / 2 + ox - 520, 520); c.globalAlpha *= 1 - .3 * m;
        panel(c, -170, -230, 340, 420, { fill: 'rgba(10,22,36,.95)', stroke: col, lw: 3, r: 12 });
        text(c, zh, 0, -150, { size: 50, family: 'SHSerif', weight: 900, color: col, align: 'center' }); text(c, en, 0, -110, { size: 20, family: 'JB', color: rgba(col, .8), align: 'center', ls: 4 });
        for (let i = 0; i < 7; i++) { c.fillStyle = rgba(col, .25); c.fillRect(-130, -70 + i * 34, 200 + hash1(i) * 60, 10); }
        c.restore();
      }
      if (m > .95) { glowDot(c, W / 2 - 520, 520, 260, '#ffffff', .4 * smooth(p(t, L54.s + 2, L54.s + 2.4))); text(c, '唯一真相', W / 2 - 520, 770, { size: 44, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: smooth(p(t, L54.s + 2.0, L54.s + 2.6)) }); }
      // 词典词条
      const dk = smooth(p(t, L54.s + 1.6, L54.s + 2.4));
      if (dk > 0) {
        c.save(); c.globalAlpha *= dk; c.translate(1020, 260);
        panel(c, 0, 0, 760, 520, { fill: 'rgba(188,178,156,.97)', stroke: null, r: 6 });
        text(c, 'SDV', 50, 120, { size: 96, family: 'SHSerif', weight: 900, color: '#1b1610' });
        text(c, '/ˌes diː ˈviː/  n.', 270, 118, { size: 30, family: 'IMFell', italic: true, color: '#4a3a28' });
        line(c, 50, 160, 710, 160, 'rgba(60,40,20,.4)', 2);
        text(c, '源数据核查。', 50, 230, { size: 40, family: 'SHSerif', weight: 700, color: '#1b1610' });
        text(c, '〔旧〕指将病例报告表中的数据', 50, 300, { size: 34, family: 'SHSerif', color: '#3a2e20' });
        text(c, '与原始记录逐一核对的工作。', 50, 350, { size: 34, family: 'SHSerif', color: '#3a2e20' });
        text(c, '例：监查员拖着拉杆箱去做 ~。', 50, 420, { size: 30, family: 'WenKai', color: '#6a5a40' });
        const fade = p(t, L54.s + 3.0, L54.e + .4);
        c.globalAlpha = 1; stamp(c, 560, 120, ['已过时', 'OBSOLETE'], { k: fade, w: 260, h: 110, size: 46, rot: .12, col: '#c4162f', seed: 21 });
        c.restore();
      }
      c.restore();
    }
    chapterCard(S, '第 六 章', '未来简史', { sub: '2030 — 2047 · 推演', color: C.cyan });
  },
});
transition('s16_2035', { type: 'cross', d: .8 });

// ============================================================ s16 2035 每秒一次
function ecgW(x) { const ph = x - Math.floor(x); const g = (m, s, a) => a * Math.exp(-((ph - m) ** 2) / (2 * s * s)); return g(.18, .025, .12) - g(.36, .008, .18) + g(.39, .012, 1.0) - g(.42, .01, .32) + g(.62, .045, .26); }
function anomalyCard(c, x, y, k, kind, t) {
  if (k <= 0) return; const kk = eOutBack(k, 1.2);
  c.save(); c.globalAlpha *= smooth(p(k, 0, .3)); c.translate(x, y); c.scale(lerp(.9, 1, kk), lerp(.9, 1, kk));
  panel(c, 0, 0, 540, 420, { fill: 'rgba(30,6,12,.9)', stroke: C.red, lw: 2.5, r: 14 });
  c.fillStyle = C.red; c.fillRect(0, 0, 540, 54); 
  const heads = { digit: ['⚠ 尾数偏好', '中心 #0417 · 血压读数'], diary: ['⚠ 日记补填', '受试者 #2291 · 电子日记'], sae: ['⚠ SAE 迟报', '严重不良事件 · 报告时效'] };
  text(c, heads[kind][0], 22, 38, { size: 30, family: 'SHSans', weight: 900, color: '#fff' });
  text(c, heads[kind][1], 22, 96, { size: 24, family: 'SHSans', weight: 500, color: '#ffd0d8' });
  if (kind === 'digit') {
    const vals = [62, 3, 4, 5, 3, 9, 4, 3, 4, 3];
    vals.forEach((v, i) => { const hh = v * 3.6 * smooth(p(k, .2, .9)); c.fillStyle = i === 0 ? C.red : 'rgba(255,200,210,.45)'; c.fillRect(40 + i * 48, 360 - hh, 34, hh); text(c, String(i), 57 + i * 48, 395, { size: 20, family: 'JB', color: '#ffd0d8', align: 'center' }); });
    line(c, 30, 360 - 36, 510, 360 - 36, 'rgba(255,255,255,.5)', 1.5); text(c, '预期 ≈10%', 505, 360 - 44, { size: 18, family: 'SHSans', color: '#fff', align: 'right' });
    text(c, '尾数为 0：62%', 300, 160, { size: 34, family: 'JB', weight: 800, color: '#fff' });
  }
  if (kind === 'diary') {
    for (let d = 0; d < 14; d++) { const x = 40 + d * 33; line(c, x, 170, x, 360, 'rgba(255,255,255,.12)', 1); const late = d > 2; const yy = late ? 300 : 200 + hash1(d) * 60; circle(c, x, yy, 7, { fill: late ? C.red : '#ffd0d8' }); }
    text(c, '14 条记录 · 同一分钟提交', 40, 160, { size: 28, family: 'SHSans', weight: 700, color: '#fff' });
    text(c, '2035-03-14 22:07', 270, 336, { size: 22, family: 'JB', weight: 700, color: C.red });
  }
  if (kind === 'sae') {
    line(c, 40, 260, 500, 260, 'rgba(255,255,255,.4)', 3);
    circle(c, 80, 260, 12, { fill: '#ffd0d8' }); text(c, 'D0 发生', 80, 310, { size: 22, family: 'SHSans', color: '#ffd0d8', align: 'center' });
    circle(c, 200, 260, 8, { stroke: '#fff', lw: 2 }); text(c, '24h 时限', 200, 230, { size: 20, family: 'SHSans', color: '#fff', align: 'center' });
    circle(c, 440, 260, 14, { fill: C.red }); text(c, 'D+3 才报告', 440, 310, { size: 24, family: 'SHSans', weight: 700, color: C.red, align: 'center' });
    c.save(); c.strokeStyle = C.red; c.lineWidth = 4; c.setLineDash([8, 8]); c.beginPath(); c.moveTo(200, 260); c.lineTo(440, 260); c.stroke(); c.restore();
    text(c, '迟报 72 小时', 40, 170, { size: 34, family: 'JB', weight: 800, color: '#fff' });
  }
  c.restore();
}
def('s16_2035', {
  post: { bloom: .8, thr: .62, ca: .002, vig: .5, grain: .035, tint: [.96, 1.02, 1.06] },
  draw(S) {
    const c = S.ctx, t = S.t; const L55 = S.L('L055'), L56 = S.L('L056'), L57 = S.L('L057'), L58 = S.L('L058');
    c.fillStyle = radial(c, W / 2, H / 2, 1200, [[0, '#06121f'], [1, '#02050a']]); c.fillRect(0, 0, W, H);
    // ---- 访视频率：点 → 线 → 心跳
    const vA = 1 - smooth(p(t, L56.s + .4, L56.s + 1.4));
    if (vA > 0) {
      c.save(); c.globalAlpha = vA;
      const comp = eIn(p(t, L55.s + 2.6, L55.e - .2)); // 压缩进度
      const y = H / 2 + 40, x0 = 160, x1 = W - 160;
      line(c, x0, y, x1, y, rgba('#fff', .15), 2);
      const n = Math.floor(lerp(9, 400, comp));
      const ecgK = smooth(p(t, L55.e - .6, L55.e + .6));
      if (ecgK < 1) {
        for (let i = 0; i < n; i++) { const x = lerp(x0, x1, i / (n - 1)); circle(c, x, y, lerp(11, 2.2, comp), { fill: C.amber, alpha: 1 - ecgK }); if (n <= 12) text(c, 'V' + (i + 1), x, y - 32, { size: 24, family: 'JB', weight: 700, color: rgba(C.amber, .9), align: 'center', alpha: 1 - ecgK }); }
      }
      if (ecgK > 0) {
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.cyan, ecgK); c.lineWidth = 4; c.beginPath();
        for (let x = x0; x <= x1; x += 3) { const u = (x - x0) / (x1 - x0); const yy = y - ecgW(u * 6 - t * 1.2) * 180 * ecgK; if (x === x0) c.moveTo(x, yy); else c.lineTo(x, yy); }
        c.stroke(); c.restore();
      }
      const label = comp < .5 ? '1 次 / 4–8 周' : comp < .98 ? '1 次 / ' + ['周', '天', '小时', '分钟'][Math.min(3, Math.floor((comp - .5) * 8))] : '1 次 / 秒';
      text(c, '监查访视频率', W / 2, 260, { size: 34, family: 'SHSans', weight: 500, color: rgba('#fff', .7), align: 'center' });
      text(c, label, W / 2, 360, { size: 96, family: 'JB', weight: 800, color: comp > .98 ? C.cyan : C.amber, align: 'center' });
      c.restore();
    }
    // ---- 全球每一家医院
    const gA = smooth(p(t, L56.s + .2, L56.s + 1.4));
    if (gA > 0) {
      const dim = lerp(1, .35, smooth(p(t, L57.s - .2, L57.s + .6)));
      drawGlobe(c, W / 2, H / 2 + 20, 380, t, { alpha: gA * dim, count: 12000, spin: t * .1, arcs: 1.4 });
      drawEye(c, W / 2, H / 2 + 20, 70, t, { open: gA, alpha: gA * dim, detail: .5 });
      const tx = env(t, L56.s + .8, L57.s + .2, .5, .4);
      text(c, '我不需要出差', W / 2, 140, { size: 50, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: tx });
      text(c, '每一家医院 · 每一个瞬间', W / 2, 1000 - 60, { size: 34, family: 'SHSans', weight: 700, color: C.cyan, align: 'center', alpha: tx, ls: 6 });
    }
    // ---- 异常卡片
    const s1 = L57.s + .9, s2 = L57.s + 4.6, s3 = L57.s + 8.4;
    anomalyCard(c, 110, 290, p(t, s1, s1 + .7) * (1 - smooth(p(t, L58.s, L58.s + .5))), 'digit', t);
    anomalyCard(c, 690, 290, p(t, s2, s2 + .7) * (1 - smooth(p(t, L58.s, L58.s + .5))), 'diary', t);
    anomalyCard(c, 1270, 290, p(t, s3, s3 + .7) * (1 - smooth(p(t, L58.s, L58.s + .5))), 'sae', t);
    // ---- 提醒一个人类
    const hA = smooth(p(t, L58.s + .2, L58.s + .9));
    if (hA > 0) {
      c.save(); c.globalAlpha = hA;
      const fx = W / 2, fy = H / 2 + 20, tx = 1500, ty = 560; const u = eInOut(p(t, L58.s + .6, L58.s + 2.0));
      const px = lerp(fx, tx, u), py = lerp(fy, ty, u) - Math.sin(u * Math.PI) * 160;
      glowDot(c, px, py, 60, C.amber, .9); circle(c, px, py, 10, { fill: '#fff' });
      // 人类图标
      c.fillStyle = '#8ea2b8'; circle(c, tx, ty - 120, 44, { fill: '#8ea2b8' }); rrect(c, tx - 70, ty - 64, 140, 170, 50); c.fill();
      const nk = smooth(p(t, L58.s + 2.0, L58.s + 2.6));
      panel(c, tx - 330, ty + 150, 520, 120, { fill: 'rgba(40,26,8,.95)', stroke: C.amber, lw: 3, r: 14, alpha: nk });
      text(c, '⚠ 已通知人类监查员', tx - 300, ty + 200, { size: 34, family: 'SHSans', weight: 900, color: C.amber, alpha: nk });
      text(c, '在任何人受到伤害之前', tx - 300, ty + 245, { size: 26, family: 'SHSans', color: '#ffe2b0', alpha: nk });
      c.restore();
    }
  },
});
transition('s17_2040', { type: 'cross', d: .8 });

// ============================================================ s17 2040 数字孪生
function human(c, x, y, s, col, a = 1, twin = false, t = 0) {
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  if (!twin) { c.fillStyle = col; c.beginPath(); c.arc(0, -150, 26, 0, TAU); c.fill(); rrect(c, -34, -118, 68, 108, 26); c.fill(); c.fillRect(-28, -20, 22, 90); c.fillRect(6, -20, 22, 90); }
  else {
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.arc(0, -150, 26, 0, TAU); c.stroke(); rrect(c, -34, -118, 68, 108, 26); c.stroke(); c.strokeRect(-28, -20, 22, 90); c.strokeRect(6, -20, 22, 90);
    for (let i = 0; i < 9; i++) { const yy = -176 + i * 28 + ((t * 40) % 28); line(c, -36, yy, 36, yy, rgba(col, .35), 1); }
  }
  c.restore();
}
def('s17_2040', {
  post: { bloom: .75, thr: .64, ca: .002, vig: .5, grain: .035, tint: [.96, 1.02, 1.06] },
  draw(S) {
    const c = S.ctx, t = S.t; const L59 = S.L('L059'), L60 = S.L('L060');
    c.fillStyle = radial(c, W / 2, 700, 1300, [[0, '#0a1a2c'], [1, '#02050a']]); c.fillRect(0, 0, W, H);
    // 地平线网格
    c.save(); c.strokeStyle = rgba(C.cyan, .12); c.lineWidth = 1.5;
    for (let i = -20; i <= 20; i++) { line(c, W / 2 + i * 40, 560, W / 2 + i * 260, H, rgba(C.cyan, .12), 1.5); }
    for (let j = 0; j < 12; j++) { const y = 560 + Math.pow(j / 12, 2) * 520 + ((t * 20) % 40) * (j / 12); line(c, 0, y, W, y, rgba(C.cyan, .1), 1.5); }
    c.restore();
    const gA = 1 - smooth(p(t, L60.s - .3, L60.s + .4));
    if (gA > 0) {
      c.save(); c.globalAlpha = gA;
      const n = 5;
      for (let i = 0; i < n; i++) {
        const x = 360 + i * 300, y = 860;
        const tw = eOut(p(t, L59.s + .6 + i * .35, L59.s + 2.4 + i * .35));
        // 分叉的未来路径
        if (tw > .3) {
          const r = rng(i + 3); c.save(); c.globalCompositeOperation = 'lighter';
          for (let b = 0; b < 4; b++) { const ex = x + (r() - .5) * 500, ey = 600 + r() * 60; const pk = smooth(p(t, L59.s + 2.4 + i * .3 + b * .2, L59.s + 4.4 + i * .3 + b * .2)); c.strokeStyle = rgba(C.cyan, .35 * pk); c.lineWidth = 2; c.beginPath(); c.moveTo(x, y - 80); c.quadraticCurveTo(x + (ex - x) * .3, y - 200, lerp(x, ex, pk), lerp(y - 80, ey, pk)); c.stroke(); glowDot(c, lerp(x, ex, pk), lerp(y - 80, ey, pk), 18, C.cyan, .6 * pk); }
          c.restore();
        }
        human(c, x - 40, y, 1.6, '#7f90a6', 1);
        human(c, x - 40 + tw * 90, y - tw * 40, 1.6 * lerp(1, .82, tw), C.cyan, tw, true, t);
      }
      const lab = smooth(p(t, L59.s + 1.4, L59.s + 2.4));
      text(c, '数 字 孪 生', W / 2, 200, { size: 80, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: lab, ls: 8 });
      text(c, 'DIGITAL TWIN', W / 2, 254, { size: 30, family: 'Orbitron', weight: 700, color: C.cyan, align: 'center', alpha: lab, ls: 12 });
      text(c, '替真实的人，提前走一遍可能的未来', W / 2, 320, { size: 34, family: 'SHSans', weight: 500, color: rgba('#fff', .75), align: 'center', alpha: smooth(p(t, L59.s + 4.4, L59.s + 5.2)) });
      c.restore();
    }
    // 对照组缩减
    const kA = smooth(p(t, L60.s - .3, L60.s + .4));
    if (kA > 0) {
      c.save(); c.globalAlpha = kA;
      text(c, '对照组 · 安慰剂', 520, 210, { size: 48, family: 'SHSerif', weight: 900, color: '#fff', align: 'center' });
      text(c, '试验组', 1400, 210, { size: 48, family: 'SHSerif', weight: 900, color: '#fff', align: 'center' });
      const rep = p(t, L60.s + .8, L60.e - .2);
      for (let i = 0; i < 40; i++) {
        const cx = 220 + (i % 10) * 66, cy = 330 + Math.floor(i / 10) * 140;
        const isTwin = ihash(i * 5) < .35 && ihash(i * 5) < rep * .35 + .0001;
        human(c, cx, cy + 90, .55, isTwin ? C.cyan : '#7f90a6', isTwin ? .9 : 1, isTwin, t);
      }
      for (let i = 0; i < 40; i++) { const cx = 1100 + (i % 10) * 66, cy = 330 + Math.floor(i / 10) * 140; human(c, cx, cy + 90, .55, '#b8946a', 1); }
      text(c, '需要服用安慰剂的真实受试者 ↓', 520, 1000 - 70, { size: 32, family: 'SHSans', weight: 700, color: C.cyan, align: 'center', alpha: smooth(p(t, L60.s + 1.2, L60.s + 2)) });
      text(c, '注：2022 年，EMA 已对一种利用“数字孪生”预后评分缩小样本量的统计方法（PROCOVA）出具资格认定意见', W / 2, 152, { size: 21, family: 'SHSans', color: rgba('#fff', .55), align: 'center', alpha: smooth(p(t, L60.s + .6, L60.s + 1.4)) });
      c.restore();
    }
  },
});
transition('s18_2047', { type: 'white', d: .5 });

// ============================================================ s18 2047 阿格斯
const STREAMS = once('streams', () => { const r = rng(88), a = []; for (let i = 0; i < 900; i++) a.push({ a: r() * TAU, sp: .2 + r() * .8, ph: r(), w: .5 + r() * 1.5, col: r() < .12 ? 1 : 0 }); return a; });
def('s18_2047', {
  post: { bloom: .95, thr: .58, ca: .0024, vig: .5, grain: .035, tint: [.96, 1.02, 1.08] },
  draw(S) {
    const c = S.ctx, t = S.t; const L61 = S.L('L061'), L62 = S.L('L062');
    c.fillStyle = '#020409'; c.fillRect(0, 0, W, H);
    // 年份翻到 2047
    const yA = env(t, -.5, L62.s + .2, .2, .6);
    if (yA > 0) {
      const k = eOutExpo(p(t, L61.s + 1.4, L61.s + 2.6)); const yr = Math.round(lerp(2040, 2047, k));
      text(c, String(yr), W / 2, H / 2 + 90, { size: 300, family: 'JB', weight: 800, color: '#fff', align: 'center', alpha: yA, ls: 20 });
      text(c, '今 天', W / 2, H / 2 + 200, { size: 46, family: 'SHSerif', weight: 900, color: C.cyan, align: 'center', alpha: yA * smooth(p(t, L61.s + 2.4, L61.s + 3)), ls: 30 });
      S.post.flash = Math.max(S.post.flash, .3 * Math.max(0, 1 - p(t, L61.s + 2.5, L61.s + 3.0)) * (t > L61.s + 2.5 ? 1 : 0));
    }
    // 阿格斯核心
    const eA = smooth(p(t, L62.s - .3, L62.s + .8));
    if (eA > 0) {
      c.save(); c.globalAlpha = eA;
      // 数据流汇入
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const st of STREAMS) {
        const d = 1 - ((t * st.sp * .5 + st.ph) % 1); const r0 = 330 + d * 900, r1 = r0 + 40 + 120 * d;
        c.strokeStyle = st.col ? `rgba(255,200,120,${.5 * (1 - d)})` : `rgba(62,230,255,${.45 * (1 - d)})`; c.lineWidth = st.w;
        c.beginPath(); c.moveTo(W / 2 + Math.cos(st.a) * r0, H / 2 + Math.sin(st.a) * r0 * .9); c.lineTo(W / 2 + Math.cos(st.a) * r1, H / 2 + Math.sin(st.a) * r1 * .9); c.stroke();
      }
      c.restore();
      drawEye(c, W / 2, H / 2, lerp(200, 300, eOut(p(t, L62.s - .3, L62.e))), t, { open: eOutExpo(p(t, L62.s - .3, L62.s + 1)), pupil: .28 });
      const stats = [['12,000', '项试验', -560, -210], ['4,000,000', '名受试者', 560, -210], ['0', '遗漏', 0, 330]];
      stats.forEach(([n, u, ox, oy], i) => {
        const k = smooth(p(t, L62.s + .4 + i * 1.1, L62.s + 1.1 + i * 1.1)); if (k <= 0) return;
        text(c, n, W / 2 + ox, H / 2 + oy, { size: 76, family: 'JB', weight: 800, color: i === 2 ? C.green : '#fff', align: 'center', alpha: k });
        text(c, u, W / 2 + ox, H / 2 + oy + 50, { size: 30, family: 'SHSans', weight: 700, color: i === 2 ? C.green : C.cyan, align: 'center', alpha: k });
      });
      c.restore();
    }
  },
});
transition('s19_signature', { type: 'black', d: 1.2 });
