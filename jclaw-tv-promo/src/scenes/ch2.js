// 52–66 s · CH02 临研知视 — chalkboard space. Regulations / SOPs flip into cheese-yellow course cards, snap into a
// learning path and get published as one training task; learner progress rings only ever grow; versions are pinned.
const L = require('../lib');
const { canvas, cached, clamp, inv, lerp, E, rng, makeCam, lookAt, track, texPlane, text, font, rrect, wobbleLine, wobble, noise1, W, H } = L;
const C = require('./common');

const CHALK = '#e9efd8', CHALK2 = '#a1b699', LIME = '#c4da93', CHEESE = '#f5d67a', CHEESE_D = '#e6b94a', BROWN = '#5a4a2a';
const COURSES = [
  { code: 'CFDA-2015-228', title: '药物临床试验数据\n现场核查要点', kind: '法规' },
  { code: 'SOP-ADM 020', title: '供应商管理', kind: 'SOP' },
  { code: 'SOP-ADM 006', title: '个人档案的\n建立和管理', kind: 'SOP' },
];
const CW = 640, CH = 440;

const board = cached('ch2-board', 1920, 1080, (c, w, h) => {
  const g = c.createRadialGradient(w * 0.45, h * 0.4, 50, w / 2, h / 2, w * 0.75);
  g.addColorStop(0, '#24503b'); g.addColorStop(1, '#0c2219');
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  const r = rng(77);
  for (let i = 0; i < 70; i++) { // eraser smudges
    c.save(); c.translate(r() * w, r() * h); c.rotate(r() * 3); c.scale(1, 0.25 + r() * 0.3);
    const gg = c.createRadialGradient(0, 0, 0, 0, 0, 80 + r() * 200); gg.addColorStop(0, `rgba(220,235,210,${0.025 + r() * 0.03})`); gg.addColorStop(1, 'rgba(220,235,210,0)');
    c.fillStyle = gg; c.beginPath(); c.arc(0, 0, 280, 0, Math.PI * 2); c.fill(); c.restore();
  }
  for (let i = 0; i < 12000; i++) { c.fillStyle = `rgba(230,240,220,${r() * 0.05})`; c.fillRect(r() * w, r() * h, 1.2, 1.2); }
  // faint old chalk writing
  c.globalAlpha = 0.06;
  ['GCP', 'SOP', '核查', '培训', '版本', '记录'].forEach((s, i) => text(c, s, 200 + (i % 3) * 620 + r() * 100, 200 + Math.floor(i / 3) * 600 + r() * 80, { font: font(700, 120, 'serif'), color: CHALK }));
  c.globalAlpha = 1;
});

function docTex(i) {
  return cached('ch2-doc' + i, CW, CH, (c, w, h) => {
    rrect(c, 4, 4, w - 8, h - 8, 16); c.lineWidth = 3; c.strokeStyle = CHALK;
    wobble(c, [[10, 10], [w - 10, 12], [w - 12, h - 10], [12, h - 12], [10, 10]], 3 + i, 2); c.stroke();
    text(c, COURSES[i].kind === '法规' ? '法规原文' : 'SOP 原件', 40, 60, { font: font(700, 30), color: CHALK2, align: 'left' });
    text(c, COURSES[i].code, 40, 112, { font: font(600, 30, 'mono'), color: CHALK, align: 'left' });
    for (let k = 0; k < 8; k++) { c.strokeStyle = 'rgba(233,239,216,0.55)'; c.lineWidth = 3; wobbleLine(c, 40, 170 + k * 30, 40 + 360 + (k * 97) % 180, 170 + k * 30, i * 10 + k, 1.6); c.stroke(); }
  });
}
function courseTex(i) {
  return cached('ch2-course' + i, CW, CH, (c, w, h) => {
    rrect(c, 8, 12, w - 16, h - 16, 26); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fill();
    rrect(c, 4, 4, w - 12, h - 12, 26); c.fillStyle = '#fff8e6'; c.fill(); c.lineWidth = 4; c.strokeStyle = BROWN; c.stroke();
    // cover band
    c.save(); rrect(c, 4, 4, w - 12, 170, 26); c.clip();
    c.fillStyle = CHEESE; c.fillRect(0, 0, w, 174);
    c.fillStyle = 'rgba(255,255,255,0.35)'; for (let k = 0; k < 7; k++) { c.beginPath(); c.arc(60 + k * 92, 40 + (k % 2) * 60, 14 + (k % 3) * 8, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.strokeStyle = BROWN; c.lineWidth = 3; wobbleLine(c, 6, 174, w - 10, 174, i * 3, 1.2); c.stroke();
    rrect(c, 32, 30, 150, 44, 22); c.fillStyle = '#fff8e6'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = BROWN; c.stroke();
    text(c, COURSES[i].kind, 107, 53, { font: font(700, 22), color: BROWN });
    text(c, COURSES[i].code, w - 36, 54, { font: font(600, 22, 'mono'), color: BROWN, align: 'right' });
    COURSES[i].title.split('\n').forEach((ln, k) => text(c, ln, 36, 236 + k * 54, { font: font(800, 42), color: '#3f3420', align: 'left' }));
    rrect(c, 36, h - 84, 168, 42, 21); c.fillStyle = '#d8ecd0'; c.fill();
    text(c, '已发布版本', 120, h - 62, { font: font(700, 21), color: '#2f6b3f' });
  });
}

// learner progress (monotonic): progress events at fixed times, value = max so far
const LEARNERS = (() => {
  const r = rng(321);
  return Array.from({ length: 24 }, (_, i) => {
    const ev = []; let v = 0, tt = 8.3 + r() * 0.6;
    while (tt < 14 && v < 100) { v = Math.min(100, v + 8 + Math.floor(r() * 26)); ev.push([tt, v]); tt += 0.35 + r() * 0.8; }
    return { id: (i < 16 ? 'E' : 'I') + String(1001 + i), ev };
  });
})();
function progressAt(l, lt) { let v = 0; for (const [t0, x] of l.ev) if (lt >= t0) v = Math.max(v, x); return v; }

module.exports = function ch2(ctx, lt, t) {
  // camera drifts across three "boards": sources (left), path (centre), learners (right)
  const pos = track([[0, [-2.5, 0.05, -4.7]], [3.8, [-2.0, 0.0, -4.4]], [4.8, [0.15, -0.05, -4.4]], [7.6, [0.4, -0.05, -4.2]], [8.6, [4.75, 0.0, -4.6]], [14, [5.0, 0.03, -4.25]]], lt, E.inOutCubic);
  const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.8 });
  lookAt(cam, [pos[0], 0, 0], noise1(lt * 0.25) * 0.01);
  // board with parallax
  const ox = -pos[0] * 60;
  ctx.drawImage(board, ox - 200, -60, W + 400, H + 120);

  // --- 1 · sources flip into courses ---
  COURSES.forEach((co, i) => {
    const t0 = 0.6 + i * 0.35;
    const flip = E.inOutCubic(clamp((lt - (1.6 + i * 0.35)) / 0.9));
    // after 4.0 the courses fly into the path
    const fly = E.inOutCubic(clamp((lt - (4.2 + i * 0.22)) / 1.0));
    const from = [-3.85 + i * 1.45, -0.05 + (i % 2) * 0.12, 0.2];
    const to = [-1.1 + i * 1.3, 0.1, 0];
    const c0 = [lerp(from[0], to[0], fly), lerp(from[1], to[1], fly), lerp(from[2], to[2], fly) - Math.sin(fly * Math.PI) * 0.8];
    const ry = Math.PI * flip;
    const appear = E.outCubic(clamp((lt - t0) / 0.5));
    if (appear <= 0) return;
    const sc = lerp(0.95, 0.82, fly);
    const pl = { c: c0, rx: 0, ry: flip < 0.5 ? ry : ry - Math.PI, rz: lerp(-0.04 + i * 0.03, 0, fly) };
    const tex = flip < 0.5 ? docTex(i) : courseTex(i);
    texPlane(ctx, cam, pl, 1.6 * sc, 1.1 * sc, tex, { alpha: appear, backface: true, nx: 4, ny: 3 });
  });
  // chalk labels on the board
  const lab1 = clamp((lt - 0.5) / 0.5) * clamp((4.4 - lt) / 0.4);
  if (lab1 > 0) {
    const q = L.project(cam, [-2.4, -0.98, 0.2]);
    if (q) text(ctx, '原始资料 → 课程', q.x, q.y, { font: font(700, 40, 'serif'), color: CHALK, alpha: lab1, spacing: 6 });
  }
  // --- 2 · learning path + publish ---
  const pathA = clamp((lt - 4.6) / 0.4);
  if (pathA > 0) {
    const a = L.project(cam, [-1.6, 0.85, 0]), b = L.project(cam, [1.9, 0.85, 0]);
    if (a && b) {
      ctx.save(); ctx.globalAlpha = pathA; ctx.strokeStyle = CHALK; ctx.lineWidth = 4;
      const q = E.outCubic(clamp((lt - 4.6) / 1.2));
      wobbleLine(ctx, a.x, a.y, lerp(a.x, b.x, q), lerp(a.y, b.y, q), 7, 2); ctx.stroke();
      if (q > 0.98) { ctx.beginPath(); ctx.moveTo(b.x - 22, b.y - 14); ctx.lineTo(b.x, b.y); ctx.lineTo(b.x - 22, b.y + 14); ctx.stroke(); }
      [0, 1, 2].forEach((k) => {
        const p0 = L.project(cam, [-1.1 + k * 1.3, 0.85, 0]);
        if (!p0) return;
        ctx.beginPath(); ctx.arc(p0.x, p0.y, 26, 0, Math.PI * 2); ctx.fillStyle = '#1d3f2e'; ctx.fill(); ctx.strokeStyle = LIME; ctx.lineWidth = 3; ctx.stroke();
        text(ctx, String(k + 1), p0.x, p0.y + 1, { font: font(800, 26, 'inter'), color: LIME });
        text(ctx, k < 2 ? '必修' : '选修', p0.x, p0.y + 52, { font: font(600, 24), color: CHALK2 });
      });
      ctx.restore();
    }
    const h = L.project(cam, [0.2, -0.95, 0]);
    if (h) {
      text(ctx, '培训任务', h.x, h.y - 46, { font: font(800, 52, 'serif'), color: CHALK, alpha: pathA, spacing: 8 });
      text(ctx, '课程顺序 · 参与人员 · 日期  →  一次发布', h.x, h.y + 18, { font: font(500, 28), color: CHALK2, alpha: pathA });
    }
    // publish button + stamp
    const bp = L.project(cam, [0.2, 1.55, 0]);
    const press = lt > 6.6 && lt < 6.8 ? 0.94 : 1;
    if (bp) {
      ctx.save(); ctx.globalAlpha = clamp((lt - 5.6) / 0.4); ctx.translate(bp.x, bp.y); ctx.scale(press, press);
      rrect(ctx, -190, -38, 380, 76, 38); ctx.fillStyle = lt > 6.7 ? '#2f6b3f' : CHEESE_D; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = BROWN; ctx.stroke();
      text(ctx, lt > 6.7 ? '✓ 已发布培训' : '创建并发布培训', 0, 1, { font: font(800, 30), color: lt > 6.7 ? '#f2f7e8' : '#3f3420' });
      ctx.restore();
    }
  }
  // --- 3 · learners ---
  const la = clamp((lt - 8.0) / 0.5);
  if (la > 0) {
    const cols = 8;
    LEARNERS.forEach((l, i) => {
      const x = 3.15 + (i % cols) * 0.42, y = -0.5 + Math.floor(i / cols) * 0.5;
      const q = L.project(cam, [x, y, 0]);
      if (!q) return;
      const a = la * clamp((lt - 8.0 - i * 0.03) / 0.3);
      const v = progressAt(l, lt);
      const R = q.k * 0.115;
      ctx.save(); ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(q.x, q.y, R, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(233,239,216,0.22)'; ctx.lineWidth = R * 0.22; ctx.stroke();
      ctx.beginPath(); ctx.arc(q.x, q.y, R, -Math.PI / 2, -Math.PI / 2 + (v / 100) * Math.PI * 2); ctx.strokeStyle = v >= 100 ? '#9fe08a' : CHEESE; ctx.stroke();
      text(ctx, v >= 100 ? '✓' : v + '%', q.x, q.y, { font: font(800, R * 0.62, 'inter'), color: v >= 100 ? '#9fe08a' : CHALK });
      text(ctx, l.id, q.x, q.y + R * 1.55, { font: font(500, R * 0.42, 'mono'), color: CHALK2 });
      ctx.restore();
    });
    // event log
    const lg = L.project(cam, [6.6, -0.75, 0]);
    if (lg) {
      ctx.save(); ctx.globalAlpha = la;
      text(ctx, 'progress.updated', lg.x, lg.y - 10, { font: font(700, 26, 'mono'), color: LIME, align: 'left' });
      const evs = [];
      LEARNERS.forEach((l) => l.ev.forEach(([t0, v]) => { if (t0 <= lt) evs.push([t0, l.id, v]); }));
      evs.sort((a, b) => b[0] - a[0]);
      evs.slice(0, 8).forEach(([t0, id, v], k) => {
        const fresh = clamp(1 - (lt - t0) / 0.6);
        text(ctx, `${id}  ${String(v).padStart(3)}%  已保存`, lg.x, lg.y + 40 + k * 38, { font: font(500, 22, 'mono'), color: fresh > 0 ? '#ffffff' : CHALK2, align: 'left', alpha: 1 - k * 0.1 });
      });
      ctx.restore();
    }
    // identity chain
    const ch = L.project(cam, [4.75, 0.98, 0]);
    if (ch) {
      const parts = ['学员', '培训分配', '课程登记', '固定课程版本'];
      const ca = clamp((lt - 10.4) / 0.5);
      ctx.save(); ctx.globalAlpha = ca;
      let x = ch.x - 520;
      parts.forEach((s, k) => {
        const w = L.measure(ctx, s, font(700, 28)) + 44 + (k === 3 ? 34 : 0);
        rrect(ctx, x, ch.y - 28, w, 56, 28); ctx.fillStyle = k === 3 ? CHEESE : 'rgba(233,239,216,0.1)'; ctx.fill(); ctx.strokeStyle = k === 3 ? BROWN : CHALK2; ctx.lineWidth = 2; ctx.stroke();
        if (k === 3) C.lockIcon(ctx, x + 34, ch.y - 2, 26, '#3f3420');
        text(ctx, s, x + w / 2 + (k === 3 ? 16 : 0), ch.y + 1, { font: font(700, 28), color: k === 3 ? '#3f3420' : CHALK });
        x += w;
        if (k < 3) { text(ctx, '→', x + 24, ch.y, { font: font(700, 30, 'inter'), color: CHALK2 }); x += 48; }
      });
      ctx.restore();
    }
    const tag = L.project(cam, [4.6, -0.98, 0]);
    if (tag) text(ctx, '进度只增不减', tag.x - 140, tag.y, { font: font(800, 44, 'serif'), color: CHALK, alpha: la, spacing: 8 });
  }
  // chalk dust motes
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = rng(4);
  for (let i = 0; i < 80; i++) { const x = (r() * W + lt * (10 + r() * 30)) % W, y = (r() * H + Math.sin(lt + i) * 20); ctx.fillStyle = `rgba(230,240,220,${0.05 + r() * 0.12})`; ctx.fillRect(x, y, 2, 2); }
  ctx.restore();
  C.channelBug(ctx, 2, lt < 4.2 ? '课程制作 1/3' : lt < 8 ? '培训任务 2/3' : '学习记录 3/3', clamp((lt - 0.5) / 0.4));
  if (lt > 8.2) C.demoTag(ctx, W - 96, C.SAFE_T + 18, la);
  C.switchIn(ctx, lt, 201);
  C.switchOut(ctx, lt, 14, 202);
  return { grade: 'chalk' };
};
