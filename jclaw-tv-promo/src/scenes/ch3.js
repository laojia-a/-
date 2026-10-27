// 66–88 s · CH03 BE Workbench — deep-teal data space.
// A: randomisation + concentration sheets → detect / confirm / match / QC → frozen StandardDataset (hash)
// B: fly through 3D concentration–time ribbons (T coral / R teal), linear → semi-log, AUC sweep, unrounded value
// C: 90% CI bars fly in and lock inside the 80.00–125.00 % corridor (demo data, no verdict)
// D: lineage back to the source row; Observed / Simulated / Combined streams never mix; sample-size methods
const L = require('../lib');
const { canvas, cached, clamp, inv, lerp, E, rng, makeCam, lookAt, track, project, texPlane, text, font, rrect, noise1, W, H } = L;
const C = require('./common');
const T = require('../timeline');

const TEAL = '#5fd3d9', CORAL = '#ed977b', INK = '#e4e7df', MUTE = '#93a8a8', BG = '#0e1f26', AMBER = '#f2c14e', VIOLET = '#a99bff';

// ---------- A · sheets ----------
const SW = 900, SH = 560;
const COLS = ['SUBJECT', 'SEQUENCE', 'PERIOD', 'TREATMENT', 'TIME', 'ACT_TIME', 'CONC'];
function sheetTex(kind) {
  return cached('ch3-sheet-' + kind, SW, SH, (c, w, h) => {
    rrect(c, 0, 0, w, h, 16); c.fillStyle = 'rgba(16,40,48,0.92)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(95,211,217,0.55)'; c.stroke();
    text(c, kind === 'rand' ? '随机表.xlsx' : '浓度数据.xlsx · 3 Sheets', 30, 40, { font: font(700, 28), color: INK, align: 'left' });
    const r = rng(kind === 'rand' ? 3 : 4);
    const cols = kind === 'rand' ? ['受试者', '序列', '分组'] : ['Subject', 'Period', 'Time (h)', 'Conc (ng/mL)'];
    const cw = (w - 60) / cols.length;
    cols.forEach((s, i) => text(c, s, 30 + i * cw + 10, 96, { font: font(700, 22), color: MUTE, align: 'left' }));
    for (let k = 0; k < 12; k++) {
      const y = 132 + k * 34;
      c.fillStyle = 'rgba(95,211,217,0.12)'; c.fillRect(30, y + 16, w - 60, 1);
      const vals = kind === 'rand' ? ['S' + String(k + 1).padStart(3, '0'), k % 2 ? 'RT' : 'TR', k % 2 ? 'R→T' : 'T→R'] : ['S' + String((k >> 2) + 1).padStart(3, '0'), String((k % 2) + 1), ['0.00', '0.50', '1.00', '3.00'][k % 4], k % 4 === 0 ? 'BQL' : (r() * 7 + 1).toFixed(6)];
      vals.forEach((v, i) => text(c, v, 30 + i * cw + 10, y, { font: font(500, 21, 'mono'), color: INK, align: 'left' }));
    }
  });
}
const dsBuf = canvas(1100, 520), dsx = dsBuf.getContext('2d');
function datasetTex(lt) {
  const c = dsx, w = 1100, h = 520;
  c.clearRect(0, 0, w, h);
  rrect(c, 0, 0, w, h, 22); c.fillStyle = 'rgba(14,40,48,0.9)'; c.fill(); c.lineWidth = 3; c.strokeStyle = TEAL; c.stroke();
  C.lockIcon(c, 56, 62, 34, TEAL);
  text(c, 'StandardDataset · 冻结处理快照', 96, 58, { font: font(800, 34), color: INK, align: 'left' });
  const cw = (w - 60) / 7;
  COLS.forEach((s, i) => text(c, s, 30 + i * cw + cw / 2, 128, { font: font(700, 19, 'mono'), color: TEAL }));
  const r = rng(11);
  for (let k = 0; k < 6; k++) {
    const y = 172 + k * 40;
    c.fillStyle = 'rgba(95,211,217,0.14)'; c.fillRect(30, y + 18, w - 60, 1);
    const sub = 'S00' + (1 + (k >> 1)), per = (k % 2) + 1;
    [sub, k % 4 < 2 ? 'TR' : 'RT', String(per), per === 1 ? 'T' : 'R', '3.00', (3 + r() * 0.08).toFixed(2), (4 + r() * 3).toFixed(6)].forEach((v, i) => text(c, v, 30 + i * cw + cw / 2, y, { font: font(500, 21, 'mono'), color: INK }));
  }
  const hash = 'a3f9c2e17b4d08e6' + '5c21f7a9d03b6e48' + '91e0c7f2a65d3b18' + '7e4c09fa2d61b853';
  const q = clamp((lt - 4.6) / 1.2);
  text(c, 'SHA-256  ' + L.scramble(hash.slice(0, 48), q, 5) + '…', 30, h - 40, { font: font(500, 20, 'mono'), color: MUTE, align: 'left' });
  return dsBuf;
}

// ---------- B · curves ----------
const SUBJ = (() => {
  const r = rng(808);
  return Array.from({ length: 18 }, (_, i) => ({ ka: 1.1 + r() * 1.2, ke: 0.13 + r() * 0.08, s: 0.8 + r() * 0.45, z: i * 0.32, tr: r() * 0.12 }));
})();
const TS = Array.from({ length: 61 }, (_, i) => (i / 60) * 24);
function conc(sb, t, form) { const ka = sb.ka * (form === 'T' ? 1 : 0.94), ke = sb.ke; return sb.s * (ka / (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t)); }
const CMAX = 1.25;
function cy(c, logq) {
  const lin = -(c / CMAX) * 2.0;
  const lg = -((Math.log10(Math.max(c, 0.01)) + 2) / 2.1) * 2.0;
  return lerp(lin, lg, logq);
}

// ---------- C · forest ----------
const FB = canvas(1500, 760), fbx = FB.getContext('2d');
const ROWS = [['Cmax', 98.21, 91.44, 105.48], ['AUC0-t', 101.37, 96.02, 107.02], ['AUC0-∞', 100.86, 95.71, 106.29]];
function forest(lt) {
  const c = fbx, w = 1500, h = 760;
  c.clearRect(0, 0, w, h);
  const xmin = 70, xmax = 140, X = (v) => 260 + ((v - xmin) / (xmax - xmin)) * (w - 340);
  // corridor
  const ca = E.outCubic(clamp((lt - 11.4) / 0.6));
  c.save(); c.globalAlpha = ca;
  const g = c.createLinearGradient(X(80), 0, X(125), 0); g.addColorStop(0, 'rgba(95,211,217,0.18)'); g.addColorStop(0.5, 'rgba(95,211,217,0.05)'); g.addColorStop(1, 'rgba(95,211,217,0.18)');
  c.fillStyle = g; c.fillRect(X(80), 80, X(125) - X(80), h - 170);
  [80, 125].forEach((v) => { c.fillStyle = TEAL; c.fillRect(X(v) - 2, 70, 4, h - 150); text(c, v.toFixed(2) + '%', X(v), 44, { font: font(700, 30, 'mono'), color: TEAL }); });
  c.fillStyle = 'rgba(228,231,223,0.4)'; c.fillRect(X(100) - 1, 80, 2, h - 170);
  text(c, '100', X(100), h - 60, { font: font(500, 24, 'mono'), color: MUTE });
  c.restore();
  ROWS.forEach(([k, pe, lo, hi], i) => {
    const y = 190 + i * 170;
    const t0 = 11.8 + i * 0.25;
    const q = E.outExpo(clamp((lt - t0) / (T.K.ciLock - T.K.ch3 - t0)));
    const wob = (1 - q) * 28 * Math.sin(lt * 9 + i);
    const L0 = lerp(pe - 30, lo, q) + wob * 0.2, H0 = lerp(pe + 30, hi, q) - wob * 0.2, P0 = pe + wob * 0.1;
    c.save(); c.globalAlpha = clamp((lt - t0 + 0.3) / 0.3);
    text(c, k, 60, y, { font: font(800, 40, 'inter'), color: INK, align: 'left' });
    c.lineCap = 'round';
    c.strokeStyle = CORAL; c.lineWidth = 10; c.beginPath(); c.moveTo(X(L0), y); c.lineTo(X(H0), y); c.stroke();
    [L0, H0].forEach((v) => { c.fillRect(X(v) - 3, y - 26, 6, 52); });
    c.fillStyle = CORAL; [L0, H0].forEach((v) => c.fillRect(X(v) - 3, y - 26, 6, 52));
    c.beginPath(); c.moveTo(X(P0), y - 22); c.lineTo(X(P0) + 22, y); c.lineTo(X(P0), y + 22); c.lineTo(X(P0) - 22, y); c.closePath(); c.fillStyle = '#fff3ec'; c.fill();
    if (q > 0.97) text(c, `${pe.toFixed(2)}  [${lo.toFixed(2)}, ${hi.toFixed(2)}]`, X(hi) + 30, y + 2, { font: font(600, 26, 'mono'), color: INK, align: 'left', alpha: clamp((lt - (T.K.ciLock - T.K.ch3)) / 0.3) });
    c.restore();
  });
  text(c, 'T/R 几何均值比 · 90% CI', 60, h - 60, { font: font(600, 26), color: MUTE, align: 'left' });
  return FB;
}

function chip(ctx, x, y, s, col, a = 1, size = 26, fill = false) {
  ctx.save(); ctx.globalAlpha *= a;
  const w = L.measure(ctx, s, font(700, size)) + size * 1.4;
  rrect(ctx, x - w / 2, y - size * 0.95, w, size * 1.9, size * 0.95);
  ctx.fillStyle = fill ? col : 'rgba(14,31,38,0.75)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = col; ctx.stroke();
  text(ctx, s, x, y + 1, { font: font(700, size), color: fill ? BG : col });
  ctx.restore();
  return w;
}

function background(ctx, lt) {
  const g = ctx.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, W * 0.7);
  g.addColorStop(0, '#163a42'); g.addColorStop(0.6, '#0b1d23'); g.addColorStop(1, '#050d10');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function grid3d(ctx, cam, a) {
  ctx.save(); ctx.strokeStyle = `rgba(95,211,217,${0.09 * a})`; ctx.lineWidth = 1;
  for (let i = -10; i <= 10; i++) {
    const p0 = project(cam, [i * 0.6, 0.6, -2]), p1 = project(cam, [i * 0.6, 0.6, 9]);
    if (p0 && p1) { ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  }
  for (let j = -2; j <= 18; j++) {
    const p0 = project(cam, [-6, 0.6, j * 0.5]), p1 = project(cam, [6, 0.6, j * 0.5]);
    if (p0 && p1) { ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); }
  }
  ctx.restore();
}

module.exports = function ch3(ctx, lt, t) {
  background(ctx, lt);
  let seg = '数据处理 1/4';
  // ================= A · 0–5.6 =================
  if (lt < 7.0) {
    const cam = makeCam({ x: noise1(lt * 0.2) * 0.1, y: -0.05, z: lerp(-4.4, -3.6, E.inOutSine(clamp(lt / 7))), fov: 0.8 });
    lookAt(cam, [0, 0, 0]);
    const merge = E.inOutCubic(clamp((lt - 3.8) / 0.9));
    const inA = E.outCubic(clamp((lt - 0.2) / 0.8));
    // two source sheets
    [['rand', -1.45, -0.25], ['conc', 1.45, 0.25]].forEach(([k, x, ry], i) => {
      const pl = { c: [lerp(x * 1.6, x, inA) * (1 - merge), -0.15 + merge * 0.1, lerp(1.2, 0, inA) + merge * 0.6], rx: 0, ry: ry * (1 - merge), rz: 0 };
      texPlane(ctx, cam, pl, 2.4, 1.49, sheetTex(k), { alpha: inA * (1 - merge * 0.9), backface: true });
    });
    // scan beam
    const sb = clamp((lt - 0.9) / 1.6);
    if (sb > 0 && sb < 1) {
      const x = lerp(260, W - 260, sb);
      const g = ctx.createLinearGradient(x - 120, 0, x + 120, 0); g.addColorStop(0, 'rgba(95,211,217,0)'); g.addColorStop(0.5, 'rgba(140,240,245,0.35)'); g.addColorStop(1, 'rgba(95,211,217,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(x - 120, 160, 240, H - 320); ctx.restore();
    }
    // detected columns
    COLS.forEach((s, i) => { const a = clamp((lt - 1.1 - i * 0.12) / 0.3) * (1 - merge); if (a > 0) chip(ctx, 300 + i * 220, 250, s, TEAL, a, 20); });
    // pipeline steps
    const steps = ['识别', '人工确认', '匹配', 'QC'];
    steps.forEach((s, i) => {
      const on = lt > 1.4 + i * 0.5;
      const x = W / 2 + (i - 1.5) * 260, y = H - 230;
      chip(ctx, x, y, (on && i === 1 ? '✓ ' : '') + s, on ? (i === 1 ? AMBER : TEAL) : '#40626a', clamp((lt - 0.6) / 0.4), 28, on && i === 3);
      if (i < 3) text(ctx, '→', x + 130, y, { font: font(700, 30, 'inter'), color: '#40626a', alpha: clamp((lt - 0.6) / 0.4) });
    });
    // frozen dataset
    if (merge > 0) {
      const pl = { c: [0, -0.15, lerp(0.8, 0, merge)], rx: 0, ry: lerp(0.5, 0, merge), rz: 0 };
      texPlane(ctx, cam, pl, 3.0, 1.42, datasetTex(lt), { alpha: merge, backface: true });
    }
    if (lt > 6.5) { const a = E.inCubic(inv(6.5, 7.0, lt)); ctx.fillStyle = `rgba(5,13,16,${a})`; ctx.fillRect(0, 0, W, H); }
  }
  // ================= B · 7–11.4 =================
  else if (lt < 11.4) {
    seg = 'NCA 2/4';
    const u = lt - 7.0;
    // fly from behind the time axis to a side view
    const pos = track([[0, [-3.8, -0.4, -1.4]], [1.8, [-1.6, -1.1, -2.6]], [4.4, [0.4, -1.0, -4.6]]], u, E.inOutCubic);
    const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.9 });
    lookAt(cam, track([[0, [0.5, -0.8, 2.5]], [1.8, [0.2, -0.8, 2.0]], [4.4, [0.3, -0.85, 2.4]]], u, E.inOutCubic), lerp(0.12, 0, E.inOutCubic(clamp(u / 2))));
    grid3d(ctx, cam, 1);
    const logq = E.inOutCubic(clamp((u - 2.2) / 0.8)) * (1 - E.inOutCubic(clamp((u - 3.3) / 0.5)));
    const grow = E.inOutCubic(clamp(u / 1.6));
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
    for (let si = SUBJ.length - 1; si >= 0; si--) {
      const sb = SUBJ[si];
      ['R', 'T'].forEach((form) => {
        const col = form === 'T' ? '237,151,123' : '95,211,217';
        ctx.beginPath();
        let first = true, k0 = 0;
        const n = Math.max(2, Math.round(TS.length * grow));
        for (let k = logq > 0.02 ? 1 : 0; k < n; k++) {
          const tt = TS[k];
          const q = project(cam, [(tt / 24) * 6 - 3, cy(conc(sb, tt, form), logq), sb.z + (form === 'T' ? 0.08 : 0)]);
          if (!q) continue;
          if (first) { ctx.moveTo(q.x, q.y); first = false; k0 = q.k; } else ctx.lineTo(q.x, q.y);
        }
        const depthA = clamp(1 - sb.z / 7);
        ctx.strokeStyle = `rgba(${col},${0.25 + 0.55 * depthA})`; ctx.lineWidth = Math.max(1, k0 * 0.006);
        ctx.stroke();
      });
    }
    ctx.restore();
    // mean curve AUC sweep (front subject plane)
    const auc = clamp((u - 1.2) / 1.2);
    const aucA = 1 - clamp(logq * 3);
    const mean = (tt) => SUBJ.reduce((a, sb) => a + conc(sb, tt, 'T'), 0) / SUBJ.length;
    if (auc > 0 && aucA > 0) {
      ctx.save(); ctx.globalAlpha = aucA; ctx.beginPath();
      const z = -0.25;
      const base0 = project(cam, [-3, cy(0.01, logq) * 0 + 0, z]);
      if (base0) ctx.moveTo(base0.x, base0.y);
      const nn = Math.round(60 * auc);
      let lastX = 0;
      for (let k = 0; k <= nn; k++) { const tt = TS[k]; const q = project(cam, [(tt / 24) * 6 - 3, cy(mean(tt), logq), z]); if (q) { ctx.lineTo(q.x, q.y); lastX = (tt / 24) * 6 - 3; } }
      const b1 = project(cam, [lastX, 0, z]); if (b1) ctx.lineTo(b1.x, b1.y);
      ctx.closePath();
      const gg = ctx.createLinearGradient(0, H * 0.25, 0, H * 0.8); gg.addColorStop(0, 'rgba(237,151,123,0.30)'); gg.addColorStop(1, 'rgba(237,151,123,0.02)');
      ctx.fillStyle = gg; ctx.fill(); ctx.strokeStyle = 'rgba(255,200,180,0.9)'; ctx.lineWidth = 3; ctx.stroke();
      ctx.restore();
    }
    // Cmax marker + readout
    const ca = clamp((u - 1.6) / 0.4);
    if (ca > 0) {
      let tm = 0, cm = 0; TS.forEach((tt) => { const v = mean(tt); if (v > cm) { cm = v; tm = tt; } });
      const q = project(cam, [(tm / 24) * 6 - 3, cy(cm, logq), -0.25]);
      if (q) {
        ctx.save(); ctx.globalAlpha = ca;
        ctx.beginPath(); ctx.arc(q.x, q.y, 10, 0, Math.PI * 2); ctx.fillStyle = '#fff3ec'; ctx.fill();
        ctx.strokeStyle = 'rgba(255,243,236,0.6)'; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + 80, q.y + 70); ctx.lineTo(q.x + 300, q.y + 70); ctx.stroke();
        text(ctx, 'Cmax · Tmax', q.x + 96, q.y + 48, { font: font(700, 24, 'inter'), color: INK, align: 'left' });
        ctx.restore();
      }
    }
    // unrounded readout
    const ra = clamp((u - 2.0) / 0.4);
    if (ra > 0) {
      ctx.save(); ctx.globalAlpha = ra;
      const x = 150, y = H - 300;
      text(ctx, 'AUC0-t 原值参与计算', x, y, { font: font(700, 28), color: MUTE, align: 'left' });
      const digits = '1284.637190' + '48' + Math.floor(u * 997 % 1000).toString().padStart(3, '0');
      text(ctx, digits, x, y + 62, { font: font(700, 64, 'mono'), color: CORAL, align: 'left', glow: 'rgba(237,151,123,0.5)', blur: 22 });
      text(ctx, '显示  1284.6   ·   修约只发生在输出', x, y + 118, { font: font(500, 26), color: INK, align: 'left', alpha: 0.8 });
      ctx.restore();
    }
    const la = clamp((u - 2.2) / 0.3) * (1 - clamp((u - 3.4) / 0.3));
    if (la > 0) chip(ctx, W - 300, C.SAFE_T + 120, logq > 0.5 ? '半对数 · λz 末端相' : '线性', TEAL, la, 26);
    // legend
    chip(ctx, W - 470, H - 210, 'T  受试制剂', CORAL, clamp(u / 0.5), 22);
    chip(ctx, W - 250, H - 210, 'R  参比制剂', TEAL, clamp(u / 0.5), 22);
    if (u > 3.95) { const a = E.inCubic(inv(3.95, 4.4, u)); ctx.fillStyle = `rgba(5,13,16,${a})`; ctx.fillRect(0, 0, W, H); }
  }
  // ================= C · 11.4–16 =================
  else if (lt < 16.0) {
    seg = 'ABE / RSABE 3/4';
    const u = lt - 11.4;
    const lockT = T.K.ciLock - T.K.ch3; // 16.0 local
    const cam = makeCam({ x: lerp(-1.4, -0.2, E.outCubic(clamp(u / 4.6))), y: -0.1, z: lerp(-3.4, -3.0, u / 4.6), fov: 0.82 });
    lookAt(cam, [0.15, 0.02, 0], 0);
    grid3d(ctx, cam, 0.6);
    texPlane(ctx, cam, { c: [0.15, 0.05, 0.3], rx: 0, ry: lerp(-0.28, -0.05, E.outCubic(clamp(u / 4.4))), rz: 0 }, 3.9, 1.976, forest(lt), { backface: true });
    C.demoTag(ctx, W - 96, C.SAFE_T + 18, clamp(u / 0.5));
    void lockT;
  }
  // ================= D · 16–22 =================
  else {
    const u = lt - 16.0;
    seg = u < 3.0 ? '来源追溯 4/4' : '数据身份 4/4';
    const cam = makeCam({ x: -0.2 + u * 0.05, y: -0.1, z: -3.0 - u * 0.05, fov: 0.82 });
    lookAt(cam, [0.15, 0.02, 0], 0);
    grid3d(ctx, cam, 0.6);
    const fa = 1 - E.inOutCubic(clamp((u - 2.6) / 0.6));
    if (fa > 0) {
      texPlane(ctx, cam, { c: [0.15, 0.05, 0.3], rx: 0, ry: -0.05, rz: 0 }, 3.9, 1.976, forest(16), { alpha: fa * (1 - 0.8 * clamp(u / 0.5)), backface: true });
      // lineage
      const nodes = [['90% CI · Cmax', CORAL], ['BE 运行记录', INK], ['NCA 运行快照', INK], ['StandardDataset', TEAL], ['浓度数据.xlsx · Sheet 2 · 第 14 行', AMBER]];
      const y0 = 300;
      nodes.forEach(([s, col], i) => {
        const a = clamp((u - 0.2 - i * 0.28) / 0.3) * fa;
        const y = y0 + i * 98;
        if (i > 0) { ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = 'rgba(228,231,223,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(W / 2, y - 64); ctx.lineTo(W / 2, y - 34); ctx.stroke(); ctx.restore(); }
        chip(ctx, W / 2, y, s, col, a, 28, i === 0);
      });
    }
    // identity streams
    const sa = E.outCubic(clamp((u - 2.9) / 0.6));
    if (sa > 0) {
      const lanes = [['Observed', TEAL, -1], ['Simulated', AMBER, 0], ['Combined', VIOLET, 1]];
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      lanes.forEach(([name, col, k], li) => {
        const rgb = L.rgbOf(col);
        const y0 = H / 2 + k * 150 - 40;
        for (let i = 0; i < 90; i++) {
          const ph = (i * 0.137 + u * (0.22 + li * 0.03)) % 1;
          const x = lerp(-60, W + 60, ph);
          const y = y0 + Math.sin(i * 1.7 + u * 2) * 26;
          const r0 = 2 + (i % 5);
          ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.55 * sa})`;
          ctx.beginPath(); ctx.arc(x, y, r0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.strokeStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${0.25 * sa})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, y0 + 60); ctx.lineTo(W, y0 + 60); ctx.stroke();
      });
      ctx.restore();
      lanes.forEach(([name, col, k]) => chip(ctx, 300, H / 2 + k * 150 - 40, name, col, sa, 32, true));
      const ma = clamp((u - 4.0) / 0.5);
      text(ctx, '例数估算', W / 2 - 560, H - 230, { font: font(700, 26), color: MUTE, alpha: ma, align: 'left' });
      ['PowerTOST-compatible', 'Bootstrap', 'Monte Carlo'].forEach((s, i) => chip(ctx, W / 2 - 220 + i * 330, H - 230, s, INK, ma * clamp((u - 4.1 - i * 0.15) / 0.3), 24));
    }
  }
  C.channelBug(ctx, 3, seg, clamp((lt - 0.5) / 0.4));
  C.switchIn(ctx, lt, 301);
  C.switchOut(ctx, lt, 22, 302);
  return { grade: 'data', streakTint: 'rgb(255,160,120)' };
};
