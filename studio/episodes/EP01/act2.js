// EP01 第二章 十倍与两倍：给 ×17 写身份证 → 弹幕投票 → 答案 C：×2 → 三个都是真的 → 离开身份证的倍数
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2,
  rgba, text, measure, typeText, scrambleText, rrect, line, circle, glowDot, radial, once, brackets, panel, tag } from '/engine.js';
import { cue, srcTag, schemTag, dust, shock, chap, idCard, idRowY, glowText, seal, pk, PKMAX } from './lib.js';

function hudGrid(c, t, a = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha = a; c.strokeStyle = rgba(C.dose, .045); c.lineWidth = 1;
  for (let x = 0; x < W; x += 60) { c.beginPath(); c.moveTo(x + .5, 0); c.lineTo(x + .5, H); c.stroke(); }
  for (let y = 0; y < H; y += 60) { c.beginPath(); c.moveTo(0, y + .5); c.lineTo(W, y + .5); c.stroke(); }
  const sy = (t * 160) % (H + 200) - 100; const g = c.createLinearGradient(0, sy - 80, 0, sy); g.addColorStop(0, rgba(C.dose, 0)); g.addColorStop(1, rgba(C.dose, .06));
  c.fillStyle = g; c.fillRect(0, sy - 80, W, 80); c.restore();
}
// 照片区：两条小曲线（空腹 / 餐后）
function photoCurves(scale, label) {
  return (c, x, y, w, h) => {
    c.fillStyle = 'rgba(232,163,61,.05)'; c.fillRect(x, y, w, h);
    const X0 = x + 20, X1 = x + w - 16, Y0 = y + h - 34, U = (h - 90) / 17;
    line(c, X0, Y0, X1, Y0, 'rgba(255,255,255,.25)', 1.5);
    for (const [s, col] of [[1, '#ffffff'], [scale, C.dose]]) {
      c.strokeStyle = col; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i <= 120; i++) { const xx = i / 120 * 24; const px = X0 + (X1 - X0) * xx / 24, py = Y0 - U * s * pk(xx) / PKMAX; i ? c.lineTo(px, py) : c.moveTo(px, py); }
      c.stroke();
    }
    text(c, label, x + w / 2, y + 40, { size: 40, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center' });
  };
}
function photoWeek(c, x, y, w, h) {
  c.fillStyle = 'rgba(232,163,61,.05)'; c.fillRect(x, y, w, h);
  for (let d = 0; d < 7; d++) { const cx = x + 30 + (d % 4) * ((w - 60) / 3.4), cy = y + 80 + Math.floor(d / 4) * 90; rrect(c, cx - 26, cy - 26, 52, 52, 8); c.fillStyle = rgba(C.dose, .28); c.fill(); text(c, String(d + 1), cx, cy + 9, { size: 24, family: 'JB', weight: 700, color: C.doseL, align: 'center' }); }
  text(c, '× 7 天', x + w / 2, y + h - 30, { size: 34, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center' });
}

// ------------------------------------------------------------------ s06 给 ×17 写身份证
def('s06_idcard', {
  clear: '#060608',
  post: { bloom: .5, thr: .8, ca: .0016, vig: .55, grain: .04, tint: [1.04, 1.0, .95], con: 1.05 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L29 = S.L('D029'), L30 = S.L('D030'), L31 = S.L('D031');
    hudGrid(c, t, smooth(p(t, 2.6, 3.6)));
    dust(c, t, 90, '#ffd9a0', .16, 61);
    // ×17 落进照片区
    const k = eInOut(p(t, cue(S, 'D029', '身份证') - .2, cue(S, 'D029', '身份证') + .9));
    const nA = smooth(p(t, L29.s - .3, L29.s + .4)) * (1 - smooth(p(t, cue(S, 'D029', '身份证') + .7, cue(S, 'D029', '身份证') + 1.0)));
    if (nA > 0) glowText(c, '×17', lerp(W / 2, 640, k), lerp(470, 520, k), { size: lerp(260, 60, k), alpha: nA, color: C.doseL });
    const build = p(t, cue(S, 'D029', '身份证') - .1, cue(S, 'D029', '身份证') + .8);
    const fields = [
      ['产品', 'ZYTIGA', cue(S, 'D030', 'ZYTIGA')],
      ['给药', '单次', cue(S, 'D030', '单次')],
      ['人群', '健康志愿者', cue(S, 'D030', '健康志愿者')],
      ['餐型', '高脂餐 825 kcal · 57% 脂肪', cue(S, 'D030', '825')],
      ['结果', 'Cmax ×17 · AUC ×10', cue(S, 'D031', '峰浓度'), 1],
    ];
    const cA = smooth(p(t, cue(S, 'D029', '身份证') - .1, cue(S, 'D029', '身份证') + .4));
    if (cA > 0) {
      const scan = p(t, cue(S, 'D029', '身份证'), cue(S, 'D029', '身份证') + 1.2);
      idCard(c, W / 2, 540, 1180, 580, fields, t, { a: cA, build, no: 'No. 01 · 单次给药研究', photo: photoCurves(17, '×17'), vs: 40 });
      if (scan > 0 && scan < 1) { c.save(); c.globalCompositeOperation = 'lighter'; const y = lerp(250, 830, scan); const g = c.createLinearGradient(0, y - 30, 0, y + 30); g.addColorStop(0, rgba(C.dose, 0)); g.addColorStop(.5, rgba(C.dose, .35)); g.addColorStop(1, rgba(C.dose, 0)); c.fillStyle = g; c.fillRect(370, y - 30, 1180, 60); c.restore(); }
      text(c, '先给“×17”写一张身份证', W / 2, 175, { size: 46, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', ls: 4, alpha: env(t, L29.s, L31.e + 1, .4, .4) });
      srcTag(c, 'ZYTIGA 标签 §12.3', smooth(p(t, L30.s, L30.s + .6)));
    }
    chap(S, '第 二 章', '十倍与两倍');
  },
});
transition('s07_vote', { type: 'cross', d: .6 });

// ------------------------------------------------------------------ s07 弹幕投票
const OPTS = [['A', '还是约 10 倍'], ['B', '更大'], ['C', '小得多']];
function voteBoard(c, t, S, k, cd, pick = -1, pickK = 0) {
  OPTS.forEach(([a, b], i) => {
    const q = eOutBack(p(t, k + i * .18, k + .5 + i * .18)); if (q <= 0) return;
    const x = 420 + i * 540, y = 830;
    const isPick = i === pick, dim = pick >= 0 && !isPick ? pickK : 0;
    c.save(); c.globalAlpha = Math.min(1, q) * (1 - .75 * dim); c.translate(x, y + (1 - Math.min(1, q)) * 40 + dim * 30);
    const sc = 1 + (isPick ? .12 * eOutBack(pickK) : 0); c.scale(sc, sc);
    if (isPick && pickK > 0) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 330, C.dose, .45 * pickK); c.restore(); }
    panel(c, -230, -64, 460, 128, { fill: isPick && pickK > 0 ? 'rgba(60,36,10,.92)' : 'rgba(18,16,14,.86)', stroke: isPick && pickK > 0 ? C.doseL : rgba(C.dose, .45), lw: isPick && pickK > 0 ? 3 : 2, r: 18 });
    circle(c, -165, 0, 34, { fill: isPick && pickK > 0 ? C.dose : 'rgba(232,163,61,.18)' });
    text(c, a, -165, 13, { size: 38, family: 'JB', weight: 800, color: isPick && pickK > 0 ? '#1b1206' : C.doseL, align: 'center' });
    text(c, b, -105, 14, { size: 40, family: 'SHSerif', weight: 900, color: '#fff' });
    c.restore();
  });
}
def('s07_vote', {
  clear: '#060608',
  post: { bloom: .5, thr: .8, ca: .0016, vig: .5, grain: .04, tint: [1.04, 1.0, .95] },
  draw(S) {
    const c = S.ctx, t = S.t; const L = S.L('D032');
    hudGrid(c, t, 1);
    dust(c, t, 90, '#ffd9a0', .16, 63);
    // 左：已知；右：未知
    const a1 = smooth(p(t, 0, .6)), a2 = smooth(p(t, cue(S, 'D032', '真正的患者') - .2, cue(S, 'D032', '真正的患者') + .5));
    c.save(); c.globalAlpha = a1;
    panel(c, 190, 250, 620, 340, { fill: 'rgba(16,14,12,.85)', stroke: rgba('#ffffff', .18), r: 20 });
    text(c, '已知', 230, 300, { size: 24, family: 'SHSans', weight: 700, color: rgba('#ffffff', .55), ls: 6 });
    text(c, '健康志愿者 · 单次', 230, 380, { size: 40, family: 'SHSerif', weight: 900, color: '#fff' });
    text(c, '高脂餐', 230, 440, { size: 32, family: 'SHSans', weight: 500, color: rgba('#ffffff', .75) });
    text(c, 'AUC ×10', 230, 540, { size: 70, family: 'JB', weight: 800, color: C.doseL });
    c.restore();
    c.save(); c.globalAlpha = a2;
    panel(c, 1110, 250, 620, 340, { fill: 'rgba(30,18,8,.88)', stroke: rgba(C.dose, .7), lw: 2.5, r: 20 });
    text(c, '换成', 1150, 300, { size: 24, family: 'SHSans', weight: 700, color: C.dose, ls: 6 });
    text(c, '前列腺癌患者', 1150, 380, { size: 40, family: 'SHSerif', weight: 900, color: '#fff' });
    text(c, '每天 · 连续 7 天 · 高脂餐', 1150, 440, { size: 32, family: 'SHSans', weight: 500, color: rgba('#ffffff', .8), alpha: smooth(p(t, cue(S, 'D032', '每天') - .1, cue(S, 'D032', '每天') + .4)) });
    const qa = .7 + .3 * Math.sin(t * 5);
    text(c, 'AUC ×?', 1150, 540, { size: 70, family: 'JB', weight: 800, color: C.doseL, alpha: smooth(p(t, cue(S, 'D032', '影响') - .2, cue(S, 'D032', '影响') + .3)) * qa });
    c.restore();
    // 选项 + 倒计时（倒计时环出现前，箭头先收掉，避免与环重叠）
    const k = L.e + .1, T0 = L.e + .6, T1 = S.dur - .4;
    // 箭头
    const ar = eOut(p(t, cue(S, 'D032', '真正的患者'), cue(S, 'D032', '真正的患者') + .8));
    const arA = 1 - smooth(p(t, T0 - .55, T0 - .15));
    if (ar > 0 && arA > 0) { c.save(); c.globalAlpha = arA; c.globalCompositeOperation = 'lighter'; line(c, 830, 420, lerp(830, 1090, ar), 420, rgba(C.dose, .8), 3); c.beginPath(); c.moveTo(lerp(830, 1090, ar) + 4, 420); c.lineTo(lerp(830, 1090, ar) - 18, 408); c.lineTo(lerp(830, 1090, ar) - 18, 432); c.closePath(); c.fillStyle = C.dose; c.fill(); c.restore(); }
    text(c, '弹 幕 投 票', W / 2, 160, { size: 34, family: 'SHSerif', weight: 900, color: C.dose, align: 'center', ls: 10, alpha: smooth(p(t, .2, .8)) });
    voteBoard(c, t, S, k, 0);
    const cd = p(t, T0, T1);
    if (t > T0 - .2) {
      const n = Math.max(0, Math.ceil(8 * (1 - cd)));
      const a = smooth(p(t, T0 - .2, T0 + .3));
      c.save(); c.globalAlpha = a;
      c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, 420, 80, 0, TAU); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.strokeStyle = C.dose; c.lineWidth = 8; c.beginPath(); c.arc(W / 2, 420, 80, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - cd)); c.stroke(); c.globalCompositeOperation = 'source-over';
      const pulse = 1 + .08 * Math.max(0, 1 - ((t - T0) % (8 * 0 + (T1 - T0) / 8)) * 4);
      text(c, String(n), W / 2, 448, { size: 80 * pulse, family: 'JB', weight: 800, color: '#fff', align: 'center' });
      text(c, '在弹幕里投出你的选项', W / 2, 560, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center' });
      c.restore();
    }
  },
});
transition('s08_answer', { type: 'white', d: .4 });

// ------------------------------------------------------------------ s08 答案：两张身份证
const CW = 880, CH = 520, CY = 480, CX1 = 470, CX2 = 1450;
def('s08_answer', {
  clear: '#060608',
  post: (S) => {
    const L37 = S.L('D037'); const g = env(S.t, L37.s + .6, S.dur + 1, .4, .1);
    return { bloom: .55, thr: .78, ca: .0016 + .006 * g, vig: .55, grain: .04, tint: [1.04, 1.0, .95], con: 1.05, sat: lerp(1, .6, g) };
  },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L33 = S.L('D033'), L34 = S.L('D034'), L35 = S.L('D035'), L36 = S.L('D036'), L37 = S.L('D037');
    hudGrid(c, t, .8);
    dust(c, t, 90, '#ffd9a0', .16, 67);
    // 答案 C
    const pickK = smooth(p(t, L33.s, L33.s + .4));
    const vA = 1 - smooth(p(t, L33.e + .2, L33.e + .8));
    if (vA > 0) { c.save(); c.globalAlpha = vA; voteBoard(c, 99, S, -9, 0, 2, pickK); c.restore(); if (pickK > 0) shock(c, 1500, 830, p(t, L33.s, L33.s + 1), C.dose, 600, vA); }
    // 两张身份证
    const f1 = [['产品', 'ZYTIGA', -9], ['给药', '单次', -9], ['人群', '健康志愿者', -9], ['餐型', '高脂餐 825 kcal', -9], ['结果', 'Cmax ×17 · AUC ×10', -9, 1]];
    const f2 = [['产品', 'ZYTIGA', L34.s + .2], ['给药', '每天 · 连续 7 天', cue(S, 'D034', '连续七天'), 1], ['人群', '前列腺癌患者', cue(S, 'D034', '患者'), 1], ['餐型', '高脂餐', cue(S, 'D034', '高脂餐')], ['结果', 'AUC ×2', cue(S, 'D034', '2倍'), 1]];
    const a1 = smooth(p(t, L33.e, L33.e + .6)), a2 = smooth(p(t, L34.s, L34.s + .6));
    const det = eInOut(p(t, L37.s + .1, L37.s + 1.4));            // ×17 脱离身份证
    const scr = smooth(p(t, L37.s + 1.0, L37.s + 1.8));
    const fade = 1 - .6 * scr;
    const slide = eOutExpo(p(t, L34.s, L34.s + .9));
    idCard(c, CX1, CY, CW, CH, f1, t, { a: a1 * fade, no: 'No. 01 · 健康志愿者', photo: photoCurves(17, '×17'), vs: 34, scramble: .35 * scr });
    if (a2 > 0) { c.save(); c.translate(lerp(500, 0, slide), 0); idCard(c, CX2, CY, CW, CH, f2, t, { a: a2 * fade, no: 'No. 02 · 患者 · 7 天', photo: photoWeek, vs: 34, glowRows: t > cue(S, 'D034', '2倍') + .5 ? [1, 2, 4] : [], scramble: .35 * scr }); c.restore(); }
    srcTag(c, 'ZYTIGA 标签 §12.3', a2 * (1 - scr));
    // 三枚“真”
    const xv = (cx) => cx - CW / 2 + 40 + CW * .3 + 50 + 120;
    const sealAt = [[xv(CX1) + 92, idRowY(CY, CH, 5, 4) - 4, cue(S, 'D035', '十七倍')], [xv(CX1) + 305, idRowY(CY, CH, 5, 4) - 4, cue(S, 'D035', '十倍')], [xv(CX2) + 125, idRowY(CY, CH, 5, 4) - 4, cue(S, 'D035', '两倍')]];
    // 印章盖在数字正下方（结果行与卡片下沿之间），不压上一行“餐型”的字
    for (const [x, y, t0] of sealAt) seal(c, x + 40, y + 52, t - t0, { r: 24, a: 1 - smooth(p(t, L36.s, L36.s + .6)) });
    // 三条连线：谁在吃、吃几次、量的是什么
    const links = [[2, '谁在吃', cue(S, 'D036', '谁在吃')], [1, '吃几次', cue(S, 'D036', '吃几次')], [4, '量的是什么', cue(S, 'D036', '量的是什么')]];
    for (const [row, lab, t0] of links) {
      const q = eOut(p(t, t0 - .1, t0 + .6)); if (q <= 0) continue;
      const y = idRowY(CY, CH, 5, row) + 4, xa = CX1 + CW / 2 - 10, xb = CX2 - CW / 2 + 10;
      const la = (1 - scr);
      c.save(); c.globalAlpha = la; c.globalCompositeOperation = 'lighter';
      line(c, xa, y, lerp(xa, xb, q), y, rgba(C.dose, .95), 3); glowDot(c, lerp(xa, xb, q), y, 30, C.dose, .9 * (q < 1 ? 1 : .4)); c.restore();
      c.save(); c.globalAlpha = la * q; panel(c, (xa + xb) / 2 - 90, y - 54, 180, 44, { fill: 'rgba(30,18,6,.95)', stroke: C.dose, r: 10 }); text(c, lab, (xa + xb) / 2, y - 22, { size: 26, family: 'SHSans', weight: 700, color: C.doseL, align: 'center' }); c.restore();
    }
    // 离开身份证的倍数：飘到中央，失真、变红、碎裂
    if (det > 0) {
      const x0 = xv(CX1) + 92, y0 = idRowY(CY, CH, 5, 4);
      const x = lerp(x0, W / 2, det), y = lerp(y0, 560, det), sz = lerp(34, 230, det);
      const red = smooth(p(t, L37.s + 1.2, L37.s + 2.2));
      const jit = red * 8; const jx = (hash1(Math.floor(t * 30)) - .5) * jit, jy = (hash1(Math.floor(t * 30) + 7) - .5) * jit;
      c.save(); c.fillStyle = `rgba(0,0,0,${.55 * det})`; c.fillRect(0, 0, W, H); c.restore();
      for (let k = 0; k < (red > 0 ? 6 : 1); k++) {
        const ys = y - sz * .85 + k * sz * .16, off = red > 0 ? (hash2(k, Math.floor(t * 20)) - .5) * 70 * red : 0;
        c.save(); if (red > 0) { c.beginPath(); c.rect(0, ys, W, sz * .16 + 1); c.clip(); }
        glowText(c, '×17', x + off + jx, y + jy, { size: sz, color: red > .5 ? '#ff7a6a' : C.doseL, glow: red > .5 ? C.risk : C.dose, alpha: 1 });
        c.restore();
      }
      text(c, '误 用', W / 2, 700, { size: 40, family: 'SHSerif', weight: 900, color: '#ff6a5a', align: 'center', ls: 20, alpha: red * (hash1(Math.floor(t * 12)) > .2 ? 1 : .4) });
      text(c, '没有产品、人群、给药方式、指标的倍数', W / 2, 750, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center', alpha: red });
      S.post.glitch = Math.max(S.post.glitch, .3 * red * (hash1(Math.floor(t * 10)) > .55 ? 1 : .15));
    }
  },
});
transition('s09_mill', { type: 'black', d: 1.0 });
