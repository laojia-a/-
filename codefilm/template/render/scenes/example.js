// 示例：三个场景，分别演示 风格化（cyber）、HBO 剧集质感、好莱坞大片质感。
import { W, H, C, def, transition, p, smooth, eOut, eOutExpo, eInOut, env, text, typeText, tag, fmt, chapterCard, radial, rrect, glowDot, rng, hash1 } from '../engine.js';
import { drawEye, dust, cam, godRays, motes, depthLayer } from './lib.js';
import { P, mixP } from '../presets.js';

// ---------- 1. 风格化开场：叙述者之眼 + 关键数字冲击
def('s00_open', {
  post: P.cyber,
  draw(S) {
    const c = S.ctx, t = S.t, L1 = S.L('L001'), L2 = S.L('L002');
    dust(c, t, 160, '#9fdfff', .35, 3);
    drawEye(c, W / 2, H / 2 - 40, 240, t, { open: eOutExpo(p(t, .3, 1.6)) });
    tag(c, W / 2 + 200, H / 2 - 160, W / 2 + 420, H / 2 - 300, ['叙述者 · NARRATOR', 'ONLINE'], { prog: p(t, L1.s + .5, L1.s + 1.6), alpha: env(t, L1.s, L2.s, .3, .4), size: 30, w: 330 });
    const k = p(t, L2.s + .5, L2.s + 2.0);
    if (k > 0) {
      text(c, fmt(12000 * eOut(k)), W / 2, H - 250, { size: 120, family: 'JB', weight: 800, color: '#fff', align: 'center' });
      S.post.glitch = Math.max(0, 1 - p(t, L2.s + .5, L2.s + .9)) * .8;
    }
  },
});

// ---------- 2. HBO 质感：深夜办公室。低调光、单一动机光源（台灯+窗外蓝光）、缓推、前景虚化
function office(c, t) {
  c.fillStyle = '#07090c'; c.fillRect(-200, -200, W + 400, H + 400);
  // 窗外冷光（动机光源 1）
  c.fillStyle = radial(c, 1500, 300, 1000, [[0, '#1b2a3d'], [1, 'rgba(7,9,12,0)']]); c.fillRect(-200, -200, W + 400, H + 400);
  for (let i = 0; i < 5; i++) { c.fillStyle = '#0a0d12'; c.fillRect(1080 + i * 170, 60, 14, 640); }
  godRays(c, 1700, 120, Math.PI * .78, 380, 1500, '#9fc4ff', .07, t);
  // 桌面与台灯（动机光源 2）
  c.fillStyle = '#120e0b'; c.fillRect(-200, 760, W + 400, 600);
  c.fillStyle = radial(c, 620, 760, 620, [[0, 'rgba(255,170,95,.42)'], [1, 'rgba(255,170,95,0)']]); c.fillRect(-200, -200, W + 400, H + 400);
  godRays(c, 620, 610, Math.PI / 2, 520, 300, '#ffc488', .12, t);
  motes(c, t, 360, 600, 560, 260, 90, '#ffe6c2', .55, 4);
  c.fillStyle = '#1d1712'; c.fillRect(612, 600, 14, 160); c.beginPath(); c.moveTo(540, 612); c.lineTo(700, 612); c.lineTo(668, 560); c.lineTo(572, 560); c.closePath(); c.fill();
  // 一沓文件与一杯咖啡
  for (let i = 0; i < 8; i++) { c.fillStyle = `rgb(${150 + i * 3},${138 + i * 3},${118 + i * 2})`; c.save(); c.translate(900, 790 - i * 6); c.rotate((hash1(i) - .5) * .05); c.fillRect(-170, -8, 340, 10); c.restore(); }
  c.fillStyle = '#2a1f18'; rrect(c, 1180, 700, 80, 90, 10); c.fill();
  for (let i = 0; i < 3; i++) { c.strokeStyle = `rgba(255,230,200,${.05 + .03 * Math.sin(t + i)})`; c.lineWidth = 3; c.beginPath(); c.moveTo(1205 + i * 14, 690); c.bezierCurveTo(1195 + i * 14, 650, 1230 + i * 14 + Math.sin(t * 1.3 + i) * 8, 630, 1212 + i * 14, 590); c.stroke(); }
  // 人物剪影（轮廓光来自窗外）
  c.fillStyle = '#05060a'; c.beginPath(); c.ellipse(1000, 420, 78, 92, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.moveTo(800, 780); c.bezierCurveTo(800, 560, 880, 520, 1000, 515); c.bezierCurveTo(1120, 520, 1200, 560, 1200, 780); c.closePath(); c.fill();
  c.strokeStyle = 'rgba(150,185,235,.55)'; c.lineWidth = 3.5; c.beginPath(); c.ellipse(1000, 420, 78, 92, 0, -Math.PI * .45, Math.PI * .2); c.stroke();
  c.beginPath(); c.moveTo(1195, 760); c.bezierCurveTo(1195, 580, 1120, 524, 1010, 516); c.stroke();
}
def('s01_hbo', {
  post: P.hbo,
  draw(S) {
    const c = S.ctx, t = S.t, L3 = S.L('L003');
    cam(c, t, S.dur, { push: .06, drift: .8, x: 980, y: 560 }); office(c, t); c.restore();
    // 前景虚化（门框/椅背），增加纵深
    depthLayer(c, (g) => { g.fillStyle = '#020304'; g.fillRect(-40, -20, 260, H + 40); g.fillRect(W - 140, 640, 300, 500); }, 14, .95);
    chapterCard(S, '第 一 章', '深夜', { sub: 'HBO 质感示例', color: C.amber });
    if (t > L3.s) text(c, '23:47', 1680, 230, { size: 34, family: 'JB', weight: 700, color: 'rgba(255,120,90,.8)', alpha: smooth(p(t, L3.s, L3.s + .6)) });
  },
});
transition('s01_hbo', { type: 'black', d: 1.0 });

// ---------- 3. 好莱坞大片质感：日出地平线 + 标题。青橙对比、光条、遮幅、慢推、标题出场
def('s02_hollywood', {
  post: (S) => mixP(P.hollywood, P.trailer, smooth(p(S.t, S.L('L004').s + 1, S.L('L004').s + 2.4))),
  draw(S) {
    const c = S.ctx, t = S.t, L4 = S.L('L004');
    cam(c, t, S.dur, { push: .12, drift: .4, x: W / 2, y: H / 2 + 40 });
    // 青色天空 → 橙色地平线（大片配色的核心：冷暗部 + 暖高光）
    const g = c.createLinearGradient(0, -100, 0, H); g.addColorStop(0, '#04121c'); g.addColorStop(.55, '#0c2a3a'); g.addColorStop(.78, '#c8642a'); g.addColorStop(.86, '#ffcf8a'); g.addColorStop(1, '#1a0d06');
    c.fillStyle = g; c.fillRect(-200, -200, W + 400, H + 400);
    const rise = eInOut(p(t, 0, S.dur)); const sy = 860 - rise * 120;
    glowDot(c, W / 2, sy, 520, '#ffb066', .55); glowDot(c, W / 2, sy, 140, '#fff4dc', 1);
    // 群山剪影（多层大气透视）
    for (let L = 0; L < 4; L++) {
      const r = rng(20 + L); c.fillStyle = ['#16303f', '#0e2230', '#08141d', '#03080c'][L]; c.beginPath(); c.moveTo(-200, H + 200);
      for (let x = -200; x <= W + 200; x += 60) c.lineTo(x, 760 + L * 50 - (Math.sin(x * .004 + L) * 60 + r() * 40) * (1 - L * .15));
      c.lineTo(W + 200, H + 200); c.closePath(); c.fill();
    }
    c.restore();
    // 标题：慢速字距收紧 + 淡入（大片标题的常规手法）
    const k = smooth(p(t, L4.s + .8, L4.s + 3.0));
    text(c, 'THE  MONITOR', W / 2, H / 2 - 40, { size: 120, family: 'Cinzel', weight: 700, color: '#fff3e0', align: 'center', ls: 60 - 40 * k, alpha: k });
    text(c, '一 部 代 码 生 成 的 电 影', W / 2, H / 2 + 40, { size: 32, family: 'SHSerif', weight: 500, color: 'rgba(255,240,220,.8)', align: 'center', ls: 12, alpha: smooth(p(t, L4.s + 2, L4.s + 3.4)) });
  },
});
transition('s02_hollywood', { type: 'black', d: 1.2 });
