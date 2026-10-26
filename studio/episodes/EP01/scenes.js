// 《剂量》EP01 一顿饭 v3 —— 冷开场「三句真话」→「一顿饭 ×17」→ 片名
// 所有动画都是时间 t 的纯函数；节拍用 S.L('D00x') 取每句旁白在场景内的起止，cue() 取句内关键词时刻。
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eInExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, noise2, fbm, rgba, text, measure, scrambleText, rrect, line, circle, glowDot, radial, once } from '/engine.js';

// ------------------------------------------------------------------ 工具
const LINES = () => Object.fromEntries(E.tl.lines.map(l => [l.id, l]));
// 句内关键词时刻：按字数比例（去标点）估算，相对场景起点
function cue(S, id, kw, after = false) {
  const ln = LINES()[id]; const s = ln.sub.replace(/\n/g, '');
  const strip = (x) => x.replace(/[\s，。、：；！？“”‘’（）()…—\-,.!?:;《》·]/g, '');
  const k = s.indexOf(kw); if (k < 0) return ln.start - S.start;
  const pre = strip(s.slice(0, k + (after ? kw.length : 0))).length, tot = strip(s).length || 1;
  return ln.start - S.start + (ln.end - ln.start) * pre / tot;
}
function srcTag(c, s, a = 1) {   // 真实数据角标：右上，琥珀
  if (a <= 0) return;
  text(c, '真实数据 · ' + s, W - 64, 66, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .92), align: 'right', ls: 1, alpha: a });
}
function schemTag(c, s = '示意 · 非真实曲线', a = 1) {   // 示意角标：左上（水印下方），冷蓝
  if (a <= 0) return;
  text(c, s, 58, 104, { size: 21, family: 'SHSans', weight: 500, color: rgba(C.sim, .9), ls: 1, alpha: a });
}
function dust(c, t, n = 140, color = '#ffd9a0', a = .3, seed = 3, drift = 1) {
  const r = rng(seed); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 5 + r() * 16, z = r();
    const x = (x0 + t * sp * (z + .3) * drift + W * 10) % (W + 40) - 20, y = (y0 + Math.sin(t * .35 + i) * 14 - t * sp * .25 * z + H * 10) % H;
    c.fillStyle = rgba(color, a * (.15 + .85 * z) * (.55 + .45 * Math.sin(t * 1.2 + i * 1.7)));
    const s = .8 + z * 2.2; c.fillRect(x, y, s, s);
  }
  c.restore();
}
// 横向变形光晕
function flare(c, x, y, w, a = 1, col = C.dose) {
  if (a <= 0 || w < 2) return;
  c.save(); c.globalCompositeOperation = 'lighter';
  for (const [hh, al] of [[34, .10], [10, .32], [2.5, .95]]) {
    const g = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
    g.addColorStop(0, rgba(col, 0)); g.addColorStop(.5, hh < 3 ? `rgba(255,250,235,${al * a})` : rgba(col, al * a)); g.addColorStop(1, rgba(col, 0));
    c.fillStyle = g; c.fillRect(x - w / 2, y - hh / 2, w, hh);
  }
  glowDot(c, x, y, 190, '#fff4dc', .32 * a);
  c.restore();
}
// 冲击波环
function shock(c, x, y, k, col = C.dose, R = 900, a = 1) {
  if (k <= 0 || k >= 1) return;
  const r = R * eOut(k); c.save(); c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba(col, (1 - k) * .55 * a); c.lineWidth = 3 + 30 * (1 - k); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.strokeStyle = `rgba(255,248,230,${(1 - k) * .7 * a})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * .97, 0, TAU); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ 分子：醋酸阿比特龙（甾体四环 + 3β-乙酰氧基 + Δ5、Δ16 + 17 位 3-吡啶基）
const MOL = once('mol', () => {
  const s3 = Math.sqrt(3), A = {};
  const hex = (cx, cy) => [[cx, cy - 1], [cx - s3 / 2, cy - .5], [cx - s3 / 2, cy + .5], [cx, cy + 1], [cx + s3 / 2, cy + .5], [cx + s3 / 2, cy - .5]];
  const a = hex(0, 0), b = hex(s3, 0), c = hex(1.5 * s3, -1.5);
  Object.assign(A, { C1: a[0], C2: a[1], C3: a[2], C4: a[3], C5: a[4], C10: a[5], C6: b[3], C7: b[4], C8: b[5], C9: b[0], C11: c[1], C12: c[0], C13: c[5], C14: c[4] });
  const pcx = A.C13[0] + 1 / (2 * Math.tan(36 * Math.PI / 180)), pcy = -1.5, R = 1 / (2 * Math.sin(36 * Math.PI / 180));
  const pent = (d) => [pcx + R * Math.cos(d * Math.PI / 180), pcy - R * Math.sin(d * Math.PI / 180)];
  A.C17 = pent(72); A.C16 = pent(0); A.C15 = pent(-72);
  A.C18 = [A.C13[0], A.C13[1] - 1]; A.C19 = [A.C10[0], A.C10[1] - 1];
  A.O3 = [A.C3[0] - s3 / 2, A.C3[1] + .5]; A.Cac = [A.O3[0] - s3 / 2, A.O3[1] - .5]; A.Oac = [A.Cac[0], A.Cac[1] - 1]; A.Me = [A.Cac[0] - s3 / 2, A.Cac[1] + .5];
  const ux = Math.cos(72 * Math.PI / 180), uy = -Math.sin(72 * Math.PI / 180);
  const pc = [A.C17[0] + 2 * ux, A.C17[1] + 2 * uy];
  for (let k = 0; k < 6; k++) { const r = (252 + 60 * k) * Math.PI / 180; A['P' + k] = [pc[0] + Math.cos(r), pc[1] - Math.sin(r)]; }
  // 简单的空间感：角甲基朝向观众，吡啶环绕 C17–P0 轴扭出平面
  const Z = { C18: .9, C19: .9, Oac: -.5, Me: -.3 };
  const axis = [ux, uy];
  for (let k = 1; k < 6; k++) { const v = [A['P' + k][0] - A.P0[0], A['P' + k][1] - A.P0[1]]; const perp = v[0] * -axis[1] + v[1] * axis[0]; Z['P' + k] = perp * .85; }
  const single = 'C1-C2 C2-C3 C3-C4 C4-C5 C5-C10 C10-C1 C6-C7 C7-C8 C8-C9 C9-C10 C9-C11 C11-C12 C12-C13 C13-C14 C14-C8 C13-C17 C16-C15 C15-C14 C13-C18 C10-C19 C3-O3 O3-Cac Cac-Me C17-P0 P0-P1 P2-P3 P4-P5'.split(' ');
  const dbl = [['C5-C6', [s3, 0]], ['C17-C16', [pcx, pcy]], ['Cac-Oac', null], ['P1-P2', pc], ['P3-P4', pc], ['P5-P0', pc]];
  const het = { O3: 'O', Oac: 'O', P2: 'N' };
  const xs = Object.values(A).map(v => v[0]), ys = Object.values(A).map(v => v[1]);
  const c0 = [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
  const P = {}; for (const k in A) P[k] = [A[k][0] - c0[0], A[k][1] - c0[1], Z[k] || 0];
  const segs = [];
  const trim = (a, b) => { let p0 = P[a].slice(), p1 = P[b].slice(); if (het[a]) p0 = p0.map((v, i) => lerp(v, P[b][i], .28)); if (het[b]) p1 = p1.map((v, i) => lerp(v, P[a][i], .28)); return [p0, p1]; };
  for (const s of single) { const [a, b] = s.split('-'); segs.push([...trim(a, b), 0]); }
  for (const [s, rc] of dbl) {
    const [a, b] = s.split('-'); const [p0, p1] = trim(a, b); segs.push([p0, p1, 0]);
    const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2; const dx = p1[0] - p0[0], dy = p1[1] - p0[1]; const L = Math.hypot(dx, dy);
    let nx = -dy / L, ny = dx / L;
    if (rc) { const r0 = [rc[0] - c0[0], rc[1] - c0[1]]; if ((r0[0] - mx) * nx + (r0[1] - my) * ny < 0) { nx = -nx; ny = -ny; } }
    const sh = rc ? .16 : 0, o = .17;
    segs.push([[lerp(p0[0], p1[0], sh) + nx * o, lerp(p0[1], p1[1], sh) + ny * o, p0[2]], [lerp(p1[0], p0[0], sh) + nx * o, lerp(p1[1], p0[1], sh) + ny * o, p1[2]], 1]);
  }
  // 粒子目标点：沿键均匀采样
  const r = rng(31), pts = [];
  const lens = segs.map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])); const tot = lens.reduce((x, y) => x + y, 0);
  for (let i = 0; i < 2600; i++) {
    let u = r() * tot, k = 0; while (u > lens[k] && k < lens.length - 1) { u -= lens[k]; k++; }
    const f = u / lens[k], [a, b] = segs[k]; pts.push([lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f), r(), r(), r()]);
  }
  return { P, segs, het, pts, pyr: [pc[0] - c0[0], pc[1] - c0[1]] };
});
function molProj(v, cx, cy, s, yaw, pitch = .12) {
  let [x, y, z] = v; const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
  const cp = Math.cos(pitch), sp = Math.sin(pitch); const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
  const f = 9 / (9 - z2); return [cx + x1 * s * f, cy + y1 * s * f, z2];
}
function drawMol(c, cx, cy, s, t, o = {}) {
  const { alpha = 1, yaw = Math.sin(t * .45) * .55, glow = 1, col = '#fff1d6', hot = 0, red = 0 } = o;
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const base = red > 0 ? `rgba(255,${lerp(236, 70, red) | 0},${lerp(214, 80, red) | 0},` : 'rgba(255,236,214,';
  for (const [a, b, d] of MOL.segs) {
    const p0 = molProj(a, cx, cy, s, yaw), p1 = molProj(b, cx, cy, s, yaw); const z = (p0[2] + p1[2]) / 2; const depth = .55 + .45 * clamp((z + 1) / 2);
    c.strokeStyle = rgba(red > .5 ? C.risk : C.dose, .16 * glow * depth); c.lineWidth = s * .28; c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
    c.strokeStyle = base + (.95 * depth) + ')'; c.lineWidth = Math.max(2, s * .055) * (d ? .85 : 1); c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.stroke();
  }
  for (const k in MOL.P) { const q = molProj(MOL.P[k], cx, cy, s, yaw); glowDot(c, q[0], q[1], s * (MOL.het[k] ? .55 : .22), MOL.het[k] ? C.dose : '#ffe7c4', (MOL.het[k] ? .55 : .22) * glow + hot * .3); }
  c.globalCompositeOperation = 'source-over';
  for (const k in MOL.het) { const q = molProj(MOL.P[k], cx, cy, s, yaw); text(c, MOL.het[k], q[0], q[1] + s * .19, { size: s * .52, family: 'SHSans', weight: 700, color: MOL.het[k] === 'N' ? C.doseL : '#fff1d6', align: 'center' }); }
  c.restore();
}

// ------------------------------------------------------------------ 文件卡（说明书 / 期刊页），风格化示意，不仿真包装
function paperCard(c, x, y, w, h, o = {}) {
  const { alpha = 1, rot = 0, head = '', sub = '', kind = 'label', glowA = 0, seed = 1, shake = 0, t = 0 } = o;
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.translate(x + (shake ? (hash1(Math.floor(t * 40) + seed) - .5) * 14 * shake : 0), y + (shake ? (hash1(Math.floor(t * 40) + seed * 7) - .5) * 10 * shake : 0)); c.rotate(rot);
  if (glowA > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, w * .95, C.dose, .22 * glowA); c.restore(); }
  c.shadowColor = 'rgba(0,0,0,.65)'; c.shadowBlur = 40; c.shadowOffsetY = 18;
  rrect(c, -w / 2, -h / 2, w, h, 6); c.fillStyle = kind === 'journal' ? '#cdc6b8' : '#cbbfa3'; c.fill(); c.shadowColor = 'transparent';
  // 纸纹
  const r = rng(seed); c.save(); rrect(c, -w / 2, -h / 2, w, h, 6); c.clip();
  for (let i = 0; i < 140; i++) { c.fillStyle = `rgba(90,70,40,${.025 + r() * .03})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 3, 1 + r() * 3); }
  c.fillStyle = radial(c, -w * .1, -h * .45, w * 1.0, [[0, 'rgba(255,248,230,.10)'], [.55, 'rgba(0,0,0,0)'], [1, 'rgba(40,26,10,.42)']]); c.fillRect(-w / 2, -h / 2, w, h);
  c.restore();
  // 页眉
  if (kind === 'journal') { c.fillStyle = '#7a1f1a'; c.fillRect(-w / 2, -h / 2, w, 10); }
  else { c.fillStyle = '#1c2a3a'; c.fillRect(-w / 2, -h / 2, w, 54); }
  text(c, head, -w / 2 + 26, -h / 2 + (kind === 'journal' ? 44 : 36), { size: kind === 'journal' ? 19 : 22, family: kind === 'journal' ? 'Cinzel' : 'SHSans', weight: 700, color: kind === 'journal' ? '#7a1f1a' : '#f3ead6', ls: kind === 'journal' ? 3 : 1 });
  text(c, sub, -w / 2 + 26, -h / 2 + (kind === 'journal' ? 72 : 84), { size: 18, family: 'SHSans', weight: 500, color: 'rgba(40,32,22,.75)' });
  // 正文灰条（示意，不写伪造的说明书原文）
  const r2 = rng(seed + 9); let yy = -h / 2 + (kind === 'journal' ? 102 : 112);
  while (yy < h / 2 - 30) { const ww = (w - 52) * (.55 + r2() * .45); c.fillStyle = 'rgba(40,32,22,.16)'; c.fillRect(-w / 2 + 26, yy, ww, 7); yy += 19; if (r2() < .12) yy += 12; }
  c.restore();
}
// 印章：红色印泥，落下时放大回弹
function stamp(c, x, y, lines, k, o = {}) {
  if (k <= 0) return;
  const { rot = -.12, col = '#c8322b', size = 52, round = false } = o;
  const e = k < 1 ? lerp(2.2, 1, eOutExpo(k)) : 1, a = Math.min(1, k * 3);
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(e, e); c.globalAlpha *= a * .92;
  const w = Math.max(...lines.map((l, i) => measure(c, l, { size: i ? size * .42 : size, family: 'SHSerif', weight: 900, ls: i ? 2 : 8 }))) + 60, h = size * (1.25 + .6 * (lines.length - 1)) + 30;
  c.strokeStyle = col; c.lineWidth = 6;
  if (round) { c.beginPath(); c.ellipse(0, 0, w / 2 + 6, h / 2 + 14, 0, 0, TAU); c.stroke(); c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, w / 2 - 4, h / 2 + 4, 0, 0, TAU); c.stroke(); }
  else { rrect(c, -w / 2, -h / 2, w, h, 8); c.stroke(); c.lineWidth = 2; rrect(c, -w / 2 + 9, -h / 2 + 9, w - 18, h - 18, 5); c.stroke(); }
  lines.forEach((l, i) => text(c, l, 0, -h / 2 + 22 + size * .95 + (i ? size * .2 + i * size * .6 : 0), { size: i ? size * .42 : size, family: 'SHSerif', weight: 900, color: col, align: 'center', ls: i ? 2 : 8 }));
  // 印泥斑驳
  const r = rng(77); c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) { c.fillStyle = `rgba(0,0,0,${.25 + r() * .5})`; c.fillRect(-w / 2 + r() * w, -h / 2 + r() * h, 1 + r() * 4, 1 + r() * 2); }
  c.restore();
}
// 两点之间的电弧（矛盾）
function arc(c, x0, y0, x1, y1, t, a, seed, col = C.risk) {
  if (a <= 0) return;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
  for (const [lw, al] of [[10, .12], [3.2, .6], [1.4, 1]]) {
    c.strokeStyle = al === 1 ? `rgba(255,220,210,${a})` : rgba(col, al * a); c.lineWidth = lw; c.beginPath();
    const n = 26; const fr = Math.floor(t * 24);
    for (let i = 0; i <= n; i++) {
      const u = i / n; const j = Math.sin(u * Math.PI);
      const ox = (hash2(i + seed, fr) - .5) * 70 * j, oy = (hash2(i + seed * 3, fr + 7) - .5) * 70 * j;
      const x = lerp(x0, x1, u) + ox, y = lerp(y0, y1, u) + oy; i ? c.lineTo(x, y) : c.moveTo(x, y);
    }
    c.stroke();
  }
  c.restore();
}

// 三张文件卡的位置
const CARD = { A: [400, 590, 520, 360], B: [1520, 590, 520, 360], Cc: [960, 660, 520, 400] };

// ============================================================ s00 冷开场：三句真话
def('s00_paradox', {
  clear: '#030406',
  post: (S) => ({ bloom: .55, thr: .82, ca: .0022, vig: .55, grain: .045, tint: [1.05, 1.0, .93], con: 1.07, mark: true, markA: smooth(p(S.t, 4, 5.5)) }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L1 = S.L('D001'), L2 = S.L('D002'), L3 = S.L('D003'), L4 = S.L('D004'), L5 = S.L('D005'), L6 = S.L('D006');
    dust(c, t, 120, '#ffd9a0', .22, 5);
    // ---- 开场：一道竖直的光
    const beam = env(t, .2, L1.s + .5, .6, .35);
    if (beam > 0) {
      const hgt = H * eOutExpo(p(t, .2, 1.4));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0); g.addColorStop(0, rgba(C.dose, 0)); g.addColorStop(.5, rgba(C.dose, .35 * beam)); g.addColorStop(1, rgba(C.dose, 0));
      c.fillStyle = g; c.fillRect(W / 2 - 60, H / 2 - hgt / 2, 120, hgt);
      c.fillStyle = `rgba(255,248,232,${.9 * beam})`; c.fillRect(W / 2 - 1.5, H / 2 - hgt / 2, 3, hgt);
      c.restore();
      glowDot(c, W / 2, H / 2, 220, '#fff2d8', .25 * beam);
    }
    // ---- 分子：光爆成粒子，聚成分子；随后上移让出三张卡
    const up = eInOut(p(t, L2.s - .5, L2.s + .9));
    const mx = W / 2, my = lerp(H / 2 - 70, 250, up), ms = lerp(70, 34, up);
    const yaw = Math.sin(t * .45) * .5 + .25;
    const burst = p(t, L1.s - .25, L1.s + 1.35);
    const red = smooth(p(t, L5.s + .2, L5.s + 1.0)) * (1 - smooth(p(t, L6.s + .9, L6.s + 1.3)));
    if (burst > 0 && burst < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < MOL.pts.length; i++) {
        const q = MOL.pts[i]; const d = q[3] * .35; const k = smoother(clamp((burst - d) / (1 - d)));
        const tg = molProj(q, mx, my, ms, yaw);
        const ang = q[4] * TAU, rad = (180 + q[5] * 700) * Math.sin(k * Math.PI) ;
        const sx = W / 2 + (q[4] - .5) * 6, sy = H / 2 + (q[5] - .5) * H;
        const x = lerp(sx, tg[0], k) + Math.cos(ang) * rad * (1 - k), y = lerp(sy, tg[1], k) + Math.sin(ang) * rad * .55 * (1 - k);
        c.fillStyle = q[3] > .8 ? `rgba(255,200,120,${.9 * (1 - k * .6)})` : `rgba(255,240,220,${.8 * (1 - k * .5)})`;
        const s = 1.4 + q[5] * 1.8; c.fillRect(x - s / 2, y - s / 2, s, s);
      }
      c.restore();
    }
    const molA = smooth(p(t, L1.s + .9, L1.s + 1.5));
    drawMol(c, mx, my, ms, t, { alpha: molA, yaw, glow: 1 + .6 * Math.max(0, 1 - p(t, L1.s + .9, L1.s + 2)), red, hot: red });
    const nameA = env(t, L1.s + 1.0, L2.s + .4, .5, .4);
    text(c, '醋 酸 阿 比 特 龙', W / 2, H / 2 + 270, { size: 34, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 6, alpha: nameA });
    text(c, 'ABIRATERONE  ACETATE', W / 2, H / 2 + 314, { size: 22, family: 'Cinzel', weight: 700, color: rgba(C.dose, .9), align: 'center', ls: 12, alpha: nameA });
    // ---- 三张卡
    const fly = (s0, dir) => eOutExpo(p(t, s0, s0 + .75));
    const kA = fly(L2.s - .05), kB = fly(L3.s - .05), kC = fly(L4.s - .05);
    const conflict = env(t, L5.s - .1, L6.s + .45, .25, .25);
    const truth = smooth(p(t, L6.s + .55, L6.s + 1.1));
    const outA = 1 - smooth(p(t, S.dur - .5, S.dur));
    const sh = conflict * (1 - truth);
    // 卡片拖影（运动模糊感）
    const ghost = (k, draw) => { if (k > 0 && k < .98) for (let g = 3; g >= 1; g--) { c.save(); c.globalAlpha = .12 * g / 3; draw(clamp(k - g * .06)); c.restore(); } draw(k); };
    ghost(kA, (k) => paperCard(c, lerp(-420, CARD.A[0], k), CARD.A[1], CARD.A[2], CARD.A[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(-.35, -.04, k), head: 'ZYTIGA®  处方信息', sub: '§2  用法用量', seed: 3, glowA: truth, shake: sh, t }));
    ghost(kB, (k) => paperCard(c, lerp(W + 420, CARD.B[0], k), CARD.B[1], CARD.B[2], CARD.B[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(.35, .04, k), head: 'YONSA®  处方信息', sub: '§2  用法用量', seed: 5, glowA: truth, shake: sh, t }));
    ghost(kC, (k) => paperCard(c, CARD.Cc[0], lerp(-320, CARD.Cc[1], k), CARD.Cc[2], CARD.Cc[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(.2, -.015, k), head: 'JOURNAL OF CLINICAL ONCOLOGY · 2018', sub: '随机 II 期 · 低剂量随餐 vs 标准剂量空腹', kind: 'journal', seed: 7, glowA: truth, shake: sh, t }));
    // 印章与要点
    const sA = p(t, cue(S, 'D002', '空腹'), cue(S, 'D002', '空腹') + .35);
    stamp(c, CARD.A[0] + 10, CARD.A[1] + 40, ['空腹服用'], sA * outA, { rot: -.1, size: 62 });
    const sB = p(t, cue(S, 'D003', '都可以') - .1, cue(S, 'D003', '都可以') + .25);
    stamp(c, CARD.B[0], CARD.B[1] + 40, ['随餐均可', '随 餐 或 不 随 餐'], sB * outA, { rot: .08, size: 54, round: true });
    const qk = p(t, cue(S, 'D004', '四分之一') - .2, cue(S, 'D004', '四分之一') + .5);
    if (qk > 0) {
      const a = Math.min(1, qk * 3) * outA, e = lerp(1.8, 1, eOutExpo(qk));
      c.save(); c.translate(CARD.Cc[0], CARD.Cc[1] + 30); c.rotate(-.015); c.scale(e, e);
      text(c, '¼', -120, 70, { size: 230, family: 'SHSerif', weight: 900, color: '#7a1f1a', align: 'center', alpha: a });
      text(c, '250 mg', 40, -10, { size: 50, family: 'JB', weight: 700, color: '#2a1f16', alpha: a });
      text(c, '+ 低脂早餐', 40, 40, { size: 32, family: 'SHSans', weight: 700, color: '#7a1f1a', alpha: a });
      text(c, 'vs 1000 mg 空腹', 40, 86, { size: 26, family: 'SHSans', weight: 500, color: 'rgba(42,31,22,.8)', alpha: a });
      c.restore();
    }
    // 来源
    const srcA = smooth(p(t, L2.s + 1.5, L2.s + 2.2)) * outA;
    text(c, 'ZYTIGA 标签 §2', CARD.A[0], CARD.A[1] + CARD.A[3] / 2 + 40, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: srcA });
    text(c, 'YONSA 标签 §2', CARD.B[0], CARD.B[1] + CARD.B[3] / 2 + 40, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: smooth(p(t, L3.s + 1.5, L3.s + 2.2)) * outA });
    text(c, 'Szmulewitz 等 · J Clin Oncol 2018', CARD.Cc[0], CARD.Cc[1] + CARD.Cc[3] / 2 + 34, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: smooth(p(t, L4.s + 1.5, L4.s + 2.2)) * outA });
    srcTag(c, '来源见各卡', smooth(p(t, L2.s + 1.5, L2.s + 2.2)) * outA);
    // ---- 矛盾：电弧 + 抖动 + 故障
    if (conflict > 0) {
      const pa = [CARD.A[0] + 200, CARD.A[1] - 120], pb = [CARD.B[0] - 200, CARD.B[1] - 120], pc = [CARD.Cc[0], CARD.Cc[1] - 190];
      arc(c, pa[0], pa[1], pb[0], pb[1], t, conflict * (1 - truth), 11);
      arc(c, pa[0], pa[1] + 60, pc[0] - 150, pc[1] + 40, t, conflict * (1 - truth), 23);
      arc(c, pb[0], pb[1] + 60, pc[0] + 150, pc[1] + 40, t, conflict * (1 - truth), 37);
      S.post.glitch = Math.max(S.post.glitch, .25 * conflict * (1 - truth) * (hash1(Math.floor(t * 12)) > .6 ? 1 : .2));
      S.post.ca = .0022 + .006 * conflict * (1 - truth);
      text(c, '矛 盾', W / 2, 470, { size: 40, family: 'SHSerif', weight: 900, color: rgba('#ff6a5a', .95), align: 'center', ls: 20, alpha: conflict * (1 - truth) * (hash1(Math.floor(t * 20)) > .25 ? 1 : .4) });
    }
    // ---- 全都是真的：三连击，金色连线成三角
    const hits = [cue(S, 'D006', '全'), cue(S, 'D006', '是'), cue(S, 'D006', '真')];
    [[CARD.A[0], CARD.A[1] - 130], [CARD.Cc[0], CARD.Cc[1] - 160], [CARD.B[0], CARD.B[1] - 130]].forEach(([x, y], i) => {
      const k = p(t, hits[i], hits[i] + .35);
      if (k <= 0) return;
      const a = Math.min(1, k * 3) * outA, e = lerp(1.6, 1, eOutExpo(k));
      c.save(); c.translate(x, y); c.scale(e, e);
      c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 120, C.dose, .5 * a); c.globalCompositeOperation = 'source-over';
      circle(c, 0, 0, 40, { fill: rgba('#120c05', .85 * a), stroke: rgba(C.doseL, a), lw: 4 });
      text(c, '真', 0, 15, { size: 44, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center', alpha: a });
      c.restore();
      shock(c, x, y, p(t, hits[i], hits[i] + .9), C.dose, 260, outA);
    });
    if (truth > 0) {
      const v = [[mx, my + 10], [CARD.A[0], CARD.A[1] - 130], [CARD.Cc[0], CARD.Cc[1] - 160], [CARD.B[0], CARD.B[1] - 130]];
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.dose, .75 * truth * outA); c.lineWidth = 2.5;
      for (const k of [1, 2, 3]) { const q = eOut(p(t, L6.s + .55 + k * .08, L6.s + 1.3 + k * .08)); c.beginPath(); c.moveTo(v[0][0], v[0][1]); c.lineTo(lerp(v[0][0], v[k][0], q), lerp(v[0][1], v[k][1], q)); c.stroke(); }
      c.restore();
      S.post.flash = Math.max(S.post.flash, .25 * Math.max(0, 1 - p(t, hits[2], hits[2] + .2)) * (t > hits[2] ? 1 : 0));
    }
    // 结尾：一切开始碎裂（交给下一场）
    S.post.exp = 1 + .25 * smooth(p(t, S.dur - .6, S.dur));
  },
});
transition('s01_meal', { type: 'white', d: .45 });

// ============================================================ s01 一顿饭 ×17
const SHARDS = once('shards', () => { const r = rng(91), a = []; for (let i = 0; i < 1800; i++) a.push([r() * W, 300 + r() * 600, r(), r(), r()]); return a; });
function pk(x, ka = 1.6, ke = .28) { return Math.exp(-ke * x) - Math.exp(-ka * x); }
const PKMAX = once('pkmax', () => { let m = 0; for (let i = 1; i < 2400; i++) m = Math.max(m, pk(i / 100)); return m; });

function sun(c, x, y, r, t, a, egg = 0) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  // 神光
  c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 28; i++) {
    const ang = i / 28 * TAU + t * .03 + hash1(i) * .2, w = .02 + hash1(i + 9) * .05, L = r * (4 + hash1(i + 3) * 5);
    c.fillStyle = rgba(C.dose, .045 + .05 * hash1(i + 1));
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang - w) * L, y + Math.sin(ang - w) * L); c.lineTo(x + Math.cos(ang + w) * L, y + Math.sin(ang + w) * L); c.closePath(); c.fill();
  }
  glowDot(c, x, y, r * 6, C.dose, .35); glowDot(c, x, y, r * 2.4, '#ffe2a8', .5);
  c.globalCompositeOperation = 'source-over';
  // 蛋白
  if (egg > 0) {
    c.save(); c.globalAlpha *= egg; c.beginPath();
    for (let k = 0; k <= 80; k++) { const th = k / 80 * TAU; const rr = r * 2.6 * (1 + .13 * Math.sin(3 * th + 1) + .08 * Math.sin(5 * th + 2) + .04 * noise1(th * 3 + 5)); const px = x + 40 + rr * Math.cos(th) * 1.3, py = y + 20 + rr * Math.sin(th) * .95; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.closePath(); c.fillStyle = radial(c, x, y, r * 3.6, [[0, '#e6dcc6'], [.6, '#cdbfa4'], [1, '#9a8c74']]); c.fill(); c.restore();
  }
  // 蛋黄
  c.fillStyle = radial(c, x - r * .3, y - r * .35, r * 1.1, [[0, '#fff0b8'], [.35, '#ffc24d'], [.8, '#e8891c'], [1, '#b85f10']]);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.globalCompositeOperation = 'lighter'; glowDot(c, x - r * .38, y - r * .42, r * .5, '#ffffff', .55);
  c.restore();
}

def('s01_meal', {
  clear: '#040306',
  post: (S) => ({ bloom: .6, thr: .8, ca: .002, vig: .5, grain: .045, tint: [1.06, 1.0, .9], con: 1.06 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L7 = S.L('D007'), L8 = S.L('D008'), L9 = S.L('D009'), L10 = S.L('D010'), L11 = S.L('D011'), L12 = S.L('D012');
    // ---- 碎片旋涡 → 太阳
    const swirl = p(t, 0, L7.s + 1.6);
    const sunA = smooth(p(t, L7.s + .6, L7.s + 1.8)) * (1 - smooth(p(t, L8.s + .2, L8.s + 1.0)));
    const horizonY = 800;
    if (swirl < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < SHARDS.length; i++) {
        const [x0, y0, a0, b0, s0] = SHARDS[i]; const k = smoother(clamp((swirl - a0 * .4) / .6));
        const ang = Math.atan2(y0 - 560, x0 - W / 2) + k * (3 + b0 * 3), rr = Math.hypot(x0 - W / 2, y0 - 560) * (1 - k);
        const x = W / 2 + Math.cos(ang) * rr, y = lerp(560, horizonY - 40, k) + Math.sin(ang) * rr * .6;
        c.fillStyle = a0 > .7 ? `rgba(255,210,140,${.8 * (1 - k)})` : `rgba(240,228,205,${.55 * (1 - k)})`;
        c.save(); c.translate(x, y); c.rotate(b0 * TAU + t * 3 * (s0 - .5)); c.fillRect(-2 - s0 * 4, -1, 4 + s0 * 8, 2.4); c.restore();
      }
      c.restore();
    }
    // 地平线
    const hz = smooth(p(t, L7.s + .3, L7.s + 1.4));
    c.save(); c.globalCompositeOperation = 'lighter';
    const hg = c.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, rgba(C.dose, 0)); hg.addColorStop(.5, rgba(C.dose, .8 * hz)); hg.addColorStop(1, rgba(C.dose, 0));
    c.fillStyle = hg; c.fillRect(0, horizonY - 1, W, 2.5); c.restore();
    const rise = eOut(p(t, L7.s + .5, L7.s + 2.6));
    sun(c, W / 2, lerp(horizonY + 120, horizonY - 170, rise), 92, t, sunA, smooth(p(t, cue(S, 'D007', '饭') - .2, cue(S, 'D007', '饭') + .8)));
    // 地平线下遮住
    c.fillStyle = 'rgba(4,3,6,.96)'; c.fillRect(0, horizonY + 1.5, W, H - horizonY); 
    // ---- 两条曲线从地平线升起
    const X0 = 240, X1 = 1680, Y0 = horizonY;
    const t17 = cue(S, 'D008', '17倍');
    const pull = eInOutExpo2(p(t, cue(S, 'D008', '峰值') + .3, t17 + .2));
    const unit = lerp(95, 33, pull);   // 1 倍对应的像素高：先放大（冲出画面），再拉远看全
    const pf = eOut(p(t, L8.s + .2, L8.s + 1.6)), pe = eInOut(p(t, cue(S, 'D008', '血液'), t17));
    const curve = (scale, prog, col, lw) => {
      const n = Math.floor(260 * prog); if (n < 2) return null; const pts = [];
      for (let i = 0; i <= n; i++) { const xx = i / 260 * 24; pts.push([X0 + (X1 - X0) * xx / 24, Y0 - unit * scale * pk(xx) / PKMAX]); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
      for (const [w, al] of [[lw * 7, .12], [lw * 2.4, .35], [lw, 1]]) { c.strokeStyle = al === 1 ? (col === 'w' ? 'rgba(255,248,236,1)' : 'rgba(255,214,140,1)') : rgba(col === 'w' ? '#ffffff' : C.dose, al); c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
      const [hx, hy] = pts[pts.length - 1]; if (prog < 1) glowDot(c, hx, hy, 70, col === 'w' ? '#ffffff' : C.dose, .9);
      c.restore(); return pts;
    };
    const cv = smooth(p(t, L8.s, L8.s + .6)) * (1 - smooth(p(t, L9.s - .4, L9.s + .1)));
    if (cv > 0) {
      c.save(); c.globalAlpha = cv;
      curve(1, pf, 'w', 3.5);
      const ep = curve(17, pe, 'a', 4.5);
      text(c, '空腹', X0 + 190, Y0 - unit * 1.05 - 16, { size: 28, family: 'SHSans', weight: 500, color: '#fff', alpha: pf * (1 - pull * .3) });
      // 冲顶：粒子尾迹
      if (ep && pe < 1) { const [hx, hy] = ep[ep.length - 1]; const r = rng(Math.floor(t * 30)); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,${190 + r() * 60 | 0},120,${r() * .8})`; c.fillRect(hx + (r() - .5) * 40, hy + r() * 120, 2, 2 + r() * 6); } c.globalCompositeOperation = 'source-over'; }
      // 倍数计数（拉远的同时滚动）
      const cnt = Math.round(lerp(1, 17, eOut(p(t, cue(S, 'D008', '峰值') + .3, t17))));
      const big = p(t, t17 - .05, t17 + .5);
      if (pe > .35) {
        const px = X0 + (X1 - X0) * 1.75 / 24 + 70, py = Y0 - unit * 17 + 30;
        const sz = big > 0 ? lerp(260, 150, eOutExpo(big)) : 120;
        const gl = big > 0 && big < .6 ? 1 - big / .6 : 0; S.post.glitch = Math.max(S.post.glitch, gl * .6); S.post.ca = .002 + .02 * gl;
        for (let k = 0; k < (gl > 0 ? 7 : 1); k++) {
          const y0s = py - sz * .9 + k * sz * .14; const off = gl > 0 ? (hash2(k, Math.floor(t * 24)) - .5) * 90 * gl : 0;
          c.save(); if (gl > 0) { c.beginPath(); c.rect(0, y0s, W, sz * .14 + 1); c.clip(); }
          text(c, '×' + cnt, px + off, py, { size: sz, family: 'SHSerif', weight: 900, color: big > 0 ? C.doseL : '#ffd7a0', alpha: 1, shadow: rgba(C.dose, .8), shadowBlur: 40 });
          c.restore();
        }
        text(c, '峰浓度 Cmax', px + 8, py + 54, { size: 30, family: 'SHSans', weight: 700, color: C.dose, alpha: smooth(p(t, t17, t17 + .5)) });
        text(c, '高脂餐 825 kcal（57% 脂肪） · 健康志愿者 · 单次服药', px + 8, py + 96, { size: 24, family: 'SHSans', weight: 500, color: rgba('#f3e6cc', .85), alpha: smooth(p(t, t17 + .3, t17 + .9)) });
        shock(c, px + 160, py - 60, p(t, t17, t17 + 1.2), C.dose, 1100);
        if (big > 0) S.post.flash = Math.max(S.post.flash, .28 * Math.max(0, 1 - p(t, t17, t17 + .16)));
      }
      text(c, '曲线形状为示意，倍数来自标签', X1, Y0 + 50, { size: 22, family: 'SHSans', color: rgba('#ffffff', .55), align: 'right', alpha: smooth(p(t, t17, t17 + .8)) });
      c.restore();
      srcTag(c, 'ZYTIGA 标签 §12.3', smooth(p(t, t17 - .2, t17 + .5)) * cv);
      schemTag(c, '示意 · 曲线形状非真实数据', smooth(p(t, L8.s + .5, L8.s + 1.2)) * cv);
    }
    // ---- 药没变 / 剂量没变 / 变的只是早餐
    const tri = env(t, L9.s - .3, L12.s + .5, .3, .5);
    if (tri > 0) {
      const xs = [W * .22, W * .5, W * .78], y = 520;
      const k1 = eOutBack(p(t, L9.s - .1, L9.s + .45)), k2 = eOutBack(p(t, L10.s - .1, L10.s + .45)), k3 = eOutExpo(p(t, cue(S, 'D011', '只是') - .15, cue(S, 'D011', '只是') + .4));
      c.save(); c.globalAlpha = tri;
      // 药片
      if (k1 > 0) { c.save(); c.translate(xs[0], y); c.scale(k1, k1); tablet(c, 0, 0, 230, 112, '#6E4A93', 'AA', t); c.restore(); text(c, '药', xs[0], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', alpha: k1 }); text(c, '=', xs[0], y - 120, { size: 70, family: 'JB', weight: 700, color: '#fff', align: 'center', alpha: k1 }); }
      // 剂量：天平保持水平
      if (k2 > 0) { c.save(); c.translate(xs[1], y); c.scale(k2, k2); balance(c, 0, 0, Math.sin(t * 2) * .02); c.restore(); text(c, '剂量', xs[1], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', alpha: k2 }); text(c, '=', xs[1], y - 120, { size: 70, family: 'JB', weight: 700, color: '#fff', align: 'center', alpha: k2 }); }
      // 早餐：空盘翻成满盘
      const kE = smooth(p(t, L11.s - .2, L11.s + .3));
      if (kE > 0) {
        c.save(); c.translate(xs[2], y); c.scale(kE, kE); plate(c, 0, 0, k3, t); c.restore();
        text(c, '早餐', xs[2], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: k3 > .5 ? C.doseL : '#f3e6cc', align: 'center', alpha: kE });
        text(c, k3 > .5 ? '≠' : '=', xs[2], y - 120, { size: 80, family: 'JB', weight: 800, color: k3 > .5 ? C.doseL : '#fff', align: 'center', alpha: kE, shadow: k3 > .5 ? rgba(C.dose, .9) : null, shadowBlur: 30 });
        if (k3 > 0) shock(c, xs[2], y, p(t, cue(S, 'D011', '只是'), cue(S, 'D011', '只是') + 1.1), C.dose, 520);
      }
      c.restore();
    }
    // ---- 凭什么改写一个剂量？
    const q = env(t, L12.s - .1, S.dur + 1, .3, .1);
    if (q > 0) {
      const ex = 1 - smooth(p(t, S.dur - .55, S.dur - .1));
      const k = p(t, L12.s + .15, cue(S, 'D012', '剂量', true));
      c.save(); c.globalAlpha = q * ex;
      darkBand(c, H / 2 - 10, 300, q);
      text(c, '一顿饭，凭什么', W / 2, H / 2 - 70, { size: 44, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 8 });
      scrambleText(c, '改写一个剂量？', W / 2, H / 2 + 40, Math.max(.001, k * 1.1), 5, { size: 96, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 10, hidden: true });
      c.restore();
      // 收成光缝（接片名）
      const cl = p(t, S.dur - .55, S.dur);
      if (cl > 0) flare(c, W / 2, H / 2, W * 1.4 * eOut(cl), cl);
    }
  },
});
transition('s02_title', { type: 'cut', d: .1 });

function eInOutExpo2(x) { x = clamp(x); return x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; }
function darkBand(c, y, h, a) { const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(0,0,0,${.75 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, y - h / 2, W, h); }
// ZYTIGA 500 mg：紫色椭圆薄膜衣片，刻 AA（标签 §3）
function tablet(c, x, y, w, h, col, imp, t) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(8, 14, w / 2, h / 2, 0, 0, TAU); c.fill();
  c.fillStyle = radial(c, -w * .18, -h * .3, w * .62, [[0, '#b58fd6'], [.55, col], [1, '#3b2554']]); c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); c.fill();
  c.globalCompositeOperation = 'lighter'; glowDot(c, -w * .2, -h * .22, w * .25, '#ffffff', .25); c.globalCompositeOperation = 'source-over';
  text(c, imp, 1, h * .2 + 2, { size: h * .5, family: 'SHSans', weight: 900, color: 'rgba(255,255,255,.18)', align: 'center' });
  text(c, imp, 0, h * .2, { size: h * .5, family: 'SHSans', weight: 900, color: 'rgba(40,20,60,.75)', align: 'center' });
  c.restore();
}
function balance(c, x, y, tilt) {
  c.save(); c.translate(x, y); c.strokeStyle = '#f3e6cc'; c.fillStyle = '#f3e6cc'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 70); c.lineTo(0, -60); c.stroke(); c.beginPath(); c.moveTo(-50, 72); c.lineTo(50, 72); c.stroke();
  c.rotate(tilt); c.beginPath(); c.moveTo(-120, -60); c.lineTo(120, -60); c.stroke();
  for (const s of [-1, 1]) { c.lineWidth = 2; c.beginPath(); c.moveTo(s * 120, -60); c.lineTo(s * 95, 0); c.moveTo(s * 120, -60); c.lineTo(s * 145, 0); c.stroke(); c.beginPath(); c.ellipse(s * 120, 2, 34, 8, 0, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(0, -60, 8, 0, TAU); c.fill(); c.restore();
}
function plate(c, x, y, full, t) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(10, 16, 150, 62, 0, 0, TAU); c.fill();
  c.fillStyle = radial(c, -30, -20, 170, [[0, '#d9d2c4'], [1, '#8f877a']]); c.beginPath(); c.ellipse(0, 0, 150, 62, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,110,95,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 104, 42, 0, 0, TAU); c.stroke();
  if (full > 0) {
    c.globalAlpha *= Math.min(1, full * 2); const e = lerp(.6, 1, eOutBack(full));
    c.scale(e, e);
    // 煎蛋
    c.fillStyle = '#e8dfcc'; c.beginPath(); c.ellipse(-30, -4, 58, 30, -.2, 0, TAU); c.fill();
    c.fillStyle = radial(c, -36, -10, 26, [[0, '#ffe39a'], [.6, '#f2a21f'], [1, '#c26a0f']]); c.beginPath(); c.arc(-30, -6, 19, 0, TAU); c.fill();
    // 培根与吐司
    c.fillStyle = '#b4452f'; c.save(); c.translate(52, -12); c.rotate(.3); rrect(c, -40, -9, 80, 18, 6); c.fill(); c.fillStyle = '#e9c3a0'; c.fillRect(-36, -2, 72, 3); c.restore();
    c.fillStyle = '#d29a52'; c.save(); c.translate(40, 20); c.rotate(-.15); rrect(c, -34, -16, 68, 32, 8); c.fill(); c.fillStyle = '#f0d3a2'; rrect(c, -27, -10, 54, 20, 6); c.fill(); c.restore();
    c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -10, 200, C.dose, .25 * full); 
  }
  c.restore();
}

// ============================================================ s02 片名（快节奏版）
def('s02_title', {
  clear: '#020203',
  post: (S) => ({ bloom: .75, thr: .62, ca: .0024, vig: .5, grain: .04, mark: false, tint: [1.05, 1.0, .92] }),
  draw(S) {
    const c = S.ctx, t = S.t, cy = H * .47;
    dust(c, t, 160, '#ffd9a0', .3, 12);
    // 光缝 → 宽银幕
    flare(c, W / 2, cy, W * 1.6 * eOut(p(t, 0, .5)), 1 - .8 * smooth(p(t, .5, 1.8)));
    const hit = p(t, .12, .6);
    S.post.flash = .22 * Math.max(0, 1 - p(t, .1, .3)) * (t > .1 ? 1 : 0);
    S.post.ca = .0024 + .016 * Math.max(0, 1 - p(t, .1, .9));
    const out1 = 1 - smooth(p(t, 3.1, 3.6));
    // 主标题：金属渐变 + 扫光，字距收拢
    const k = eOutExpo(p(t, .15, 1.2)), a = smooth(p(t, .15, .5)) * out1;
    if (a > 0) {
      const sz = 230, ls = lerp(160, 70, k);
      c.save(); c.globalAlpha = a; c.font = `900 ${sz}px SHSerif`; c.textAlign = 'center'; c.letterSpacing = ls + 'px';
      const g = c.createLinearGradient(0, cy - sz * .8, 0, cy + sz * .1);
      g.addColorStop(0, '#fff3d6'); g.addColorStop(.45, '#e8a33d'); g.addColorStop(.55, '#8a5a1e'); g.addColorStop(1, '#f2c97a');
      c.shadowColor = rgba(C.dose, .6); c.shadowBlur = 50; c.fillStyle = g; c.fillText('剂量', W / 2 + ls / 2, cy + 40);
      const sw = p(t, .9, 2.2);
      if (sw > 0 && sw < 1) { c.shadowBlur = 0; c.globalCompositeOperation = 'lighter'; const gx = lerp(W / 2 - 500, W / 2 + 500, eInOut(sw)); const h2 = c.createLinearGradient(gx - 110, 0, gx + 110, 0); h2.addColorStop(0, 'rgba(255,255,255,0)'); h2.addColorStop(.5, `rgba(255,250,235,${.8 * Math.sin(sw * Math.PI)})`); h2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = h2; c.fillText('剂量', W / 2 + ls / 2, cy + 40); }
      c.restore();
    }
    text(c, 'D O S E', W / 2, cy + 120, { size: 46, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: lerp(40, 22, k), alpha: smooth(p(t, .7, 1.3)) * out1 });
    const sb = smooth(p(t, 1.3, 1.9)) * out1;
    text(c, '每一个剂量，都是一次决定', W / 2, cy + 196, { size: 38, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 8, alpha: sb });
    text(c, 'EVERY DOSE IS A DECISION', W / 2, cy + 240, { size: 22, family: 'Cinzel', weight: 700, color: rgba('#ffffff', .6), align: 'center', ls: 10, alpha: sb });
    // 集名
    const e = smooth(p(t, 3.5, 4.0)) * (1 - smooth(p(t, S.dur - .7, S.dur - .1)));
    if (e > 0) {
      const ke = eOutExpo(p(t, 3.5, 4.4));
      text(c, 'EP 01', W / 2, H * .37, { size: 34, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: 24, alpha: e });
      text(c, '一 顿 饭', W / 2, H * .37 + 150, { size: 130, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: lerp(60, 30, ke), alpha: e, shadow: rgba(C.dose, .5), shadowBlur: 40 });
      text(c, 'O N E   M E A L', W / 2, H * .37 + 220, { size: 26, family: 'Cinzel', weight: 700, color: rgba('#ffffff', .6), align: 'center', ls: 12, alpha: e });
      line(c, W / 2 - 260 * ke, H * .37 + 252, W / 2 + 260 * ke, H * .37 + 252, rgba(C.dose, .6), 2, e);
      text(c, '◇ 支线进行中 出品', W / 2, H - 110, { size: 24, family: 'SHSans', weight: 500, color: rgba('#ffffff', .65), align: 'center', ls: 6, alpha: e });
    }
    // 宽银幕黑边
    const bar = (H - W / 2.39) / 2 * eInOut(p(t, .1, .7));
    c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
  },
});
