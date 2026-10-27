// 示例：两个场景，演示章节卡、HUD 标签、打字机、眼睛、数字计数、故障冲击、预设与转场
import { W, H, C, def, transition, p, smooth, eOut, eOutExpo, env, text, typeText, tag, panel, fmt, chapterCard, radial } from '../engine.js';
import { drawEye, dust, drawGlobe } from './lib.js';
import { P } from '../presets.js';

def('s00_open', {
  post: P.cyber,
  draw(S) {
    const c = S.ctx, t = S.t, L1 = S.L('L001'), L2 = S.L('L002');
    dust(c, t, 160, '#9fdfff', .35, 3);
    drawEye(c, W / 2, H / 2, 240, t, { open: eOutExpo(p(t, .3, 1.6)) });
    tag(c, W / 2 + 200, H / 2 - 120, W / 2 + 420, H / 2 - 260, ['叙述者 · NARRATOR', 'ONLINE'], { prog: p(t, L1.s + .5, L1.s + 1.6), alpha: env(t, L1.s, L2.s, .3, .4), size: 30, w: 330 });
    // 关键数字：计数 + 故障冲击
    const k = p(t, L2.s + .5, L2.s + 2.0);
    if (k > 0) {
      text(c, fmt(12000 * eOut(k)), W / 2, H - 230, { size: 120, family: 'JB', weight: 800, color: '#fff', align: 'center' });
      S.post.glitch = Math.max(0, 1 - p(t, L2.s + .5, L2.s + .9)) * .8;
    }
  },
});
transition('s01_chapter', { type: 'glitch', d: .6 });

def('s01_chapter', {
  post: P.paper,
  clear: '#140d06',
  draw(S) {
    const c = S.ctx, t = S.t, L3 = S.L('L003');
    c.fillStyle = radial(c, W / 2, H / 2, 1100, [[0, '#3a2a18'], [1, '#120c06']]); c.fillRect(0, 0, W, H);
    typeText(c, '这是一行打字机效果的文字。', W / 2, H / 2, p(t, L3.s, L3.e), { size: 64, family: 'SHSerif', weight: 700, color: '#f2e6cc', align: 'center', cursor: true, t });
    chapterCard(S, '第 一 章', '章节标题', { sub: '副标题 · 年份', color: C.amber });
  },
});
transition('s01_chapter', { type: 'black', d: .8 });
