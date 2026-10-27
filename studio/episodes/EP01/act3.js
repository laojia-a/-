// EP01 第三章 磨碎的分子：晶体碎裂 → 微粉压成 YONSA → 食物效应小但不为零 → 不能互换 → 第一个矛盾解开
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, rgba, text, measure, rrect, line, circle, glowDot, radial, once, brackets, panel, tag } from '/engine.js';
import { cue, srcTag, schemTag, dust, flare, shock, chap, crystal, tablet, paperCard, stamp, arc, glowText, pillar, seal, MOL, drawMol } from './lib.js';

const ZYT = '#6E4A93', YON = '#E9E5DC';
// 白色药片：YONSA 125 mg（白色至类白色椭圆片，刻 125 FP）
function whiteTablet(c, x, y, w, h, imp = '125 FP', a = 1, rot = 0) {
  if (a <= 0) return;
  c.save(); c.translate(x, y); c.rotate(rot); c.globalAlpha *= a;
  c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(7, 12, w / 2, h / 2, 0, 0, TAU); c.fill();
  c.fillStyle = radial(c, -w * .18, -h * .3, w * .62, [[0, '#ffffff'], [.55, '#d9d4c8'], [1, '#8f897c']]); c.beginPath(); c.ellipse(0, 0, w / 2, h / 2, 0, 0, TAU); c.fill();
  text(c, imp, 1, h * .17 + 2, { size: h * .36, family: 'SHSans', weight: 900, color: 'rgba(255,255,255,.35)', align: 'center' });
  text(c, imp, 0, h * .17, { size: h * .36, family: 'SHSans', weight: 900, color: 'rgba(90,84,72,.75)', align: 'center' });
  c.restore();
}
export { whiteTablet };

// ------------------------------------------------------------------ s09 磨碎的分子
const FRAG = once('frag', () => {   // 四级碎裂：1 → 4 → 16 → 64 → 256
  const r = rng(101), lv = [[{ x: 0, y: 0, s: 150, rot: 0 }]];
  for (let L = 1; L <= 4; L++) { const prev = lv[L - 1], cur = []; for (const q of prev) for (let k = 0; k < 4; k++) { const ang = k / 4 * TAU + r() * .8, d = q.s * (.45 + r() * .3); cur.push({ x: q.x + Math.cos(ang) * d, y: q.y + Math.sin(ang) * d * .8, s: q.s * (.48 + r() * .1), rot: q.rot + (r() - .5) * 2 }); } lv.push(cur); }
  return lv;
});
const DUSTP = once('dustp', () => { const r = rng(103), a = []; for (let i = 0; i < 900; i++) a.push({ x: (r() - .5) * 900, y: (r() - .5) * 560, k: r(), tb: Math.floor(r() * 4) }); return a; });

def('s09_mill', {
  clear: '#050608',
  post: { bloom: .6, thr: .76, ca: .002, vig: .55, grain: .04, tint: [.98, 1.0, 1.04], con: 1.06 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L38 = S.L('D038'), L39 = S.L('D039'), L40 = S.L('D040');
    dust(c, t, 120, '#cfe6ff', .16, 71);
    c.fillStyle = radial(c, W / 2, H / 2, 900, [[0, 'rgba(30,50,70,.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
    const cx = W / 2, cy = 500;
    const tf = cue(S, 'D038', '磨得更细');
    const lvF = clamp((t - tf + .2) / .55, 0, 4);                     // 碎裂级数（连续）
    const comp = eInOut(p(t, cue(S, 'D039', '做成了') - .3, cue(S, 'D039', 'YONSA')));   // 压片
    const out = smooth(p(t, L40.s - .3, L40.s + .3));
    // 晶体与碎片
    const cA = smooth(p(t, 2.6, 3.8)) * (1 - comp);
    if (cA > 0) {
      const L = Math.floor(lvF), f = lvF - L;
      const pieces = FRAG[Math.min(4, L + (f > 0 ? 1 : 0))];
      const parent = FRAG[L];
      const spread = 1 + .25 * lvF;
      pieces.forEach((q, i) => {
        const par = parent[Math.floor(i / (L < 4 && f > 0 ? 4 : 1))] || q;
        const e = L < 4 && f > 0 ? eOutBack(f) : 1;
        const x = lerp(par.x, q.x, e) * spread + Math.sin(t * .6 + i) * 3 * lvF, y = lerp(par.y, q.y, e) * spread + Math.cos(t * .5 + i) * 3 * lvF;
        const s = L < 4 && f > 0 ? lerp(par.s, q.s, e) : q.s;
        crystal(c, cx + x, cy + y, s, q.rot + t * .15 * (i % 2 ? 1 : -1), cA, { seed: i + L * 300, glow: Math.min(1, lvF / 3) });
      });
      // 每次碎裂一道闪光
      for (let k = 1; k <= 4; k++) { const tk = tf - .2 + (k - .2) * .55; if (t > tk && t < tk + .5) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, cy, 300 + k * 80, '#e6f4ff', .3 * (1 - p(t, tk, tk + .5))); c.restore(); } }
      const sa = env(t, tf + .6, L39.s + 1.0, .4, .5);
      text(c, '颗粒越细 · 总表面积越大 · 溶得越快', cx, 900, { size: 30, family: 'SHSans', weight: 700, color: '#cfe8ff', align: 'center', ls: 2, alpha: sa });
      schemTag(c, '示意 · 微粉化', sa);
    }
    // 微粉旋流 → 四片 YONSA
    const tx = [cx - 270, cx - 90, cx + 90, cx + 270];
    if (comp > 0 && comp < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const d of DUSTP) {
        const tgt = tx[d.tb], ang = Math.atan2(d.y, d.x) + comp * 6 * (1 - comp), r0 = Math.hypot(d.x, d.y);
        const x = lerp(cx + Math.cos(ang) * r0, tgt + (d.k - .5) * 60 * (1 - comp), comp), y = lerp(cy + Math.sin(ang) * r0 * .8, cy + (d.k - .5) * 30 * (1 - comp), comp);
        c.fillStyle = `rgba(230,244,255,${.7 * (1 - comp * .6)})`; c.fillRect(x, y, 2.2, 2.2);
      }
      c.restore();
    }
    const tA = smooth(p(t, cue(S, 'D039', 'YONSA') - .15, cue(S, 'D039', 'YONSA') + .25)) * (1 - out * .55);
    if (tA > 0) {
      const sh = cue(S, 'D039', 'YONSA') - .1;
      shock(c, cx, cy, p(t, sh, sh + 1.1), '#e6f4ff', 700);
      tx.forEach((x, i) => whiteTablet(c, x, cy + Math.sin(t * 1.2 + i) * 3, 150, 74, '125 FP', tA, (i - 1.5) * .04));
      text(c, 'YONSA®  125 mg × 4  =  每日 500 mg', cx, cy + 140, { size: 40, family: 'SHSans', weight: 700, color: '#f3f6fa', align: 'center', alpha: smooth(p(t, cue(S, 'D039', '500') - .2, cue(S, 'D039', '500') + .4)) * (1 - out) });
      text(c, '对照：ZYTIGA® 每日 1000 mg', cx, cy + 190, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .6), align: 'center', alpha: smooth(p(t, cue(S, 'D039', '500') + .3, cue(S, 'D039', '500') + .9)) * (1 - out) });
      srcTag(c, 'YONSA 标签 §2、§11', tA * (1 - out));
    }
    // 回到冷开场的第二张卡
    const kB = eOutExpo(p(t, L40.s - .1, L40.s + .7));
    if (kB > 0) {
      const x = lerp(W + 400, W / 2 + 330, kB), y = 560;
      paperCard(c, x, y, 560, 380, { alpha: Math.min(1, kB * 3), rot: lerp(.3, .03, kB), head: 'YONSA®  处方信息', sub: '§2  用法用量', seed: 5, t });
      const sB = p(t, cue(S, 'D040', '都可以') - .1, cue(S, 'D040', '都可以') + .25);
      stamp(c, x, y + 40, ['随餐均可', '随 餐 或 不 随 餐'], sB, { rot: .08, size: 56, round: true });
      text(c, 'YONSA 标签 §2', x, y + 230, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: smooth(p(t, L40.s + .8, L40.s + 1.4)) });
      c.save(); c.globalAlpha = out; tx.forEach((xx, i) => whiteTablet(c, lerp(xx, 560 + (i % 2) * 170, kB), lerp(cy, 470 + Math.floor(i / 2) * 120, kB), 150, 74, '125 FP', 1, 0)); c.restore();
    }
    chap(S, '第 三 章', '磨碎的分子');
  },
});
transition('s10_bars', { type: 'cross', d: .7 });

// ------------------------------------------------------------------ s10 两组光柱
def('s10_bars', {
  clear: '#050608',
  post: { bloom: .65, thr: .74, ca: .0018, vig: .55, grain: .04, tint: [1.04, 1.0, .95], con: 1.06 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L41 = S.L('D041'), L42 = S.L('D042'), L43 = S.L('D043');
    dust(c, t, 110, '#ffd9a0', .16, 73);
    const base = 790, U = 31;          // 底部给字幕留出空间（字幕顶约 y=970）
    // 地面反光
    c.save(); const g = c.createLinearGradient(0, base, 0, H); g.addColorStop(0, 'rgba(232,163,61,.10)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, base, W, H - base); c.restore();
    line(c, 140, base, W - 140, base, rgba(C.dose, .5), 2);
    text(c, '高脂餐让暴露变成空腹的几倍', W / 2, 120, { size: 46, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', ls: 4, alpha: smooth(p(t, 0, .7)) });
    text(c, '各自与各自的空腹相比', W / 2, 170, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .6), align: 'center', alpha: smooth(p(t, .3, 1)) });
    const groups = [
      { x: 600, name: 'ZYTIGA', tab: (a) => tablet(c, 520, base + 105, 110, 54, ZYT, 'AA', t), items: [['峰浓度 Cmax', 17, -1], ['总暴露 AUC', 10, -.6]] },
      { x: 1320, name: 'YONSA', tab: (a) => whiteTablet(c, 1240, base + 105, 110, 54, '125 FP', a), items: [['峰浓度 Cmax', 6.5, cue(S, 'D042', '6.5')], ['总暴露 AUC', 4.4, cue(S, 'D042', '4.4')]] },
    ];
    groups.forEach((gr, gi) => {
      gr.items.forEach(([lab, v, t0], i) => {
        const k = eOutExpo(p(t, t0, t0 + 1.2)); const x = gr.x - 110 + i * 220, h = v * U * k;
        pillar(c, x, base, 120, h, C.dose, t, gi === 0 ? .85 : 1, gi * 10 + i);
        if (k > .02) text(c, '×' + (v % 1 ? (v * k).toFixed(1) : Math.round(v * k)), x, base - h - 26, { size: 52, family: 'JB', weight: 800, color: '#fff6e2', align: 'center', shadow: rgba(C.dose, .8), shadowBlur: 24 });
        text(c, lab, x, base + 44, { size: 24, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center', alpha: smooth(p(t, t0, t0 + .5)) });
        if (k > 0 && k < 1) shock(c, x, base - h, p(t, t0, t0 + .8), C.dose, 180);
      });
      const na = gi === 0 ? 1 : smooth(p(t, cue(S, 'D042', '6.5') - .3, cue(S, 'D042', '6.5') + .3));
      gr.tab(na);
      text(c, gr.name, gr.x + 10, base + 118, { size: 40, family: 'SHSans', weight: 800, color: '#fff', alpha: na });
    });
    // 空腹 = 1
    const da = smooth(p(t, L41.s, L41.s + .6));
    c.save(); c.globalAlpha = da; c.setLineDash([12, 10]); line(c, 140, base - U, W - 140, base - U, 'rgba(255,255,255,.55)', 2); c.setLineDash([]); c.restore();
    text(c, '空腹 = 1', 130, base - U + 8, { size: 24, family: 'SHSans', weight: 500, color: '#fff', align: 'right', alpha: da });
    const zA = env(t, L41.s, L42.s + .6, .4, .5);
    glowText(c, '食物效应 ≠ 0', 1320, 470, { size: 64, alpha: zA, color: '#fff6e2' });
    // 依据框
    const bA = smooth(p(t, cue(S, 'D043', '允许随餐') - .2, cue(S, 'D043', '允许随餐') + .5));
    if (bA > 0) {
      brackets(c, 1080, 360, 480, 580, { color: C.doseL, alpha: bA, len: 40, lw: 3 });
      text(c, '随餐与否 · 依据它自己的整套研究', 1320, 330, { size: 28, family: 'SHSans', weight: 700, color: C.doseL, align: 'center', alpha: bA });
    }
    const sm = env(t, L43.s - .1, cue(S, 'D043', '允许随餐'), .3, .3);
    text(c, '小得多', 1320, 470, { size: 54, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: sm });
    srcTag(c, 'ZYTIGA / YONSA 标签 §12.3', 1);
  },
});
transition('s11_twins', { type: 'cross', d: .7 });

// ------------------------------------------------------------------ s11 不能互换 → 第一个矛盾解开
def('s11_twins', {
  clear: '#040506',
  post: (S) => ({ bloom: .65, thr: .74, ca: .002, vig: .55, grain: .04, tint: [1.04, 1.0, .95], con: 1.06 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L44 = S.L('D044'), L45 = S.L('D045');
    dust(c, t, 110, '#ffd9a0', .16, 79);
    const solve = cue(S, 'D045', '解开了');
    const up = eInOut(p(t, L45.s - .2, L45.s + 1.0));            // 第二句：上移，让出结论
    const y = lerp(470, 330, up), xl = lerp(560, 520, up), xr = lerp(1360, 1400, up);
    // 能量屏障
    const wa = smooth(p(t, .2, 1)) * (1 - smooth(p(t, solve, solve + .8)));
    if (wa > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = wa;
      const g = c.createLinearGradient(W / 2 - 50, 0, W / 2 + 50, 0); g.addColorStop(0, rgba(C.risk, 0)); g.addColorStop(.5, rgba('#ff6a5a', .35)); g.addColorStop(1, rgba(C.risk, 0));
      c.fillStyle = g; c.fillRect(W / 2 - 50, y - 260, 100, 520);
      for (let k = 0; k < 18; k++) { const yy = y - 250 + ((k * 31 + t * 120) % 500); line(c, W / 2 - 6, yy, W / 2 + 6, yy + 18, rgba('#ffd2c8', .5), 1.5); }
      line(c, W / 2, y - 260, W / 2, y + 260, 'rgba(255,220,210,.9)', 2.5);
      c.restore();
    }
    tablet(c, xl, y, 300, 146, ZYT, 'AA', t);
    whiteTablet(c, xr, y, 220, 108, '125 FP', 1);
    text(c, 'ZYTIGA® 500 mg', xl, y + 130, { size: 28, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center' });
    text(c, 'YONSA® 125 mg', xr, y + 120, { size: 28, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center' });
    // 互换的尝试：两道弧线撞上屏障
    for (const [dir, t0] of [[1, cue(S, 'D044', '不能') - .4], [-1, cue(S, 'D044', '互换') - .2]]) {
      const k = p(t, t0, t0 + .7); if (k <= 0 || k >= 1.6) continue;
      const kk = Math.min(1, k), x0 = dir > 0 ? xl + 120 : xr - 120;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.doseL, .9 * (1 - smooth(p(t, t0 + .7, t0 + 1.2)))); c.lineWidth = 4; c.beginPath();
      for (let i = 0; i <= 30; i++) { const u = i / 30 * kk; const x = lerp(x0, W / 2 - dir * 10, u), yy = y - 150 * Math.sin(u * Math.PI * .5); i ? c.lineTo(x, yy) : c.moveTo(x, yy); } c.stroke(); c.restore();
      if (k >= 1) { shock(c, W / 2, y - 150, p(t, t0 + .7, t0 + 1.4), '#ff6a5a', 240); const r = rng(Math.floor(t0 * 10)); c.save(); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 30; i++) { const a = r() * TAU, d = p(t, t0 + .7, t0 + 1.3) * (60 + r() * 120); c.fillStyle = `rgba(255,180,160,${1 - p(t, t0 + .7, t0 + 1.3)})`; c.fillRect(W / 2 + Math.cos(a) * d, y - 150 + Math.sin(a) * d, 3, 3); } c.restore(); }
    }
    const nA = smooth(p(t, cue(S, 'D044', '不能') - .1, cue(S, 'D044', '不能') + .4)) * (1 - up);
    glowText(c, '≠', W / 2, y + 30, { size: 160, alpha: nA, color: '#ffd2c8', glow: C.risk });
    text(c, '不能与其他阿比特龙产品互换', W / 2, 860, { size: 40, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', ls: 4, alpha: nA });
    srcTag(c, 'YONSA 标签 §2', smooth(p(t, L44.s + .5, L44.s + 1.1)) * (1 - up));
    // 第一个矛盾：两张冷开场的卡之间的红色电弧 → 解开，化成金色
    const kA = smooth(p(t, L45.s - .1, L45.s + .5));
    if (kA > 0) {
      const sl = smooth(p(t, solve - .1, solve + .5));
      const ax = 640, bx = 1280, ay = 640;
      c.save(); c.globalAlpha = kA * (1 - .25 * sl);
      text(c, '矛 盾 ①', W / 2, ay - 40, { size: 30, family: 'SHSerif', weight: 900, color: sl > .5 ? C.doseL : '#ff6a5a', align: 'center', ls: 10 });
      c.restore();
      if (sl < 1) arc(c, ax + 120, ay, bx - 120, ay, t, kA * (1 - sl), 51);
      if (sl > 0) {
        c.save(); c.globalCompositeOperation = 'lighter'; const r = rng(53);
        for (let i = 0; i < 160; i++) { const u = r(), x = lerp(ax + 120, bx - 120, u), yy = ay + Math.sin(u * 9) * 14; const d = eOut(p(t, solve, solve + 1.6)); c.fillStyle = `rgba(255,214,140,${.9 * (1 - d)})`; c.fillRect(x + (r() - .5) * 80 * d, yy - d * (40 + r() * 120), 2.4, 2.4); }
        line(c, ax + 120, ay, bx - 120, ay, rgba(C.dose, .8 * sl), 2); c.restore();
        seal(c, W / 2, ay, t - solve, { r: 34, ch: '解' });
      }
      // 结论出现前，两张卡下沉淡出，把位置让给结论
      const cf = smooth(p(t, cue(S, 'D045', '不属于') - .6, cue(S, 'D045', '不属于') + .1));
      if (cf < 1) {
        paperCard(c, ax, ay + 150 + cf * 50, 300, 200, { alpha: kA * (1 - cf), rot: -.04, head: 'ZYTIGA®', sub: '空腹服用', seed: 3, t });
        paperCard(c, bx, ay + 150 + cf * 50, 300, 200, { alpha: kA * (1 - cf), rot: .04, head: 'YONSA®', sub: '随餐均可', seed: 5, t });
      }
      const cA = smooth(p(t, cue(S, 'D045', '食物效应') - .1, cue(S, 'D045', '食物效应') + .5));
      text(c, '食物效应', W / 2, 205, { size: 40, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', ls: 8, alpha: cA * (t > solve ? 1 : 0) });
      const c2 = smooth(p(t, cue(S, 'D045', '不属于'), cue(S, 'D045', '不属于') + .5)), c3 = smooth(p(t, cue(S, 'D045', '具体的产品') - .2, cue(S, 'D045', '具体的产品') + .4));
      text(c, '不属于一个分子', W / 2 - 330, 815, { size: 44, family: 'SHSerif', weight: 900, color: rgba('#ffffff', .75), align: 'center', alpha: c2 });
      glowText(c, '属于一个具体的产品', W / 2 + 290, 815, { size: 54, alpha: c3, color: C.doseL });
    }
  },
});
transition('s12_toilet', { type: 'black', d: 1.0 });
