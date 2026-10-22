// B站封面
import { W, H, C, text, rgba, radial, line, panel, glowDot } from '../engine.js';
import { drawEye, dust, drawGlobe } from './act0.js';
export function drawCover(S, v = 0) {
  const c = S.ctx, t = 3.0;
  c.fillStyle = radial(c, 1350, 520, 1200, [[0, '#0b1d33'], [1, '#02050a']]); c.fillRect(0, 0, W, H);
  dust(c, t, 260, '#9fe6ff', .4, 7);
  drawGlobe(c, 1390, 540, 470, t, { alpha: .45, count: 12000, spin: .9, arcs: 1.2 });
  drawEye(c, 1390, 540, 250, t, { open: 1, pupil: .27 });
  // 左侧标题
  { const g = c.createLinearGradient(0, 0, 1100, 0); g.addColorStop(0, 'rgba(2,5,10,.7)'); g.addColorStop(.75, 'rgba(2,5,10,.45)'); g.addColorStop(1, 'rgba(2,5,10,0)'); c.fillStyle = g; c.fillRect(0, 0, 1100, H); }
  text(c, v ? '2047 年的 AI 回望监查员的 300 年' : '来自 2047 年的监查智能体', 90, 170, { size: 46, family: 'SHSans', weight: 700, color: C.cyan, ls: 2 });
  text(c, '监查者', 80, 450, { size: 250, family: 'SHSerif', weight: 900, color: '#ffffff', ls: 10, stroke: 'rgba(0,0,0,.6)', strokeW: 10 });
  text(c, 'AI 将如何改写', 92, 600, { size: 96, family: 'SHSerif', weight: 900, color: C.gold, stroke: 'rgba(0,0,0,.6)', strokeW: 8 });
  text(c, '临床试验监查？', 92, 716, { size: 96, family: 'SHSerif', weight: 900, color: C.gold, stroke: 'rgba(0,0,0,.6)', strokeW: 8 });
  // 1.1% 角标
  panel(c, 92, 790, 610, 120, { fill: 'rgba(255,45,85,.14)', stroke: '#ff2d55', lw: 4, r: 10 });
  text(c, 'SDV 只改了 1.1%？', 120, 872, { size: 58, family: 'SHSans', weight: 900, color: '#ff4d6d' });
  text(c, '◇ 支线进行中', 94, 1010, { size: 34, family: 'SHSans', weight: 700, color: rgba('#ffffff', .85), ls: 4 });
}
