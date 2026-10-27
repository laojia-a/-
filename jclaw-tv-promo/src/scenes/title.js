// 24–36 s · Title: macro of the knob, pull back to a 3/4 product shot, title, programme guide, knob to CH01, dive into the glass.
const L = require('../lib');
const { canvas, clamp, inv, lerp, E, makeCam, lookAt, track, text, font, rrect, W, H } = L;
const TV = require('../tv');
const C = require('./common');
const { drawStatic } = require('../post');
const T = require('../timeline');

const buf = canvas(W, H), bx = buf.getContext('2d');
const POSE = { x: 0, y: 0, z: 0, ry: 0 };
const KNOB_W = [(TV.KNOB.x / TV.TW - 0.5) * TV.BW, (TV.KNOB.y / TV.TH - 0.5) * TV.BH, -TV.BD / 2];

// programme guide shown on the screen
const ROWS = [
  [1, '临床工具集', 'cth.jclaw.top'], [2, '临研知视', 'cv.jclaw.top'], [3, 'BE Workbench', 'be-workbench.jclaw.top'],
  [4, 'EZCTD', '本机工作台'], [5, 'BE Solo', 'be-solo.jclaw.top · 私有'], [6, 'BE Oracle', '无信号'], [7, '2026 · 学习资料', '无信号'],
];
function guide(c, t) {
  c.fillStyle = '#121c16'; c.fillRect(0, 0, W, H);
  const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(60,110,80,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  text(c, 'JCLAW TV', 150, 120, { font: font(900, 64, 'inter'), color: '#e9efd8', align: 'left' });
  text(c, '节目单 · PROGRAMME GUIDE', 470, 124, { font: font(600, 34), color: '#a1b699', align: 'left', spacing: 3 });
  text(c, '2026-10-27', W - 150, 122, { font: font(500, 34, 'mono'), color: '#a1b699', align: 'right' });
  c.fillStyle = 'rgba(233,239,216,0.25)'; c.fillRect(150, 178, W - 300, 2);
  const cur = Math.floor(clamp((t - 7.4) / 2.6) * 5.999); // cursor walks CH01..CH05
  ROWS.forEach(([n, name, url], i) => {
    const y = 250 + i * 104;
    const live = n <= 5;
    const on = live && i === cur && t > 7.4;
    const a = clamp((t - 2.6 - i * 0.12) / 0.4);
    c.save(); c.globalAlpha = a;
    if (on) { rrect(c, 136, y - 44, W - 272, 88, 14); c.fillStyle = 'rgba(196,218,147,0.18)'; c.fill(); c.lineWidth = 3; c.strokeStyle = '#c4da93'; c.stroke(); }
    rrect(c, 160, y - 28, 112, 56, 10); c.fillStyle = live ? C.CH[n].accent : '#3a4238'; c.fill();
    text(c, 'CH' + C.CH[n].no, 216, y + 1, { font: font(800, 28, 'inter'), color: live && (n === 1 || n >= 4) ? '#fff' : '#0f1a14' });
    text(c, name, 310, y + 1, { font: font(700, 44), color: live ? '#eef2e4' : '#6c7568', align: 'left' });
    text(c, url, W - 170, y + 2, { font: font(500, 32, 'mono'), color: live ? '#a1b699' : '#5b6458', align: 'right' });
    c.restore();
  });
  const sa = clamp((t - 3.6) / 0.5);
  c.save(); c.globalAlpha = sa;
  rrect(c, 136, 990, W - 272, 64, 12); c.fillStyle = 'rgba(63,230,255,0.12)'; c.fill(); c.lineWidth = 2; c.strokeStyle = 'rgba(63,230,255,0.55)'; c.stroke();
  text(c, '特别节目', 180, 1023, { font: font(800, 32), color: '#3fe6ff', align: 'left' });
  text(c, 'BE CSR Review · BE 报告审核 Agent Skill', 340, 1023, { font: font(600, 32), color: '#d8f3ff', align: 'left' });
  c.restore();
}

module.exports = function title(ctx, lt, t) {
  // ---- camera ----
  let camPos, target, fov = 0.62, scale = 1, light;
  if (lt < 2.4) {
    // macro: slow arc around the knob
    const a = lt / 2.4;
    camPos = [KNOB_W[0] + 0.14 - a * 0.1, KNOB_W[1] - 0.12 + a * 0.05, -0.56 + a * 0.06];
    target = [KNOB_W[0] - 0.02, KNOB_W[1] + 0.01, KNOB_W[2]];
    fov = 0.55; scale = 2.4;
  } else {
    const keys = [
      [2.4, [0.95, -0.22, -0.95]],
      [4.0, [-1.1, -0.3, -2.7]],
      [9.4, [-0.82, -0.2, -2.5]],
      [10.6, [0.0, -0.035, -1.55]],
      [12.0, [-0.02, -0.035, -0.26]],
    ];
    const tgt = [
      [2.4, [0.45, -0.12, -0.1]],
      [4.0, [-0.66, -0.03, 0]],
      [9.4, [-0.6, -0.03, 0]],
      [10.6, [-0.02, -0.035, 0]],
      [12.0, [-0.02, -0.035, 0]],
    ];
    const ease = (q) => E.inOutCubic(q);
    camPos = track(keys.slice(0, 4), Math.min(lt, 10.6), ease);
    target = track(tgt, lt, ease);
    if (lt > 10.6) { const q = E.inExpo(inv(10.6, 12, lt)); camPos = [lerp(0, -0.02, q), -0.035, lerp(-1.55, -0.26, q)]; }
    scale = lt < 4 ? 1.6 : lt > 10.6 ? 1 + E.inExpo(inv(10.6, 12, lt)) * 2 : 1;
  }
  const cam = makeCam({ x: camPos[0], y: camPos[1], z: camPos[2], fov });
  lookAt(cam, target, lt < 2.4 ? -0.08 + lt * 0.02 : L.noise1(lt * 0.4) * 0.003);

  // ---- knob + channel ----
  // macro: knob sweeps 6 -> 7 -> 1 ... ; at 10.2 it clicks to 1 from 7 for the dive
  let knob, ch = 7;
  if (lt < 2.4) { knob = TV.channelAngle(5) + E.inOutCubic(lt / 2.4) * (2 * Math.PI / 7) * 2; ch = lt < 1.2 ? 6 : 7; }
  else if (lt < 10.2) { knob = TV.channelAngle(7); ch = 7; }
  else { const q = E.outBack(clamp((lt - 10.2) / 0.25)); knob = TV.channelAngle(7) + q * (2 * Math.PI / 7); ch = lt > 10.3 ? 1 : 7; }

  // ---- screen ----
  bx.setTransform(1, 0, 0, 1, 0, 0);
  guide(bx, lt);
  let staticAmt = 0;
  if (lt < 2.9) staticAmt = lt < 2.4 ? 0.35 : 0.85;
  else staticAmt = clamp(1 - (lt - 2.9) / 0.5) * 0.85;
  if (lt > 10.2) staticAmt = clamp((lt - 10.2) / 0.15) * 0.95;
  const st = { ch, knob, power: 1, led: 1, screen: buf, staticAmt, seed: Math.floor(t * 30), scale };
  const scrCol = staticAmt > 0.5 ? [150, 150, 150] : [70, 110, 90];
  const keyL = lt < 2.4 ? 0.5 : lt < 10.6 ? 0.82 : 0.82 - inv(10.6, 12, lt) * 0.5;
  C.room(ctx, cam, POSE, scrCol, 1, { key: keyL });
  TV.drawTV(ctx, cam, POSE, st, keyL, 1);
  C.beamAndMotes(ctx, cam, POSE, scrCol, 0.7, t, 90);

  // ---- rim light sweep on the knob in macro ----
  if (lt < 2.4) {
    const q = L.project(cam, KNOB_W);
    if (q) {
      const sx = q.x + (lt / 2.4 - 0.5) * 900;
      const g = ctx.createRadialGradient(sx, q.y - 60, 0, sx, q.y - 60, 260);
      g.addColorStop(0, 'rgba(255,236,190,0.38)'); g.addColorStop(1, 'rgba(255,236,190,0)');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
    }
  }

  // ---- title ----
  const ta = Math.min(clamp((lt - 4.0) / 0.12), clamp((9.6 - lt) / 0.6));
  if (ta > 0) {
    const x = 640, y = 430;
    const tr = lerp(48, 8, E.outExpo(clamp((lt - 4.0) / 2.2)));
    ctx.save();
    ctx.globalAlpha = ta;
    ctx.translate(x, y); ctx.transform(1, 0, -0.16, 1, 0, 0);
    text(ctx, 'JCLAW', 0, 0, { font: font(900, 150, 'inter'), color: '#f6efdf', align: 'right', spacing: tr, glow: 'rgba(255,220,160,0.35)', blur: 30 });
    ctx.restore();
    ctx.save(); ctx.globalAlpha = ta;
    rrect(ctx, x + 40, y - 68, 134, 134, 18); ctx.lineWidth = 10; ctx.strokeStyle = '#f6efdf'; ctx.stroke();
    text(ctx, 'TV', x + 107, y + 4, { font: font(900, 78, 'inter'), color: '#f6efdf' });
    ctx.restore();
    const sa = Math.min(clamp((lt - 4.9) / 0.5), clamp((9.6 - lt) / 0.6));
    L.reveal(ctx, '临床研究的工作频道', x - 480, y + 160, lt - 4.9, { font: font(700, 54, 'serif'), color: '#e9dcc0', spacing: 16, align: 'left', alpha: sa, stagger: 0.05 });
    text(ctx, 'BROADCAST NETWORK  ·  七频导航  ·  一个入口', x - 480, y + 240, { font: font(500, 22, 'mono'), color: '#b9ad92', align: 'left', spacing: 4, alpha: sa * 0.85 });
    // hairline
    ctx.save(); ctx.globalAlpha = sa * 0.6; ctx.fillStyle = '#e9dcc0'; ctx.fillRect(x - 480, y + 110, 700 * E.outExpo(clamp((lt - 4.6) / 1.2)), 2); ctx.restore();
  }
  // dive: static takes the whole frame in the last half second
  const sAmt = E.inCubic(inv(11.4, 12, lt));
  if (sAmt > 0) drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), sAmt);
  return { grade: 'hero', streakTint: 'rgb(255,190,120)', streakMul: lt < 2.4 ? 1.2 : 0.7 };
};
