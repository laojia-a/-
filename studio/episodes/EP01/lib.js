// 《剂量》EP01 共用画面组件：分子、文件卡、印章、电弧、光晕、冲击波、药片、天平、餐盘、太阳、曲线
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eInExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, noise2, fbm, rgba, text, measure, scrambleText, typeText, rrect, line, circle, glowDot, radial, once, brackets, panel, tag, proj, chapterCard } from '/engine.js';


// ------------------------------------------------------------------ 工具
export const LINES = () => Object.fromEntries(E.tl.lines.map(l => [l.id, l]));
// 句内关键词时刻：按字数比例（去标点）估算，相对场景起点
export function cue(S, id, kw, after = false) {
  const ln = LINES()[id]; const s = ln.sub.replace(/\n/g, '');
  const strip = (x) => x.replace(/[\s，。、：；！？“”‘’（）()…—\-,.!?:;《》·]/g, '');
  const k = s.indexOf(kw); if (k < 0) return ln.start - S.start;
  const pre = strip(s.slice(0, k + (after ? kw.length : 0))).length, tot = strip(s).length || 1;
  return ln.start - S.start + (ln.end - ln.start) * pre / tot;
}
export function srcTag(c, s, a = 1) {   // 真实数据角标：右上，琥珀
  if (a <= 0) return;
  text(c, '真实数据 · ' + s, W - 64, 66, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .92), align: 'right', ls: 1, alpha: a });
}
export function schemTag(c, s = '示意 · 非真实曲线', a = 1) {   // 示意角标：左上（水印下方），冷蓝
  if (a <= 0) return;
  text(c, s, 58, 104, { size: 21, family: 'SHSans', weight: 500, color: rgba(C.sim, .9), ls: 1, alpha: a });
}
export function dust(c, t, n = 140, color = '#ffd9a0', a = .3, seed = 3, drift = 1) {
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
export function flare(c, x, y, w, a = 1, col = C.dose) {
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
export function shock(c, x, y, k, col = C.dose, R = 900, a = 1) {
  if (k <= 0 || k >= 1) return;
  const r = R * eOut(k); c.save(); c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba(col, (1 - k) * .55 * a); c.lineWidth = 3 + 30 * (1 - k); c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  c.strokeStyle = `rgba(255,248,230,${(1 - k) * .7 * a})`; c.lineWidth = 2; c.beginPath(); c.arc(x, y, r * .97, 0, TAU); c.stroke();
  c.restore();
}

// ------------------------------------------------------------------ 分子：醋酸阿比特龙（甾体四环 + 3β-乙酰氧基 + Δ5、Δ16 + 17 位 3-吡啶基）
export const MOL = once('mol', () => {
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
export function molProj(v, cx, cy, s, yaw, pitch = .12) {
  let [x, y, z] = v; const cyw = Math.cos(yaw), syw = Math.sin(yaw);
  const x1 = x * cyw + z * syw, z1 = -x * syw + z * cyw;
  const cp = Math.cos(pitch), sp = Math.sin(pitch); const y1 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
  const f = 9 / (9 - z2); return [cx + x1 * s * f, cy + y1 * s * f, z2];
}
export function drawMol(c, cx, cy, s, t, o = {}) {
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
export function paperCard(c, x, y, w, h, o = {}) {
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
export function stamp(c, x, y, lines, k, o = {}) {
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
export function arc(c, x0, y0, x1, y1, t, a, seed, col = C.risk) {
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
export const CARD = { A: [400, 590, 520, 360], B: [1520, 590, 520, 360], Cc: [960, 660, 520, 400] };

// ============================================================ s01 一顿饭 ×17
export const SHARDS = once('shards', () => { const r = rng(91), a = []; for (let i = 0; i < 1800; i++) a.push([r() * W, 300 + r() * 600, r(), r(), r()]); return a; });
export function pk(x, ka = 1.6, ke = .28) { return Math.exp(-ke * x) - Math.exp(-ka * x); }
export const PKMAX = once('pkmax', () => { let m = 0; for (let i = 1; i < 2400; i++) m = Math.max(m, pk(i / 100)); return m; });

export function sun(c, x, y, r, t, a, egg = 0) {
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

export function eInOutExpo2(x) { x = clamp(x); return x < .5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2; }
export function darkBand(c, y, h, a) { const g = c.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.5, `rgba(0,0,0,${.75 * a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, y - h / 2, W, h); }
// ZYTIGA 500 mg：紫色椭圆薄膜衣片，刻 AA（标签 §3）
export function tablet(c, x, y, w, h, col, imp, t) {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(8, 14, w / 2, h / 2, 0, 0, TAU); c.fill();
  c.fillStyle = radial(c, -w * .18, -h * .3, w * .62, [[0, '#b58fd6'], [.55, col], [1, '#3b2554']]); c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); c.fill();
  c.globalCompositeOperation = 'lighter'; glowDot(c, -w * .2, -h * .22, w * .25, '#ffffff', .25); c.globalCompositeOperation = 'source-over';
  text(c, imp, 1, h * .2 + 2, { size: h * .5, family: 'SHSans', weight: 900, color: 'rgba(255,255,255,.18)', align: 'center' });
  text(c, imp, 0, h * .2, { size: h * .5, family: 'SHSans', weight: 900, color: 'rgba(40,20,60,.75)', align: 'center' });
  c.restore();
}
export function balance(c, x, y, tilt) {
  c.save(); c.translate(x, y); c.strokeStyle = '#f3e6cc'; c.fillStyle = '#f3e6cc'; c.lineWidth = 5; c.lineCap = 'round';
  c.beginPath(); c.moveTo(0, 70); c.lineTo(0, -60); c.stroke(); c.beginPath(); c.moveTo(-50, 72); c.lineTo(50, 72); c.stroke();
  c.rotate(tilt); c.beginPath(); c.moveTo(-120, -60); c.lineTo(120, -60); c.stroke();
  for (const s of [-1, 1]) { c.lineWidth = 2; c.beginPath(); c.moveTo(s * 120, -60); c.lineTo(s * 95, 0); c.moveTo(s * 120, -60); c.lineTo(s * 145, 0); c.stroke(); c.beginPath(); c.ellipse(s * 120, 2, 34, 8, 0, 0, TAU); c.fill(); }
  c.beginPath(); c.arc(0, -60, 8, 0, TAU); c.fill(); c.restore();
}
// kind: 'high' = 高脂餐（煎蛋、培根、黄油吐司）；'low' = 低脂早餐（不涂黄油的吐司配果酱、水果）
export function plate(c, x, y, full, t, kind = 'high') {
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.ellipse(10, 16, 150, 62, 0, 0, TAU); c.fill();
  c.fillStyle = radial(c, -30, -20, 170, [[0, '#d9d2c4'], [1, '#8f877a']]); c.beginPath(); c.ellipse(0, 0, 150, 62, 0, 0, TAU); c.fill();
  c.strokeStyle = 'rgba(120,110,95,.6)'; c.lineWidth = 2; c.beginPath(); c.ellipse(0, 0, 104, 42, 0, 0, TAU); c.stroke();
  if (full > 0 && kind === 'low') {
    c.globalAlpha *= Math.min(1, full * 2); const e = lerp(.6, 1, eOutBack(full));
    c.scale(e, e);
    // 吐司 + 一抹果酱
    c.save(); c.translate(-38, 0); c.rotate(-.12);
    c.fillStyle = '#c99a5b'; rrect(c, -40, -22, 80, 44, 12); c.fill();
    c.fillStyle = '#efdcb4'; rrect(c, -33, -16, 66, 32, 9); c.fill();
    c.fillStyle = '#b8323a'; c.beginPath(); c.ellipse(-4, 0, 20, 8, .2, 0, TAU); c.fill();
    c.fillStyle = 'rgba(255,190,190,.55)'; c.beginPath(); c.ellipse(-10, -3, 7, 2.5, .2, 0, TAU); c.fill();
    c.restore();
    // 橙子瓣
    for (let i = 0; i < 3; i++) {
      c.save(); c.translate(46 + i * 20, -16 + i * 6); c.rotate(-.5 + i * .25);
      c.fillStyle = '#f08a1c'; c.beginPath(); c.ellipse(0, 0, 20, 8, 0, Math.PI, TAU); c.closePath(); c.fill();
      c.fillStyle = '#ffc266'; c.beginPath(); c.ellipse(0, -1, 15, 5, 0, Math.PI, TAU); c.closePath(); c.fill();
      c.restore();
    }
    // 几颗莓果
    for (const [bx, by] of [[52, 20], [66, 14], [74, 26], [40, 28]]) { c.fillStyle = '#3b2a6e'; c.beginPath(); c.arc(bx, by, 6.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(bx - 2, by - 2, 2, 0, TAU); c.fill(); }
    c.globalCompositeOperation = 'lighter'; glowDot(c, 0, -10, 180, C.dose, .12 * full);
  } else if (full > 0) {
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


// ================================================================== 正片组件
export function chap(S, num, title) { chapterCard(S, num, title, { color: C.dose, T: 2.8 }); }
export const ease = (t, a, b) => eOutExpo(p(t, a, b));

// 圆形金印：dt = 距落印的秒数
export function seal(c, x, y, dt, o = {}) {
  if (dt < 0) return;
  const { r = 40, ch = '真', col = C.doseL, a = 1 } = o;
  const k = dt / .35, e = lerp(1.6, 1, eOutExpo(Math.min(1, k))), al = Math.min(1, k * 3) * a;
  c.save(); c.translate(x, y); c.scale(e, e);
  c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, r * 3, C.dose, .5 * al); c.globalCompositeOperation = 'source-over';
  circle(c, 0, 0, r, { fill: rgba('#120c05', .85 * al), stroke: rgba(col, al), lw: r * .1 });
  text(c, ch, 0, r * .38, { size: r * 1.1, family: 'SHSerif', weight: 900, color: col, align: 'center', alpha: al });
  c.restore();
  shock(c, x, y, dt / .9, C.dose, r * 6.5, a);
}

// 带光晕的大字
export function glowText(c, s, x, y, o = {}) {
  const { size = 96, family = 'SHSerif', weight = 900, color = '#fff', glow = C.dose, alpha = 1, align = 'center', ls = 6, blur = 36 } = o;
  if (alpha <= 0) return;
  text(c, s, x, y, { size, family, weight, color, align, ls, alpha, shadow: rgba(glow, .75), shadowBlur: blur });
}

// 不规则晶体（难溶的“石子”）
export function crystal(c, x, y, s, rot, a = 1, o = {}) {
  if (a <= .003 || s < .5) return;
  const { seed = 1, metal = 0, glow = 0, red = 0 } = o;
  const r = rng(seed * 7919 + 13), n = 5 + Math.floor(r() * 3), pts = [];
  for (let i = 0; i < n; i++) { const th = i / n * TAU + (r() - .5) * .7, rr = s * (.62 + r() * .5); pts.push([Math.cos(th + rot) * rr, Math.sin(th + rot) * rr * (.75 + r() * .3)]); }
  c.save(); c.translate(x, y); c.globalAlpha *= a;
  const g = c.createLinearGradient(-s, -s, s, s);
  if (red > 0) { g.addColorStop(0, '#ffe2d6'); g.addColorStop(.5, '#c87a6a'); g.addColorStop(1, '#4a1f1a'); }
  else { g.addColorStop(0, '#f2f8ff'); g.addColorStop(.45, '#a3bccf'); g.addColorStop(1, '#34495c'); }
  c.fillStyle = g; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.fill();
  const fx = pts[0][0] * .25, fy = pts[0][1] * .25;
  c.strokeStyle = 'rgba(255,255,255,.45)'; c.lineWidth = 1; c.beginPath(); for (const [px, py] of pts) { c.moveTo(fx, fy); c.lineTo(px, py); } c.stroke();
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 1.3; c.beginPath(); pts.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.stroke();
  if (metal > 0) { const tw = Math.pow(Math.max(0, Math.sin(rot * 3 + seed * 1.7)), 12); if (tw > .02) { c.globalCompositeOperation = 'lighter'; glowDot(c, pts[1][0], pts[1][1], s * 3, C.dose, .9 * metal * tw); } }
  if (glow > 0) { c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, s * 3, '#bfe6ff', .3 * glow); }
  c.restore();
}

// 胶束：一圈亲水头基，尾巴朝内，中间可装一颗药
export function micelle(c, x, y, r, t, a = 1, cargo = 0, seed = 0) {
  if (a <= .003 || r < 1) return;
  c.save(); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter';
  glowDot(c, x, y, r * 2.2, C.dose, .14);
  c.fillStyle = radial(c, x, y, r, [[0, 'rgba(255,214,140,.20)'], [.75, 'rgba(255,180,80,.08)'], [1, 'rgba(255,180,80,0)']]);
  c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  const n = Math.max(10, Math.round(r * .9));
  c.strokeStyle = 'rgba(255,190,110,.5)'; c.lineWidth = 1;
  c.beginPath();
  for (let k = 0; k < n; k++) { const th = k / n * TAU + t * .45 + seed; c.moveTo(x + Math.cos(th) * r, y + Math.sin(th) * r); c.lineTo(x + Math.cos(th + .15) * r * .55, y + Math.sin(th + .15) * r * .55); }
  c.stroke();
  c.fillStyle = 'rgba(255,220,150,.95)';
  for (let k = 0; k < n; k++) { const th = k / n * TAU + t * .45 + seed; c.beginPath(); c.arc(x + Math.cos(th) * r, y + Math.sin(th) * r, Math.max(1.6, r * .11), 0, TAU); c.fill(); }
  c.restore();
  if (cargo > 0) crystal(c, x, y, r * .42 * cargo, t * .6 + seed, .95, { seed: seed + 3, glow: .5 });
}

// 环形仪表：segs = [{f0, f, col, w, r}]
export function gauge(c, x, y, r, segs, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = 'rgba(255,255,255,.08)'; c.lineWidth = 20; c.beginPath(); c.arc(x, y, r, 0, TAU); c.stroke();
  for (const s of segs) {
    if (s.f <= (s.f0 || 0)) continue;
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(s.col, .25); c.lineWidth = (s.w || 20) * 2.2; c.beginPath(); c.arc(x, y, s.r || r, -Math.PI / 2 + (s.f0 || 0) * TAU, -Math.PI / 2 + s.f * TAU); c.stroke(); c.restore();
    c.strokeStyle = s.col; c.lineWidth = s.w || 20; c.beginPath(); c.arc(x, y, s.r || r, -Math.PI / 2 + (s.f0 || 0) * TAU, -Math.PI / 2 + s.f * TAU); c.stroke();
  }
  c.strokeStyle = 'rgba(255,255,255,.22)'; c.lineWidth = 2; c.beginPath();
  for (let i = 0; i < 100; i++) { const th = -Math.PI / 2 + i / 100 * TAU, big = i % 10 === 0, r0 = r + 18, r1 = r + (big ? 34 : 25); c.moveTo(x + Math.cos(th) * r0, y + Math.sin(th) * r0); c.lineTo(x + Math.cos(th) * r1, y + Math.sin(th) * r1); }
  c.stroke(); c.restore();
}

// 雄激素（甾体四环骨架的简笔）
export function steroid(c, x, y, s, rot, a = 1, col = '#ff9a6a') {
  if (a <= 0) return;
  const s3 = Math.sqrt(3), hex = (cx, cy) => [[cx, cy - 1], [cx - s3 / 2, cy - .5], [cx - s3 / 2, cy + .5], [cx, cy + 1], [cx + s3 / 2, cy + .5], [cx + s3 / 2, cy - .5]];
  const rings = [hex(-s3, .5), hex(0, .5), hex(s3 / 2, -1)];
  c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s); c.globalAlpha *= a; c.globalCompositeOperation = 'lighter';
  c.strokeStyle = rgba(col, .9); c.lineWidth = 2.2 / s; c.lineJoin = 'round';
  for (const r of rings) { c.beginPath(); r.forEach(([px, py], i) => i ? c.lineTo(px, py) : c.moveTo(px, py)); c.closePath(); c.stroke(); }
  const b = rings[2][5], q = rings[2][4];
  c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(b[0] + .95, b[1] + .2); c.lineTo(q[0] + .95, q[1] + .1); c.lineTo(q[0], q[1]); c.stroke();
  c.restore();
}

// 癌细胞：起伏的膜 + 核；heat 越高越亮
export function cell(c, x, y, r, t, a = 1, heat = .5, seed = 0) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, r * 2.2, '#ff4a3a', .18 + .35 * heat); c.globalCompositeOperation = 'source-over';
  c.beginPath();
  for (let k = 0; k <= 48; k++) { const th = k / 48 * TAU, rr = r * (1 + .08 * noise1(th * 2 + t * .8 + seed * 10) + .05 * Math.sin(3 * th + t + seed)); const px = x + Math.cos(th) * rr, py = y + Math.sin(th) * rr; k ? c.lineTo(px, py) : c.moveTo(px, py); }
  c.closePath();
  c.fillStyle = radial(c, x - r * .3, y - r * .3, r * 1.3, [[0, rgba('#ff8a6a', .35 + .45 * heat)], [.6, rgba('#a8281f', .45 + .3 * heat)], [1, 'rgba(40,6,6,.7)']]); c.fill();
  c.strokeStyle = rgba('#ffb09a', .35 + .4 * heat); c.lineWidth = 2; c.stroke();
  circle(c, x + r * .12, y + r * .05, r * .36, { fill: rgba('#3a0c0a', .8) });
  c.globalCompositeOperation = 'lighter'; glowDot(c, x + r * .12, y + r * .05, r * .5, '#ff6a4a', .25 * heat);
  c.restore();
}

// 光柱：从地面升起，内部有上升粒子，下方有倒影
export function pillar(c, x, base, w, h, col, t, a = 1, seed = 0) {
  if (a <= 0 || h < 1) return;
  c.save(); c.globalAlpha *= a;
  const g = c.createLinearGradient(0, base - h, 0, base);
  g.addColorStop(0, rgba(col, .95)); g.addColorStop(.12, rgba(col, .55)); g.addColorStop(1, rgba(col, .18));
  c.fillStyle = g; c.fillRect(x - w / 2, base - h, w, h);
  c.globalCompositeOperation = 'lighter';
  const ge = c.createLinearGradient(x - w / 2, 0, x + w / 2, 0); ge.addColorStop(0, rgba(col, .0)); ge.addColorStop(.5, rgba('#fff3dc', .35)); ge.addColorStop(1, rgba(col, 0));
  c.fillStyle = ge; c.fillRect(x - w / 2, base - h, w, h);
  const r = rng(seed + 5);
  for (let i = 0; i < 40; i++) { const sp = 40 + r() * 80, ph = r(); const yy = base - ((t * sp + ph * h) % h); c.fillStyle = `rgba(255,236,200,${.5 * r()})`; c.fillRect(x - w / 2 + r() * w, yy, 2, 6); }
  glowDot(c, x, base - h, w * 1.6, col, .7);
  c.fillStyle = rgba('#fff6e4', .95); c.fillRect(x - w / 2, base - h - 2, w, 4);
  c.restore();
  // 倒影
  c.save(); c.globalAlpha *= a * .22; const gr = c.createLinearGradient(0, base, 0, base + h * .45); gr.addColorStop(0, rgba(col, .8)); gr.addColorStop(1, rgba(col, 0)); c.fillStyle = gr; c.fillRect(x - w / 2, base + 4, w, h * .45); c.restore();
}

// 胶囊（NEURONTIN 300 mg：黄色硬胶囊）
export function capsule(c, x, y, w, h, col, a = 1, rot = 0) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  c.fillStyle = 'rgba(0,0,0,.45)'; rrect(c, -w / 2 + 6, -h / 2 + 8, w, h, w / 2); c.fill();
  const g = c.createLinearGradient(-w / 2, 0, w / 2, 0); g.addColorStop(0, '#9c7614'); g.addColorStop(.35, col); g.addColorStop(.5, '#fff2b8'); g.addColorStop(1, '#7a5a0e');
  c.fillStyle = g; rrect(c, -w / 2, -h / 2, w, h, w / 2); c.fill();
  c.strokeStyle = 'rgba(80,55,5,.5)'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-w / 2, -h * .02); c.lineTo(w / 2, -h * .02); c.stroke();
  c.restore();
}

// 量筒
export function cylinder(c, x, y, w, h, level, col, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.strokeStyle = 'rgba(255,255,255,.4)'; c.lineWidth = 3; c.beginPath(); c.moveTo(x, y - h); c.lineTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w, y - h); c.stroke();
  for (let k = 1; k < 10; k++) { const yy = y - h * k / 10; c.beginPath(); c.moveTo(x, yy); c.lineTo(x + (k % 5 ? 14 : 28), yy); c.stroke(); }
  const lh = h * level;
  if (lh > 1) {
    const g = c.createLinearGradient(0, y - lh, 0, y); g.addColorStop(0, rgba(col, .9)); g.addColorStop(1, rgba(col, .35));
    c.fillStyle = g; c.fillRect(x + 4, y - lh, w - 8, lh);
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba('#fff2d0', .8); c.fillRect(x + 4, y - lh, w - 8, 3);
  }
  c.restore();
}

// 数字身份证：fields = [[键, 值, 出现时刻, 高亮]]
// 返回第 i 行字段的屏幕 y（基线上方一点），用于连线
export function idRowY(y, h, n, i) { return y - h / 2 + 100 + (h - 140) / n * (i + .62) - 12; }
export function idCard(c, x, y, w, h, fields, t, o = {}) {
  const { a = 1, title = 'IDENTITY OF A NUMBER', no = '', photo = null, build = 1, glowRows = [], vs = 38, scramble = 0 } = o;
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  const k = eOutExpo(build);
  const ww = w * lerp(.9, 1, k);
  c.translate(x, y);
  c.shadowColor = 'rgba(0,0,0,.6)'; c.shadowBlur = 50; c.shadowOffsetY = 20;
  rrect(c, -ww / 2, -h / 2, ww, h, 22); c.fillStyle = 'rgba(14,16,22,.92)'; c.fill(); c.shadowColor = 'transparent';
  const gb = c.createLinearGradient(-ww / 2, -h / 2, ww / 2, h / 2); gb.addColorStop(0, rgba(C.dose, .9)); gb.addColorStop(.5, rgba(C.dose, .25)); gb.addColorStop(1, rgba(C.dose, .8));
  c.strokeStyle = gb; c.lineWidth = 2.5; rrect(c, -ww / 2, -h / 2, ww, h, 22); c.stroke();
  // 底纹：细密的防伪线
  c.save(); rrect(c, -ww / 2, -h / 2, ww, h, 22); c.clip(); c.strokeStyle = rgba(C.dose, .05); c.lineWidth = 1;
  for (let i = -20; i < 40; i++) { c.beginPath(); for (let u = 0; u <= 40; u++) { const xx = -ww / 2 + u / 40 * ww, yy = -h / 2 + i * 22 + Math.sin(u * .5 + i) * 8; u ? c.lineTo(xx, yy) : c.moveTo(xx, yy); } c.stroke(); }
  c.restore();
  text(c, title, -ww / 2 + 40, -h / 2 + 54, { size: 22, family: 'Cinzel', weight: 700, color: C.dose, ls: 6 });
  text(c, no, ww / 2 - 40, -h / 2 + 54, { size: 20, family: 'JB', weight: 500, color: rgba('#ffffff', .55), align: 'right', ls: 2 });
  line(c, -ww / 2 + 40, -h / 2 + 76, ww / 2 - 40, -h / 2 + 76, rgba(C.dose, .35), 1.5);
  // 照片区
  const px = -ww / 2 + 40, py = -h / 2 + 100, pw = ww * .3, ph = h - 140;
  rrect(c, px, py, pw, ph, 12); c.fillStyle = 'rgba(0,0,0,.45)'; c.fill(); c.strokeStyle = rgba('#ffffff', .15); c.lineWidth = 1.5; c.stroke();
  if (photo) { c.save(); rrect(c, px, py, pw, ph, 12); c.clip(); photo(c, px, py, pw, ph); c.restore(); }
  // 字段
  const fx = px + pw + 50, rowH = (h - 140) / fields.length;
  fields.forEach(([kk, v, t0, hi], i) => {
    const yy = py + rowH * (i + .62);
    text(c, kk, fx, yy, { size: 24, family: 'SHSans', weight: 500, color: rgba('#ffffff', .5), ls: 4 });
    const q = p(t, t0, t0 + .55);
    if (q > 0) {
      const glowA = glowRows.includes(i) ? 1 : 0;
      if (glowA) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, fx + 330, yy - 12, 260, C.dose, .18); c.restore(); }
      if (scramble > 0 && hash1(i * 13 + Math.floor(t * 18)) < scramble) scrambleText(c, v, fx + 120, yy, .5, i * 7 + Math.floor(t * 18), { size: vs, family: 'SHSans', weight: 700, color: '#ff6a5a' });
      else typeText(c, v, fx + 120, yy, q, { size: vs, family: 'SHSans', weight: 700, color: hi ? C.doseL : '#fff', cursor: q < 1, t, cursorColor: C.dose });
    }
    if (i < fields.length - 1) line(c, fx, yy + rowH * .38, ww / 2 - 40, yy + rowH * .38, 'rgba(255,255,255,.07)', 1);
  });
  c.restore();
}

// 一段河流（肠道）：o.warm 0..1 让河水变金；o.lit[k] 点亮第 k 根绒毛；o.flow 流速倍数
export const RIV = { top: 330, bot: 900, bank0: 640, bank1: 1300, gate: 1790 };
const VILLI = once('villi', () => { const r = rng(17), v = []; for (let x = -10; x < W + 20; x += 30) v.push({ x: x + r() * 10, len: 70 + r() * 50, w: 13 + r() * 6, ph: r() * TAU }); return v; });
const STREAK = once('streak', () => { const r = rng(23), s = []; for (let i = 0; i < 220; i++) { const y = RIV.top + 20 + r() * (RIV.bot - RIV.top - 40); s.push({ x: r() * (W + 400), y, v: 60 + 170 * Math.sin(Math.PI * (y - RIV.top) / (RIV.bot - RIV.top)), len: 30 + r() * 90, a: .05 + r() * .15, ph: r() * TAU }); } return s; });
export function villusLit(x) { return x >= RIV.bank0 && x <= RIV.bank1 ? 1 : 0; }
export function river(c, t, o = {}) {
  const { warm = 0, warmFront = W + 400, lit = null, flow = 1, gate = 1, a = 1, dim = 0 } = o;
  c.save(); c.globalAlpha *= a;
  // 上下岸（组织）
  c.fillStyle = radial(c, W * .5, -200, 1300, [[0, '#2a1a14'], [1, '#0c0807']]); c.fillRect(0, 0, W, RIV.top + 4);
  c.fillStyle = '#07090b'; c.fillRect(0, RIV.bot - 4, W, H - RIV.bot + 4);
  // 水体
  const gw = c.createLinearGradient(0, RIV.top, 0, RIV.bot); gw.addColorStop(0, '#0e2a33'); gw.addColorStop(.5, '#0a1d25'); gw.addColorStop(1, '#050d12');
  c.fillStyle = gw; c.fillRect(0, RIV.top, W, RIV.bot - RIV.top);
  if (warm > 0) {
    const x1 = Math.min(W, warmFront);
    const gg = c.createLinearGradient(Math.max(0, x1 - 420), 0, x1, 0); gg.addColorStop(0, rgba('#c98a2a', .32 * warm)); gg.addColorStop(1, rgba('#c98a2a', 0));
    c.fillStyle = rgba('#c98a2a', .32 * warm); c.fillRect(0, RIV.top, Math.max(0, x1 - 420), RIV.bot - RIV.top);
    c.fillStyle = gg; c.fillRect(Math.max(0, x1 - 420), RIV.top, Math.min(420, x1), RIV.bot - RIV.top);
  }
  // 水下光斑与流纹
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) { const cx = (k * 173 + t * (16 + k * 2) * flow) % (W + 500) - 250, cy = RIV.top + 70 + (k * 97) % (RIV.bot - RIV.top - 140) + Math.sin(t * .3 + k) * 24; glowDot(c, cx, cy, 170 + (k % 4) * 50, warm > .3 ? '#d9a04a' : '#3f8fb0', .06); }
  c.lineWidth = 1.6;
  for (const s of STREAK) {
    const x = (s.x + s.v * t * flow) % (W + 400) - 200, y = s.y + Math.sin(t * .8 + s.ph + x * .004) * 6;
    c.strokeStyle = (warm > 0 && x < warmFront) ? `rgba(255,200,120,${s.a * (1 + warm)})` : `rgba(140,190,215,${s.a})`;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x - s.len * (.6 + .4 * flow), y); c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  // 绒毛（上岸垂下）：吸收最好的一段带琥珀光
  VILLI.forEach((v, i) => {
    const sw = Math.sin(t * 1.1 + v.ph) * 6, x0 = v.x, y0 = RIV.top, L = v.len * (villusLit(x0) ? 1.1 : .85);
    const lv = lit ? (lit[i] || 0) : 0, zone = villusLit(x0);
    c.beginPath(); c.moveTo(x0 - v.w / 2, y0); c.quadraticCurveTo(x0 - v.w / 2 + sw * .5, y0 + L * .6, x0 + sw, y0 + L); c.quadraticCurveTo(x0 + v.w / 2 + sw * .5, y0 + L * .6, x0 + v.w / 2, y0); c.closePath();
    const gv = c.createLinearGradient(0, y0, 0, y0 + L);
    gv.addColorStop(0, '#2a1912'); gv.addColorStop(1, zone ? rgba('#e8a33d', .55 + .45 * lv) : 'rgba(120,80,60,.45)');
    c.fillStyle = gv; c.fill();
    if (zone || lv > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x0 + sw, y0 + L, 26 + 40 * lv, C.dose, (zone ? .18 : 0) + .6 * lv); c.restore(); }
  });
  // 底岸绒毛剪影
  c.fillStyle = '#0a0d10';
  VILLI.forEach((v) => { const sw = Math.sin(t * .9 + v.ph) * 4; c.beginPath(); c.moveTo(v.x - v.w / 2, RIV.bot); c.quadraticCurveTo(v.x + sw, RIV.bot - v.len * .55, v.x + v.w / 2, RIV.bot); c.fill(); });
  // 尽头的暗门
  if (gate > 0) {
    const gd = c.createLinearGradient(RIV.gate - 140, 0, W, 0); gd.addColorStop(0, 'rgba(0,0,0,0)'); gd.addColorStop(.55, `rgba(0,0,0,${.85 * gate})`); gd.addColorStop(1, `rgba(0,0,0,${gate})`);
    c.fillStyle = gd; c.fillRect(RIV.gate - 140, 0, W - RIV.gate + 140, H);
  }
  if (dim > 0) { c.fillStyle = `rgba(0,0,0,${dim})`; c.fillRect(0, 0, W, H); }
  c.restore();
}
