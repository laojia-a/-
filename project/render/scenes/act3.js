// 第三章（续）：基于风险的监查、722；第四章：2020；第五章：我的祖先 & 2025—2026 规则
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2, fbm,
  rgba, text, measure, typeText, scrambleText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt, chapterCard, walker } from '../engine.js';
import { dust, drawEye } from './act0.js';
import { stamp, PAPER } from './act1.js';

function card(c, x, y, w, h, head, title, sub, o = {}) {
  const { col = C.cyan, alpha = 1, k = 1 } = o; if (alpha <= 0 || k <= 0) return;
  const kk = eOutBack(k, 1.2); c.save(); c.globalAlpha *= alpha * smooth(p(k, 0, .4)); c.translate(x + w / 2, y + h / 2); c.scale(lerp(.9, 1, kk), lerp(.9, 1, kk)); c.translate(-w / 2, -h / 2);
  panel(c, 0, 0, w, h, { fill: 'rgba(8,16,30,.92)', stroke: rgba(col, .8), lw: 2.5, r: 14 });
  c.fillStyle = col; c.fillRect(0, 22, 6, h - 44);
  text(c, head, 34, 62, { size: 34, family: 'JB', weight: 800, color: col });
  text(c, title, 34, 122, { size: o.titleSize || 40, family: 'SHSerif', weight: 900, color: '#fff' });
  (Array.isArray(sub) ? sub : [sub]).forEach((sline, i) => text(c, sline, 34, 172 + i * 40, { size: 26, family: 'SHSans', weight: 400, color: rgba('#ffffff', .78) }));
  c.restore();
}

// ============================================================ s09 基于风险的监查
const SITES = once('sites', () => { const r = rng(91), a = []; for (let i = 0; i < 64; i++) { const hot = i < 4; a.push({ x: .08 + r() * .84, y: hot ? .12 + r() * .18 : .35 + r() * .6, r: 14 + r() * 26, hot, ph: r() * TAU }); } return a; });
def('s09_rbm', {
  post: { bloom: .5, thr: .76, ca: .0016, vig: .5, grain: .038 },
  draw(S) {
    const c = S.ctx, t = S.t; const L33 = S.L('L033'), L34 = S.L('L034'), L35 = S.L('L035');
    c.fillStyle = radial(c, W / 2, H / 2, 1100, [[0, '#0b1626'], [1, '#03060b']]); c.fillRect(0, 0, W, H);
    // 罗盘转向
    const dA = env(t, -1, L34.s + .6, .1, .6);
    if (dA > 0) {
      c.save(); c.globalAlpha = dA; c.translate(W / 2, H / 2 + 40);
      for (let i = 0; i < 72; i++) { const a = i / 72 * TAU; const big = i % 6 === 0; line(c, Math.cos(a) * 300, Math.sin(a) * 300, Math.cos(a) * (big ? 270 : 286), Math.sin(a) * (big ? 270 : 286), rgba(C.cyan, big ? .8 : .35), big ? 3 : 1.5); }
      circle(c, 0, 0, 312, { stroke: rgba(C.cyan, .5), lw: 2 });
      text(c, '全部核查', -360, 12, { size: 40, family: 'SHSerif', weight: 900, color: C.amber, align: 'right' });
      text(c, '100% SDV', -360, 56, { size: 24, family: 'JB', color: rgba(C.amber, .8), align: 'right' });
      text(c, '基于风险', 360, 12, { size: 40, family: 'SHSerif', weight: 900, color: C.cyan });
      text(c, 'RISK-BASED', 360, 56, { size: 24, family: 'JB', color: rgba(C.cyan, .8) });
      const ang = lerp(Math.PI, 0, eOutElastic2(p(t, L33.s + .3, L33.s + 2.4)));
      c.rotate(ang); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(250, 0); c.lineTo(-30, -16); c.lineTo(-30, 16); c.closePath(); c.fill();
      c.restore(); circle(c, W / 2, H / 2 + 40, 16, { fill: C.cyan, alpha: dA });
    }
    // 两份文件
    const kA = env(t, L34.s - .2, L35.s + .4, .3, .6);
    if (kA > 0) {
      c.save(); c.globalAlpha = kA;
      card(c, 150, 300, 780, 330, '2013.08', 'FDA · 基于风险的监查指南', ['Oversight of Clinical Investigations —', 'A Risk-Based Approach to Monitoring'], { k: p(t, L34.s + .3, L34.s + 1.2), col: C.cyan });
      card(c, 990, 300, 780, 330, '2016.11', 'ICH E6(R2) 补充版', ['写入：基于风险的质量管理', '写入：中心化监查（Centralized Monitoring）'], { k: p(t, L34.s + 5.4, L34.s + 6.3), col: C.green });
      c.restore();
    }
    // 风险热图
    const hA = smooth(p(t, L35.s - .4, L35.s + .4));
    if (hA > 0) {
      c.save(); c.globalAlpha = hA;
      c.fillStyle = 'rgba(3,6,11,.92)'; c.fillRect(0, 0, W, H);
      const bx = 200, by = 200, bw = 1520, bh = 680;
      line(c, bx, by + bh, bx + bw, by + bh, rgba('#fff', .3), 2); line(c, bx, by, bx, by + bh, rgba('#fff', .3), 2);
      text(c, '风险评分 ↑', bx - 20, by - 20, { size: 22, family: 'SHSans', color: rgba('#fff', .6) });
      text(c, '研究中心（按入组量）→', bx + bw, by + bh + 44, { size: 22, family: 'SHSans', color: rgba('#fff', .6), align: 'right' });
      const focus = eInOut(p(t, L35.s + 1.0, L35.s + 2.6));
      for (const st of SITES) {
        const x = bx + st.x * bw, y = by + st.y * bh;
        const a = st.hot ? 1 : lerp(.85, .25, focus);
        const col = st.hot ? C.red : C.cyan;
        circle(c, x, y, st.r * (st.hot ? 1 + .12 * Math.sin(t * 5 + st.ph) : 1), { fill: rgba(col, st.hot ? .35 : .18), stroke: rgba(col, .8), lw: 2, alpha: a });
        if (st.hot && focus > .5) brackets(c, x - st.r - 14, y - st.r - 14, st.r * 2 + 28, st.r * 2 + 28, { color: C.red, len: 12, lw: 2.5, alpha: smooth(p(focus, .5, 1)) });
      }
      // 扫描光束（全都看）
      if (focus < 1) { const sx = bx + ((t - L35.s) * 900 % bw); c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(sx - 120, 0, sx, 0); g.addColorStop(0, 'rgba(62,230,255,0)'); g.addColorStop(1, `rgba(62,230,255,${.25 * (1 - focus)})`); c.fillStyle = g; c.fillRect(sx - 120, by, 120, bh); c.restore(); }
      const kri = ['AE 报告率', '方案偏离', '数据录入延迟', '质疑未关闭'];
      kri.forEach((k, i) => { const a = smooth(p(t, L35.s + 1.6 + i * .25, L35.s + 2.2 + i * .25)); panel(c, 1380, 220 + i * 70, 300, 54, { fill: 'rgba(40,8,16,.85)', stroke: rgba(C.red, .8), r: 8, alpha: a }); text(c, 'KRI · ' + k, 1400, 256 + i * 70, { size: 24, family: 'SHSans', weight: 700, color: '#ffd0d8', alpha: a }); });
      const s1 = smooth(p(t, L35.s + .2, L35.s + .9)), s2 = smooth(p(t, L35.s + 2.2, L35.s + 3));
      text(c, '全都看', 420, 150, { size: 52, family: 'SHSerif', weight: 900, color: rgba('#fff', .9), align: 'center', alpha: s1 });
      if (s2 > 0) line(c, 330, 132, 330 + 180 * s2, 132, C.red, 6);
      text(c, '→  看最重要的', 830, 150, { size: 52, family: 'SHSerif', weight: 900, color: C.cyan, align: 'center', alpha: s2 });
      c.restore();
    }
  },
});
function eOutElastic2(t) { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -9 * t) * Math.sin((t * 9 - .75) * (2 * Math.PI / 3.4)) + 1; }
transition('s10_722', { type: 'black', d: .8 });

// ============================================================ s10 722
const CLOUD = once('clouds', () => { const r = rng(55), a = []; for (let i = 0; i < 60; i++) a.push({ x: r() * W * 1.4 - W * .2, y: r() * 420 - 60, r: 120 + r() * 260, sp: 8 + r() * 30, d: r() }); return a; });
function bolt(c, x, y, len, seed, a) {
  const r = rng(seed); c.save(); c.globalAlpha = a; c.strokeStyle = '#e8f0ff'; c.lineWidth = 4; c.shadowColor = '#9fc8ff'; c.shadowBlur = 20; c.beginPath(); c.moveTo(x, y);
  let px = x, py = y; while (py < y + len) { px += (r() - .5) * 90; py += 30 + r() * 50; c.lineTo(px, py); if (r() < .2) { c.moveTo(px, py); c.lineTo(px + (r() - .5) * 160, py + 60 + r() * 60); c.moveTo(px, py); } }
  c.stroke(); c.restore();
}
def('s10_722', {
  post: { bloom: .55, thr: .74, ca: .002, vig: .6, grain: .045, tint: [1.02, .98, 1] },
  draw(S) {
    const c = S.ctx, t = S.t; const L36 = S.L('L036'), L37 = S.L('L037'), L38 = S.L('L038'), L39 = S.L('L039');
    c.fillStyle = '#05070c'; c.fillRect(0, 0, W, H);
    // 云层
    const cl = 1 - smooth(p(t, L39.s - .5, L39.s + .5));
    if (cl > 0) {
      c.save(); c.globalAlpha = cl;
      for (const k of CLOUD) { const x = ((k.x + t * k.sp) % (W * 1.5)) - W * .25; c.fillStyle = radial(c, x, k.y, k.r, [[0, `rgba(${40 + k.d * 30 | 0},${44 + k.d * 30 | 0},${58 + k.d * 30 | 0},.55)`], [1, 'rgba(20,22,30,0)']]); c.fillRect(x - k.r, k.y - k.r, k.r * 2, k.r * 2); }
      c.restore();
      // 闪电
      const strikes = [L36.s + .9, L36.s + 2.6, L37.s + .4, L37.s + 6.2, L37.s + 10.4];
      for (const [i, st] of strikes.entries()) { const a = Math.max(0, 1 - Math.abs(t - st) * 7); if (a > 0) { bolt(c, 300 + ihash(i * 9) * 1300, -20, 520, i * 13 + 1, a); S.post.flash = Math.max(S.post.flash, a * .35); } }
    }
    // 7·22
    const dA = env(t, L37.s - .2, L37.s + 7.2, .2, .6);
    if (dA > 0) {
      const k = eOutBack(p(t, L37.s, L37.s + .6), 1.6);
      text(c, '2015', W / 2, 250, { size: 48, family: 'JB', weight: 700, color: rgba('#fff', .8), align: 'center', alpha: dA, ls: 20 });
      c.save(); c.translate(W / 2, 470); c.scale(lerp(1.6, 1, k), lerp(1.6, 1, k)); c.rotate(-.04);
      text(c, '7 · 22', 0, 0, { size: 230, family: 'SHSerif', weight: 900, color: C.red, align: 'center', alpha: dA * smooth(p(t, L37.s, L37.s + .25)) });
      c.restore();
      text(c, '药物临床试验数据自查核查', W / 2, 570, { size: 46, family: 'SHSerif', weight: 700, color: '#fff', align: 'center', alpha: dA * smooth(p(t, L37.s + .9, L37.s + 1.6)), ls: 6 });
      text(c, '被称为“史上最严”的数据核查', W / 2, 626, { size: 28, family: 'SHSans', color: rgba('#fff', .65), align: 'center', alpha: dA * smooth(p(t, L37.s + 1.4, L37.s + 2.1)) });
    }
    // 1622 份申请被风暴卷走
    const gA = env(t, L37.s + 6.6, L39.s + .2, .6, .6);
    if (gA > 0) {
      c.save(); c.globalAlpha = gA; c.fillStyle = `rgba(5,7,12,${.7})`; c.fillRect(0, 0, W, H);
      const cols = 58, rows = 28, sx = 26, sy = 26, ox = W / 2 - cols * sx / 2, oy = 260;
      const sweep = p(t, L37.s + 9.2, L37.s + 13.6);
      let gone = 0;
      for (let i = 0; i < 1622; i++) {
        const x = ox + (i % cols) * sx, y = oy + Math.floor(i / cols) * sy;
        const h = ihash(i * 3 + 1); const stays = h > .8;
        const app = smooth(p(t, L37.s + 6.8 + (i / 1622) * 1.6, L37.s + 7.2 + (i / 1622) * 1.6));
        if (app <= 0) continue;
        let dx = 0, dy = 0, rot = 0, a = app;
        if (!stays) { const u = clamp((sweep - h * .7) / .3); if (u > 0) { gone++; dx = eIn(u) * (900 + ihash(i) * 900); dy = -eIn(u) * (300 + ihash(i + 5) * 500); rot = u * (ihash(i + 9) - .5) * 8; a *= 1 - u; } }
        if (a <= 0) continue;
        c.save(); c.translate(x + dx, y + dy); c.rotate(rot); c.fillStyle = stays ? `rgba(255,214,107,${a})` : `rgba(200,210,230,${a * .8})`; c.fillRect(-8, -10, 16, 20); c.fillStyle = `rgba(0,0,0,${.3 * a})`; c.fillRect(-5, -5, 10, 2); c.fillRect(-5, 0, 8, 2); c.restore();
      }
      text(c, fmt(1622 * smooth(p(t, L37.s + 6.8, L37.s + 8.6))), 260, 210, { size: 76, family: 'JB', weight: 800, color: '#fff' });
      text(c, '个待审注册申请被要求自查', 560, 200, { size: 32, family: 'SHSans', weight: 500, color: rgba('#fff', .8) });
      const wk = smooth(p(t, L37.s + 11, L37.s + 12.4));
      text(c, '→ 约 80% 被申请人主动撤回', W - 200, 210, { size: 50, family: 'SHSerif', weight: 900, color: C.red, align: 'right', alpha: wk });
      c.restore();
    }
    // 口号印章
    const sA = env(t, L38.s - .1, L39.s + .3, .2, .5);
    if (sA > 0) { c.save(); c.globalAlpha = sA; c.fillStyle = 'rgba(5,7,12,.75)'; c.fillRect(0, 0, W, H); stamp(c, W / 2, H / 2 - 40, ['数据可信', '不是一句口号'], { k: p(t, L38.s + .8, L38.s + 1.5), w: 760, h: 290, size: 120, rot: -.05, col: '#e2223f', seed: 9 }); c.restore(); }
    // 2017 加入 ICH
    const iA = smooth(p(t, L39.s - .4, L39.s + .5));
    if (iA > 0) {
      c.save(); c.globalAlpha = iA; c.fillStyle = radial(c, W / 2, H / 2, 900, [[0, '#0c1a2c'], [1, '#03060b']]); c.fillRect(0, 0, W, H);
      const cx = W / 2, cy = H / 2 - 10, R = 300, n = 14; const j = eOutBack(p(t, L39.s + .4, L39.s + 1.6), 1.1);
      for (let i = 0; i < n; i++) { const a = i / n * TAU - Math.PI / 2 + t * .05; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; line(c, cx, cy, x, y, rgba(C.cyan, .18), 1.5); circle(c, x, y, 16, { fill: rgba(C.cyan, .5), stroke: C.cyan, lw: 2 }); }
      const na = Math.PI / 2 + .25; const tx = cx + Math.cos(na) * R, ty = cy + Math.sin(na) * R;
      const nx = lerp(cx + 900, tx, j), ny = lerp(cy + 500, ty, j);
      line(c, cx, cy, nx, ny, rgba(C.gold, .7 * smooth(p(j, .8, 1))), 3); glowDot(c, nx, ny, 70, C.gold, .8); circle(c, nx, ny, 22, { fill: C.gold });
      text(c, '中国 CFDA（现 NMPA）', nx + 40, ny + 12, { size: 30, family: 'SHSans', weight: 700, color: C.gold, alpha: smooth(p(j, .7, 1)) });
      circle(c, cx, cy, 110, { fill: 'rgba(10,30,50,.9)', stroke: C.cyan, lw: 3 });
      text(c, 'ICH', cx, cy + 22, { size: 64, family: 'Orbitron', weight: 900, color: '#fff', align: 'center', ls: 6 });
      text(c, '2017 · 中国加入 ICH', W / 2, 150, { size: 54, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 4, alpha: smooth(p(t, L39.s + .8, L39.s + 1.6)) });
      c.restore();
    }
  },
});
transition('s11_2020', { type: 'black', d: .9 });

// ============================================================ s11 2020 大门关上
def('s11_2020', {
  post: { bloom: .45, thr: .8, ca: .0016, vig: .55, grain: .045, tint: [.96, 1.02, 1.04], sat: .85 },
  draw(S) {
    const c = S.ctx, t = S.t; const L40 = S.L('L040'), L41 = S.L('L041'), L42 = S.L('L042');
    c.fillStyle = '#060a10'; c.fillRect(0, 0, W, H);
    // 医院大门
    const dA = 1 - smooth(p(t, L41.s - .4, L41.s + .3));
    if (dA > 0) {
      c.save(); c.globalAlpha = dA;
      c.fillStyle = '#0d1520'; c.fillRect(0, 0, W, H);
      c.fillStyle = '#16222f'; c.fillRect(260, 120, 1400, 700);
      c.fillStyle = '#1f6f6a'; c.fillRect(260, 120, 1400, 90); text(c, '医院 · HOSPITAL', W / 2, 182, { size: 50, family: 'SHSans', weight: 900, color: '#e8fffb', align: 'center', ls: 20 });
      // 室内暖光
      c.fillStyle = radial(c, W / 2, 560, 600, [[0, 'rgba(180,230,220,.28)'], [1, 'rgba(180,230,220,0)']]); c.fillRect(300, 220, 1320, 600);
      const close = eInOut(p(t, L40.s + 2.2, L40.e + .2));
      const gw = 700 * close;
      c.fillStyle = 'rgba(150,190,200,.55)'; c.fillRect(260, 220, gw, 600); c.fillRect(1660 - gw, 220, gw, 600);
      c.strokeStyle = '#9fb7c0'; c.lineWidth = 6; c.strokeRect(260, 220, gw, 600); c.strokeRect(1660 - gw, 220, gw, 600);
      if (close > .98) { line(c, W / 2, 220, W / 2, 820, '#dfe9ee', 6); }
      // 告示
      const sg = smooth(p(t, L40.e - .4, L40.e + .3));
      panel(c, W / 2 - 330, 420, 660, 150, { fill: 'rgba(250,250,245,.95)', stroke: '#c0392b', lw: 6, r: 8, alpha: sg });
      text(c, '疫情防控期间', W / 2, 482, { size: 40, family: 'SHSans', weight: 900, color: '#c0392b', align: 'center', alpha: sg });
      text(c, '非必要人员 暂停进入', W / 2, 538, { size: 36, family: 'SHSans', weight: 700, color: '#333', align: 'center', alpha: sg });
      c.fillStyle = '#0a0e15'; c.fillRect(0, 820, W, 260);
      walker(c, 1760, 900, 1.05, 0, { color: '#03050a' });
      if (t > L40.e + .1 && t < L40.e + .3) S.post.exp = 1.08;
      c.restore();
    }
    // 远程工具箱
    const gA = env(t, L41.s - .3, L42.s + .3, .5, .5);
    if (gA > 0) {
      c.save(); c.globalAlpha = gA;
      const cells = [[120, 150, '远程监查', 'REMOTE MONITORING', 0], [990, 150, '远程源数据核查', 'rSDV', 1.7], [120, 560, '电子知情同意', 'eCONSENT', 3.4], [990, 560, '药物直达患者', 'DIRECT-TO-PATIENT', 5.2]];
      for (const [x, y, zh, en, d] of cells) {
        const k = smooth(p(t, L41.s + .3 + d, L41.s + 1 + d)); if (k <= 0) continue;
        c.save(); c.globalAlpha *= k; c.translate(0, (1 - k) * 30);
        panel(c, x, y, 810, 370, { fill: 'rgba(10,22,34,.95)', stroke: rgba(C.cyan, .6), lw: 2, r: 16 });
        text(c, zh, x + 30, y + 60, { size: 40, family: 'SHSerif', weight: 900, color: '#fff' });
        text(c, en, x + 30, y + 96, { size: 20, family: 'JB', weight: 500, color: C.cyan, ls: 4 });
        const ix = x + 30, iy = y + 120, iw = 750, ih = 220;
        if (d === 0) { for (let i = 0; i < 6; i++) { const tx = ix + (i % 3) * 252, ty = iy + Math.floor(i / 3) * 112; c.fillStyle = '#1b2a3c'; c.fillRect(tx, ty, 240, 102); circle(c, tx + 120, ty + 44, 22, { fill: '#5d7894' }); c.fillStyle = '#5d7894'; rrect(c, tx + 80, ty + 70, 80, 32, 14); c.fill(); if (i === (Math.floor(t * 1.5) % 6)) { c.strokeStyle = C.green; c.lineWidth = 3; c.strokeRect(tx, ty, 240, 102); } } }
        if (d === 1.7) { c.fillStyle = '#d6dbe2'; c.fillRect(ix, iy, iw, ih); for (let i = 0; i < 8; i++) { c.fillStyle = i % 3 === 1 ? '#111' : '#8a94a6'; c.fillRect(ix + 20, iy + 18 + i * 24, i % 3 === 1 ? 160 : 380 + hash1(i) * 200, 10); } stamp(c, ix + iw - 150, iy + ih / 2, ['已脱敏', 'REDACTED'], { k: p(t, L41.s + 2.6, L41.s + 3.1), w: 220, h: 100, size: 40, col: '#d43b3b', rot: -.12, seed: 4 }); }
        if (d === 3.4) { c.fillStyle = '#1c232d'; rrect(c, ix + 160, iy - 10, 430, 240, 18); c.fill(); c.fillStyle = '#e9edf2'; c.fillRect(ix + 180, iy + 8, 390, 204); text(c, '知情同意书 · 电子签署', ix + 375, iy + 50, { size: 24, family: 'SHSans', weight: 700, color: '#223', align: 'center' }); line(c, ix + 220, iy + 160, ix + 530, iy + 160, '#99a', 2); const sp = p(t, L41.s + 4.2, L41.s + 5.2); c.save(); c.strokeStyle = '#1a3a8a'; c.lineWidth = 3; c.beginPath(); for (let u = 0; u <= sp; u += .01) { const xx = ix + 240 + u * 260, yy = iy + 150 - Math.sin(u * 22) * 14 * (1 - u * .5) - u * 10; if (u === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); } c.stroke(); c.restore(); }
        if (d === 5.2) { c.fillStyle = '#3a2c1c'; c.fillRect(ix + 520, iy, 200, 220); c.fillStyle = '#c9a26a'; const bx = lerp(ix - 100, ix + 260, eOut(p(t, L41.s + 5.8, L41.s + 7))); c.fillRect(bx, iy + 90, 220, 130); c.fillStyle = '#e8f4ff'; c.fillRect(bx + 20, iy + 110, 120, 50); text(c, '试验用药品', bx + 80, iy + 140, { size: 18, family: 'SHSans', weight: 700, color: '#234', align: 'center' }); text(c, '❄ 2–8℃', bx + 175, iy + 140, { size: 16, family: 'SHSans', weight: 700, color: '#2a7ab8', align: 'center' }); }
        c.restore();
      }
      c.restore();
    }
    // 监查 ≠ 到场
    const nA = smooth(p(t, L42.s - .2, L42.s + .5));
    if (nA > 0) {
      c.save(); c.globalAlpha = nA; c.fillStyle = 'rgba(6,10,16,.94)'; c.fillRect(0, 0, W, H);
      const k = eOutExpo(p(t, L42.s + 2.4, L42.s + 3.2));
      text(c, '监查', W / 2 - 330, H / 2 + 50, { size: 170, family: 'SHSerif', weight: 900, color: '#fff', align: 'center' });
      text(c, '≠', W / 2, H / 2 + 40, { size: 170, family: 'SHSerif', weight: 900, color: C.cyan, align: 'center', alpha: k });
      text(c, '到场', W / 2 + 330, H / 2 + 50, { size: 170, family: 'SHSerif', weight: 900, color: rgba('#fff', lerp(1, .55, k)), align: 'center' });
      text(c, 'MONITORING  ≠  ON-SITE', W / 2, H / 2 + 150, { size: 30, family: 'JB', weight: 500, color: rgba(C.cyan, .85), align: 'center', ls: 10, alpha: k });
      c.restore();
    }
    chapterCard(S, '第 四 章', '大门关上的那一年', { sub: '2020', color: C.cyan });
  },
});
transition('s12_llm', { type: 'black', d: .9 });

// ============================================================ s12 我的祖先
const TASKS = [['监查访视报告', 'MVR · 自动起草', '本次访视共核对 37 份病历，发现 2 项方案偏离……'], ['方案偏离', 'PD · 归类与趋势', '偏离类型：访视窗外 ×3 / 合并用药 ×1……'], ['质疑', 'QUERY · 智能起草', '请核实受试者 012 第 3 次访视心率记录……'], ['文件归档', 'eTMF · 自动分类', 'ICF_V3.0_签字页.pdf → 05.01.01 已归档']];
def('s12_llm', {
  post: { bloom: .55, thr: .74, ca: .0016, vig: .5, grain: .036 },
  draw(S) {
    const c = S.ctx, t = S.t; const L43 = S.L('L043'), L44 = S.L('L044');
    c.fillStyle = '#05080e'; c.fillRect(0, 0, W, H);
    const tA = env(t, L43.s - .4, L44.s + .4, .5, .5);
    if (tA > 0) {
      c.save(); c.globalAlpha = tA;
      // 终端
      panel(c, 160, 160, 940, 620, { fill: 'rgba(8,14,22,.96)', stroke: rgba('#ffffff', .25), lw: 2, r: 14 });
      for (let i = 0; i < 3; i++) circle(c, 196 + i * 30, 192, 8, { fill: ['#ff5f56', '#ffbd2e', '#27c93f'][i] });
      typeText(c, '2022.11.30', 210, 300, p(t, L43.s + .2, L43.s + 1.4), { size: 84, family: 'JB', weight: 800, color: '#fff', cursor: true, t });
      const q = p(t, L43.s + 1.8, L43.s + 3.2);
      typeText(c, '> 你好，你是谁？', 210, 400, q, { size: 34, family: 'JB', color: rgba(C.green, .95) });
      const a2 = p(t, L43.s + 3.4, L43.s + 6.4);
      typeText(c, '我是一个大型语言模型，可以回答问题、', 210, 470, a2 * 2, { size: 32, family: 'SHSans', color: '#e6edf5' });
      typeText(c, '写作、总结，以及……', 210, 520, a2 * 2 - 1, { size: 32, family: 'SHSans', color: '#e6edf5', cursor: a2 > .5, t });
      text(c, 'ChatGPT', 210, 720, { size: 52, family: 'SHSans', weight: 900, color: C.green, alpha: smooth(p(t, L43.s + 1, L43.s + 2)) });
      // 族谱
      const fA = smooth(p(t, L43.s + 4.6, L43.s + 5.8));
      if (fA > 0) {
        const x = 1460; const nodes = [[740, '2022', 'ChatGPT'], [560, '2025', 'CRA 智能体'], [380, '……', ''], [200, '2047', 'ARGUS']];
        nodes.forEach(([y, yr, nm], i) => {
          const k = smooth(p(t, L43.s + 4.6 + i * .5, L43.s + 5.3 + i * .5)); if (k <= 0) return;
          if (i > 0) line(c, x, nodes[i - 1][0] - 30, x, y + 30, rgba(C.cyan, .6 * k), 3);
          if (i === 3) drawEye(c, x, y, 34, t, { open: k, alpha: k, detail: .3 }); else circle(c, x, y, 22, { fill: i === 0 ? C.green : rgba(C.cyan, .5), stroke: C.cyan, lw: 2, alpha: k });
          text(c, yr, x - 70, y + 10, { size: 30, family: 'JB', weight: 700, color: rgba('#fff', .8), align: 'right', alpha: k });
          text(c, nm, x + 70, y + 12, { size: 34, family: 'SHSans', weight: 700, color: i === 3 ? C.cyan : '#fff', alpha: k });
        });
        text(c, '我 的 祖 先', x, 900, { size: 46, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 8, alpha: fA });
      }
      c.restore();
    }
    // 四张任务卡
    const kA = smooth(p(t, L44.s - .3, L44.s + .5));
    if (kA > 0) {
      c.save(); c.globalAlpha = kA; c.fillStyle = 'rgba(5,8,14,.96)'; c.fillRect(0, 0, W, H);
      text(c, '大语言模型 · 进入监查工作', W / 2, 150, { size: 46, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 4 });
      TASKS.forEach(([zh, en, body], i) => {
        const x = 110 + i * 435, y = 250; const k = p(t, L44.s + .4 + i * .9, L44.s + 1.2 + i * .9); if (k <= 0) return;
        c.save(); c.globalAlpha *= smooth(k); c.translate(0, (1 - eOut(k)) * 40);
        panel(c, x, y, 400, 560, { fill: 'rgba(10,20,34,.95)', stroke: rgba(C.cyan, .7), lw: 2, r: 16 });
        text(c, zh, x + 28, y + 70, { size: 40, family: 'SHSerif', weight: 900, color: '#fff' });
        text(c, en, x + 28, y + 110, { size: 20, family: 'JB', weight: 500, color: C.cyan, ls: 2 });
        const tp = p(t, L44.s + 1 + i * .9, L44.s + 4.5 + i * .9);
        // 流式文本
        const chars = body.length; const shown = body.slice(0, Math.floor(tp * chars));
        const linesArr = []; let cur = ''; for (const ch of shown) { cur += ch; if (measure(c, cur, { size: 26, family: 'SHSans' }) > 340) { linesArr.push(cur); cur = ''; } } if (cur) linesArr.push(cur);
        linesArr.forEach((l, j) => text(c, l, x + 28, y + 180 + j * 40, { size: 26, family: 'SHSans', color: '#d9e6f2' }));
        for (let j = 0; j < 5; j++) { const w = (260 + hash1(i * 7 + j) * 80) * clamp(tp * 1.4 - j * .15); c.fillStyle = rgba(C.cyan, .18); c.fillRect(x + 28, y + 330 + j * 30, w, 10); }
        panel(c, x + 28, y + 490, 344, 14, { fill: 'rgba(255,255,255,.08)', stroke: null, r: 7 }); panel(c, x + 28, y + 490, 344 * tp, 14, { fill: C.green, stroke: null, r: 7 });
        text(c, tp >= 1 ? '✓ 待人工复核' : 'AI 生成中…', x + 372, y + 470, { size: 22, family: 'SHSans', weight: 700, color: tp >= 1 ? C.green : rgba('#fff', .6), align: 'right' });
        c.restore();
      });
      c.restore();
    }
    chapterCard(S, '第 五 章', '我的祖先', { sub: '2022 — 2026', color: C.green });
  },
});
transition('s13_rules', { type: 'cross', d: .8 });

// ============================================================ s13 2025—2026 规则与工具
const MILES = [
  ['L045', '2025.01', 'ICH E6(R3) 定稿', ['质量源于设计 · 风险相称', '对新技术保持开放'], C.cyan],
  ['L046', '2025.06', 'FDA 上线 Elsa', ['监管机构自己的生成式 AI 工具'], C.green],
  ['L047', '2025.09', 'CRA 智能体出现', ['面向监查工作的 AI 智能体'], C.amber],
  ['L048', '2026.01', 'FDA × EMA 十条原则', ['药物研发中良好 AI 实践', '第一条：以人为本'], C.gold],
  ['L049', '2026.06', 'E6(R3) 附件 2 通过', ['去中心化 · 实用性 · 真实世界数据'], C.cyan],
  ['L049b', '2026.09.01', '中国新修订 GCP 施行', ['《药物临床试验质量管理规范》'], C.red],
];
def('s13_rules', {
  post: { bloom: .55, thr: .74, ca: .0016, vig: .5, grain: .036 },
  draw(S) {
    const c = S.ctx, t = S.t;
    c.fillStyle = radial(c, W / 2, H / 2, 1200, [[0, '#0a1424'], [1, '#03060b']]); c.fillRect(0, 0, W, H);
    dust(c, t, 120, '#9fdfff', .25, 8);
    const L49 = S.L('L049'), L50 = S.L('L050');
    const starts = MILES.map(m => m[0] === 'L049b' ? L49.s + 3.2 : S.L(m[0]).s);
    // 时间轴滚动：保持最新卡片在右侧
    let idx = 0; for (let i = 0; i < starts.length; i++) if (t > starts[i] - .3) idx = i;
    const spacing = 560; const target = Math.max(0, idx - 2) * spacing;
    let scroll = 0; for (let i = 3; i < starts.length; i++) scroll += spacing * eInOut(p(t, starts[i] - .5, starts[i] + .4));
    const endZoom = eInOut(p(t, L50.s - .3, L50.s + 1.2));
    const ax = 220 - scroll - endZoom * 420, ay = 640;
    line(c, 0, ay, W, ay, rgba('#ffffff', .25), 2);
    for (let i = 0; i < starts.length; i++) {
      const k = p(t, starts[i] - .2, starts[i] + .7); if (k <= 0) continue;
      const [, date, title, sub, col] = MILES[i];
      const x = ax + i * spacing; const up = i % 2 === 0;
      circle(c, x, ay, 12, { fill: col, alpha: smooth(k) });
      line(c, x, ay, x, up ? ay - 70 : ay + 70, rgba(col, .7 * smooth(k)), 2);
      const cy = up ? ay - 70 - 300 : ay + 70;
      c.save(); c.globalAlpha = 1 - .55 * endZoom; card(c, x - 60, cy, 520, sub.length > 1 ? 300 : 260, date, title, sub, { k, col, titleSize: 38 }); c.restore();
    }
    // 你在这里
    const yA = smooth(p(t, L50.s - .2, L50.s + .6));
    if (yA > 0) {
      const x = ax + (starts.length - 1) * spacing + 640; const pulse = (t * 1.2) % 1;
      circle(c, x, ay, 20 + pulse * 120, { stroke: rgba(C.gold, (1 - pulse) * .8), lw: 3, alpha: yA });
      circle(c, x, ay, 22, { fill: C.gold, alpha: yA }); glowDot(c, x, ay, 120, C.gold, .7 * yA);
      text(c, '你在这里', x, ay - 90, { size: 64, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: yA, ls: 6 });
      text(c, 'YOU ARE HERE · 2026', x, ay + 90, { size: 30, family: 'JB', weight: 700, color: C.gold, align: 'center', alpha: yA, ls: 6 });
    }
  },
});
transition('s14_extrap', { type: 'glitch', d: .7 });
