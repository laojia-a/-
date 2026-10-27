// 36–52 s · CH01 临床工具集 — warm paper desk; the camera dollies across cards: contract, supplies, BE sample size,
// high-fat meal (ICH M13A), CTCAE / MedDRA, then cranes up to show Cloudflare sync. All numbers are demo values.
const L = require('../lib');
const { canvas, cached, clamp, inv, lerp, E, p, rng, makeCam, lookAt, track, texPlane, quadPath, text, font, rrect, reveal, fmt, wobbleLine, noise1, W, H } = L;
const C = require('./common');
const T = require('../timeline');

const CH1 = C.CH[1];
const INK = '#364331', ACC = '#7b8153', PAPER = '#fbf7ec', MUTE = '#7e856c', RED = '#b5523b';
const CW = 1000, CHh = 660, WW = 1.8, WH = 1.188;

const STATIONS = [
  { id: 'contract', x: 0, t0: 0.3, seg: '合同 1/6' },
  { id: 'supply', x: 2.5, t0: 3.4, seg: '物资 2/6' },
  { id: 'size', x: 5.0, t0: 5.9, seg: '例数 3/6' },
  { id: 'meal', x: 7.5, t0: 8.4, seg: '高脂餐 4/6' },
  { id: 'terms', x: 10.0, t0: 10.8, seg: '术语 5/6' },
];

const desk = cached('ch1-desk', 2048, 1024, (c, w, h) => {
  c.fillStyle = '#4a3624'; c.fillRect(0, 0, w, h);
  const r = rng(5);
  for (let i = 0; i < 14000; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '20,10,5' : '160,120,80'},${r() * 0.07})`; c.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 3); }
  for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(${r() < 0.5 ? '25,15,8' : '120,85,50'},0.10)`; c.lineWidth = 1 + r() * 2; c.beginPath(); const y = r() * h; c.moveTo(0, y); c.bezierCurveTo(w / 3, y + (r() - 0.5) * 40, w * 0.6, y + (r() - 0.5) * 40, w, y + (r() - 0.5) * 30); c.stroke(); }
  // stitched border of a leather desk mat
  
});

const bufs = {};
function card(id) { if (!bufs[id]) bufs[id] = canvas(CW, CHh); const c = bufs[id].getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, CW, CHh); return [bufs[id], c]; }
function paper(c, title, sub) {
  rrect(c, 0, 0, CW, CHh, 18); c.fillStyle = PAPER; c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(120,110,80,0.35)'; c.stroke();
  c.fillStyle = 'rgba(123,129,83,0.12)'; c.fillRect(0, 96, CW, 2);
  text(c, title, 48, 56, { font: font(800, 40), color: INK, align: 'left' });
  if (sub) text(c, sub, CW - 48, 58, { font: font(500, 22), color: MUTE, align: 'right' });
}

// ---- cards ----
function contract(lt) {
  const [cv, c] = card('contract');
  paper(c, '合同付款计算器', '含税 · 分期');
  const total = 1280000 * E.outExpo(clamp((lt - 0.4) / 1.4));
  text(c, '含税总价', 48, 160, { font: font(500, 26), color: MUTE, align: 'left' });
  text(c, '¥ ' + fmt(total, 2), 48, 222, { font: font(700, 64, 'mono'), color: INK, align: 'left' });
  // instalment donut
  const parts = [[0.3, ACC, '首付 30%'], [0.4, '#a4a86f', '中期 40%'], [0.3, '#c9b98a', '结题 30%']];
  const cx = 790, cy = 330, R = 150;
  let a0 = -Math.PI / 2;
  parts.forEach(([f, col, lab], i) => {
    const q = E.outCubic(clamp((lt - 0.8 - i * 0.25) / 0.6));
    const a1 = a0 + f * Math.PI * 2 * q;
    c.beginPath(); c.arc(cx, cy, R, a0, a1); c.lineWidth = 56; c.strokeStyle = col; c.stroke();
    const am = a0 + f * Math.PI;
    if (q > 0.9) text(c, lab, cx + Math.cos(am) * (R + 74), cy + Math.sin(am) * (R + 62), { font: font(600, 22), color: INK });
    a0 += f * Math.PI * 2;
  });
  text(c, '3 期', cx, cy, { font: font(800, 40), color: INK });
  // rows
  [['第 1 期', '384,000.00'], ['第 2 期', '512,000.00'], ['第 3 期', '384,000.00']].forEach(([k, v], i) => {
    const a = clamp((lt - 1.2 - i * 0.2) / 0.4);
    c.save(); c.globalAlpha = a;
    text(c, k, 48, 300 + i * 56, { font: font(500, 26), color: INK, align: 'left' });
    text(c, v, 470, 300 + i * 56, { font: font(500, 28, 'mono'), color: INK, align: 'right' });
    c.fillStyle = 'rgba(120,110,80,0.18)'; c.fillRect(48, 326 + i * 56, 422, 1.5);
    c.restore();
  });
  // capital amount
  text(c, '中文大写', 48, 500, { font: font(500, 24), color: MUTE, align: 'left' });
  reveal(c, '人民币壹佰贰拾捌万元整', 48, 560, lt - 1.9, { font: font(700, 46, 'serif'), color: RED, align: 'left', stagger: 0.07, rise: 6 });
  C.demoTag(c, CW - 40, CHh - 58, 1, true);
  return cv;
}
function supply(lt) {
  const [cv, c] = card('supply');
  paper(c, '物资计算器', '空腹组 · 餐后组');
  // rack
  const rx = 60, ry = 150;
  rrect(c, rx, ry + 250, 520, 40, 10); c.fillStyle = '#c9b98a'; c.fill();
  const caps = ['#7b4fa0', '#c64b3c', '#e1b43c', '#5f8f4e'];
  for (let i = 0; i < 12; i++) {
    const x = rx + 30 + i * 41;
    const d = 0.25 + i * 0.09;
    const q = E.outBack(clamp((lt - d) / 0.42));
    const y = ry + lerp(-220, 0, q);
    if (q <= 0) continue;
    c.save(); c.globalAlpha = clamp(q * 3);
    rrect(c, x, y + 40, 26, 210, 13); c.fillStyle = 'rgba(235,240,245,0.95)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(80,90,90,0.4)'; c.stroke();
    c.fillStyle = 'rgba(160,40,40,0.75)'; c.fillRect(x + 3, y + 150, 20, 94);
    rrect(c, x - 2, y + 16, 30, 34, 6); c.fillStyle = caps[i % 4]; c.fill();
    c.restore();
  }
  const rows = [['采血管', 384], ['冻存管', 768], ['冻存盒', 9], ['尿筛试剂盒', 48]];
  rows.forEach(([k, v], i) => {
    const q = clamp((lt - 0.6 - i * 0.18) / 0.5);
    c.save(); c.globalAlpha = q;
    text(c, k, 640, 190 + i * 96, { font: font(600, 30), color: INK, align: 'left' });
    text(c, '× ' + Math.round(v * E.outExpo(q)), 950, 190 + i * 96, { font: font(700, 40, 'mono'), color: INK, align: 'right' });
    c.fillStyle = 'rgba(120,110,80,0.18)'; c.fillRect(640, 226 + i * 96, 310, 1.5);
    c.restore();
  });
  C.demoTag(c, CW - 40, CHh - 58, 1, true);
  return cv;
}
function sizeCard(lt) {
  const [cv, c] = card('size');
  paper(c, 'BE 例数估算', '双交叉 · 重复交叉 · 平行');
  // N vs CV curve
  const x0 = 70, y0 = 560, gw = 520, gh = 360;
  c.strokeStyle = 'rgba(54,67,49,0.5)'; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, y0 - gh); c.lineTo(x0, y0); c.lineTo(x0 + gw, y0); c.stroke();
  text(c, 'CV', x0 + gw, y0 + 30, { font: font(600, 22, 'inter'), color: MUTE });
  text(c, 'N', x0 - 30, y0 - gh, { font: font(600, 22, 'inter'), color: MUTE });
  const q = E.inOutCubic(clamp((lt - 0.3) / 1.4));
  c.beginPath();
  for (let i = 0; i <= 60 * q; i++) { const cvv = 0.1 + (i / 60) * 0.5; const n = 8 + 260 * cvv * cvv; c.lineTo(x0 + (i / 60) * gw, y0 - (n / 80) * gh); }
  c.strokeStyle = ACC; c.lineWidth = 4; c.stroke();
  const cvx = 0.27, ni = 8 + 260 * cvx * cvx;
  const mq = clamp((lt - 1.5) / 0.4);
  if (mq > 0) {
    const mx = x0 + ((cvx - 0.1) / 0.5) * gw, my = y0 - (ni / 80) * gh;
    c.save(); c.globalAlpha = mq; c.setLineDash([6, 6]); c.strokeStyle = MUTE; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(mx, y0); c.lineTo(mx, my); c.lineTo(x0, my); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.arc(mx, my, 9, 0, Math.PI * 2); c.fillStyle = RED; c.fill();
    c.restore();
  }
  // methods + result
  ['平均 BE · 2×2', 'FDA 2026 Mixed RSABE', 'EMA ABEL'].forEach((m, i) => {
    const a = clamp((lt - 0.6 - i * 0.2) / 0.4);
    c.save(); c.globalAlpha = a;
    const w = L.measure(c, m, font(600, 22)) + 32;
    rrect(c, 640, 150 + i * 62, w, 44, 22); c.strokeStyle = ACC; c.lineWidth = 2; c.stroke();
    text(c, m, 640 + w / 2, 172 + i * 62, { font: font(600, 22), color: INK });
    c.restore();
  });
  const ra = clamp((lt - 1.7) / 0.5);
  c.save(); c.globalAlpha = ra;
  text(c, '可评价例数', 640, 380, { font: font(500, 24), color: MUTE, align: 'left' });
  text(c, '24', 950, 380, { font: font(800, 52, 'mono'), color: INK, align: 'right' });
  text(c, '计划入组（含脱落）', 640, 460, { font: font(500, 24), color: MUTE, align: 'left' });
  text(c, '28', 950, 460, { font: font(800, 52, 'mono'), color: RED, align: 'right' });
  c.restore();
  C.demoTag(c, CW - 40, CHh - 58, 1, true);
  return cv;
}
function meal(lt) {
  const [cv, c] = card('meal');
  paper(c, '高脂餐谱 · 营养核对', 'ICH M13A §2.1.5');
  // gauge 0..1400 kcal; band 900..1000
  const cx = 300, cy = 470, R = 210;
  const ang = (v) => Math.PI + (v / 1400) * Math.PI;
  c.lineWidth = 34; c.strokeStyle = 'rgba(120,110,80,0.18)'; c.beginPath(); c.arc(cx, cy, R, Math.PI, 2 * Math.PI); c.stroke();
  c.strokeStyle = 'rgba(95,143,78,0.85)'; c.beginPath(); c.arc(cx, cy, R, ang(900), ang(1000)); c.stroke();
  for (let v = 0; v <= 1400; v += 200) { const a = ang(v); text(c, String(v), cx + Math.cos(a) * (R + 46), cy + Math.sin(a) * (R + 40), { font: font(500, 18, 'inter'), color: MUTE }); }
  const val = 958 * E.outQuart(clamp((lt - 0.4) / 1.6));
  const a = ang(val);
  c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30)); c.stroke();
  c.beginPath(); c.arc(cx, cy, 14, 0, Math.PI * 2); c.fillStyle = INK; c.fill();
  text(c, Math.round(val) + ' kcal', cx, cy - 80, { font: font(800, 46, 'mono'), color: INK });
  text(c, '总热量 900–1000', cx, cy + 46, { font: font(600, 22), color: '#5f8f4e' });
  // fat bar
  const bx = 600, bw = 340;
  [['脂肪供能', 540, 500, 600, 800], ['蛋白质供能', 152, 150, 150, 400], ['碳水供能', 262, 250, 250, 600]].forEach(([k, v, lo, hi, max], i) => {
    const y = 170 + i * 120, q = E.outCubic(clamp((lt - 0.8 - i * 0.2) / 0.8));
    text(c, k, bx, y, { font: font(600, 24), color: INK, align: 'left' });
    text(c, Math.round(v * q) + ' kcal', bx + bw, y, { font: font(600, 24, 'mono'), color: INK, align: 'right' });
    rrect(c, bx, y + 26, bw, 18, 9); c.fillStyle = 'rgba(120,110,80,0.15)'; c.fill();
    if (hi > lo) { c.fillStyle = 'rgba(95,143,78,0.35)'; c.fillRect(bx + (lo / max) * bw, y + 26, ((hi - lo) / max) * bw, 18); }
    rrect(c, bx, y + 26, (v / max) * bw * q, 18, 9); c.fillStyle = i === 0 ? ACC : '#a4a86f'; c.fill();
    text(c, i === 0 ? '区间核对' : '仅提醒', bx + bw, y + 64, { font: font(500, 17), color: MUTE, align: 'right' });
  });
  C.demoTag(c, CW - 40, CHh - 58, 1, true);
  return cv;
}
function terms(lt) {
  const [cv, c] = card('terms');
  paper(c, 'CTCAE v6 · MedDRA', '查询 · 不自动分级');
  const n = Math.round(850 * E.outExpo(clamp((lt - 0.3) / 1.3)));
  text(c, String(n), 48, 200, { font: font(800, 110, 'mono'), color: INK, align: 'left' });
  text(c, '条不良事件术语', 48 + L.measure(c, String(n), font(800, 110, 'mono')) + 20, 214, { font: font(600, 30), color: MUTE, align: 'left' });
  // grade pills
  ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'].forEach((g, i) => {
    const a = clamp((lt - 0.7 - i * 0.12) / 0.3);
    c.save(); c.globalAlpha = a;
    rrect(c, 48 + i * 182, 290, 166, 52, 26); c.fillStyle = ['#e8e3cc', '#ddd3ac', '#d6b98a', '#c98d6b', '#a65a4a'][i]; c.fill();
    text(c, g, 48 + i * 182 + 83, 316, { font: font(600, 22, 'inter'), color: i > 2 ? '#fff' : INK });
    c.restore();
  });
  // MedDRA chain
  const chain = ['SOC', 'HLGT', 'HLT', 'PT', 'LLT'];
  chain.forEach((k, i) => {
    const a = clamp((lt - 1.2 - i * 0.15) / 0.35);
    c.save(); c.globalAlpha = a;
    const x = 48 + i * 186, y = 430;
    rrect(c, x, y, 150, 70, 12); c.strokeStyle = ACC; c.lineWidth = 2.5; c.stroke();
    text(c, k, x + 75, y + 36, { font: font(700, 28, 'inter'), color: INK });
    if (i < 4) { c.strokeStyle = MUTE; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 156, y + 35); c.lineTo(x + 180, y + 35); c.stroke(); }
    c.restore();
  });
  text(c, '双语 LLT 与完整层级浏览', 48, 560, { font: font(500, 24), color: MUTE, align: 'left', alpha: clamp((lt - 1.8) / 0.4) });
  return cv;
}
const DRAW = { contract, supply, size: sizeCard, meal, terms };

function shadowQuad(ctx, cam, pl, w, h, a) {
  const s = { c: [pl.c[0] + 0.05, pl.c[1] + 0.001, pl.c[2] - 0.06], rx: pl.rx, ry: pl.ry, rz: pl.rz };
  ctx.save(); ctx.filter = 'blur(14px)';
  if (quadPath(ctx, cam, s, -w / 2, -h / 2, w / 2, h / 2)) { ctx.fillStyle = `rgba(12,6,2,${a})`; ctx.fill(); }
  ctx.filter = 'none'; ctx.restore();
}

module.exports = function ch1(ctx, lt, t) {
  // camera dolly: hold on each station, glide between; crane up at the end
  const keys = STATIONS.map((s) => [s.t0 + 0.2, [s.x, -1.55, -1.25]]);
  keys.unshift([0, [-0.3, -1.4, -1.5]]);
  const holds = [];
  STATIONS.forEach((s, i) => { holds.push([s.t0 + 0.15, [s.x, -1.5, -1.2]]); holds.push([s.t0 + (i < 4 ? STATIONS[i + 1].t0 - s.t0 - 0.55 : 1.8), [s.x + 0.25, -1.45, -1.12]]); });
  void keys;
  let pos;
  const end = 13.0;
  if (lt < end) pos = track([[0, [-0.35, -1.3, -1.45]], ...holds], lt, E.inOutCubic);
  else { const q = E.inOutCubic(inv(end, 16, lt)); pos = [lerp(10.25, 5.0, q), lerp(-1.45, -6.0, q), lerp(-1.12, -4.4, q)]; }
  const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.78 });
  const tgt = lt < end ? [pos[0] - 0.05, 0, 0.1] : [lerp(10.2, 5.0, E.inOutCubic(inv(end, 16, lt))), 0, lerp(0.1, 0.0, inv(end, 16, lt))];
  lookAt(cam, tgt, -0.03 + noise1(lt * 0.3) * 0.004);

  // desk
  ctx.fillStyle = '#2a1e14'; ctx.fillRect(0, 0, W, H);
  texPlane(ctx, cam, { c: [5, 0.01, 0], rx: -Math.PI / 2 }, 26, 13, desk, { nx: 12, ny: 8 });
  // cards (lying flat, slight rotations)
  STATIONS.forEach((s, i) => {
    const local = lt - s.t0;
    const drop = E.outCubic(clamp((local + 0.6) / 0.6));
    const pl = { c: [s.x, -0.002 - (1 - drop) * 0.4, 0.05], rx: -Math.PI / 2, ry: 0, rz: (i % 2 ? 0.035 : -0.03) * (1 + (1 - drop) * 4) };
    if (drop <= 0) return;
    shadowQuad(ctx, cam, pl, WW, WH, 0.6 * drop);
    texPlane(ctx, cam, pl, WW, WH, DRAW[s.id](Math.max(0, local)), { alpha: clamp(drop * 2) });
  });
  // cloud sync (crane)
  const sq = clamp((lt - 13.2) / 0.8);
  if (sq > 0) {
    const cl = L.project(cam, [5.0, 0, -1.9]);
    if (cl) {
      // ink lines from each card to the cloud stamp
      STATIONS.forEach((s, i) => {
        const a = L.project(cam, [s.x, 0, -0.55]);
        if (!a) return;
        const q = E.outCubic(clamp((lt - 13.3 - i * 0.12) / 0.6));
        ctx.save(); ctx.strokeStyle = `rgba(233,226,206,${0.6 * sq})`; ctx.lineWidth = 2.5; ctx.setLineDash([10, 8]);
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, cl.x, q), lerp(a.y, cl.y, q)); ctx.stroke(); ctx.restore();
      });
      ctx.save(); ctx.globalAlpha = sq;
      rrect(ctx, cl.x - 330, cl.y - 80, 660, 160, 80); ctx.fillStyle = '#fbf7ec'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = ACC; ctx.stroke();
      text(ctx, '本地计算 · 云端同步', cl.x, cl.y - 22, { font: font(800, 40), color: INK });
      text(ctx, 'Cloudflare Workers · D1 · R2', cl.x, cl.y + 32, { font: font(600, 24, 'mono'), color: MUTE, spacing: 1 });
      ctx.restore();
    }
  }
  // window light
  // desk-lamp pool: warm centre, falling off to the edges
  let g = ctx.createRadialGradient(W * 0.46, H * 0.42, H * 0.1, W * 0.5, H * 0.5, W * 0.62);
  g.addColorStop(0, 'rgba(255,226,170,0.10)'); g.addColorStop(0.6, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // channel bug
  const st = STATIONS.slice().reverse().find((s) => lt >= s.t0) || STATIONS[0];
  C.channelBug(ctx, 1, lt > 13.2 ? '云端同步 6/6' : st.seg, clamp((lt - 0.5) / 0.4), false);
  C.switchIn(ctx, lt, 101);
  C.switchOut(ctx, lt, 16, 102);
  return { grade: 'paper' };
};
