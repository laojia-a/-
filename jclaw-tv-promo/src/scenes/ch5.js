// 104–120 s · CH05 BE Solo — indigo glass UI floating in depth.
// Overview tiles + 16-node project progress → 14-day density + issue / to-do → BE assistant drafts a to-do,
// it waits in "待审核", a person clicks 接受 and only then it becomes a real to-do. All data is demo data.
const L = require('../lib');
const { canvas, clamp, inv, lerp, E, rng, makeCam, lookAt, track, texPlane, text, font, rrect, noise1, W, H } = L;
const C = require('./common');
const T = require('../timeline');

const PUR = '#6e56cf', PUR_L = '#ece8fb', NAVY = '#161a33', INK = '#1f2433', MUTE = '#7b8399', TEAL = '#1aa889', AMB = '#e9a23b', RED = '#d9534f';
const bufs = {};
function panel(id, w, h) { if (!bufs[id]) bufs[id] = canvas(w, h); const c = bufs[id].getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, w, h); return [bufs[id], c]; }
function glass(c, w, h, r = 26, topCol) {
  rrect(c, 0, 0, w, h, r); c.fillStyle = 'rgba(255,255,255,0.95)'; c.fill();
  if (topCol) { c.save(); rrect(c, 0, 0, w, h, r); c.clip(); c.fillStyle = topCol; c.fillRect(0, 0, w, 7); c.restore(); }
  rrect(c, 0, 0, w, h, r); c.lineWidth = 2; c.strokeStyle = 'rgba(110,86,207,0.25)'; c.stroke();
}

function kpis(lt) {
  const [cv, c] = panel('kpi', 1800, 250);
  glass(c, 1800, 250);
  const items = [['进行中项目', '3', '不含已获批', PUR], ['节点完成', '50%', '8 / 16 个适用节点', PUR], ['未关闭 Issue', '2', '只统计 open', RED], ['待办 To-do', '5', '1 重要 · 0 逾期', AMB]];
  items.forEach(([k, v, s, col], i) => {
    const x = 40 + i * 440, a = clamp((lt - 0.3 - i * 0.12) / 0.4);
    c.save(); c.globalAlpha = a;
    rrect(c, x, 70, 90, 90, 22); c.fillStyle = col + '22'; c.fill();
    c.beginPath(); c.arc(x + 45, 115, 16, 0, Math.PI * 2); c.strokeStyle = col; c.lineWidth = 4; c.stroke();
    text(c, k, x + 120, 70, { font: font(700, 30), color: INK, align: 'left' });
    text(c, v, x + 120, 136, { font: font(800, 64, 'inter'), color: INK, align: 'left' });
    text(c, s, x + 120, 196, { font: font(500, 24), color: MUTE, align: 'left' });
    c.restore();
  });
  return cv;
}
const STAGES = ['方案', '伦理', '启动', '筛选', '入组', '给药', '采血', '样本', 'EDC录入', 'SDV', '数据清理', '锁库', '统计', 'CSR', '递交', '归档'];
function focus(lt) {
  const [cv, c] = panel('focus', 1100, 560);
  glass(c, 1100, 560, 26, PUR);
  text(c, '项目焦点', 44, 62, { font: font(700, 32), color: PUR, align: 'left' });
  text(c, '示例项目 A', 44, 120, { font: font(800, 46), color: INK, align: 'left' });
  text(c, '进入项目 →', 1056, 62, { font: font(700, 28), color: PUR, align: 'right' });
  const done = Math.min(8, Math.floor(clamp((lt - 0.6) / 2.0) * 8.99));
  text(c, '整体节点进度', 44, 200, { font: font(500, 26), color: MUTE, align: 'left' });
  text(c, Math.round((done / 16) * 100) + '%', 1056, 200, { font: font(800, 40, 'inter'), color: INK, align: 'right' });
  rrect(c, 44, 234, 1012, 18, 9); c.fillStyle = PUR_L; c.fill();
  rrect(c, 44, 234, 1012 * (done / 16), 18, 9); c.fillStyle = PUR; c.fill();
  // 16 nodes
  for (let i = 0; i < 16; i++) {
    const x = 44 + i * 63.5;
    const cur = i === done;
    rrect(c, x, 300, 52, 16, 8); c.fillStyle = i < done ? PUR : cur ? '#b8a9f2' : '#e3e5ec'; c.fill();
    if (cur) { rrect(c, x - 4, 296, 60, 24, 12); c.strokeStyle = PUR; c.lineWidth = 3; c.stroke(); }
  }
  [['当前阶段', '数据管理'], ['当前节点', STAGES[done] || 'EDC录入'], ['下一节点', STAGES[done + 1] || 'SDV']].forEach(([k, v], i) => {
    const x = 44 + i * 345;
    rrect(c, x, 360, 320, 130, 18); c.fillStyle = '#f5f6fa'; c.fill();
    text(c, k, x + 24, 398, { font: font(500, 24), color: MUTE, align: 'left' });
    text(c, v, x + 24, 448, { font: font(800, 32), color: INK, align: 'left' });
  });
  text(c, '当前无逾期节点', 44, 528, { font: font(600, 26), color: TEAL, align: 'left' });
  return cv;
}
function density(lt) {
  const [cv, c] = panel('density', 1100, 560);
  glass(c, 1100, 560, 26, TEAL);
  text(c, '未来 14 天', 44, 62, { font: font(700, 32), color: TEAL, align: 'left' });
  text(c, '事项密度', 44, 120, { font: font(800, 46), color: INK, align: 'left' });
  const r = rng(14);
  const vals = Array.from({ length: 14 }, () => (r() < 0.45 ? 0 : 1 + Math.floor(r() * 4)));
  vals.forEach((v, i) => {
    const x = 60 + i * 72, q = E.outBack(clamp((lt - 0.2 - i * 0.05) / 0.5));
    const hgt = v * 70 * q;
    rrect(c, x, 470 - hgt, 40, Math.max(0, hgt), 8); c.fillStyle = i % 3 === 0 ? AMB : '#6e5be6'; if (hgt > 0) c.fill();
    if (i % 2 === 0) text(c, `08/${String(15 + i).padStart(2, '0')}`, x + 20, 506, { font: font(500, 20, 'inter'), color: MUTE });
  });
  c.fillStyle = '#e3e5ec'; c.fillRect(44, 471, 1012, 2);
  return cv;
}
function work(lt) {
  const [cv, c] = panel('work', 1100, 560);
  glass(c, 1100, 560, 26, AMB);
  text(c, 'Issue · To-do', 44, 62, { font: font(700, 32), color: AMB, align: 'left' });
  const rows = [['Issue', '中心样本运输温度记录缺页', RED, '高'], ['To-do', '提交第二批采血管申领', PUR, '08/18'], ['To-do', '更新排期总览中的入组节点', PUR, '08/20'], ['Issue', '随机表版本待核对', AMB, '中']];
  rows.forEach(([k, s, col, tag], i) => {
    const y = 110 + i * 104, a = clamp((lt - 0.2 - i * 0.15) / 0.4);
    c.save(); c.globalAlpha = a; c.translate((1 - E.outCubic(a)) * 60, 0);
    rrect(c, 44, y, 1012, 86, 16); c.fillStyle = '#f7f7fb'; c.fill();
    rrect(c, 64, y + 24, 98, 38, 19); c.fillStyle = col + '22'; c.fill();
    text(c, k, 113, y + 44, { font: font(700, 22, 'inter'), color: col });
    text(c, s, 186, y + 44, { font: font(600, 28), color: INK, align: 'left' });
    text(c, tag, 1030, y + 44, { font: font(600, 24), color: MUTE, align: 'right' });
    c.restore();
  });
  return cv;
}
function chat(lt) {
  const [cv, c] = panel('chat', 1000, 860);
  rrect(c, 0, 0, 1000, 860, 30); c.fillStyle = 'rgba(22,26,51,0.94)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(160,140,255,0.4)'; c.stroke();
  text(c, 'BE 助手', 44, 60, { font: font(800, 34), color: '#fff', align: 'left' });
  text(c, '只起草 · 不落库', 956, 62, { font: font(600, 24), color: '#b8a9f2', align: 'right' });
  // user bubble
  const ua = clamp((lt - 0.2) / 0.3);
  c.save(); c.globalAlpha = ua;
  rrect(c, 330, 110, 626, 96, 22); c.fillStyle = PUR; c.fill();
  text(c, '为示例项目 A 起草一个待审核 To-do', 360, 158, { font: font(600, 28), color: '#fff', align: 'left' });
  c.restore();
  // streaming answer
  const ans = '好的。我起草了一条待办，放进「待审核」，你确认后才会创建：';
  const n = Math.floor(clamp((lt - 0.7) / 1.2) * ans.length);
  if (n > 0) {
    rrect(c, 44, 236, 820, 120, 22); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill();
    const s = ans.slice(0, n);
    text(c, s.slice(0, 20), 74, 276, { font: font(500, 27), color: '#e8e6f6', align: 'left' });
    if (s.length > 20) text(c, s.slice(20), 74, 320, { font: font(500, 27), color: '#e8e6f6', align: 'left' });
  }
  return cv;
}
const DC = canvas(880, 300), dcx = DC.getContext('2d');
function draftCard(state) {
  const c = dcx; c.clearRect(0, 0, 880, 300);
  const accepted = state > 0;
  rrect(c, 0, 0, 880, 300, 24); c.fillStyle = '#ffffff'; c.fill();
  c.lineWidth = 4; c.setLineDash(accepted ? [] : [14, 10]); c.strokeStyle = accepted ? TEAL : PUR; c.stroke(); c.setLineDash([]);
  rrect(c, 36, 32, accepted ? 150 : 170, 46, 23); c.fillStyle = accepted ? TEAL + '22' : PUR_L; c.fill();
  text(c, accepted ? '✓ 已创建' : '草稿 · 待审核', accepted ? 111 : 121, 56, { font: font(700, 24), color: accepted ? TEAL : PUR });
  text(c, 'To-do：SDV 及数据清理准备', 36, 130, { font: font(800, 38), color: INK, align: 'left' });
  text(c, '示例项目 A · 截止 08/16 · 关联节点 EDC录入', 36, 184, { font: font(500, 26), color: MUTE, align: 'left' });
  if (!accepted) {
    rrect(c, 520, 220, 160, 56, 28); c.fillStyle = PUR; c.fill(); text(c, '接受', 600, 249, { font: font(800, 28), color: '#fff' });
    rrect(c, 700, 220, 150, 56, 28); c.strokeStyle = '#c9cbd6'; c.lineWidth = 2.5; c.stroke(); text(c, '拒绝', 775, 249, { font: font(700, 28), color: MUTE });
  }
  return DC;
}

module.exports = function ch5(ctx, lt, t) {
  // background: indigo dusk with soft bokeh
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#262d55'); g.addColorStop(0.55, '#141833'); g.addColorStop(1, '#0a0c1a');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const r = rng(55);
  for (let i = 0; i < 26; i++) { const x = r() * W + noise1(lt * 0.1 + i) * 40, y = r() * H, R = 40 + r() * 140; const gg = ctx.createRadialGradient(x, y, 0, x, y, R); gg.addColorStop(0, `rgba(${r() < 0.5 ? '140,120,255' : '90,150,220'},${0.05 + r() * 0.06})`); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gg; ctx.fillRect(x - R, y - R, 2 * R, 2 * R); }
  ctx.restore();

  const acceptAt = T.K.accept - T.K.ch5; // 12
  const pos = track([[0, [-0.75, -0.2, -3.7]], [4.4, [-0.55, -0.12, -3.3]], [5.4, [1.6, 0.0, -3.9]], [8.8, [1.9, 0.05, -3.6]], [9.8, [2.6, 0.05, -3.0]], [16, [2.75, 0.08, -2.75]]], lt, E.inOutCubic);
  const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.8 });
  lookAt(cam, [pos[0], 0.12, 0], noise1(lt * 0.3) * 0.006);
  const intro = (d) => E.outCubic(clamp((lt - d) / 0.7));
  const items = [];
  // overview row
  items.push({ c: [-0.5, -0.62, 0.2], ry: 0.06, w: 3.0, h: 0.417, tex: () => kpis(lt), d: 0.3 });
  items.push({ c: [-0.75, 0.5, 0.1], ry: 0.12, w: 2.0, h: 1.02, tex: () => focus(lt), d: 0.6 });
  items.push({ c: [1.35, 0.42, 0.25], ry: -0.1, w: 2.2, h: 1.12, tex: () => density(lt - 4.6), d: 4.4 });
  items.push({ c: [3.6, 0.42, 0.45], ry: -0.18, w: 2.2, h: 1.12, tex: () => work(lt - 5.6), d: 5.4 });
  items.push({ c: [2.4, -0.05, -0.55], ry: 0.12, w: 1.7, h: 1.46, tex: () => chat(lt - 9.6), d: 9.4 });
  for (const it of items) {
    const a = intro(it.d);
    if (a <= 0) continue;
    const pl = { c: [it.c[0], it.c[1] + (1 - a) * 0.3, it.c[2] + (1 - a) * 0.8], rx: 0, ry: it.ry, rz: 0 };
    // glow behind
    texPlane(ctx, cam, pl, it.w, it.h, it.tex(), { alpha: a * (lt > 9.4 && it.d < 9 ? 0.18 + 0.82 * (1 - clamp((lt - 9.4) / 0.6)) : 1) });
  }
  // draft card → accept → to-do
  const da = E.outBack(clamp((lt - 11.0) / 0.6));
  if (da > 0) {
    const acc = lt >= acceptAt + 0.12 ? 1 : 0;
    const fly = E.inOutCubic(clamp((lt - (acceptAt + 0.9)) / 0.9));
    const pl = { c: [lerp(2.55, 3.6, fly), lerp(0.3, 0.75, fly), lerp(-0.85, 0.42, fly)], rx: 0, ry: lerp(0.12, -0.18, fly), rz: 0 };
    const sc = lerp(1, 0.6, fly);
    texPlane(ctx, cam, pl, 1.45 * sc, 0.494 * sc, draftCard(acc), { alpha: clamp(da) * (1 - clamp((lt - (acceptAt + 1.7)) / 0.3)) });
    // bell badge
    const bp = L.project(cam, [3.3, -0.62, -0.55]);
    if (bp && lt > 11.3) {
      const pend = acc ? 0 : 1;
      ctx.save();
      rrect(ctx, bp.x - 30, bp.y - 34, 210, 60, 30); ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fill();
      text(ctx, '待审核', bp.x + 52, bp.y - 3, { font: font(700, 26), color: '#fff' });
      ctx.beginPath(); ctx.arc(bp.x + 158, bp.y - 26, 15, 0, Math.PI * 2); ctx.fillStyle = pend ? RED : TEAL; ctx.fill();
      text(ctx, String(pend), bp.x + 158, bp.y - 25, { font: font(800, 18, 'inter'), color: '#fff' });
      ctx.restore();
    }
    // cursor
    const btn = L.project(cam, [2.55 + (600 - 440) / 880 * 1.45, 0.3 + (249 - 150) / 300 * 0.494, -0.85 - 0.03]);
    if (btn && lt > 11.2 && lt < acceptAt + 0.9) {
      const q = E.inOutCubic(clamp((lt - 11.2) / 0.7));
      const x = lerp(btn.x + 260, btn.x, q), y = lerp(btn.y + 200, btn.y, q);
      const press = Math.abs(lt - acceptAt) < 0.1 ? 0.85 : 1;
      ctx.save(); ctx.translate(x, y); ctx.scale(press * 1.3, press * 1.3);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34); ctx.lineTo(9, 26); ctx.lineTo(16, 41); ctx.lineTo(22, 38); ctx.lineTo(15, 23); ctx.lineTo(27, 23); ctx.closePath();
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = '#111'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
      if (lt > acceptAt && lt < acceptAt + 0.5) { const k = (lt - acceptAt) / 0.5; ctx.beginPath(); ctx.arc(btn.x, btn.y, 20 + k * 70, 0, Math.PI * 2); ctx.strokeStyle = `rgba(255,255,255,${1 - k})`; ctx.lineWidth = 3; ctx.stroke(); }
    }
    // rule
    const ra = clamp((lt - 11.6) / 0.4);
    text(ctx, 'GPT / MCP 只能起草；接受或拒绝只在浏览器里由你完成', W / 2, H - C.BAR - 70, { font: font(600, 28), color: '#d9d3fb', alpha: ra * 0.9 });
  }
  C.channelBug(ctx, 5, lt < 4.4 ? '概览 1/3' : lt < 9.4 ? '排期与工作 2/3' : 'BE 助手 3/3', clamp((lt - 0.5) / 0.4));
  C.demoTag(ctx, W - 96, C.SAFE_T + 18, clamp((lt - 0.6) / 0.4));
  C.switchIn(ctx, lt, 501);
  C.switchOut(ctx, lt, 16, 502);
  return { grade: 'glass' };
};
