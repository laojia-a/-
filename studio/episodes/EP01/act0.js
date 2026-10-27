// EP01 第0幕：冷开场「三句真话」→「一顿饭 ×17」→ 片名
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eInExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, noise2, fbm, rgba, text, measure, scrambleText, typeText, rrect, line, circle, glowDot, radial, once, brackets, panel, tag, proj, chapterCard } from '/engine.js';
import { LINES, cue, srcTag, schemTag, dust, flare, shock, MOL, molProj, drawMol, paperCard, stamp, arc, CARD, SHARDS, pk, PKMAX, sun, eInOutExpo2, darkBand, tablet, balance, plate } from './lib.js';

// ============================================================ s00 冷开场：三句真话
def('s00_paradox', {
  clear: '#030406',
  post: (S) => ({ bloom: .55, thr: .82, ca: .0022, vig: .55, grain: .045, tint: [1.05, 1.0, .93], con: 1.07, mark: true, markA: smooth(p(S.t, 4, 5.5)) }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L1 = S.L('D001'), L2 = S.L('D002'), L3 = S.L('D003'), L4 = S.L('D004'), L5 = S.L('D005'), L6 = S.L('D006');
    dust(c, t, 120, '#ffd9a0', .22, 5);
    // ---- 开场：一道竖直的光
    const beam = env(t, .2, L1.s + .5, .6, .35);
    if (beam > 0) {
      const hgt = H * eOutExpo(p(t, .2, 1.4));
      c.save(); c.globalCompositeOperation = 'lighter';
      const g = c.createLinearGradient(W / 2 - 60, 0, W / 2 + 60, 0); g.addColorStop(0, rgba(C.dose, 0)); g.addColorStop(.5, rgba(C.dose, .35 * beam)); g.addColorStop(1, rgba(C.dose, 0));
      c.fillStyle = g; c.fillRect(W / 2 - 60, H / 2 - hgt / 2, 120, hgt);
      c.fillStyle = `rgba(255,248,232,${.9 * beam})`; c.fillRect(W / 2 - 1.5, H / 2 - hgt / 2, 3, hgt);
      c.restore();
      glowDot(c, W / 2, H / 2, 220, '#fff2d8', .25 * beam);
    }
    // ---- 分子：光爆成粒子，聚成分子；随后上移让出三张卡
    const up = eInOut(p(t, L2.s - .5, L2.s + .9));
    const mx = W / 2, my = lerp(H / 2 - 70, 250, up), ms = lerp(70, 34, up);
    const yaw = Math.sin(t * .45) * .5 + .25;
    const burst = p(t, L1.s - .25, L1.s + 1.35);
    const red = smooth(p(t, L5.s + .2, L5.s + 1.0)) * (1 - smooth(p(t, L6.s + .9, L6.s + 1.3)));
    if (burst > 0 && burst < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < MOL.pts.length; i++) {
        const q = MOL.pts[i]; const d = q[3] * .35; const k = smoother(clamp((burst - d) / (1 - d)));
        const tg = molProj(q, mx, my, ms, yaw);
        const ang = q[4] * TAU, rad = (180 + q[5] * 700) * Math.sin(k * Math.PI) ;
        const sx = W / 2 + (q[4] - .5) * 6, sy = H / 2 + (q[5] - .5) * H;
        const x = lerp(sx, tg[0], k) + Math.cos(ang) * rad * (1 - k), y = lerp(sy, tg[1], k) + Math.sin(ang) * rad * .55 * (1 - k);
        c.fillStyle = q[3] > .8 ? `rgba(255,200,120,${.9 * (1 - k * .6)})` : `rgba(255,240,220,${.8 * (1 - k * .5)})`;
        const s = 1.4 + q[5] * 1.8; c.fillRect(x - s / 2, y - s / 2, s, s);
      }
      c.restore();
    }
    const molA = smooth(p(t, L1.s + .9, L1.s + 1.5));
    drawMol(c, mx, my, ms, t, { alpha: molA, yaw, glow: 1 + .6 * Math.max(0, 1 - p(t, L1.s + .9, L1.s + 2)), red, hot: red });
    const nameA = env(t, L1.s + 1.0, L2.s + .4, .5, .4);
    text(c, '醋 酸 阿 比 特 龙', W / 2, H / 2 + 270, { size: 34, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 6, alpha: nameA });
    text(c, 'ABIRATERONE  ACETATE', W / 2, H / 2 + 314, { size: 22, family: 'Cinzel', weight: 700, color: rgba(C.dose, .9), align: 'center', ls: 12, alpha: nameA });
    // ---- 三张卡
    const fly = (s0, dir) => eOutExpo(p(t, s0, s0 + .75));
    const kA = fly(L2.s - .05), kB = fly(L3.s - .05), kC = fly(L4.s - .05);
    const conflict = env(t, L5.s - .1, L6.s + .45, .25, .25);
    const truth = smooth(p(t, L6.s + .55, L6.s + 1.1));
    const outA = 1 - smooth(p(t, S.dur - .5, S.dur));
    const sh = conflict * (1 - truth);
    // 卡片拖影（运动模糊感）
    const ghost = (k, draw) => { if (k > 0 && k < .98) for (let g = 3; g >= 1; g--) { c.save(); c.globalAlpha = .12 * g / 3; draw(clamp(k - g * .06)); c.restore(); } draw(k); };
    ghost(kA, (k) => paperCard(c, lerp(-420, CARD.A[0], k), CARD.A[1], CARD.A[2], CARD.A[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(-.35, -.04, k), head: 'ZYTIGA®  处方信息', sub: '§2  用法用量', seed: 3, glowA: truth, shake: sh, t }));
    ghost(kB, (k) => paperCard(c, lerp(W + 420, CARD.B[0], k), CARD.B[1], CARD.B[2], CARD.B[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(.35, .04, k), head: 'YONSA®  处方信息', sub: '§2  用法用量', seed: 5, glowA: truth, shake: sh, t }));
    ghost(kC, (k) => paperCard(c, CARD.Cc[0], lerp(-320, CARD.Cc[1], k), CARD.Cc[2], CARD.Cc[3], { alpha: Math.min(1, k * 4) * outA, rot: lerp(.2, -.015, k), head: 'JOURNAL OF CLINICAL ONCOLOGY · 2018', sub: '随机 II 期 · 低剂量随餐 vs 标准剂量空腹', kind: 'journal', seed: 7, glowA: truth, shake: sh, t }));
    // 印章与要点
    const sA = p(t, cue(S, 'D002', '空腹'), cue(S, 'D002', '空腹') + .35);
    stamp(c, CARD.A[0] + 10, CARD.A[1] + 40, ['空腹服用'], sA * outA, { rot: -.1, size: 62 });
    const sB = p(t, cue(S, 'D003', '都可以') - .1, cue(S, 'D003', '都可以') + .25);
    stamp(c, CARD.B[0], CARD.B[1] + 40, ['随餐均可', '随 餐 或 不 随 餐'], sB * outA, { rot: .08, size: 54, round: true });
    const qk = p(t, cue(S, 'D004', '四分之一') - .2, cue(S, 'D004', '四分之一') + .5);
    if (qk > 0) {
      const a = Math.min(1, qk * 3) * outA, e = lerp(1.8, 1, eOutExpo(qk));
      c.save(); c.translate(CARD.Cc[0], CARD.Cc[1] + 30); c.rotate(-.015); c.scale(e, e);
      text(c, '¼', -120, 70, { size: 230, family: 'SHSerif', weight: 900, color: '#7a1f1a', align: 'center', alpha: a });
      text(c, '250 mg', 40, -10, { size: 50, family: 'JB', weight: 700, color: '#2a1f16', alpha: a });
      text(c, '+ 低脂早餐', 40, 40, { size: 32, family: 'SHSans', weight: 700, color: '#7a1f1a', alpha: a });
      text(c, 'vs 1000 mg 空腹', 40, 86, { size: 26, family: 'SHSans', weight: 500, color: 'rgba(42,31,22,.8)', alpha: a });
      c.restore();
    }
    // 来源
    const srcA = smooth(p(t, L2.s + 1.5, L2.s + 2.2)) * outA;
    text(c, 'ZYTIGA 标签 §2', CARD.A[0], CARD.A[1] + CARD.A[3] / 2 + 40, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: srcA });
    text(c, 'YONSA 标签 §2', CARD.B[0], CARD.B[1] + CARD.B[3] / 2 + 40, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: smooth(p(t, L3.s + 1.5, L3.s + 2.2)) * outA });
    text(c, 'Szmulewitz 等 · J Clin Oncol 2018', CARD.Cc[0], CARD.Cc[1] + CARD.Cc[3] / 2 + 34, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', alpha: smooth(p(t, L4.s + 1.5, L4.s + 2.2)) * outA });
    srcTag(c, '来源见各卡', smooth(p(t, L2.s + 1.5, L2.s + 2.2)) * outA);
    // ---- 矛盾：电弧 + 抖动 + 故障
    if (conflict > 0) {
      const pa = [CARD.A[0] + 200, CARD.A[1] - 120], pb = [CARD.B[0] - 200, CARD.B[1] - 120], pc = [CARD.Cc[0], CARD.Cc[1] - 190];
      arc(c, pa[0], pa[1], pb[0], pb[1], t, conflict * (1 - truth), 11);
      arc(c, pa[0], pa[1] + 60, pc[0] - 150, pc[1] + 40, t, conflict * (1 - truth), 23);
      arc(c, pb[0], pb[1] + 60, pc[0] + 150, pc[1] + 40, t, conflict * (1 - truth), 37);
      S.post.glitch = Math.max(S.post.glitch, .25 * conflict * (1 - truth) * (hash1(Math.floor(t * 12)) > .6 ? 1 : .2));
      S.post.ca = .0022 + .006 * conflict * (1 - truth);
      text(c, '矛 盾', W / 2, 470, { size: 40, family: 'SHSerif', weight: 900, color: rgba('#ff6a5a', .95), align: 'center', ls: 20, alpha: conflict * (1 - truth) * (hash1(Math.floor(t * 20)) > .25 ? 1 : .4) });
    }
    // ---- 全都是真的：三连击，金色连线成三角
    const hits = [cue(S, 'D006', '全'), cue(S, 'D006', '是'), cue(S, 'D006', '真')];
    [[CARD.A[0], CARD.A[1] - 130], [CARD.Cc[0], CARD.Cc[1] - 160], [CARD.B[0], CARD.B[1] - 130]].forEach(([x, y], i) => {
      const k = p(t, hits[i], hits[i] + .35);
      if (k <= 0) return;
      const a = Math.min(1, k * 3) * outA, e = lerp(1.6, 1, eOutExpo(k));
      c.save(); c.translate(x, y); c.scale(e, e);
      c.globalCompositeOperation = 'lighter'; glowDot(c, 0, 0, 120, C.dose, .5 * a); c.globalCompositeOperation = 'source-over';
      circle(c, 0, 0, 40, { fill: rgba('#120c05', .85 * a), stroke: rgba(C.doseL, a), lw: 4 });
      text(c, '真', 0, 15, { size: 44, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center', alpha: a });
      c.restore();
      shock(c, x, y, p(t, hits[i], hits[i] + .9), C.dose, 260, outA);
    });
    if (truth > 0) {
      const v = [[mx, my + 10], [CARD.A[0], CARD.A[1] - 130], [CARD.Cc[0], CARD.Cc[1] - 160], [CARD.B[0], CARD.B[1] - 130]];
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.dose, .75 * truth * outA); c.lineWidth = 2.5;
      for (const k of [1, 2, 3]) { const q = eOut(p(t, L6.s + .55 + k * .08, L6.s + 1.3 + k * .08)); c.beginPath(); c.moveTo(v[0][0], v[0][1]); c.lineTo(lerp(v[0][0], v[k][0], q), lerp(v[0][1], v[k][1], q)); c.stroke(); }
      c.restore();
      S.post.flash = Math.max(S.post.flash, .25 * Math.max(0, 1 - p(t, hits[2], hits[2] + .2)) * (t > hits[2] ? 1 : 0));
    }
    // 结尾：一切开始碎裂（交给下一场）
    S.post.exp = 1 + .25 * smooth(p(t, S.dur - .6, S.dur));
  },
});
transition('s01_meal', { type: 'white', d: .45 });

def('s01_meal', {
  clear: '#040306',
  post: (S) => ({ bloom: .6, thr: .8, ca: .002, vig: .5, grain: .045, tint: [1.06, 1.0, .9], con: 1.06 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L7 = S.L('D007'), L8 = S.L('D008'), L9 = S.L('D009'), L10 = S.L('D010'), L11 = S.L('D011'), L12 = S.L('D012');
    // ---- 碎片旋涡 → 太阳
    const swirl = p(t, 0, L7.s + 1.6);
    const sunA = smooth(p(t, L7.s + .6, L7.s + 1.8)) * (1 - smooth(p(t, L8.s + .2, L8.s + 1.0)));
    const horizonY = 800;
    if (swirl < 1) {
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < SHARDS.length; i++) {
        const [x0, y0, a0, b0, s0] = SHARDS[i]; const k = smoother(clamp((swirl - a0 * .4) / .6));
        const ang = Math.atan2(y0 - 560, x0 - W / 2) + k * (3 + b0 * 3), rr = Math.hypot(x0 - W / 2, y0 - 560) * (1 - k);
        const x = W / 2 + Math.cos(ang) * rr, y = lerp(560, horizonY - 40, k) + Math.sin(ang) * rr * .6;
        c.fillStyle = a0 > .7 ? `rgba(255,210,140,${.8 * (1 - k)})` : `rgba(240,228,205,${.55 * (1 - k)})`;
        c.save(); c.translate(x, y); c.rotate(b0 * TAU + t * 3 * (s0 - .5)); c.fillRect(-2 - s0 * 4, -1, 4 + s0 * 8, 2.4); c.restore();
      }
      c.restore();
    }
    // 地平线
    const hz = smooth(p(t, L7.s + .3, L7.s + 1.4));
    c.save(); c.globalCompositeOperation = 'lighter';
    const hg = c.createLinearGradient(0, 0, W, 0); hg.addColorStop(0, rgba(C.dose, 0)); hg.addColorStop(.5, rgba(C.dose, .8 * hz)); hg.addColorStop(1, rgba(C.dose, 0));
    c.fillStyle = hg; c.fillRect(0, horizonY - 1, W, 2.5); c.restore();
    const rise = eOut(p(t, L7.s + .5, L7.s + 2.6));
    sun(c, W / 2, lerp(horizonY + 120, horizonY - 170, rise), 92, t, sunA, smooth(p(t, cue(S, 'D007', '饭') - .2, cue(S, 'D007', '饭') + .8)));
    // 地平线下遮住
    c.fillStyle = 'rgba(4,3,6,.96)'; c.fillRect(0, horizonY + 1.5, W, H - horizonY); 
    // ---- 两条曲线从地平线升起
    const X0 = 240, X1 = 1680, Y0 = horizonY;
    const t17 = cue(S, 'D008', '17倍');
    const pull = eInOutExpo2(p(t, cue(S, 'D008', '峰值') + .3, t17 + .2));
    const unit = lerp(95, 33, pull);   // 1 倍对应的像素高：先放大（冲出画面），再拉远看全
    const pf = eOut(p(t, L8.s + .2, L8.s + 1.6)), pe = eInOut(p(t, cue(S, 'D008', '血液'), t17));
    const curve = (scale, prog, col, lw) => {
      const n = Math.floor(260 * prog); if (n < 2) return null; const pts = [];
      for (let i = 0; i <= n; i++) { const xx = i / 260 * 24; pts.push([X0 + (X1 - X0) * xx / 24, Y0 - unit * scale * pk(xx) / PKMAX]); }
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
      for (const [w, al] of [[lw * 7, .12], [lw * 2.4, .35], [lw, 1]]) { c.strokeStyle = al === 1 ? (col === 'w' ? 'rgba(255,248,236,1)' : 'rgba(255,214,140,1)') : rgba(col === 'w' ? '#ffffff' : C.dose, al); c.lineWidth = w; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.stroke(); }
      const [hx, hy] = pts[pts.length - 1]; if (prog < 1) glowDot(c, hx, hy, 70, col === 'w' ? '#ffffff' : C.dose, .9);
      c.restore(); return pts;
    };
    const cv = smooth(p(t, L8.s, L8.s + .6)) * (1 - smooth(p(t, L9.s - .4, L9.s + .1)));
    if (cv > 0) {
      c.save(); c.globalAlpha = cv;
      curve(1, pf, 'w', 3.5);
      const ep = curve(17, pe, 'a', 4.5);
      text(c, '空腹', X0 + 190, Y0 - unit * 1.05 - 16, { size: 28, family: 'SHSans', weight: 500, color: '#fff', alpha: pf * (1 - pull * .3) });
      // 冲顶：粒子尾迹
      if (ep && pe < 1) { const [hx, hy] = ep[ep.length - 1]; const r = rng(Math.floor(t * 30)); c.globalCompositeOperation = 'lighter'; for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,${190 + r() * 60 | 0},120,${r() * .8})`; c.fillRect(hx + (r() - .5) * 40, hy + r() * 120, 2, 2 + r() * 6); } c.globalCompositeOperation = 'source-over'; }
      // 倍数计数（拉远的同时滚动）
      const cnt = Math.round(lerp(1, 17, eOut(p(t, cue(S, 'D008', '峰值') + .3, t17))));
      const big = p(t, t17 - .05, t17 + .5);
      if (pe > .35) {
        const px = X0 + (X1 - X0) * 1.75 / 24 + 70, py = Y0 - unit * 17 + 30;
        const sz = big > 0 ? lerp(260, 150, eOutExpo(big)) : 120;
        const gl = big > 0 && big < .6 ? 1 - big / .6 : 0; S.post.glitch = Math.max(S.post.glitch, gl * .6); S.post.ca = .002 + .02 * gl;
        for (let k = 0; k < (gl > 0 ? 7 : 1); k++) {
          const y0s = py - sz * .9 + k * sz * .14; const off = gl > 0 ? (hash2(k, Math.floor(t * 24)) - .5) * 90 * gl : 0;
          c.save(); if (gl > 0) { c.beginPath(); c.rect(0, y0s, W, sz * .14 + 1); c.clip(); }
          text(c, '×' + cnt, px + off, py, { size: sz, family: 'SHSerif', weight: 900, color: big > 0 ? C.doseL : '#ffd7a0', alpha: 1, shadow: rgba(C.dose, .8), shadowBlur: 40 });
          c.restore();
        }
        text(c, '峰浓度 Cmax', px + 8, py + 54, { size: 30, family: 'SHSans', weight: 700, color: C.dose, alpha: smooth(p(t, t17, t17 + .5)) });
        text(c, '高脂餐 825 kcal（57% 脂肪） · 健康志愿者 · 单次服药', px + 8, py + 96, { size: 24, family: 'SHSans', weight: 500, color: rgba('#f3e6cc', .85), alpha: smooth(p(t, t17 + .3, t17 + .9)) });
        shock(c, px + 160, py - 60, p(t, t17, t17 + 1.2), C.dose, 1100);
        if (big > 0) S.post.flash = Math.max(S.post.flash, .28 * Math.max(0, 1 - p(t, t17, t17 + .16)));
      }
      text(c, '曲线形状为示意，倍数来自标签', X1, Y0 + 50, { size: 22, family: 'SHSans', color: rgba('#ffffff', .55), align: 'right', alpha: smooth(p(t, t17, t17 + .8)) });
      c.restore();
      srcTag(c, 'ZYTIGA 标签 §12.3', smooth(p(t, t17 - .2, t17 + .5)) * cv);
      schemTag(c, '示意 · 曲线形状非真实数据', smooth(p(t, L8.s + .5, L8.s + 1.2)) * cv);
    }
    // ---- 药没变 / 剂量没变 / 变的只是早餐
    const tri = env(t, L9.s - .3, L12.s + .5, .3, .5);
    if (tri > 0) {
      const xs = [W * .22, W * .5, W * .78], y = 520;
      const k1 = eOutBack(p(t, L9.s - .1, L9.s + .45)), k2 = eOutBack(p(t, L10.s - .1, L10.s + .45)), k3 = eOutExpo(p(t, cue(S, 'D011', '只是') - .15, cue(S, 'D011', '只是') + .4));
      c.save(); c.globalAlpha = tri;
      // 药片
      if (k1 > 0) { c.save(); c.translate(xs[0], y); c.scale(k1, k1); tablet(c, 0, 0, 230, 112, '#6E4A93', 'AA', t); c.restore(); text(c, '药', xs[0], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', alpha: k1 }); text(c, '=', xs[0], y - 120, { size: 70, family: 'JB', weight: 700, color: '#fff', align: 'center', alpha: k1 }); }
      // 剂量：天平保持水平
      if (k2 > 0) { c.save(); c.translate(xs[1], y); c.scale(k2, k2); balance(c, 0, 0, Math.sin(t * 2) * .02); c.restore(); text(c, '剂量', xs[1], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', alpha: k2 }); text(c, '=', xs[1], y - 120, { size: 70, family: 'JB', weight: 700, color: '#fff', align: 'center', alpha: k2 }); }
      // 早餐：空盘翻成满盘
      const kE = smooth(p(t, L11.s - .2, L11.s + .3));
      if (kE > 0) {
        c.save(); c.translate(xs[2], y); c.scale(kE, kE); plate(c, 0, 0, k3, t); c.restore();
        text(c, '早餐', xs[2], y + 150, { size: 44, family: 'SHSerif', weight: 900, color: k3 > .5 ? C.doseL : '#f3e6cc', align: 'center', alpha: kE });
        text(c, k3 > .5 ? '≠' : '=', xs[2], y - 120, { size: 80, family: 'JB', weight: 800, color: k3 > .5 ? C.doseL : '#fff', align: 'center', alpha: kE, shadow: k3 > .5 ? rgba(C.dose, .9) : null, shadowBlur: 30 });
        if (k3 > 0) shock(c, xs[2], y, p(t, cue(S, 'D011', '只是'), cue(S, 'D011', '只是') + 1.1), C.dose, 520);
      }
      c.restore();
    }
    // ---- 凭什么改写一个剂量？
    const q = env(t, L12.s - .1, S.dur + 1, .3, .1);
    if (q > 0) {
      const ex = 1 - smooth(p(t, S.dur - .55, S.dur - .1));
      const k = p(t, L12.s + .15, cue(S, 'D012', '剂量', true));
      c.save(); c.globalAlpha = q * ex;
      darkBand(c, H / 2 - 10, 300, q);
      text(c, '一顿饭，凭什么', W / 2, H / 2 - 70, { size: 44, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 8 });
      scrambleText(c, '改写一个剂量？', W / 2, H / 2 + 40, Math.max(.001, k * 1.1), 5, { size: 96, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 10, hidden: true });
      c.restore();
      // 收成光缝（接片名）
      const cl = p(t, S.dur - .55, S.dur);
      if (cl > 0) flare(c, W / 2, H / 2, W * 1.4 * eOut(cl), cl);
    }
  },
});
transition('s02_title', { type: 'cut', d: .1 });

// ============================================================ s02 片名（快节奏版）
def('s02_title', {
  clear: '#020203',
  post: (S) => ({ bloom: .75, thr: .62, ca: .0024, vig: .5, grain: .04, mark: false, tint: [1.05, 1.0, .92] }),
  draw(S) {
    const c = S.ctx, t = S.t, cy = H * .47;
    dust(c, t, 160, '#ffd9a0', .3, 12);
    // 光缝 → 宽银幕
    flare(c, W / 2, cy, W * 1.6 * eOut(p(t, 0, .5)), 1 - .8 * smooth(p(t, .5, 1.8)));
    const hit = p(t, .12, .6);
    S.post.flash = .22 * Math.max(0, 1 - p(t, .1, .3)) * (t > .1 ? 1 : 0);
    S.post.ca = .0024 + .016 * Math.max(0, 1 - p(t, .1, .9));
    const out1 = 1 - smooth(p(t, 3.1, 3.6));
    // 主标题：金属渐变 + 扫光，字距收拢
    const k = eOutExpo(p(t, .15, 1.2)), a = smooth(p(t, .15, .5)) * out1;
    if (a > 0) {
      const sz = 230, ls = lerp(160, 70, k);
      c.save(); c.globalAlpha = a; c.font = `900 ${sz}px SHSerif`; c.textAlign = 'center'; c.letterSpacing = ls + 'px';
      const g = c.createLinearGradient(0, cy - sz * .8, 0, cy + sz * .1);
      g.addColorStop(0, '#fff3d6'); g.addColorStop(.45, '#e8a33d'); g.addColorStop(.55, '#8a5a1e'); g.addColorStop(1, '#f2c97a');
      c.shadowColor = rgba(C.dose, .6); c.shadowBlur = 50; c.fillStyle = g; c.fillText('剂量', W / 2 + ls / 2, cy + 40);
      const sw = p(t, .9, 2.2);
      if (sw > 0 && sw < 1) { c.shadowBlur = 0; c.globalCompositeOperation = 'lighter'; const gx = lerp(W / 2 - 500, W / 2 + 500, eInOut(sw)); const h2 = c.createLinearGradient(gx - 110, 0, gx + 110, 0); h2.addColorStop(0, 'rgba(255,255,255,0)'); h2.addColorStop(.5, `rgba(255,250,235,${.8 * Math.sin(sw * Math.PI)})`); h2.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = h2; c.fillText('剂量', W / 2 + ls / 2, cy + 40); }
      c.restore();
    }
    text(c, 'D O S E', W / 2, cy + 120, { size: 46, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: lerp(40, 22, k), alpha: smooth(p(t, .7, 1.3)) * out1 });
    const sb = smooth(p(t, 1.3, 1.9)) * out1;
    text(c, '每一个剂量，都是一次决定', W / 2, cy + 196, { size: 38, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 8, alpha: sb });
    text(c, 'EVERY DOSE IS A DECISION', W / 2, cy + 240, { size: 22, family: 'Cinzel', weight: 700, color: rgba('#ffffff', .6), align: 'center', ls: 10, alpha: sb });
    // 集名
    const e = smooth(p(t, 3.5, 4.0)) * (1 - smooth(p(t, S.dur - .7, S.dur - .1)));
    if (e > 0) {
      const ke = eOutExpo(p(t, 3.5, 4.4));
      text(c, 'EP 01', W / 2, H * .37, { size: 34, family: 'Cinzel', weight: 700, color: C.dose, align: 'center', ls: 24, alpha: e });
      text(c, '一 顿 饭', W / 2, H * .37 + 150, { size: 130, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: lerp(60, 30, ke), alpha: e, shadow: rgba(C.dose, .5), shadowBlur: 40 });
      text(c, 'O N E   M E A L', W / 2, H * .37 + 220, { size: 26, family: 'Cinzel', weight: 700, color: rgba('#ffffff', .6), align: 'center', ls: 12, alpha: e });
      line(c, W / 2 - 260 * ke, H * .37 + 252, W / 2 + 260 * ke, H * .37 + 252, rgba(C.dose, .6), 2, e);
      text(c, '◇ 支线进行中 出品', W / 2, H - 110, { size: 24, family: 'SHSans', weight: 500, color: rgba('#ffffff', .65), align: 'center', ls: 6, alpha: e });
    }
    // 宽银幕黑边
    const bar = (H - W / 2.39) / 2 * eInOut(p(t, .1, .7));
    c.fillStyle = '#000'; c.fillRect(0, 0, W, bar); c.fillRect(0, H - bar, W, bar);
  },
});
