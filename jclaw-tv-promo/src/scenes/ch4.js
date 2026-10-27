// 88–104 s · CH04 EZCTD — local PDF workbench for clinical CROs.
// No signal (as on home) → signal lock → PDF pages fan out on a light table → search hit with PDF coordinates →
// 26-rule batch scan with five explicit states → original locked, separate web-view copy generated and re-checked.
const L = require('../lib');
const { canvas, cached, clamp, inv, lerp, E, rng, makeCam, lookAt, track, texPlane, quadPath, text, font, rrect, reveal, noise1, W, H } = L;
const C = require('./common');
const { drawStatic } = require('../post');
const T = require('../timeline');

const ROSE = '#ece3e2', MAUVE = '#9c657e', PLUM = '#5c4f5b', INK = '#3f3240', LIGHT = '#fbf6f4';
const ST = { PASS: '#5f9f6e', FAIL: '#c8524a', NOT_APPLICABLE: '#9a9097', INDETERMINATE: '#d9a441', NOT_RUN: '#4a3f49' };
const FILES = [['5.3.1.2', '临床研究报告（空腹）.pdf'], ['5.3.1.2', '临床研究报告（餐后）.pdf'], ['2.5', '临床综述.pdf'], ['2.7', '临床总结.pdf']];

const PW = 620, PH = 820;
function pageTex(i) {
  return cached('ez-page' + i, PW, PH, (c, w, h) => {
    c.fillStyle = LIGHT; c.fillRect(0, 0, w, h);
    const r = rng(40 + i);
    text(c, FILES[i][0], 48, 60, { font: font(700, 22, 'mono'), color: MAUVE, align: 'left' });
    text(c, FILES[i][1].replace('.pdf', ''), 48, 104, { font: font(800, 30), color: INK, align: 'left' });
    c.fillStyle = 'rgba(92,79,91,0.25)'; c.fillRect(48, 132, w - 96, 2);
    for (let k = 0; k < 9; k++) { c.fillStyle = 'rgba(63,50,64,0.28)'; c.fillRect(48, 170 + k * 26, (w - 96) * (0.55 + r() * 0.45), 9); }
    // small table
    const ty = 420;
    for (let rr = 0; rr < 6; rr++) for (let cc = 0; cc < 4; cc++) {
      c.strokeStyle = 'rgba(92,79,91,0.3)'; c.strokeRect(48 + cc * 131, ty + rr * 40, 131, 40);
      if (rr === 0) { c.fillStyle = 'rgba(156,101,126,0.15)'; c.fillRect(48 + cc * 131, ty, 131, 40); }
      else text(c, cc === 0 ? ['Cmax', 'AUC0-t', 'AUC0-∞', 'Tmax', 't1/2'][rr - 1] : (r() * 90 + 5).toFixed(2), 60 + cc * 131, ty + rr * 40 + 20, { font: font(500, 19, 'mono'), color: INK, align: 'left' });
    }
    for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(63,50,64,0.28)'; c.fillRect(48, 690 + k * 26, (w - 96) * (0.5 + r() * 0.5), 9); }
    text(c, '— ' + (i + 2) + ' —', w / 2, h - 30, { font: font(500, 18, 'inter'), color: '#9a9097' });
  });
}
// the searched page: "12.50" in the table, highlighted
const hitBuf = canvas(PW, PH), hx = hitBuf.getContext('2d');
function hitPage(q) {
  hx.clearRect(0, 0, PW, PH);
  hx.drawImage(pageTex(0), 0, 0);
  text(hx, '12.50', 60 + 2 * 131, 420 + 2 * 40 + 20, { font: font(700, 19, 'mono'), color: INK, align: 'left' });
  hx.fillStyle = LIGHT; hx.fillRect(49 + 2 * 131 + 1, 420 + 2 * 40 + 1, 129, 38);
  text(hx, '12.50', 60 + 2 * 131, 420 + 2 * 40 + 20, { font: font(700, 19, 'mono'), color: INK, align: 'left' });
  if (q > 0) {
    hx.save(); hx.globalAlpha = q;
    hx.fillStyle = 'rgba(255,214,90,0.55)'; hx.fillRect(48 + 2 * 131 + 4, 420 + 2 * 40 + 4, 70 * E.outCubic(q), 32);
    hx.strokeStyle = '#d9a441'; hx.lineWidth = 3; hx.strokeRect(48 + 2 * 131 + 2, 420 + 2 * 40 + 2, 76, 36);
    hx.restore();
  }
  return hitBuf;
}

// rule matrix (26 rules × 4 files) — deterministic demo states
const STATES = Object.keys(ST);
const MATRIX = (() => {
  const r = rng(26);
  return Array.from({ length: 26 }, () => Array.from({ length: 4 }, () => { const x = r(); return x < 0.62 ? 'PASS' : x < 0.72 ? 'FAIL' : x < 0.84 ? 'NOT_APPLICABLE' : x < 0.95 ? 'INDETERMINATE' : 'NOT_RUN'; }));
})();

function lightbox(ctx) {
  const g = ctx.createRadialGradient(W / 2, H * 0.55, 50, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#3a2c38'); g.addColorStop(1, '#120c12');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

module.exports = function ch4(ctx, lt, t) {
  const lock = T.K.ch4Lock - T.K.ch4; // 1.5
  if (lt < lock) {
    // no signal, like the home page: static + name + channel number
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, W, H);
    drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), 0.8);
    rrect(ctx, W / 2 - 300, H / 2 - 110, 600, 300, 24); ctx.fillStyle = 'rgba(10,10,10,0.55)'; ctx.fill();
    const roll = (lt * 1.7) % 1;
    const g = ctx.createLinearGradient(0, roll * H - 100, 0, roll * H + 100); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.16)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, roll * H - 100, W, 200);
    text(ctx, 'EZCTD', W / 2, H / 2 - 20, { font: font(800, 86, 'inter'), color: '#f2f2f2', alpha: 0.85, spacing: 10 });
    text(ctx, 'CH04 · 无信号', W / 2, H / 2 + 60, { font: font(500, 30), color: '#cfcfcf', alpha: 0.8 });
    // signal search bars
    const q = clamp((lt - 0.6) / 0.9);
    for (let i = 0; i < 5; i++) { rrect(ctx, W / 2 - 60 + i * 26, H / 2 + 140 - i * 10, 18, 20 + i * 10, 3); ctx.fillStyle = i / 5 < q ? '#9fe08a' : 'rgba(255,255,255,0.25)'; ctx.fill(); }
    C.switchIn(ctx, lt, 401, 0.4);
    return { grade: 'night' };
  }
  const u = lt - lock; // 0..14.5
  lightbox(ctx);
  // camera over a tilted light table
  const pos = track([[0, [0, -2.5, -2.3]], [2.0, [-0.2, -2.2, -2.0]], [2.9, [-1.35, -1.2, -0.75]], [4.2, [-1.4, -1.12, -0.7]], [5.0, [0.2, -2.6, -2.6]], [8.6, [0, -2.7, -2.7]], [9.4, [0.1, -2.4, -2.2]], [14.5, [0.2, -2.3, -2.0]]], u, E.inOutCubic);
  const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.8 });
  const tg = track([[0, [0, 0, 0.25]], [2.0, [-0.2, 0, 0.25]], [2.9, [-1.5, 0, 0.12]], [4.2, [-1.52, 0, 0.12]], [5.0, [0.1, 0, 0.2]], [14.5, [0.1, 0, 0.2]]], u, E.inOutCubic);
  lookAt(cam, tg, noise1(u * 0.3) * 0.005);
  // table glow
  ctx.save();
  if (quadPath(ctx, cam, { c: [0, 0.02, 0.2], rx: -Math.PI / 2 }, -4, -2.4, 4, 2.4)) {
    const g = ctx.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, W * 0.6);
    g.addColorStop(0, 'rgba(255,240,236,0.12)'); g.addColorStop(1, 'rgba(255,240,236,0.02)');
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.restore();
  let seg = '阅读与检索 1/3';
  // ---- pages fan out (0–4.5) ----
  const fanOut = E.outCubic(clamp(u / 1.2));
  const toScan = E.inOutCubic(clamp((u - 4.3) / 0.8));
  const toCopy = E.inOutCubic(clamp((u - 8.6) / 0.8));
  if (toScan < 1 || toCopy > 0) {
    FILES.forEach((f, i) => {
      if (toCopy > 0 && i !== 0) return;
      const spread = (i - 1.5) * 1.05 * fanOut;
      let x = spread, z = 0.25 + Math.abs(i - 1.5) * 0.05, rz = (i - 1.5) * 0.05 * fanOut;
      if (toCopy > 0) { x = lerp(-0.4, -1.3, toCopy); z = 0.3; rz = 0; }
      const a = (1 - toScan * (toCopy > 0 ? 0 : 1)) * clamp(u / 0.4) || (toCopy > 0 ? 1 : 0);
      const pl = { c: [x, -0.004 * i, z], rx: -Math.PI / 2, ry: 0, rz };
      const tex = i === 0 ? hitPage(clamp((u - 2.2) / 0.5)) : pageTex(i);
      texPlane(ctx, cam, pl, 0.93, 1.23, tex, { alpha: toCopy > 0 ? toCopy : a, shade: 0.1 });
    });
  }
  // search bar + coordinate callout
  const sa = clamp((u - 1.2) / 0.4) * (1 - toScan);
  if (sa > 0) {
    ctx.save(); ctx.globalAlpha = sa;
    const x = W / 2 - 360, y = C.SAFE_T + 70;
    rrect(ctx, x, y, 720, 70, 35); ctx.fillStyle = 'rgba(251,246,244,0.95)'; ctx.fill();
    const typed = '12.50'.slice(0, Math.floor(clamp((u - 1.4) / 0.7) * 5.99));
    text(ctx, '全文检索', x + 40, y + 36, { font: font(600, 26), color: '#9a9097', align: 'left' });
    text(ctx, typed + (Math.floor(u * 3) % 2 ? '|' : ''), x + 170, y + 36, { font: font(700, 30, 'mono'), color: INK, align: 'left' });
    text(ctx, u > 2.2 ? '4 个文件 · 1 处命中' : '', x + 690, y + 36, { font: font(600, 22), color: MAUVE, align: 'right' });
    ctx.restore();
    const hq = clamp((u - 2.4) / 0.4);
    const hp = L.project(cam, [-1.52, 0, 0.16]);
    if (hq > 0 && hp) {
      ctx.save(); ctx.globalAlpha = hq * sa;
      ctx.strokeStyle = '#ffd65a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hp.x, hp.y); ctx.lineTo(hp.x - 60, hp.y + 140); ctx.lineTo(hp.x - 300, hp.y + 140); ctx.stroke();
      rrect(ctx, hp.x - 640, hp.y + 100, 340, 84, 12); ctx.fillStyle = 'rgba(20,12,20,0.85)'; ctx.fill(); ctx.strokeStyle = '#ffd65a'; ctx.stroke();
      text(ctx, '物理页 2', hp.x - 620, hp.y + 126, { font: font(700, 22), color: '#ffd65a', align: 'left' });
      text(ctx, 'PDF 坐标 x 312.4  y 508.1', hp.x - 620, hp.y + 160, { font: font(500, 20, 'mono'), color: LIGHT, align: 'left' });
      ctx.restore();
    }
  }
  // ---- rule matrix (4.5–8.6) ----
  const ma = toScan * (1 - toCopy);
  if (ma > 0) {
    seg = '批量扫描 2/3';
    ctx.save(); ctx.globalAlpha = ma;
    const x0 = 250, y0 = C.SAFE_T + 130, cw = 56, chh = 30;
    text(ctx, '26 条规则 × 4 个文件', x0, y0 - 46, { font: font(800, 36), color: LIGHT, align: 'left' });
    FILES.forEach((f, j) => text(ctx, f[0], x0 - 20, y0 + 14 + j * (chh + 14), { font: font(600, 20, 'mono'), color: '#d8c9d2', align: 'right' }));
    for (let i = 0; i < 26; i++) for (let j = 0; j < 4; j++) {
      const d = 4.6 + (i * 4 + j) * 0.03;
      const q = clamp((u - d) / 0.2);
      if (q <= 0) continue;
      const st = MATRIX[i][j];
      const x = x0 + i * cw, y = y0 + j * (chh + 14);
      rrect(ctx, x, y, cw - 8, chh + 6, 6); ctx.fillStyle = ST[st]; ctx.globalAlpha = ma * q; ctx.fill();
    }
    ctx.globalAlpha = ma;
    for (let i = 0; i < 26; i += 5) text(ctx, 'R' + String(i + 1).padStart(2, '0'), x0 + i * cw + 20, y0 + 4 * (chh + 14) + 16, { font: font(500, 18, 'mono'), color: '#b9a9b4' });
    // legend
    STATES.forEach((s, k) => {
      const x = x0 + k * 300, y = y0 + 4 * (chh + 14) + 90;
      rrect(ctx, x, y - 14, 28, 28, 6); ctx.fillStyle = ST[s]; ctx.fill();
      text(ctx, s, x + 40, y, { font: font(700, 22, 'mono'), color: LIGHT, align: 'left' });
    });
    text(ctx, 'PASS 只表示本地有限检查完成，不是官方通过', x0, y0 + 4 * (chh + 14) + 160, { font: font(500, 26), color: '#d8c9d2', align: 'left' });
    ctx.restore();
  }
  // ---- safe copy (8.6–14.5) ----
  if (toCopy > 0) {
    seg = '安全副本 3/3';
    const op = L.project(cam, [-1.3, 0, -0.4]);
    if (op) { C.lockIcon(ctx, op.x, op.y - 40, 46, LIGHT); text(ctx, '原文件不动 · 哈希绑定', op.x, op.y + 30, { font: font(700, 28), color: LIGHT, alpha: toCopy }); }
    const cq = E.outCubic(clamp((u - 9.4) / 0.9));
    if (cq > 0) {
      const pl = { c: [lerp(-1.3, 0.9, cq), -0.05 - Math.sin(cq * Math.PI) * 0.4, 0.3], rx: -Math.PI / 2, ry: 0, rz: lerp(0, 0.03, cq) };
      texPlane(ctx, cam, pl, 0.93, 1.23, pageTex(0), { alpha: cq, shade: 0.1 });
      const cp = L.project(cam, [0.9, 0, -0.4]);
      if (cp) {
        text(ctx, '快速 Web 查看副本', cp.x, cp.y + 30, { font: font(700, 28), color: '#f3d7e3', alpha: cq });
        ['页面渲染', '可检索文本', 'PDF 对象结构'].forEach((s, k) => {
          const a = clamp((u - 10.6 - k * 0.35) / 0.3);
          if (a <= 0) return;
          const y = C.SAFE_T + 140 + k * 70, x = W - 560;
          ctx.save(); ctx.globalAlpha = a;
          rrect(ctx, x, y - 26, 420, 52, 26); ctx.fillStyle = 'rgba(95,159,110,0.2)'; ctx.fill(); ctx.strokeStyle = ST.PASS; ctx.lineWidth = 2; ctx.stroke();
          text(ctx, '✓  ' + s + ' 复验', x + 30, y + 1, { font: font(700, 24), color: '#d6f0dc', align: 'left' });
          ctx.restore();
        });
        const ea = clamp((u - 12.0) / 0.4);
        text(ctx, 'evidence.json · 运行证据已保存', W - 560, C.SAFE_T + 360, { font: font(500, 22, 'mono'), color: '#cdbdc8', align: 'left', alpha: ea });
      }
    }
    // arrow
    const aa = clamp((u - 9.2) / 0.4);
    const p0 = L.project(cam, [-0.75, 0, 0.3]), p1 = L.project(cam, [0.35, 0, 0.3]);
    if (aa > 0 && p0 && p1) { ctx.save(); ctx.globalAlpha = aa; ctx.strokeStyle = MAUVE; ctx.lineWidth = 4; ctx.setLineDash([12, 10]); ctx.lineDashOffset = -u * 40; ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke(); ctx.restore(); }
  }
  C.channelBug(ctx, 4, seg, clamp(u / 0.4));
  if (u < 0.5) { const f = 1 - u / 0.5; ctx.fillStyle = `rgba(255,250,255,${f * 0.7})`; ctx.fillRect(0, 0, W, H); drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), f * 0.6); }
  C.switchOut(ctx, lt, 16, 402);
  return { grade: 'glass', gradeOverride: { shadow: [0.01, -0.01, 0.03], high: [0.04, 0.01, 0.02], bloom: 0.28, thr: 0.84 } };
};
