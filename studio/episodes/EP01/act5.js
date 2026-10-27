// EP01 终章 三句真话 → 剂量地图 → 下集预告 → 片尾
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2,
  rgba, text, measure, rrect, line, circle, glowDot, radial, once, brackets, panel, tag } from '/engine.js';
import { cue, srcTag, dust, flare, shock, chap, MOL, molProj, drawMol, paperCard, stamp, arc, CARD, glowText, seal, capsule, cylinder } from './lib.js';

// ------------------------------------------------------------------ s15 终章：三句真话
const Q = [
  { k: 'A', head: 'ZYTIGA®  处方信息', sub: '§2  用法用量', seed: 3, ans: ['ZYTIGA 的说明书', '它自己的研究'], q: 'ZYTIGA 该怎么吃？', lid: 'D058', kw: 'ZYTIGA' },
  { k: 'B', head: 'YONSA®  处方信息', sub: '§2  用法用量', seed: 5, ans: ['YONSA 的说明书', '另一套研究'], q: 'YONSA 该怎么吃？', lid: 'D059', kw: 'YONSA' },
  { k: 'Cc', head: 'JOURNAL OF CLINICAL ONCOLOGY · 2018', sub: '随机 II 期 · 低剂量随餐 vs 标准剂量空腹', seed: 7, kind: 'journal', ans: ['一项研究', '72 人 · 12 周 · 1 个指标'], q: '一项研究看到了什么？', lid: 'D060', kw: '一项研究' },
];
function cardContent(c, i, x, y) {
  if (i === 0) stamp(c, x + 10, y + 40, ['空腹服用'], 1, { rot: -.1, size: 62 });
  else if (i === 1) stamp(c, x, y + 40, ['随餐均可', '随 餐 或 不 随 餐'], 1, { rot: .08, size: 54, round: true });
  else {
    text(c, '¼', x - 120, y + 100, { size: 230, family: 'SHSerif', weight: 900, color: '#7a1f1a', align: 'center' });
    text(c, '250 mg', x + 40, y + 20, { size: 50, family: 'JB', weight: 700, color: '#2a1f16' });
    text(c, '+ 低脂早餐', x + 40, y + 70, { size: 32, family: 'SHSans', weight: 700, color: '#7a1f1a' });
  }
}
const RINGS = [['产品', -.35, .2, C.dose], ['人群', .5, -.6, '#f3e6cc'], ['吃法', 1.2, .9, C.doseL]];
const FIN = { A: [345, 560, 500, 340], B: [1575, 560, 500, 340], Cc: [960, 575, 500, 360] };   // [x, y, w, h]

def('s15_finale', {
  clear: '#030406',
  post: (S) => ({ bloom: .7, thr: .72, ca: .002, vig: .55, grain: .04, tint: [1.06, 1.0, .92], con: 1.07 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L57 = S.L('D057'), L58 = S.L('D058'), L59 = S.L('D059'), L60 = S.L('D060'), L61 = S.L('D061'), L62 = S.L('D062');
    dust(c, t, 130, '#ffd9a0', .2, 107);
    const solve = cue(S, 'D061', '并不矛盾'), tq = cue(S, 'D061', '三个不同的问题');
    const sl = smooth(p(t, solve - .1, solve + .6));
    const dim = env(t, solve, tq - .1, .25, .45);                  // “并不矛盾”一拍：卡片压暗，只留三枚“真”和金线
    const fold = eInOut(p(t, L62.s - .3, L62.s + 1.3));           // 卡片退场，分子居中
    // 分子
    const mx = W / 2, my = lerp(185, 520, fold), ms = lerp(30, 70, fold);
    drawMol(c, mx, my, ms, t, { alpha: smooth(p(t, 2.2, 3.4)), glow: 1 + .8 * sl });
    // 三张卡排成一行：上方留给问题，下方留给答案标签，字幕区不压
    const pos = Q.map((q) => FIN[q.k]);
    Q.forEach((q, i) => {
      const k = eOutExpo(p(t, L57.s - .2 + i * .25, L57.s + .6 + i * .25)); if (k <= 0) return;
      const [x0, y0, w, h] = pos[i];
      const from = [[-420, y0], [W + 420, y0], [x0, -320]][i];
      const x = lerp(from[0], x0, k), y = lerp(from[1], y0, k) + fold * 60;
      const hl = env(t, cue(S, q.lid, q.kw) - .2, L62.s, .3, .6);
      c.save(); c.globalAlpha = (1 - fold) * (1 - .72 * dim); c.translate(x, y); c.scale(1 + .04 * hl, 1 + .04 * hl); c.translate(-x, -y);
      paperCard(c, x, y, w, h, { head: q.head, sub: q.sub, kind: q.kind || 'label', seed: q.seed, glowA: hl * .8 + sl * .5, rot: [-.04, .04, -.015][i], t });
      cardContent(c, i, x, y);
      c.restore();
      // 答案标签
      const ak = eOutExpo(p(t, cue(S, q.lid, q.kw) - .1, cue(S, q.lid, q.kw) + .6));
      if (ak > 0) {
        const ty = y0 + h / 2 + 62;
        c.save(); c.globalAlpha = Math.min(1, ak * 2) * (1 - fold) * (1 - .72 * dim);
        panel(c, x0 - 220, ty - 46, 440 * ak, 100, { fill: 'rgba(28,16,6,.92)', stroke: C.dose, r: 12 });
        text(c, q.ans[0], x0 - 196, ty - 4, { size: 32, family: 'SHSerif', weight: 900, color: C.doseL, alpha: smooth(p(ak, .5, 1)) });
        text(c, q.ans[1], x0 - 196, ty + 34, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .8), alpha: smooth(p(ak, .6, 1)) });
        c.restore();
      }
      // 三个不同的问题
      const qk = smooth(p(t, cue(S, 'D061', '三个不同的问题') - .1 + i * .25, cue(S, 'D061', '三个不同的问题') + .4 + i * .25));
      text(c, q.q, x0, y0 - h / 2 - 34, { size: 32, family: 'SHSerif', weight: 900, color: '#fff6e2', align: 'center', alpha: qk * (1 - fold), shadow: rgba(C.dose, .7), shadowBlur: 20 });
    });
    // 矛盾电弧 → 金线
    const arcA = smooth(p(t, L57.s + .8, L57.s + 1.4)) * (1 - sl) * (1 - fold);
    const A = pos[0], B = pos[1], Cc = pos[2];
    if (arcA > 0) {
      arc(c, A[0] + 200, A[1] - 120, B[0] - 200, B[1] - 120, t, arcA * .8, 11);
      arc(c, A[0] + 200, A[1] - 60, Cc[0] - 150, Cc[1] - 150, t, arcA * .8, 23);
      arc(c, B[0] - 200, B[1] - 60, Cc[0] + 150, Cc[1] - 150, t, arcA * .8, 37);
      S.post.glitch = Math.max(S.post.glitch, .12 * arcA * (hash1(Math.floor(t * 12)) > .7 ? 1 : 0));
    }
    if (sl > 0 && fold < 1) {
      c.save(); c.globalAlpha = 1 - fold; c.globalCompositeOperation = 'lighter';
      const tops = [[A[0], A[1] - 130], [Cc[0], Cc[1] - 160], [B[0], B[1] - 130]];
      for (let k = 0; k < 3; k++) { const q = eOut(p(t, solve + k * .1, solve + .7 + k * .1)); line(c, mx, my + 10, lerp(mx, tops[k][0], q), lerp(my + 10, tops[k][1], q), rgba(C.dose, .8), 2.5); }
      const r = rng(181); for (let i = 0; i < 220; i++) { const d = eOut(p(t, solve, solve + 1.8)); const x = lerp(A[0] + 200, B[0] - 200, r()), y = A[1] - 120 + (r() - .5) * 120; c.fillStyle = `rgba(255,214,140,${.8 * (1 - d)})`; c.fillRect(x + (r() - .5) * 200 * d, y - d * (60 + r() * 200), 2.4, 2.4); }
      c.restore();
      tops.forEach(([x, y], k) => seal(c, x, y, t - solve - k * .12, { r: 36, a: 1 - fold }));
      shock(c, mx, my, p(t, solve, solve + 1.4), C.dose, 1100, 1 - fold);
      S.post.flash = Math.max(S.post.flash, .22 * Math.max(0, 1 - p(t, solve, solve + .2)) * (t > solve ? 1 : 0));
    }
    if (dim > 0) {
      c.save(); c.globalAlpha = dim; c.fillStyle = radial(c, W / 2, 630, 620, [[0, 'rgba(0,0,0,.72)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 300, W, 680); c.restore();
      const sk = eOutExpo(p(t, solve, solve + .5));
      glowText(c, '并 不 矛 盾', W / 2, 660, { size: lerp(150, 110, sk), alpha: dim, color: '#fff6e2', ls: 18, blur: 48 });
    }
    // 三道光环：产品、人群、吃法
    if (fold > 0) {
      RINGS.forEach(([lab, tilt, ph, col], i) => {
        const kw = ['产品', '人', '吃法'][i];
        const lk = smooth(p(t, cue(S, 'D062', kw) - .25, cue(S, 'D062', kw) + .35));
        const R = 330 + i * 70, ry = R * (.28 + .1 * i), a = fold * (.35 + .65 * lk);
        c.save(); c.translate(mx, my); c.rotate(tilt); c.globalAlpha = a; c.globalCompositeOperation = 'lighter';
        c.strokeStyle = rgba(col, .25 + .6 * lk); c.lineWidth = 2 + 3 * lk; c.beginPath(); c.ellipse(0, 0, R, ry, 0, 0, TAU); c.stroke();
        const th = t * (.5 + .15 * i) + ph; const ox = Math.cos(th) * R, oy = Math.sin(th) * ry;
        glowDot(c, ox, oy, 60 + 50 * lk, col, .8 * lk + .2);
        c.restore();
        const sx = mx + Math.cos(tilt) * ox - Math.sin(tilt) * oy, sy = my + Math.sin(tilt) * ox + Math.cos(tilt) * oy;
        text(c, lab, sx, sy - 26, { size: 44, family: 'SHSerif', weight: 900, color: lk > .5 ? '#fff6e2' : col, align: 'center', alpha: a, shadow: rgba(C.dose, .8), shadowBlur: 24 });
      });
      const tg = smooth(p(t, L62.e + .2, L62.e + 1.4));
      text(c, '每一个剂量，都是一次决定', W / 2, 930, { size: 40, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 10, alpha: tg });
    }
    chap(S, '终 章', '三句真话');
  },
});
transition('s16_map', { type: 'cross', d: 1.0 });

// ------------------------------------------------------------------ s16 剂量地图
const MAP = ['剂量', '暴露', '效应', '风险', '决策'];
const MY = [520, 470, 540, 490, 530];
def('s16_map', {
  clear: '#030406',
  post: { bloom: .75, thr: .7, ca: .0018, vig: .55, grain: .04, tint: [1.04, 1.0, .95] },
  draw(S) {
    const c = S.ctx, t = S.t; const L63 = S.L('D063');
    const r = rng(191); for (let i = 0; i < 300; i++) { const x = r() * W, y = r() * H, k = r(); c.fillStyle = `rgba(255,240,220,${(.1 + .4 * k) * (.5 + .5 * Math.sin(t * 1.5 + k * 40))})`; c.fillRect(x, y, 1.5, 1.5); }
    c.fillStyle = radial(c, W * .35, 500, 900, [[0, 'rgba(90,50,20,.30)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
    const xs = MAP.map((_, i) => W * (.14 + .18 * i));
    for (let i = 0; i < 4; i++) {
      const k = eOut(p(t, .3 + i * .2, .9 + i * .2)), hi = i === 0;
      const x0 = xs[i] + 70, y0 = MY[i], x1 = xs[i + 1] - 70, y1 = MY[i + 1];
      c.save(); if (!hi) c.setLineDash([10, 12]); c.globalCompositeOperation = hi ? 'lighter' : 'source-over';
      line(c, x0, y0, lerp(x0, x1, k), lerp(y0, y1, k), hi ? rgba(C.doseL, .95) : 'rgba(255,255,255,.25)', hi ? 4 : 2); c.restore();
    }
    MAP.forEach((m, i) => {
      const k = eOutBack(p(t, .2 + i * .2, .8 + i * .2)), hi = i <= 1; if (k <= 0) return;
      c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, xs[i], MY[i], hi ? 150 : 60, hi ? C.dose : '#ffffff', (hi ? .55 : .12) * Math.min(1, k)); flare(c, xs[i], MY[i], hi ? 260 : 90, (hi ? .5 : .15) * Math.min(1, k)); c.restore();
      circle(c, xs[i], MY[i], 10 * Math.min(1, k), { fill: hi ? '#fff6e2' : 'rgba(255,255,255,.5)' });
      text(c, m, xs[i], MY[i] + 80, { size: 52, family: 'SHSerif', weight: 900, color: hi ? C.doseL : 'rgba(255,255,255,.4)', align: 'center', alpha: Math.min(1, k) });
    });
    const fA = smooth(p(t, 1.4, 2.0));
    const fx = (xs[0] + xs[1]) / 2, fy = (MY[0] + MY[1]) / 2 - 90;
    c.save(); c.globalAlpha = fA; c.globalCompositeOperation = 'lighter'; glowDot(c, fx, fy, 90, C.dose, .6); c.restore();
    circle(c, fx, fy, 22, { fill: '#ffb23d', alpha: fA });
    text(c, '食物', fx, fy - 40, { size: 32, family: 'SHSans', weight: 800, color: C.doseL, align: 'center', alpha: fA });
    text(c, 'EP01', fx, fy + 150, { size: 22, family: 'JB', weight: 700, color: rgba(C.dose, .8), align: 'center', ls: 6, alpha: fA });
    glowText(c, '剂量没变，暴露变了', W / 2, 820, { size: 64, alpha: smooth(p(t, L63.s - .1, L63.s + .5)), color: '#fff6e2' });
    text(c, '这一集的变量：一顿饭', W / 2, 890, { size: 36, family: 'SHSerif', weight: 600, color: rgba('#ffffff', .75), align: 'center', ls: 6, alpha: smooth(p(t, cue(S, 'D063', '这一集') - .1, cue(S, 'D063', '这一集') + .5)) });
    text(c, '剂 量 地 图', W / 2, 170, { size: 30, family: 'SHSerif', weight: 900, color: rgba(C.dose, .9), align: 'center', ls: 14, alpha: smooth(p(t, .2, .8)) });
  },
});
transition('s17_next', { type: 'glitch', d: .5 });

// ------------------------------------------------------------------ s17 下集预告
const NEU = '#E2B437';   // NEURONTIN 300 mg：黄色硬胶囊
def('s17_next', {
  clear: '#050506',
  post: (S) => ({ bloom: .6, thr: .76, ca: .002, vig: .55, grain: .045, tint: [1.02, 1.0, .96] }),
  draw(S) {
    const c = S.ctx, t = S.t; const L64 = S.L('D064'), L65 = S.L('D065');
    dust(c, t, 80, '#ffe9a0', .14, 113);
    const t5 = cue(S, 'D064', '五倍多'), t2 = cue(S, 'D064', '两倍多'), tq = cue(S, 'D064', '剩下的药');
    const out = smooth(p(t, L65.s - .1, L65.s + .4));
    c.save(); c.globalAlpha = 1 - out * .85;
    for (let i = 0; i < 3; i++) { const k = eOutBack(p(t, .2 + i * .12, .6 + i * .12)); capsule(c, 200 + i * 70, 330 - (1 - Math.min(1, k)) * 40, 44, 104, NEU, Math.min(1, k)); }
    text(c, '900 mg/日', 270, 430, { size: 30, family: 'SHSans', weight: 700, color: '#fff', align: 'center', alpha: smooth(p(t, .6, 1.1)) });
    for (let i = 0; i < 16; i++) { const k = eOutBack(p(t, t5 - 1.4 + i * .06, t5 - 1.0 + i * .06)); capsule(c, 150 + i * 50, 600 - (1 - Math.min(1, k)) * 40, 38, 90, NEU, Math.min(1, k)); }
    text(c, '4800 mg/日', 525, 700, { size: 30, family: 'SHSans', weight: 700, color: '#fff', align: 'center', alpha: smooth(p(t, t5 - .5, t5)) });
    glowText(c, '剂量 ×5.3', 525, 800, { size: 64, alpha: smooth(p(t, t5, t5 + .5)), color: C.doseL });
    const base = 830, hh = 520, l0 = .15, lv = eInOut(p(t, t2 - 1.2, t2 + .4));
    cylinder(c, 1180, base, 150, hh, l0, C.dose, smooth(p(t, .4, 1)));
    cylinder(c, 1450, base, 150, hh, l0 * lerp(1, 2.4, lv), C.dose, smooth(p(t, .6, 1.2)));
    const da = smooth(p(t, t5, t5 + .6));
    c.save(); c.globalAlpha = da; c.setLineDash([12, 10]); line(c, 1430, base - hh * l0 * 5.33, 1620, base - hh * l0 * 5.33, 'rgba(255,255,255,.6)', 2); c.setLineDash([]); c.restore();
    text(c, '按剂量应到这里', 1630, base - hh * l0 * 5.33 + 9, { size: 24, family: 'SHSans', weight: 500, color: '#fff', alpha: da });
    glowText(c, '吸收 ×2.4', 1525, base - hh * l0 * 2.4 - 34, { size: 52, alpha: smooth(p(t, t2, t2 + .5)), color: C.doseL });
    text(c, '按说明书给出的生物利用度估算', 1380, base + 50, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .6), align: 'center', alpha: smooth(p(t, t2, t2 + .5)) });
    srcTag(c, 'NEURONTIN 标签', smooth(p(t, t2, t2 + .5)));
    glowText(c, '剩下的药去哪了？', W / 2, 200, { size: 64, alpha: smooth(p(t, tq - .1, tq + .5)), color: '#fff6e2' });
    c.restore();
    if (out > 0) {
      const k = eOutExpo(p(t, L65.s, L65.s + .8));
      text(c, 'EP 02', W / 2, 420, { size: 34, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: 24, alpha: out });
      glowText(c, '加 倍', W / 2, 580, { size: lerp(200, 150, k), alpha: out, color: '#fff6e2' });
      text(c, 'D O U B L E', W / 2, 650, { size: 26, family: 'Cinzel', weight: 700, color: rgba('#ffffff', .6), align: 'center', ls: 12, alpha: out });
      S.post.glitch = Math.max(S.post.glitch, .5 * Math.max(0, 1 - p(t, L65.s, L65.s + .5)));
    }
  },
});
transition('s18_end', { type: 'black', d: 1.0 });

// ------------------------------------------------------------------ s18 片尾
function sanlian(c, x, y, k, gap = 240) {
  ['点赞', '投币', '收藏'].forEach((lab, i) => {
    const q = eOutBack(p(k, i * .18, i * .18 + .5)); if (q <= 0) return;
    const cx = x + (i - 1) * gap, a = Math.min(1, q);
    c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, cx, y, 120, C.dose, .25 * a); c.restore();
    c.save(); c.translate(cx, y); c.scale(q, q); c.strokeStyle = C.doseL; c.fillStyle = C.doseL; c.lineWidth = 5; c.lineJoin = 'round';
    if (i === 0) { rrect(c, -30, -14, 58, 52, 10); c.stroke(); c.fillRect(-48, -12, 12, 48); c.beginPath(); c.moveTo(-18, -14); c.lineTo(-4, -46); c.lineTo(8, -40); c.lineTo(4, -14); c.stroke(); }
    else if (i === 1) { c.beginPath(); c.arc(0, 0, 40, 0, TAU); c.stroke(); text(c, '币', 0, 15, { size: 40, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center' }); }
    else { c.beginPath(); for (let k2 = 0; k2 < 10; k2++) { const rr = k2 % 2 ? 18 : 44, ang = -Math.PI / 2 + k2 * Math.PI / 5; c.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } c.closePath(); c.stroke(); }
    c.restore();
    text(c, lab, cx, y + 92, { size: 30, family: 'SHSans', weight: 700, color: '#fff', align: 'center', alpha: a });
  });
}
def('s18_end', {
  clear: '#030304',
  post: (S) => ({ bloom: .7, thr: .7, ca: .0018, vig: .55, grain: .04, tint: [1.05, 1.0, .93], mark: false }),
  draw(S) {
    const c = S.ctx, t = S.t; const L66 = S.L('D066'), L67 = S.L('D067');
    dust(c, t, 160, '#ffd9a0', .26, 127);
    const k = eOutExpo(p(t, .2, 1.6)), a = smooth(p(t, .2, .8)), cy = 330;
    c.save(); c.globalAlpha = a; c.font = '900 170px SHSerif'; c.textAlign = 'center'; c.letterSpacing = lerp(120, 50, k) + 'px';
    const g = c.createLinearGradient(0, cy - 140, 0, cy + 20); g.addColorStop(0, '#fff3d6'); g.addColorStop(.45, '#e8a33d'); g.addColorStop(.55, '#8a5a1e'); g.addColorStop(1, '#f2c97a');
    c.shadowColor = rgba(C.dose, .6); c.shadowBlur = 50; c.fillStyle = g; c.fillText('剂量', W / 2 + lerp(60, 25, k), cy); c.restore();
    text(c, 'D O S E', W / 2, cy + 80, { size: 38, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: 20, alpha: smooth(p(t, .8, 1.6)) });
    text(c, '每一个剂量，都是一次决定', W / 2, cy + 150, { size: 38, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 8, alpha: smooth(p(t, 1.2, 2.0)) });
    const ts = cue(S, 'D067', '一键三连') - .3;
    sanlian(c, W / 2, 700, p(t, ts, ts + 1.6));
    text(c, '◇ 支线进行中', W / 2, 862, { size: 30, family: 'SHSans', weight: 700, color: rgba('#ffffff', .75), align: 'center', ls: 8, alpha: smooth(p(t, cue(S, 'D067', '支线进行中') - .2, cue(S, 'D067', '支线进行中') + .5)) });
    text(c, '本视频为药物研发科普，不构成任何用药建议 · 来源见简介', W / 2, 912, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .45), align: 'center', alpha: smooth(p(t, L66.s, L66.s + 1)) });
    S.post.fade = smooth(p(t, S.dur - 1.2, S.dur));
  },
});
