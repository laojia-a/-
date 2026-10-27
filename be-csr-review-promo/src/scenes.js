// The nine shots of the film. Each scene draws onto ctx for local time lt (seconds since scene start).
const L = require('./lib');
const { GATE_PASS } = require('./timeline');
const {
  clamp, lerp, inv, E, win, rng, noise1, hex, C, makeCam, project, rot3, planePt, planeQuad, planeLine, planeText,
  rrect, text, measure, revealText, scramble, createCanvas, W, H,
} = L;

const TAU = Math.PI * 2;
const sig = (x) => 1 / (1 + Math.exp(-x));
// keyframe interpolation [[t,v],...] with smoothstep
function kf(keys, t, ease = E.inOutCubic) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const [t0, v0] = keys[i - 1], [t1, v1] = keys[i];
      return lerp(v0, v1, ease((t - t0) / (t1 - t0)));
    }
  }
  return keys[keys.length - 1][1];
}

// ======================= shared elements =======================
const DUST = (() => { const r = rng(7); return Array.from({ length: 520 }, () => ({ x: (r() - 0.5) * 34, y: (r() - 0.5) * 20, z: r() * 40, s: r() * 1.4 + 0.4, ph: r() * TAU })); })();
function drawDust(ctx, cam, t, o = {}) {
  const color = o.color || '200,235,255';
  const amt = o.alpha == null ? 1 : o.alpha;
  for (const d of DUST) {
    const rz = (((d.z - cam.z) % 40) + 40) % 40 + 0.3;
    const p = project(cam, [cam.x + d.x + Math.sin(t * 0.3 + d.ph) * 0.4, cam.y + d.y + Math.cos(t * 0.23 + d.ph) * 0.3 + (o.fall ? t * 0.15 % 20 : 0), cam.z + rz]);
    if (!p) continue;
    const a = clamp(rz / 3) * clamp((40 - rz) / 12) * amt * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 2 + d.ph)));
    if (o.beam) { const bx = o.beam(p.x, p.y); if (bx <= 0.02) continue; ctx.globalAlpha = a * bx; } else ctx.globalAlpha = a * 0.5;
    const r = clamp(d.s * p.k * 0.012, 0.6, 5);
    ctx.fillStyle = `rgba(${color},1)`;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bgGlow(ctx, x, y, r, color, a) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, hex(color, a)); g.addColorStop(1, hex(color, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function floorGrid(ctx, cam, t, o = {}) {
  const y = o.y || 1.8, alpha = o.alpha || 0.3, scroll = o.scroll || 0;
  ctx.save();
  ctx.strokeStyle = hex(o.color || C.cyan, 1);
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 40; i++) {
    const z = cam.z + 1 + i * 1.5 - (scroll % 1.5);
    const a = project(cam, [cam.x - 40, y, z]), b = project(cam, [cam.x + 40, y, z]);
    if (!a || !b) continue;
    ctx.globalAlpha = alpha * clamp(1 - i / 40) * clamp(i / 3);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  for (let xi = -20; xi <= 20; xi++) {
    const a = project(cam, [xi * 1.5, y, cam.z + 0.6]), b = project(cam, [xi * 1.5, y, cam.z + 60]);
    if (!a || !b) continue;
    const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
    g.addColorStop(0, hex(o.color || C.cyan, alpha)); g.addColorStop(1, hex(o.color || C.cyan, 0));
    ctx.strokeStyle = g; ctx.globalAlpha = 1;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
}

// A CSR page in 3D with header, paragraphs and a data table.
function drawPage(ctx, cam, pl, seed, o = {}) {
  const w = o.w || 2.1, h = o.h || 2.97;
  const pc = project(cam, pl.c);
  if (!pc) return;
  const fog = clamp(1 - (pc.z - (o.fogNear || 10)) / (o.fogFar || 45));
  const alpha = fog * (o.alpha == null ? 1 : o.alpha) * clamp((pc.z - 0.4) / 1.2);
  if (alpha < 0.02) return;
  const n = rot3([0, 0, 1], pl.rx || 0, pl.ry || 0, pl.rz || 0);
  const vx = pl.c[0] - cam.x, vy = pl.c[1] - cam.y, vz = pl.c[2] - cam.z, vl = Math.hypot(vx, vy, vz);
  const lit = 0.5 + 0.5 * Math.abs((n[0] * vx + n[1] * vy + n[2] * vz) / vl);
  const px = pc.k * h;
  ctx.globalAlpha = alpha;
  if (!planeQuad(ctx, cam, pl, -w / 2, -h / 2, w / 2, h / 2)) return;
  const tint = o.tint || [222, 233, 245];
  ctx.fillStyle = `rgb(${tint[0] * lit | 0},${tint[1] * lit | 0},${tint[2] * lit | 0})`;
  ctx.fill();
  if (px < 45) { ctx.globalAlpha = 1; return; }
  const r = rng(seed);
  // header
  ctx.fillStyle = 'rgba(18,42,78,0.9)';
  planeQuad(ctx, cam, pl, -w / 2 + 0.16, -h / 2 + 0.16, -w / 2 + 0.16 + w * 0.42, -h / 2 + 0.27); ctx.fill();
  ctx.fillStyle = 'rgba(0,150,200,0.8)';
  planeQuad(ctx, cam, pl, w / 2 - 0.5, -h / 2 + 0.16, w / 2 - 0.16, -h / 2 + 0.27); ctx.fill();
  // paragraphs
  ctx.fillStyle = 'rgba(70,86,108,0.55)';
  for (let i = 0; i < 6; i++) {
    const y = -h / 2 + 0.45 + i * 0.12, len = (w - 0.32) * (i === 5 ? 0.5 : 0.75 + 0.25 * r());
    planeQuad(ctx, cam, pl, -w / 2 + 0.16, y, -w / 2 + 0.16 + len, y + 0.045); ctx.fill();
  }
  // table
  const tx0 = -w / 2 + 0.16, tx1 = w / 2 - 0.16, ty0 = -h / 2 + 1.3, rows = 8, rh = 0.17, cols = 5;
  const cw = (tx1 - tx0) / cols;
  ctx.fillStyle = 'rgba(0,120,170,0.25)';
  planeQuad(ctx, cam, pl, tx0, ty0, tx1, ty0 + rh); ctx.fill();
  if (o.marks) {
    for (const [mr, mc, col] of o.marks) {
      ctx.fillStyle = col;
      planeQuad(ctx, cam, pl, tx0 + mc * cw, ty0 + mr * rh, tx0 + (mc + 1) * cw, ty0 + (mr + 1) * rh); ctx.fill();
    }
  }
  ctx.strokeStyle = 'rgba(30,52,84,0.75)';
  ctx.lineWidth = clamp(pc.k * 0.006, 0.5, 2);
  ctx.beginPath();
  for (let i = 0; i <= rows; i++) planeLine(ctx, cam, pl, tx0, ty0 + i * rh, tx1, ty0 + i * rh);
  for (let j = 0; j <= cols; j++) planeLine(ctx, cam, pl, tx0 + j * cw, ty0, tx0 + j * cw, ty0 + rows * rh);
  ctx.stroke();
  // more paragraphs after table + footnote
  ctx.fillStyle = 'rgba(70,86,108,0.5)';
  for (let i = 0; i < 4; i++) {
    const y = ty0 + rows * rh + 0.18 + i * 0.12;
    planeQuad(ctx, cam, pl, -w / 2 + 0.16, y, -w / 2 + 0.16 + (w - 0.32) * (0.6 + 0.4 * r()), y + 0.04); ctx.fill();
  }
  if (px > 240) {
    const heads = ['Param', 'Unit', 'T', 'R', 'T/R'];
    for (let j = 0; j < cols; j++) planeText(ctx, cam, pl, tx0 + j * cw + 0.04, ty0 + rh / 2, heads[j], 0.075, 'Bebas', '#0c2a4a');
    const params = ['Cmax', 'AUC0-t', 'AUC0-inf', 'Tmax', 't1/2', 'λz', 'CL/F'];
    for (let i = 1; i < rows; i++) {
      planeText(ctx, cam, pl, tx0 + 0.04, ty0 + i * rh + rh / 2, params[(i - 1 + seed) % params.length], 0.07, 'Mono', '#1c2f4a');
      for (let j = 1; j < cols; j++) {
        const v = j === 1 ? ['ng/mL', 'h', '1/h'][Math.floor(r() * 3)] : (r() * 1800 + 20).toFixed(j === 4 ? 2 : 1);
        planeText(ctx, cam, pl, tx0 + j * cw + 0.04, ty0 + i * rh + rh / 2, v, 0.066, 'Mono', '#24364f');
      }
    }
    planeText(ctx, cam, pl, -w / 2 + 0.2, -h / 2 + 0.215, 'CLINICAL STUDY REPORT', 0.075, 'Bebas', '#e9f6ff');
  }
  ctx.globalAlpha = 1;
}

// Metallic title with light sweep (drawn via an offscreen layer)
let titleLayer = null;
function drawTitle(ctx, lt, o) {
  if (!titleLayer) titleLayer = createCanvas(W, H);
  const tx = titleLayer.getContext('2d');
  tx.setTransform(1, 0, 0, 1, 0, 0);
  tx.globalCompositeOperation = 'source-over';
  tx.clearRect(0, 0, W, H);
  const str = 'BE CSR REVIEW';
  const size = o.size, y = o.y, sp = o.spacing || 14;
  tx.font = `${size}px Bebas`;
  tx.textBaseline = 'middle';
  const chars = [...str];
  const ws = chars.map((c) => tx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let x = W / 2 - total / 2;
  const grad = tx.createLinearGradient(0, y - size * 0.45, 0, y + size * 0.45);
  grad.addColorStop(0, '#f4fbff'); grad.addColorStop(0.46, '#a9d4f2'); grad.addColorStop(0.54, '#4f86b8'); grad.addColorStop(1, '#d9efff');
  chars.forEach((ch, i) => {
    const p = o.perLetter ? clamp((lt - o.t0 - i * 0.08) / 0.35) : clamp((lt - o.t0) / 0.4);
    if (p > 0 && ch !== ' ') {
      const e = E.outExpo(p);
      const s = lerp(o.perLetter ? 3.2 : 1.35, 1, e);
      tx.save();
      tx.translate(x + ws[i] / 2, y);
      tx.scale(s, s);
      tx.globalAlpha = clamp(p * 2.5);
      tx.fillStyle = grad;
      tx.textAlign = 'center';
      tx.fillText(ch, 0, 0);
      tx.restore();
    }
    x += ws[i] + sp;
  });
  // light sweep
  const sw = o.sweep;
  if (sw != null && sw > -0.2 && sw < 1.2) {
    tx.globalCompositeOperation = 'source-atop';
    const sx = lerp(W / 2 - total / 2 - 300, W / 2 + total / 2 + 300, sw);
    const g = tx.createLinearGradient(sx - 160, 0, sx + 160, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,250,235,0.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    tx.fillStyle = g; tx.fillRect(0, 0, W, H);
  }
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  ctx.shadowColor = hex(C.cyan, 0.55); ctx.shadowBlur = 22;
  ctx.drawImage(titleLayer, 0, 0);
  ctx.restore();
  return total;
}

function shockwave(ctx, x, y, p, maxR, color, width = 50) {
  if (p <= 0 || p >= 1) return;
  const r = E.outExpo(p) * maxR;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(color, (1 - p) * 0.9);
  ctx.lineWidth = width * (1 - p) + 2;
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.42, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = hex('#ffffff', (1 - p) * 0.8);
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.ellipse(x, y, r * 0.96, r * 0.4, 0, 0, TAU); ctx.stroke();
  ctx.restore();
}

const SPARKS = (() => { const r = rng(31); return Array.from({ length: 320 }, () => ({ a: r() * TAU, v: 300 + r() * 1500, s: r() * 2.5 + 0.8, gold: r() < 0.45, up: (r() - 0.5) * 0.7 })); })();
function sparks(ctx, x, y, lt, life = 2.2) {
  if (lt < 0 || lt > life) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pos = (tt, s) => { const d = (1 - Math.exp(-tt * 3)) / 3; return [x + Math.cos(s.a) * s.v * d, y + Math.sin(s.a) * s.v * d * 0.55 + 140 * tt * tt]; };
  for (const s of SPARKS) {
    const [x1, y1] = pos(lt, s), [x0, y0] = pos(Math.max(0, lt - 0.06), s);
    const a = (1 - lt / life);
    ctx.strokeStyle = s.gold ? hex(C.gold, a) : hex(C.ice, a);
    ctx.lineWidth = s.s;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  }
  ctx.restore();
}

function flareLine(ctx, y, a, color = C.cyan) {
  if (a <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, hex(color, 0)); g.addColorStop(0.5, hex('#ffffff', a)); g.addColorStop(1, hex(color, 0));
  ctx.fillStyle = g; ctx.fillRect(0, y - 2, W, 4);
  const g2 = ctx.createLinearGradient(0, 0, W, 0);
  g2.addColorStop(0, hex(color, 0)); g2.addColorStop(0.5, hex(color, a * 0.35)); g2.addColorStop(1, hex(color, 0));
  ctx.fillStyle = g2; ctx.fillRect(0, y - 18, W, 36);
  ctx.restore();
}

function chip(ctx, x, y, label, p, o = {}) {
  if (p <= 0) return;
  const e = E.outBack(clamp(p));
  const size = o.size || 30, font = o.font || 'SCBold';
  const w = measure(ctx, label, size, font) + size * 1.3, h = size * 1.75;
  ctx.save();
  ctx.translate(x, y); ctx.scale(e, e);
  ctx.globalAlpha = clamp(p * 3) * (o.alpha == null ? 1 : o.alpha);
  const col = o.color || C.cyan;
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = o.fill || 'rgba(6,20,36,0.82)'; ctx.fill();
  ctx.shadowColor = hex(col, 0.9); ctx.shadowBlur = 18;
  ctx.strokeStyle = hex(col, 0.95); ctx.lineWidth = 2.5; ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.font = `${size}px ${font}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = o.textColor || C.white; ctx.fillText(label, 0, 2);
  ctx.restore();
  return w;
}

// ======================= S1 cold open =======================
function cold(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const up = inv(0.2, 3.5, lt);
  bgGlow(ctx, W * 0.66, H * 0.2, 900, C.teal, 0.12 * up);
  // volumetric beam
  const bx = W * 0.66;
  const beam = (x, y) => { const half = lerp(60, 520, clamp(y / H)); return clamp(1 - Math.abs(x - bx - (y / H) * 40) / half) * up; };
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const top = 30 + i * 25, bot = 260 + i * 140;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `rgba(190,235,255,${0.10 * up})`); g.addColorStop(1, 'rgba(190,235,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(bx - top, -10); ctx.lineTo(bx + top, -10); ctx.lineTo(bx + 40 + bot, H); ctx.lineTo(bx + 40 - bot, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
  const cam = makeCam({ x: noise1(lt * 0.3) * 0.05, y: noise1(lt * 0.27 + 9) * 0.04, yaw: -0.02 + 0.01 * lt / 7.5 });
  drawDust(ctx, cam, lt, { beam });
  const pe = E.outCubic(inv(0, 7.5, lt));
  const pl = { c: [1.25, 0.05 + 0.06 * Math.sin(lt * 0.8), lerp(8.5, 4.7, pe)], rx: -0.12 + 0.05 * Math.sin(lt * 0.7), ry: lerp(-1.0, -0.42, pe), rz: 0.05 };
  drawPage(ctx, cam, pl, 3, { alpha: inv(0.3, 2.2, lt), fogNear: 30, tint: [178, 194, 214], marks: lt > 5.0 ? [[2, 2, `rgba(255,53,80,${0.5 * inv(5.0, 5.4, lt)})`]] : null });
  // typography
  const fade = 1 - inv(6.9, 7.5, lt);
  const tr = inv(0.8, 7.5, lt);
  text(ctx, 'CLINICAL STUDY REPORT', 170, 330, { font: 'Bebas', size: 84, align: 'left', spacing: lerp(4, 12, tr), color: C.ice, alpha: win(lt, 0.8, 7.5, 1.2, 0.6) * 0.95, glow: hex(C.cyan, 0.6), blur: 30 });
  text(ctx, 'BIOEQUIVALENCE · FASTING / FED', 174, 400, { font: 'Mono', size: 22, align: 'left', spacing: 6, color: C.cyan, alpha: win(lt, 1.6, 7.5, 1.0, 0.6) * 0.8 });
  const words = ['正文', '表格', '嵌套表', '脚注', '图'];
  words.forEach((w, i) => {
    const t0 = 4.6 + i * 0.5, p = inv(t0, t0 + 0.45, lt);
    if (p <= 0) return;
    const y = 490 + i * 72;
    ctx.save(); ctx.globalAlpha = fade;
    ctx.strokeStyle = hex(C.cyan, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(174, y); ctx.lineTo(174 + 60 * E.outCubic(p), y); ctx.stroke();
    ctx.restore();
    text(ctx, w, 254, y, { font: 'SCBlack', size: 50, align: 'left', alpha: E.outCubic(p) * fade, glow: hex(C.cyan, 0.7), blur: 18 });
  });
  return { bloom: 0.8, streak: 0.15 };
}

// ======================= S2 storm =======================
const STORM = (() => { const r = rng(11); return Array.from({ length: 190 }, (_, i) => ({ a: r() * TAU, r: 1.4 + r() * 5.2, z: r() * 70, tr: [(r() - 0.5) * 2.4, (r() - 0.5) * 2.4, (r() - 0.5) * 1.6], ph: [r() * TAU, r() * TAU, r() * TAU], seed: i * 13 + 5, mark: r() < 0.18 })); })();
const TAGS = [
  [2.0, 0.24, 0.30, '转录不一致', '1,284.6 ≠ 1,248.6'],
  [3.5, 0.74, 0.62, '人数矛盾', 'N = 24 ≠ 23'],
  [5.0, 0.30, 0.68, '单位不符', 'ng/mL ≠ μg/mL'],
  [6.5, 0.72, 0.28, '显示精度', '6.8 ≠ 6.84'],
  [7.5, 0.50, 0.24, '脚注缺失', '† 未找到对应说明'],
  [8.0, 0.62, 0.50, '表头不一致', 'AUC0-t ≠ AUC0-∞'],
];
function storm(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const T = 11.5;
  const collapse = E.inExpo(inv(9.3, 11.5, lt));
  bgGlow(ctx, W / 2, H / 2, 1100, C.teal, 0.1 + 0.25 * inv(4, 11.5, lt));
  const D = 3 * lt + (7 * lt * lt * lt) / (3 * T * T);
  const vort = 0.12 * lt + 0.035 * lt * lt;
  const cam = makeCam({ roll: 0.12 * Math.sin(lt * 0.45) + 0.03 * lt, fov: 1.0 + 0.25 * inv(6, 11.5, lt) });
  drawDust(ctx, cam, lt, { alpha: 0.8 });
  const items = STORM.map((p) => {
    let z = (((p.z - D) % 70) + 70) % 70 + 0.2;
    const ang = p.a + vort * (2.2 / p.r);
    let r = p.r * (1 - collapse);
    z = lerp(z, 28 + p.z * 0.2, collapse);
    return { p, z, x: Math.cos(ang) * r, y: Math.sin(ang) * r * 0.78 };
  }).sort((a, b) => b.z - a.z);
  for (const it of items) {
    const { p } = it;
    const pl = { c: [it.x, it.y, it.z], rx: p.ph[0] + lt * p.tr[0], ry: p.ph[1] + lt * p.tr[1], rz: p.ph[2] + lt * p.tr[2] };
    drawPage(ctx, cam, pl, p.seed, { w: 1.4, h: 1.98, fogNear: 12, fogFar: 55, marks: p.mark ? [[3, 2, 'rgba(255,53,80,0.75)']] : null });
  }
  const qv = win(lt, 9.6, 11.45, 0.35, 0.25);
  // singularity
  const sing = inv(8.5, 11.5, lt) * (1 - 0.75 * qv);
  if (sing > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    bgGlow(ctx, W / 2, H / 2, 200 + 900 * sing * sing, '#bfefff', 0.9 * sing);
    bgGlow(ctx, W / 2, H / 2, 80 + 200 * sing, '#ffffff', sing);
    ctx.restore();
  }
  // mismatch tags
  for (const [t0, fx, fy, k, v] of TAGS) {
    const age = lt - t0;
    if (age < 0 || age > 1.6) continue;
    const pop = E.outBack(clamp(age / 0.25));
    const out = inv(1.2, 1.6, age);
    const flick = age < 0.18 ? (Math.floor(age * 60) % 2 ? 0.3 : 1) : 1;
    const x = fx * W, y = fy * H, s = pop * (1 + age * 0.12);
    ctx.save();
    ctx.translate(x, y); ctx.scale(s, s);
    ctx.globalAlpha = (1 - out) * flick;
    const w = Math.max(measure(ctx, v, 40, 'Mono'), measure(ctx, k, 26, 'SCBold')) + 60;
    rrect(ctx, -w / 2, -60, w, 120, 14);
    ctx.fillStyle = 'rgba(30,4,10,0.85)'; ctx.fill();
    ctx.shadowColor = hex(C.red, 1); ctx.shadowBlur = 30;
    ctx.strokeStyle = hex(C.red, 1); ctx.lineWidth = 3; ctx.stroke();
    ctx.shadowBlur = 0;
    text(ctx, '⚠ ' + k, 0, -24, { font: 'SCBold', size: 26, color: '#ff8a99' });
    text(ctx, v, 0, 22, { font: 'Mono', size: 40, color: C.white, glow: hex(C.red, 0.8), blur: 12 });
    ctx.restore();
  }
  // big question card
  const q = win(lt, 9.6, 11.45, 0.35, 0.25);
  if (q > 0) {
    const s = 1 + 0.06 * inv(9.6, 11.5, lt);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, 700);
    g.addColorStop(0, `rgba(0,6,14,${0.85 * q})`); g.addColorStop(1, 'rgba(0,6,14,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(s, s);
    text(ctx, '怎样才能', 0, -80, { font: 'SCBold', size: 54, color: C.ice, alpha: q });
    text(ctx, '一格都不漏？', 0, 40, { font: 'SCBlack', size: 132, color: C.white, alpha: q, spacing: 6, glow: hex(C.cyan, 0.9), blur: 30 });
    ctx.restore();
  }
  return { bloom: 0.9 + sing * 0.5, streak: 0.25 + sing * 0.5 - qv * 0.2, shake: 3 * inv(4, 11.5, lt) };
}

// ======================= S3 title =======================
function title(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H * 0.45, 1200, C.teal, 0.22);
  bgGlow(ctx, W / 2, H * 0.45, 500, '#3b6bff', 0.12);
  const cam = makeCam({ y: -0.4, pitch: 0.05, z: lt * 2 });
  floorGrid(ctx, cam, lt, { y: 1.4, alpha: 0.28 });
  drawDust(ctx, cam, lt, { alpha: 0.9 });
  const exit = E.inCubic(inv(8.0, 9.0, lt));
  ctx.save();
  const sc = 1 + 0.04 * lt / 9 + exit * 1.8;
  ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
  ctx.globalAlpha = 1 - exit;
  shockwave(ctx, W / 2, 470, inv(0, 1.5, lt), W * 0.95, C.cyan);
  shockwave(ctx, W / 2, 470, inv(0.15, 1.9, lt), W * 0.75, C.gold, 30);
  sparks(ctx, W / 2, 470, lt);
  flareLine(ctx, 470, 0.25 + 0.75 * Math.exp(-lt * 1.6), C.cyan);
  const sweep = lt < 4 ? inv(1.4, 3.2, lt) : inv(5.6, 7.2, lt);
  const total = drawTitle(ctx, lt, { size: 250, y: 470, spacing: 18, t0: 0.2, perLetter: true, sweep, alpha: 1 - exit });
  // tagline
  const tl = lt - 2.0;
  if (tl > 0) revealText(ctx, '把报告审清楚，把意见交明白', W / 2, 640, tl, { size: 62, font: 'SCBold', spacing: 10, color: C.ice, glow: hex(C.cyan, 0.8), blur: 22, stagger: 0.05 });
  const dl = E.outExpo(inv(3.4, 4.4, lt));
  if (dl > 0) {
    ctx.save(); ctx.globalAlpha = (1 - exit);
    const g = ctx.createLinearGradient(W / 2 - total / 2, 0, W / 2 + total / 2, 0);
    g.addColorStop(0, hex(C.gold, 0)); g.addColorStop(0.5, hex(C.gold, 0.9)); g.addColorStop(1, hex(C.gold, 0));
    ctx.fillStyle = g; ctx.fillRect(W / 2 - (total / 2) * dl, 712, total * dl, 2);
    ctx.restore();
    text(ctx, 'REVIEW-BE-REPORT  ·  SKILL 3.3.27  ·  CSR REVIEW METHOD + LOCAL TOOLS', W / 2, 752, { font: 'Mono', size: 20, spacing: 3, color: C.gold, alpha: inv(3.8, 4.6, lt) * 0.9 * (1 - exit) });
  }
  ctx.restore();
  return { bloom: 1.0, streak: 0.45 + 0.6 * Math.exp(-lt * 1.5) };
}

// ======================= S4 gates =======================
const GATES = [
  ['G0', '明确任务', '目标 · 版本 · 空腹/餐后分支 · 范围'],
  ['G1', '固定文件', '绑定文件身份与来源角色'],
  ['G2', '顺读全文', '读完约定内容，记录精确断点'],
  ['G3', '核来源与主张', '题 · 表头 · 单位 · 脚注 · 全部值格'],
  ['G4', '反查意见与漏项', '反证 · 已有说明 · 全部表现位置'],
  ['G5', '交付', '七列意见 · 重点与未核说明'],
];
const TG = GATE_PASS.map((t) => t - 28);
const STREAKS = (() => { const r = rng(5); return Array.from({ length: 170 }, () => ({ a: r() * TAU, r: 2.8 + r() * 5, z: r() * 50, gold: r() < 0.25 })); })();
function gateCamZ(lt) { let z = 0.4 * lt; for (const tg of TG) z += 10 * sig((lt - tg) / 0.16); return z; }
function gateSpeed(lt) { let v = 0.4; for (const tg of TG) { const s = sig((lt - tg) / 0.16); v += (10 * s * (1 - s)) / 0.16; } return v; }
function gates(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  const camZ = gateCamZ(lt), speed = gateSpeed(lt);
  let roll = 0; TG.forEach((tg, i) => { roll += (i % 2 ? -1 : 1) * 0.22 * Math.exp(-Math.pow((lt - tg) / 0.4, 2)); });
  const cam = makeCam({ z: camZ, x: noise1(lt * 0.4) * 0.25, y: noise1(lt * 0.37 + 5) * 0.18, roll: roll + 0.04 * Math.sin(lt * 0.5), fov: 1.0 + speed * 0.006 });
  bgGlow(ctx, W / 2, H / 2, 700, C.teal, 0.2);
  // streaks
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const len = 0.3 + speed * 0.09;
  for (const s of STREAKS) {
    const rz = (((s.z - camZ) % 50) + 50) % 50 + 0.5;
    const x = Math.cos(s.a) * s.r, y = Math.sin(s.a) * s.r;
    const a = project(cam, [x, y, camZ + rz]), b = project(cam, [x, y, camZ + rz + len]);
    if (!a || !b) continue;
    ctx.strokeStyle = s.gold ? hex(C.gold, 0.5 * clamp(rz / 4)) : hex(C.cyan, 0.45 * clamp(rz / 4));
    ctx.lineWidth = clamp(a.k * 0.02, 0.6, 4);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  ctx.restore();
  // gates far -> near
  const order = GATES.map((g, i) => i).reverse();
  for (const i of order) {
    const zg = 10 * i + 5 + 0.4 * TG[i];
    const dist = zg - camZ;
    if (dist < 0.15 || dist > 48) continue;
    const col = i === 5 ? C.gold : C.cyan;
    const R = 2.5, rotA = lt * 0.25 + i * 0.5;
    const fadeFar = clamp((48 - dist) / 20);
    const pts = [];
    for (let k = 0; k < 6; k++) { const a = rotA + (k * TAU) / 6; pts.push(project(cam, [Math.cos(a) * R, Math.sin(a) * R, zg])); }
    if (pts.some((p) => !p)) continue;
    const k0 = pts[0].k;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const path = () => { ctx.beginPath(); pts.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y))); ctx.closePath(); };
    path(); ctx.strokeStyle = hex(col, 0.18 * fadeFar); ctx.lineWidth = k0 * 0.35; ctx.stroke();
    path(); ctx.strokeStyle = hex(col, 0.5 * fadeFar); ctx.lineWidth = k0 * 0.08; ctx.stroke();
    path(); ctx.strokeStyle = hex('#ffffff', 0.9 * fadeFar); ctx.lineWidth = Math.max(1, k0 * 0.018); ctx.stroke();
    // inner ticks ring
    ctx.strokeStyle = hex(col, 0.55 * fadeFar); ctx.lineWidth = Math.max(1, k0 * 0.012);
    ctx.beginPath();
    for (let k = 0; k < 48; k++) {
      const a = -rotA * 1.6 + (k * TAU) / 48, r1 = 2.05, r2 = k % 4 ? 2.15 : 2.3;
      const p1 = project(cam, [Math.cos(a) * r1, Math.sin(a) * r1, zg]), p2 = project(cam, [Math.cos(a) * r2, Math.sin(a) * r2, zg]);
      if (p1 && p2) { ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); }
    }
    ctx.stroke();
    ctx.restore();
    // label
    const pc = project(cam, [0, 0, zg]);
    const s = pc.k / (cam.f / 5);
    const la = clamp((dist - 1.2) / 2.5) * clamp((8.5 - dist) / 2);
    if (la > 0.01) {
      text(ctx, GATES[i][0], pc.x, pc.y - 120 * s, { font: 'Bebas', size: 190 * s, color: col, alpha: la, glow: hex(col, 0.9), blur: 30 * s });
      text(ctx, GATES[i][1], pc.x, pc.y + 40 * s, { font: 'SCBlack', size: 100 * s, color: C.white, alpha: la, glow: hex(col, 0.6), blur: 20 * s, spacing: 6 * s });
      text(ctx, GATES[i][2], pc.x, pc.y + 135 * s, { font: 'SCMedium', size: 38 * s, color: C.ice, alpha: la * 0.9 });
    }
  }
  // passing flash ring
  const end = inv(15.2, 16, lt);
  if (end > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; bgGlow(ctx, W / 2, H / 2, 300 + 1400 * end, '#ffe2a8', end); ctx.restore(); }
  const overlay = (o) => {
    // HUD in the top letterbox bar
    const x0 = 660, step = 120, y = 62;
    o.save();
    o.globalAlpha = win(lt, 0.2, 16, 0.5, 0.4);
    o.strokeStyle = hex(C.cyan, 0.35); o.lineWidth = 2;
    o.beginPath(); o.moveTo(x0, y); o.lineTo(x0 + step * 5, y); o.stroke();
    const prog = clamp((lt - TG[0]) / (TG[5] - TG[0]));
    o.strokeStyle = hex(C.cyan, 1); o.lineWidth = 3;
    o.beginPath(); o.moveTo(x0, y); o.lineTo(x0 + step * 5 * prog, y); o.stroke();
    for (let i = 0; i < 6; i++) {
      const on = lt >= TG[i] - 0.05;
      const pulse = Math.exp(-Math.pow((lt - TG[i]) / 0.25, 2));
      o.beginPath(); o.arc(x0 + i * step, y, 9 + 6 * pulse, 0, TAU);
      o.fillStyle = on ? (i === 5 ? C.gold : C.cyan) : '#0a1a2a'; o.fill();
      o.strokeStyle = hex(i === 5 ? C.gold : C.cyan, 0.9); o.lineWidth = 2; o.stroke();
      text(o, GATES[i][0], x0 + i * step, y + 36, { font: 'Mono', size: 18, color: on ? C.white : '#5d7891' });
    }
    o.restore();
  };
  return { bloom: 0.9, streak: 0.12 + speed * 0.006, overlay };
}

// ======================= S5 table =======================
const COLS = [['参数', 1.2], ['单位', 1.1], ['CSR 显示值', 1.4], ['来源原值', 1.4], ['显示精度', 1.0], ['核对', 0.9]];
const ROWS = [
  ['Cmax', 'ng/mL', '1,036.2', '1,036.2', '0.1', 'ok', 1.3],
  ['AUC0-t', 'h·ng/mL', '1,284.6', '1,248.6', '0.1', 'bad', 1.8],
  ['AUC0-∞', 'h·ng/mL', '1,302.9', '1,302.9', '0.1', 'ok', 4.4],
  ['Tmax', 'h', '1.50', '1.50', '0.01', 'ok', 4.9],
  ['t1/2', 'h', '6.8', '6.84', '0.01', 'warn', 5.4],
  ['λz', '1/h', '0.102', '0.102', '0.001', 'ok', 5.9],
];
const TW = 7.0, RH = 0.44;
const TBL = { c: [0, 0.05, 6], rx: 0, ry: 0, rz: 0 };
const colX = (j) => -TW / 2 + COLS.slice(0, j).reduce((a, c) => a + c[1], 0);
const rowY = (i) => -2.0 + i * RH; // i: 0 title, 1 header, 2.. data, 8 footnote
const CHIPS = [
  ['表题', 0.17, 0.25, [0, -1.85]],
  ['表头', 0.83, 0.25, [1.5, rowY(1) + RH / 2]],
  ['标签', 0.1, 0.45, [colX(0) + 0.6, rowY(4) + RH / 2]],
  ['单位', 0.9, 0.45, [colX(1) + 0.55, rowY(3) + RH / 2]],
  ['脚注', 0.12, 0.66, [-2.5, rowY(8) + RH / 2]],
  ['缺失标记', 0.88, 0.66, [colX(4) + 0.5, rowY(7) + RH / 2]],
  ['显示精度', 0.3, 0.8, [colX(4) + 0.5, rowY(6) + RH / 2]],
  ['每一个值格', 0.7, 0.8, [colX(3) + 0.7, rowY(5) + RH / 2]],
];
function table(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H / 2, 1100, C.navy, 1);
  bgGlow(ctx, W / 2, H * 0.5, 800, C.teal, 0.12);
  // camera: orbit + crash zoom into the mismatch
  const a = lerp(-0.32, 0.22, lt / 14);
  const crash = kf([[1.8, 0], [2.15, 1], [4.0, 1], [4.5, 0]], lt, (x) => (x < 0.5 ? E.outExpo(x * 2) * 0.5 : 0.5 + E.inOutCubic((x - 0.5) * 2) * 0.5));
  const crashIn = lt < 3 ? E.outExpo(inv(1.8, 2.15, lt)) : 1 - E.inOutCubic(inv(4.0, 4.5, lt));
  const pull = E.inOutCubic(inv(9.6, 10.6, lt));
  const dist = lerp(lerp(6.4, 2.5, crashIn), 8.5, pull);
  const tgt = [lerp(0, colX(3), crashIn), lerp(0.05, rowY(3) + RH / 2 + 0.25, crashIn), 6];
  const aa = lerp(a, 0.12, crashIn);
  const cam = makeCam({ x: tgt[0] + dist * Math.sin(aa), y: tgt[1] - 0.6 * (1 - crashIn) + noise1(lt * 0.5) * 0.04, z: tgt[2] - dist * Math.cos(aa), yaw: -aa, pitch: -0.09 * (1 - crashIn) });
  void crash;
  drawDust(ctx, cam, lt, { alpha: 0.6 });
  floorGrid(ctx, cam, lt, { y: 2.6, alpha: 0.12, scroll: lt * 0.3 });
  const dim = 1 - 0.86 * E.inOutCubic(inv(9.8, 10.6, lt));
  ctx.globalAlpha = 1;
  const pl = TBL;
  const quad = (x0, y0, x1, y1, fill) => { if (planeQuad(ctx, cam, pl, x0, y0, x1, y1)) { ctx.fillStyle = fill; ctx.fill(); } };
  const appear = (i) => E.outCubic(inv(0.05 + i * 0.07, 0.5 + i * 0.07, lt));
  // panel back
  ctx.save(); ctx.globalAlpha = dim * appear(0);
  ctx.shadowColor = hex(C.cyan, 0.5); ctx.shadowBlur = 50;
  quad(-TW / 2 - 0.15, rowY(0) - 0.12, TW / 2 + 0.15, rowY(9) + 0.1, 'rgba(6,18,34,0.92)');
  ctx.restore();
  ctx.globalAlpha = dim * appear(0);
  planeText(ctx, cam, pl, -TW / 2, rowY(0) + RH / 2, '表 14.2.1  主要药代动力学参数（示例数据）', 0.24, 'SCBold', C.ice);
  ctx.globalAlpha = dim * appear(1);
  quad(-TW / 2, rowY(1), TW / 2, rowY(2), 'rgba(0,140,190,0.35)');
  COLS.forEach((c, j) => planeText(ctx, cam, pl, colX(j) + 0.1, rowY(1) + RH / 2, c[0], 0.19, 'SCBold', C.cyan));
  const beamY = kf([[1.0, rowY(2)], [1.8, rowY(3)], [4.2, rowY(3)], [4.4, rowY(4)], [4.9, rowY(5)], [5.4, rowY(6)], [5.9, rowY(7)], [6.3, rowY(8)]], lt, E.inOutCubic);
  ROWS.forEach((r, i) => {
    const ri = i + 2, ap = appear(ri);
    if (ap <= 0) return;
    ctx.globalAlpha = dim * ap;
    const done = lt >= r[6];
    const age = lt - r[6];
    const state = done ? r[5] : null;
    if (state === 'bad') quad(-TW / 2, rowY(ri), TW / 2, rowY(ri + 1), `rgba(255,40,70,${0.18 + 0.12 * Math.sin(lt * 12)})`);
    else if (state === 'warn') quad(-TW / 2, rowY(ri), TW / 2, rowY(ri + 1), 'rgba(255,180,60,0.16)');
    else if (state === 'ok') quad(-TW / 2, rowY(ri), TW / 2, rowY(ri + 1), `rgba(54,255,162,${0.05 + 0.25 * Math.exp(-age * 3)})`);
    r.slice(0, 5).forEach((v, j) => {
      let col = j === 0 ? C.white : '#bcd2e6';
      if (state === 'bad' && (j === 2 || j === 3)) col = j === 2 ? '#ff7b8e' : C.gold;
      if (state === 'warn' && (j === 2 || j === 3)) col = C.gold;
      planeText(ctx, cam, pl, colX(j) + 0.1, rowY(ri) + RH / 2, v, j === 0 ? 0.2 : 0.19, j === 0 ? 'SCBold' : 'Mono', col);
    });
    if (state) {
      const sym = state === 'ok' ? '✓ 一致' : state === 'bad' ? '× 不一致' : '⚠ 精度';
      const sc = state === 'ok' ? C.green : state === 'bad' ? C.red : C.gold;
      ctx.globalAlpha = dim * ap * clamp(age / 0.15);
      planeText(ctx, cam, pl, colX(5) + 0.08, rowY(ri) + RH / 2, sym, 0.19, 'SCBold', sc);
    }
  });
  ctx.globalAlpha = dim * appear(8);
  planeText(ctx, cam, pl, -TW / 2 + 0.1, rowY(8) + RH / 2, '注：— 表示未检出；本表为演示用示例数据。', 0.16, 'SCRegular', '#7f98b0');
  // grid lines
  ctx.globalAlpha = dim * appear(2) * 0.8;
  ctx.strokeStyle = hex(C.cyan, 0.35); ctx.lineWidth = 1.3;
  ctx.beginPath();
  for (let i = 1; i <= 8; i++) planeLine(ctx, cam, pl, -TW / 2, rowY(i), TW / 2, rowY(i));
  for (let j = 0; j <= 6; j++) planeLine(ctx, cam, pl, colX(j), rowY(1), colX(j), rowY(8));
  ctx.stroke();
  // scanning laser
  const beamA = win(lt, 0.9, 6.5, 0.2, 0.3) * dim;
  if (beamA > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = beamA;
    const p1 = project(cam, planePt(pl, -TW / 2 - 0.4, beamY)), p2 = project(cam, planePt(pl, TW / 2 + 0.4, beamY));
    if (p1 && p2) {
      ctx.strokeStyle = hex(C.cyan, 0.25); ctx.lineWidth = 26; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
      ctx.strokeStyle = hex('#ffffff', 0.95); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  // crash callout
  const ca = win(lt, 2.1, 4.1, 0.2, 0.25);
  if (ca > 0) {
    const s = E.outBack(clamp((lt - 2.1) / 0.3));
    ctx.save(); ctx.translate(W / 2, 255); ctx.scale(s, s); ctx.globalAlpha = ca;
    rrect(ctx, -470, -95, 940, 190, 18); ctx.fillStyle = 'rgba(22,3,8,0.97)'; ctx.fill();
    ctx.shadowColor = C.red; ctx.shadowBlur = 40; ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
    text(ctx, '× 转录不一致', -440, -50, { font: 'SCBlack', size: 36, align: 'left', color: '#ff8a99' });
    text(ctx, '定位：表14.2.1 · AUC0-t · CSR显示值', 440, -50, { font: 'SCMedium', size: 24, align: 'right', color: '#ffc2ca' });
    // 1,2[84].6 ≠ 1,2[48].6 with highlighted digits
    const segs = [['1,2', C.white], ['84', '#ff5a72'], ['.6', C.white], ['   ≠   ', C.red], ['1,2', C.white], ['48', C.gold], ['.6', C.white]];
    ctx.font = '64px Mono';
    const tw = segs.reduce((a, [sg]) => a + ctx.measureText(sg).width, 0);
    let x = -tw / 2;
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    for (const [sg, c] of segs) { ctx.fillStyle = c; ctx.shadowColor = c; ctx.shadowBlur = c === C.white ? 0 : 20; ctx.fillText(sg, x, 30); x += ctx.measureText(sg).width; }
    ctx.shadowBlur = 0;
    text(ctx, 'CSR', -tw / 2 + 80, 82, { font: 'Mono', size: 18, color: '#ff8a99' });
    text(ctx, '来源', tw / 2 - 80, 82, { font: 'SCMedium', size: 18, color: C.gold });
    ctx.restore();
  }
  // checklist chips
  CHIPS.forEach(([label, fx, fy, anchor], i) => {
    const t0 = 6.3 + i * 0.4, p = inv(t0, t0 + 0.35, lt);
    const fade = 1 - inv(9.6, 10.2, lt);
    if (p <= 0 || fade <= 0) return;
    const x = fx * W, y = fy * H;
    const ap = project(cam, planePt(pl, anchor[0], anchor[1]));
    if (ap) {
      ctx.save(); ctx.globalAlpha = fade * clamp(p * 2);
      ctx.strokeStyle = hex(C.cyan, 0.7); ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(lerp(x, ap.x, E.outCubic(p)), lerp(y, ap.y, E.outCubic(p))); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(ap.x, ap.y, 6 * E.outBack(p), 0, TAU); ctx.fill();
      ctx.restore();
    }
    chip(ctx, x, y, label, p, { alpha: fade, size: 30 });
  });
  // honesty beat
  const hb = win(lt, 10.1, 14, 0.4, 0.4);
  if (hb > 0) {
    const s = 1 + 0.03 * (lt - 10);
    ctx.save(); ctx.translate(W / 2, 400); ctx.scale(s, s);
    text(ctx, '数值一致', -380, 0, { font: 'SCBlack', size: 96, color: C.ice, alpha: hb * E.outCubic(inv(10.1, 10.5, lt)), glow: hex(C.cyan, 0.6), blur: 20 });
    const ne = E.outBack(inv(10.4, 10.8, lt));
    ctx.save(); ctx.scale(ne || 0.001, ne || 0.001);
    text(ctx, '≠', 0, -6, { font: 'Mono', size: 170, color: C.red, alpha: hb, glow: C.red, blur: 40 });
    ctx.restore();
    text(ctx, '专业结论', 380, 0, { font: 'SCBlack', size: 96, color: C.gold, alpha: hb * E.outCubic(inv(10.6, 11.0, lt)), glow: hex(C.orange, 0.6), blur: 20 });
    ctx.restore();
    const items = ['用途', '人群', '时点', '方法', '条件', '反证'];
    items.forEach((it, i) => {
      const t0 = 11.0 + i * 0.4;
      chip(ctx, W / 2 + (i - 2.5) * 190, 620, it, inv(t0, t0 + 0.3, lt), { alpha: hb, color: C.gold, size: 36 });
    });
  }
  return { bloom: 0.85, streak: 0.2 };
}

// ======================= S6 roles =======================
const ROLES = [
  { x: 420, col: C.gold, name: '审核人员', icon: 'person', t0: 0.5, lines: ['处理未定的来源与口径', '做专业取舍', '判断最终意见是否可用'] },
  { x: 960, col: C.violet, name: 'Agent + Skill', icon: 'net', t0: 2.5, lines: ['顺读全文、识别主张', '寻找证据与反证', '组织并复核意见'] },
  { x: 1500, col: C.green, name: '本地确定性工具', icon: 'term', t0: 4.5, lines: ['读取并保留原值', '完整逐格 / 数值比较', '保存 · 恢复 · 生成文件'] },
];
function drawIcon(ctx, kind, s) {
  ctx.save(); ctx.strokeStyle = C.white; ctx.fillStyle = C.white; ctx.lineWidth = 6; ctx.lineCap = 'round';
  ctx.shadowColor = '#fff'; ctx.shadowBlur = 14;
  ctx.scale(s, s);
  if (kind === 'person') {
    ctx.beginPath(); ctx.arc(0, -22, 22, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 48, 44, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
  } else if (kind === 'net') {
    const n = [[0, -40], [-38, -10], [38, -10], [-24, 34], [24, 34], [0, 2]];
    ctx.lineWidth = 3.5; ctx.beginPath();
    [[0, 1], [0, 2], [1, 3], [2, 4], [3, 4], [5, 0], [5, 1], [5, 2], [5, 3], [5, 4]].forEach(([a, b]) => { ctx.moveTo(...n[a]); ctx.lineTo(...n[b]); });
    ctx.stroke();
    n.forEach(([x, y], i) => { ctx.beginPath(); ctx.arc(x, y, i === 5 ? 9 : 7, 0, TAU); ctx.fill(); });
  } else {
    ctx.font = '62px Mono'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('>_', 0, 0);
    rrect(ctx, -52, -42, 104, 84, 12); ctx.lineWidth = 4; ctx.stroke();
  }
  ctx.restore();
}
function roles(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H / 2, 1200, C.navy, 1);
  const cam = makeCam({ z: lt * 0.6, x: Math.sin(lt * 0.2) * 0.3 });
  drawDust(ctx, cam, lt, { alpha: 0.8 });
  const exit = E.inCubic(inv(9.3, 10, lt));
  const drift = Math.sin(lt * 0.35) * 18;
  const cy = 420;
  // beams
  const bp = inv(6.3, 7.3, lt);
  if (bp > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - exit;
    const pairs = [[0, 1], [1, 2], [0, 2]];
    pairs.forEach(([a, b], k) => {
      const A = ROLES[a], B = ROLES[b];
      const lift = k === 2 ? -300 : -120;
      const mx = (A.x + B.x) / 2 + drift, my = cy + lift;
      ctx.strokeStyle = hex(C.cyan, 0.35 * bp); ctx.lineWidth = 10;
      ctx.beginPath(); ctx.moveTo(A.x + drift, cy); ctx.quadraticCurveTo(mx, my, B.x + drift, cy); ctx.stroke();
      ctx.strokeStyle = hex('#ffffff', 0.8 * bp); ctx.lineWidth = 2; ctx.setLineDash([18, 22]); ctx.lineDashOffset = -lt * 120;
      ctx.beginPath(); ctx.moveTo(A.x + drift, cy); ctx.quadraticCurveTo(mx, my, B.x + drift, cy); ctx.stroke(); ctx.setLineDash([]);
      for (let q = 0; q < 4; q++) {
        const u = ((lt * 0.45 + q / 4 + k * 0.13) % 1) * clamp(bp * 1.2);
        const x = (1 - u) * (1 - u) * (A.x + drift) + 2 * (1 - u) * u * mx + u * u * (B.x + drift);
        const y = (1 - u) * (1 - u) * cy + 2 * (1 - u) * u * my + u * u * cy;
        bgGlow(ctx, x, y, 26, '#ffffff', 0.9 * bp);
      }
    });
    ctx.restore();
    text(ctx, '同一份任务 · 证据 · 结果', W / 2 + drift, 200, { font: 'SCBold', size: 36, spacing: 6, color: C.ice, alpha: bp * (1 - exit), glow: hex(C.cyan, 0.7), blur: 18 });
  }
  ROLES.forEach((r, i) => {
    const p = inv(r.t0, r.t0 + 0.7, lt);
    if (p <= 0) return;
    const e = E.outElastic(clamp(p * 1.1));
    const x = r.x + drift + (i - 1) * exit * 600, y = cy + Math.sin(lt * 1.3 + i) * 8;
    ctx.save(); ctx.globalAlpha = 1 - exit;
    ctx.globalCompositeOperation = 'lighter';
    bgGlow(ctx, x, y, 300 * e, r.col, 0.35);
    const g = ctx.createRadialGradient(x, y, 0, x, y, 110 * e);
    g.addColorStop(0, hex('#ffffff', 0.55)); g.addColorStop(0.5, hex(r.col, 0.55)); g.addColorStop(1, hex(r.col, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 110 * e, 0, TAU); ctx.fill();
    for (let k = 0; k < 2; k++) {
      const rot = lt * (k ? -0.7 : 0.9) + i;
      ctx.strokeStyle = hex(r.col, 0.75); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.ellipse(x, y, 150 * e, 46 * e, rot, 0, TAU); ctx.stroke();
      const ph = lt * 2.2 * (k ? -1 : 1) + i;
      const ex = Math.cos(ph) * 150 * e, ey = Math.sin(ph) * 46 * e;
      bgGlow(ctx, x + ex * Math.cos(rot) - ey * Math.sin(rot), y + ex * Math.sin(rot) + ey * Math.cos(rot), 20, '#ffffff', 1);
    }
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 1 - exit; ctx.translate(x, y); drawIcon(ctx, r.icon, e); ctx.restore();
    text(ctx, r.name, x, 640, { font: 'SCBlack', size: 44, color: r.col, alpha: E.outCubic(inv(r.t0 + 0.3, r.t0 + 0.8, lt)) * (1 - exit), glow: hex(r.col, 0.6), blur: 16 });
    r.lines.forEach((ln, j) => {
      revealText(ctx, ln, x, 705 + j * 46, lt - r.t0 - 0.6 - j * 0.25, { size: 27, font: 'SCRegular', color: C.ice, stagger: 0.025, dur: 0.35, rise: 10, alpha: 1 - exit });
    });
  });
  return { bloom: 1.0, streak: 0.3 };
}

// ======================= S7 delivery =======================
const COMMENTS = [
  [1.2, 2, 'R-01', '表14.2.1 AUC0-t：CSR 1,284.6 与来源 1,248.6 不一致，请核对原始输出后更正。', C.red],
  [2.0, 6, 'R-02', '表14.2.1 t1/2：显示 6.8，来源 6.84，显示精度不一致。', C.gold],
  [2.8, 10, 'R-03', '11.4节称“全部受试者完成试验”，与处置表人数不一致，请核对。', C.red],
];
const SEVEN = [['编号', 110], ['位置', 230], ['原文', 190], ['意见', 440], ['依据', 330], ['处理性质', 160], ['当前状态', 180]];
const SEVEN_ROWS = [
  ['R-01', '表14.2.1 第2行 · CSR显示值', '1,284.6', '与来源值不一致，请核对原始输出后更正', 'PK输出 AUC0-t T列：1,248.6', '必须修改', '待处理'],
  ['R-02', '表14.2.1 第5行 · CSR显示值', '6.8', '显示精度与来源不一致', '来源 6.84（两位小数）', '必须修改', '待处理'],
  ['R-03', '第11.4节 第3段', '全部受试者完成试验', '与处置表人数不一致，请核对脱落', '处置表：入组24，完成23', '请说明', '待处理'],
];
function wrapLines(ctx, s, maxW, size, font) {
  ctx.font = `${size}px ${font}`;
  const out = []; let cur = '';
  for (const ch of [...s]) { if (ctx.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; }
  if (cur) out.push(cur);
  return out;
}
function delivery(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H / 2, 1200, C.navy, 1);
  bgGlow(ctx, W * 0.3, H * 0.4, 700, C.teal, 0.1);
  const cam = makeCam({ z: lt * 0.5 });
  drawDust(ctx, cam, lt, { alpha: 0.6 });
  // ---- Part A: annotated copy ----
  const aOut = E.inOutCubic(inv(3.7, 4.4, lt));
  if (aOut < 1) {
    const ain = E.outExpo(inv(0, 0.8, lt));
    ctx.save();
    ctx.globalAlpha = 1 - aOut;
    ctx.translate(lerp(-300, 0, ain) - aOut * 500, 0);
    const dx = 230, dy = 175, dw = 640, dh = 740;
    ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50;
    rrect(ctx, dx, dy, dw, dh, 8); ctx.fillStyle = '#e8eef6'; ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#1f4e94'; ctx.fillRect(dx, dy, dw, 50);
    text(ctx, 'CSR_批注副本.docx', dx + 22, dy + 26, { font: 'SCMedium', size: 22, align: 'left', color: '#fff' });
    text(ctx, '原件不改', dx + dw - 22, dy + 26, { font: 'SCBold', size: 20, align: 'right', color: '#ffd27a' });
    const r = rng(4);
    for (let i = 0; i < 13; i++) {
      const y = dy + 100 + i * 46;
      const len = (dw - 80) * (0.55 + 0.45 * r());
      const hit = COMMENTS.find((c) => c[1] === i);
      if (hit) {
        const p = inv(hit[0], hit[0] + 0.3, lt);
        ctx.fillStyle = hex(hit[4], 0.35 * p); ctx.fillRect(dx + 36, y - 6, len * E.outCubic(p) + 8, 26);
      }
      ctx.fillStyle = 'rgba(60,78,100,0.6)'; ctx.fillRect(dx + 40, y, len, 14);
    }
    COMMENTS.forEach(([t0, li, id, msg, col]) => {
      const p = inv(t0, t0 + 0.4, lt);
      if (p <= 0) return;
      const y = dy + 100 + li * 46 + 7;
      const bx = 960, by = y - 70 + 10, bw = 760;
      const lines = wrapLines(ctx, msg, bw - 140, 27, 'SCMedium');
      const bh = 40 + lines.length * 40;
      ctx.save();
      ctx.strokeStyle = hex(col, 0.9); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(dx + dw - 30, y); ctx.lineTo(lerp(dx + dw - 30, bx, E.outCubic(p)), lerp(y, by + bh / 2, E.outCubic(p))); ctx.stroke();
      const s = E.outBack(p);
      ctx.translate(bx, by + bh / 2); ctx.scale(s, s); ctx.translate(-bx, -(by + bh / 2));
      rrect(ctx, bx, by, bw, bh, 14); ctx.fillStyle = 'rgba(8,22,40,0.92)'; ctx.fill();
      ctx.shadowColor = col; ctx.shadowBlur = 22; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.stroke(); ctx.shadowBlur = 0;
      text(ctx, id, bx + 24, by + bh / 2, { font: 'Bebas', size: 44, align: 'left', color: col });
      lines.forEach((ln, k) => text(ctx, ln, bx + 112, by + 40 + k * 40, { font: 'SCMedium', size: 27, align: 'left', color: C.white }));
      ctx.restore();
    });
    ctx.restore();
  }
  // ---- Part B: seven-column table ----
  const bIn = E.outExpo(inv(4.0, 4.8, lt));
  const bShrink = E.inOutCubic(inv(7.7, 8.5, lt));
  if (bIn > 0) {
    ctx.save();
    const s = lerp(0.85, 1, bIn) * lerp(1, 0.62, bShrink);
    ctx.translate(W / 2, lerp(500, 330, bShrink)); ctx.scale(s, s); ctx.translate(-W / 2, -500);
    ctx.globalAlpha = bIn * lerp(1, 0.55, bShrink);
    const x0 = 140, y0 = 260, hh = 70, rh = 120, tw = 1640;
    rrect(ctx, x0 - 20, y0 - 80, tw + 40, hh + rh * 3 + 110, 20); ctx.fillStyle = 'rgba(6,18,34,0.92)'; ctx.fill();
    ctx.shadowColor = hex(C.cyan, 0.6); ctx.shadowBlur = 40; ctx.strokeStyle = hex(C.cyan, 0.6); ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
    text(ctx, '审核意见 · 七列', x0, y0 - 40, { font: 'SCBlack', size: 32, align: 'left', color: C.ice });
    chip(ctx, x0 + 330, y0 - 40, '示例', 1, { size: 20, color: C.gold });
    let cx = x0;
    SEVEN.forEach(([h, w], j) => {
      const p = inv(4.3 + j * 0.08, 4.6 + j * 0.08, lt);
      ctx.save(); ctx.globalAlpha *= p;
      ctx.fillStyle = 'rgba(0,140,190,0.35)'; ctx.fillRect(cx + 2, y0 + (1 - E.outBack(p)) * 30, w - 4, hh - 4);
      text(ctx, h, cx + w / 2, y0 + hh / 2, { font: 'SCBold', size: 28, color: C.cyan });
      ctx.restore();
      cx += w;
    });
    SEVEN_ROWS.forEach((row, i) => {
      const t0 = 5.0 + i * 0.6;
      if (lt < t0) return;
      const y = y0 + hh + i * rh;
      let cx2 = x0;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x0, y, tw, rh - 4);
      row.forEach((v, j) => {
        const w = SEVEN[j][1];
        const shown = [...v].slice(0, Math.floor((lt - t0) * 60)).join('');
        const font = j === 0 ? 'Bebas' : j === 2 ? 'Mono' : 'SCMedium';
        const size = j === 0 ? 38 : 24;
        const lines = wrapLines(ctx, shown, w - 24, size, font).slice(0, 3);
        const col = j === 0 ? C.gold : j === 5 ? (v === '必须修改' ? '#ff8a99' : C.gold) : j === 6 ? C.cyan : C.white;
        lines.forEach((ln, k) => text(ctx, ln, cx2 + 12, y + rh / 2 + (k - (lines.length - 1) / 2) * 32, { font, size, align: 'left', color: col }));
        cx2 += w;
      });
    });
    ctx.strokeStyle = hex(C.cyan, 0.25); ctx.lineWidth = 1;
    ctx.beginPath(); let gx = x0; SEVEN.forEach(([, w]) => { gx += w; ctx.moveTo(gx, y0); ctx.lineTo(gx, y0 + hh + rh * 3); }); ctx.stroke();
    ctx.restore();
  }
  // ---- Part C: save / interrupt / resume ----
  const cIn = inv(8.0, 8.5, lt);
  let res = { bloom: 0.9, streak: 0.2 };
  if (cIn > 0) {
    const y = 700, x0 = 360, x1 = 1560;
    const prog = lt < 9.2 ? 0.62 * E.inOutCubic(inv(8.2, 9.1, lt)) : lt < 10.4 ? 0.62 : lerp(0.62, 1, E.inOutCubic(inv(10.6, 11.7, lt)));
    const dead = lt >= 9.2 && lt < 10.4;
    const flick = dead ? (lt < 9.5 ? (Math.floor(lt * 40) % 2 ? 0.2 : 0.9) : 0.25) : 1;
    ctx.save(); ctx.globalAlpha = cIn * flick;
    rrect(ctx, x0, y - 10, x1 - x0, 20, 10); ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fill();
    const g = ctx.createLinearGradient(x0, 0, x1, 0); g.addColorStop(0, C.cyan); g.addColorStop(1, C.green);
    rrect(ctx, x0, y - 10, (x1 - x0) * prog, 20, 10); ctx.fillStyle = g; ctx.shadowColor = C.cyan; ctx.shadowBlur = 25; ctx.fill(); ctx.shadowBlur = 0;
    const mx = x0 + (x1 - x0) * 0.62;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, y - 40); ctx.lineTo(mx, y + 40); ctx.stroke();
    text(ctx, '断点：第11.4节 · 待核 3 项', mx, y + 70, { font: 'SCMedium', size: 26, color: C.gold });
    ctx.restore();
    chip(ctx, x0 + 120, y - 80, 'review-save', inv(8.3, 8.6, lt), { font: 'Mono', size: 28, color: C.cyan, alpha: flick });
    if (dead) {
      text(ctx, '会话中断', W / 2, 560, { font: 'SCBlack', size: 80, color: C.red, glow: C.red, blur: 40, alpha: lt < 9.5 ? flick : 0.95 });
      res = { bloom: 0.5, streak: 0, dark: 0.5 };
    }
    if (lt >= 10.4) {
      chip(ctx, mx + 220, y - 80, 'review-resume', inv(10.4, 10.7, lt), { font: 'Mono', size: 28, color: C.green });
      text(ctx, '从断点继续', mx, y - 140, { font: 'SCBlack', size: 44, color: C.green, glow: C.green, blur: 22, alpha: inv(10.6, 11.0, lt) });
      if (lt > 11.6) bgGlow(ctx, x1, y, 160, C.green, 0.8 * (1 - inv(11.6, 12, lt)));
    }
  }
  return res;
}

// ======================= S8 package =======================
const HASH = 'bf699143c8a1b56ea8e01087ae28604a9c48d988d13d0c0839fce22252bad24f';
const FACES = [[0, 0, 1], [0, 0, -1], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0]];
const FEATS = [
  ['方法 + 固定运行代码', 0.17, 0.42], ['离线安装 · 不联网补包', 0.83, 0.42],
  ['独立 venv · 不覆盖旧环境', 0.17, 0.62], ['无需完整仓库或API密钥', 0.83, 0.62],
];
function pkg(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H * 0.45, 1100, C.navy, 1);
  bgGlow(ctx, W / 2, H * 0.45, 600, C.teal, 0.18 + 0.2 * inv(2, 4, lt));
  const cam = makeCam({ y: -0.3, z: 0, pitch: 0.03 });
  drawDust(ctx, cam, lt, { alpha: 0.7 });
  const exit = E.inExpo(inv(6.6, 8, lt));
  const S = 1.1, ctr = [0, -0.35, 7 - exit * 5];
  const ry = lt * 0.55 + 0.7 + exit * 3, rx = -0.42;
  // faces with assembly
  const faces = FACES.map((n, i) => {
    const p = E.outExpo(inv(0.4 + i * 0.2, 1.3 + i * 0.2, lt));
    const off = (1 - p) * 9;
    const nn = rot3(n, rx, ry, 0);
    const c = [ctr[0] + nn[0] * (S + off), ctr[1] + nn[1] * (S + off), ctr[2] + nn[2] * (S + off)];
    // plane orientation: build rotation so local z = n
    let prx = 0, pry = 0;
    if (n[0]) pry = n[0] * Math.PI / 2; else if (n[1]) prx = -n[1] * Math.PI / 2; else if (n[2] < 0) pry = Math.PI;
    return { i, p, c, nn, prx, pry, spin: (1 - p) * 4 };
  }).filter((f) => f.p > 0);
  faces.sort((a, b) => b.c[2] - a.c[2]);
  const toWorld = (f, lx, ly) => {
    let v = rot3([lx, ly, 0], f.prx, f.pry, f.spin);
    v = rot3(v, rx, ry, 0);
    return [f.c[0] + v[0], f.c[1] + v[1], f.c[2] + v[2]];
  };
  for (const f of faces) {
    const corners = [[-S, -S], [S, -S], [S, S], [-S, S]].map(([a, b]) => project(cam, toWorld(f, a, b)));
    if (corners.some((c) => !c)) continue;
    const facing = -(f.nn[2]);
    ctx.save();
    ctx.globalAlpha = f.p * (1 - exit * 0.5);
    ctx.beginPath(); corners.forEach((c, j) => (j ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y))); ctx.closePath();
    ctx.fillStyle = `rgba(${10 + 20 * clamp(facing)},${30 + 60 * clamp(facing)},${60 + 90 * clamp(facing)},0.88)`; ctx.fill();
    ctx.shadowColor = C.cyan; ctx.shadowBlur = 25; ctx.strokeStyle = hex(C.cyan, 0.95); ctx.lineWidth = 3; ctx.stroke(); ctx.shadowBlur = 0;
    // inner stripes
    ctx.strokeStyle = hex(C.cyan, 0.35); ctx.lineWidth = 1.5; ctx.beginPath();
    for (let k = 1; k < 5; k++) { const a = project(cam, toWorld(f, -S * 0.8, -S + k * 0.4 * S)), b = project(cam, toWorld(f, S * 0.8, -S + k * 0.4 * S)); if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
    ctx.stroke();
    if (facing > 0.2) {
      const pl = { c: toWorld(f, 0, 0) };
      const p0 = project(cam, toWorld(f, -S * 0.7, -S * 0.35)), pu = project(cam, toWorld(f, -S * 0.7 + 0.01, -S * 0.35)), pv = project(cam, toWorld(f, -S * 0.7, -S * 0.35 + 0.01));
      if (p0 && pu && pv) {
        let ux = (pu.x - p0.x) / 0.01, uy = (pu.y - p0.y) / 0.01, vx = (pv.x - p0.x) / 0.01, vy = (pv.y - p0.y) / 0.01;
        let ox = p0.x, oy = p0.y;
        if (ux * vy - uy * vx < 0) {
          // local frame is mirrored on screen: flip x so text always reads correctly
          const q = project(cam, toWorld(f, S * 0.7, -S * 0.35));
          if (q) { ox = q.x; oy = q.y; }
          ux = -ux; uy = -uy;
        }
        ctx.setTransform(ux * 0.0065, uy * 0.0065, vx * 0.0065, vy * 0.0065, ox, oy);
        ctx.font = '100px Bebas'; ctx.textBaseline = 'middle'; ctx.fillStyle = hex(C.white, clamp(facing)); ctx.fillText(f.i % 2 ? 'SKILL' : 'BE CSR', 0, 0);
        ctx.font = '45px Mono'; ctx.fillStyle = hex(C.gold, clamp(facing)); ctx.fillText('3.3.27', 0, 90);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
      void pl;
    }
    ctx.restore();
  }
  // hex ring tightening into the cube
  const ringR = lerp(4.2, 0.4, E.inCubic(inv(2.0, 4.0, lt)));
  const ringA = win(lt, 0.6, 4.05, 0.6, 0.1);
  if (ringA > 0) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 64; k++) {
      const a = (k / 64) * TAU + lt * 0.8;
      const p = project(cam, [ctr[0] + Math.cos(a) * ringR, ctr[1] + Math.sin(a * 3 + lt) * 0.25, ctr[2] + Math.sin(a) * ringR]);
      if (!p) continue;
      text(ctx, HASH[k], p.x, p.y, { font: 'Mono', size: p.k * 0.32, color: k % 7 ? C.cyan : C.gold, alpha: ringA * clamp(1.2 - (p.z - 3) / 8) });
    }
    ctx.restore();
  }
  // lock + flash
  const lk = lt - 4.0;
  const pc = project(cam, ctr);
  if (lk > -0.6 && pc && exit < 0.9) {
    const s = pc.k / (cam.f / 7);
    const drop = lk < 0 ? 30 * (1 - E.inCubic(clamp((lk + 0.6) / 0.6))) + 0 : 0;
    ctx.save(); ctx.translate(pc.x, pc.y); ctx.scale(s, s); ctx.globalAlpha = clamp((lk + 0.6) * 3) * (1 - exit);
    ctx.shadowColor = hex(C.gold, 0.6); ctx.shadowBlur = 14;
    ctx.strokeStyle = '#c8962e'; ctx.lineWidth = 14; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -40 - drop, 42, Math.PI, 0); ctx.lineTo(42, -10 - drop); ctx.moveTo(-42, -40 - drop); ctx.lineTo(-42, -10 - drop); ctx.stroke();
    rrect(ctx, -70, -20, 140, 110, 16);
    const lg = ctx.createLinearGradient(0, -20, 0, 90); lg.addColorStop(0, '#e6b84a'); lg.addColorStop(1, '#8a5a12');
    ctx.fillStyle = lg; ctx.fill(); ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,230,160,0.8)'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#3a2400'; ctx.beginPath(); ctx.arc(0, 25, 12, 0, TAU); ctx.fill(); ctx.fillRect(-5, 25, 10, 34);
    ctx.restore();
    if (lk > 0) shockwave(ctx, pc.x, pc.y, inv(0, 1.2, lk), 900, C.gold, 40);
  }
  // hash decode line
  const hp = inv(2.0, 4.0, lt);
  if (hp > 0) {
    const a = win(lt, 2.0, 8, 0.3, 0.6) * (1 - exit);
    text(ctx, 'SHA256  ·  --require-hashes', W / 2, 778, { font: 'Mono', size: 20, spacing: 4, color: C.gold, alpha: a * 0.9 });
    text(ctx, scramble(HASH, hp, 3), W / 2, 822, { font: 'Mono', size: 27, color: hp >= 1 ? C.white : C.cyan, alpha: a, glow: hp >= 1 ? hex(C.gold, 0.6) : null, blur: 12 });
  }
  FEATS.forEach(([lab, fx, fy], i) => {
    const t0 = 4.6 + i * 0.6;
    chip(ctx, fx * W, fy * H, lab, inv(t0, t0 + 0.35, lt), { size: 30, color: i % 2 ? C.gold : C.cyan, alpha: 1 - exit });
  });
  if (exit > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; bgGlow(ctx, W / 2, H / 2, 200 + 1600 * exit, '#ffffff', exit); ctx.restore(); }
  return { bloom: lerp(1.0, 0.55, inv(3.6, 4.2, lt)) + exit, streak: 0.35 + exit };
}

// ======================= S9 finale =======================
const WORDS = ['表题', '表头', '标签', '单位', '脚注', '缺失标记', '显示精度', '值格', '用途', '人群', '时点', '方法', '反证', 'G0', 'G1', 'G2', 'G3', 'G4', 'G5', '七列意见', '批注副本', 'review-save', 'review-resume', 'SHA256', '离线安装', 'Skill', 'Agent', '审核人员', '确定性工具', '来源', '断点', '未核说明', 'Word', '证据', '漏项', '全表'];
const STARS = (() => { const r = rng(77); return WORDS.map((w, i) => { const u = r() * 2 - 1, th = r() * TAU, s = Math.sqrt(1 - u * u); return { w, p: [s * Math.cos(th) * 9, u * 5, s * Math.sin(th) * 9 + 4], gold: i % 5 === 0 }; }); })();
function finale(ctx, lt) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  bgGlow(ctx, W / 2, H * 0.45, 1300, C.teal, 0.2);
  bgGlow(ctx, W / 2, H * 0.45, 600, '#3b6bff', 0.12);
  const back = E.outCubic(inv(0, 10, lt));
  const cam = makeCam({ z: lerp(-1, -7, back), yaw: lt * 0.03, y: -0.2 });
  drawDust(ctx, cam, lt, { alpha: 1 });
  // constellation
  const ry = lt * 0.08;
  const pts = STARS.map((s) => { const v = rot3(s.p, 0, ry, 0); return { s, q: project(cam, [v[0], v[1], v[2] + 4]) }; });
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = hex(C.cyan, 0.12); ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 0; i < pts.length; i++) { const a = pts[i].q, b = pts[(i * 7 + 3) % pts.length].q; if (a && b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); } }
  ctx.stroke();
  const ca = inv(0.3, 1.5, lt);
  for (const { s, q } of pts) {
    if (!q) continue;
    const cx = Math.abs(q.x - W / 2) / 640, cy = Math.abs(q.y - 560) / 260;
    const mask = clamp(Math.max(cx, cy) * 4 - 3.2, 0.05, 1);
    const a = ca * clamp(1.3 - q.z / 18) * mask;
    bgGlow(ctx, q.x, q.y, 14, s.gold ? C.gold : C.cyan, a);
    text(ctx, s.w, q.x, q.y - 22, { font: 'SCMedium', size: clamp(q.k * 0.22, 12, 34), color: s.gold ? C.gold : C.ice, alpha: a * 0.75 });
  }
  ctx.restore();
  shockwave(ctx, W / 2, 440, inv(0, 1.6, lt), W, C.cyan);
  shockwave(ctx, W / 2, 440, inv(0.12, 2.0, lt), W * 0.8, C.gold, 30);
  sparks(ctx, W / 2, 440, lt, 2.6);
  flareLine(ctx, 440, 0.3 + 0.7 * Math.exp(-lt * 1.5));
  const total = drawTitle(ctx, lt, { size: 200, y: 440, spacing: 16, t0: 0, perLetter: false, sweep: inv(1.0, 2.6, lt) });
  if (lt > 0.8) revealText(ctx, '把报告审清楚，把意见交明白', W / 2, 580, lt - 0.8, { size: 48, font: 'SCBold', spacing: 8, color: C.ice, glow: hex(C.cyan, 0.7), blur: 18, stagger: 0.04 });
  const u = E.outExpo(inv(5.2, 6.0, lt));
  if (u > 0) {
    ctx.save(); ctx.globalAlpha = u;
    const url = 'github.com/pharmaxi/be-csr-review';
    const w = measure(ctx, url, 34, 'Mono') + 70;
    rrect(ctx, W / 2 - (w / 2) * u, 660, w * u, 66, 33); ctx.fillStyle = 'rgba(4,16,30,0.8)'; ctx.fill();
    ctx.shadowColor = C.gold; ctx.shadowBlur = 24; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.stroke(); ctx.shadowBlur = 0;
    ctx.restore();
    text(ctx, url, W / 2, 694, { font: 'Mono', size: 34, color: C.white, alpha: inv(5.5, 6.1, lt) });
    text(ctx, 'review-be-report · 3.3.27-qa-candidate · 辅助审核方法与本地工具', W / 2, 772, { font: 'SCRegular', size: 22, color: '#8fb0c8', alpha: inv(6.0, 6.8, lt) });
  }
  void total;
  return { bloom: 1.0, streak: 0.35 + 0.6 * Math.exp(-lt * 1.4) };
}

module.exports = { cold, storm, title, gates, table, roles, delivery, package: pkg, finale };
