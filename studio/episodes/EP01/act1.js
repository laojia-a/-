// EP01 第一章 一条河：钥匙与锁 → 沉底的石子（88%）→ 早餐、胆汁、胶束渡船 → 观察 ≠ 机制
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, noise2, rgba, text, measure, typeText, rrect, line, circle, glowDot, radial, once, brackets, panel, tag } from '/engine.js';
import { cue, srcTag, schemTag, dust, flare, shock, MOL, molProj, drawMol, tablet, chap, crystal, micelle, gauge, steroid, cell,
  river, RIV, glowText, pk, PKMAX, seal } from './lib.js';

// ------------------------------------------------------------------ s03 钥匙与锁
const LOCK = [1330, 500];
function enzyme(c, x, y, R, t, a, on) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.globalCompositeOperation = 'lighter';
  glowDot(c, 0, 0, R * 2.1, '#ff6a3a', .10 + .16 * on);
  // 蛋白主链：两圈缠绕的螺旋带
  for (const [rr, sp, n, col] of [[R, .12 * on + .02, 9, '#ffb37a'], [R * .78, -.18 * on - .02, 7, '#e8a33d']]) {
    c.strokeStyle = rgba(col, .55); c.lineWidth = 3;
    c.beginPath();
    for (let k = 0; k <= 360; k++) { const th = k / 360 * TAU + t * sp; const w = 1 + .09 * Math.sin(th * n * 2 + t * 2); const px = Math.cos(th) * rr * w, py = Math.sin(th) * rr * w * .92; k ? c.lineTo(px, py) : c.moveTo(px, py); }
    c.stroke();
    c.strokeStyle = rgba(col, .25); c.lineWidth = 10; c.stroke();
  }
  // 结合口袋：血红素铁的红光
  glowDot(c, 0, 0, R * .55, '#ff3a1e', .25 + .55 * on);
  glowDot(c, 0, 0, R * .18, '#fff0d0', .2 + .6 * on);
  c.globalCompositeOperation = 'source-over';
  circle(c, 0, 0, R * .22, { stroke: rgba('#ffd2a0', .4 + .4 * on), lw: 2 });
  c.restore();
}
const ANDRO = once('andro', () => { const r = rng(41), a = []; for (let i = 0; i < 26; i++) a.push({ ph: r(), dy: (r() - .5) * 220, sp: .22 + r() * .1, rot: r() * TAU, s: 9 + r() * 5 }); return a; });
const CELLS = [[1700, 380, 62], [1790, 520, 74], [1690, 650, 56], [1830, 330, 40], [1600, 520, 44]];

def('s03_key', {
  clear: '#050507',
  post: (S) => ({ bloom: .6, thr: .78, ca: .0018, vig: .55, grain: .04, tint: [1.05, 1.0, .94], con: 1.06 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L13 = S.L('D013'), L14 = S.L('D014'), L15 = S.L('D015'), L16 = S.L('D016'), L17 = S.L('D017');
    dust(c, t, 130, '#ffd9a0', .2, 31);
    c.fillStyle = radial(c, W * .45, H * .45, 1100, [[0, 'rgba(60,34,18,.35)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
    // 对接：D015 句末钥匙飞入锁孔
    const dock = eInOut(p(t, L15.e - .3, L15.e + 1.1));
    const on = 1 - smooth(p(t, L15.e + .9, L15.e + 1.8));          // 酶的活性
    const out = smooth(p(t, L17.s - .2, L17.s + .6));                // 第四句：一切退场
    // 钥匙（分子）的位置与大小
    const mx0 = 560, my0 = 520, s0 = 58;
    const yaw = lerp(Math.sin(t * .45) * .5 + .25, 0, dock);
    // 吡啶环对准锁孔：分子整体平移，使吡啶中心落在 LOCK
    const s1 = 36, dockX = LOCK[0] - MOL.pyr[0] * s1, dockY = LOCK[1] - MOL.pyr[1] * s1;
    const mx = lerp(mx0, dockX, dock), my = lerp(my0, dockY, dock), ms = lerp(s0, s1, dock);
    const molA = smooth(p(t, 1.6, 3.0)) * (1 - out);
    // 酶与雄激素流
    const eA = smooth(p(t, L14.s - .2, L14.s + 1.0)) * (1 - smooth(p(t, L16.s + 1.5, L16.s + 3)) * .55) * (1 - out);
    enzyme(c, LOCK[0], LOCK[1], 150, t, eA, on);
    if (eA > 0) {
      const flowA = smooth(p(t, cue(S, 'D014', '合成雄激素') - .2, cue(S, 'D014', '合成雄激素') + .6)) * eA;
      for (const an of ANDRO) {
        const u = (t * an.sp + an.ph) % 1, born = t - u / an.sp;
        const alive = born > cue(S, 'D014', '合成雄激素') - .4 && born < L15.e + 1.0 ? 1 : 0;
        const x = LOCK[0] + 150 + u * 330, y = LOCK[1] + an.dy * u + Math.sin(u * 9 + an.ph * 9) * 10;
        steroid(c, x, y, an.s, an.rot + u * 2, flowA * alive * (1 - u) * 1.2, '#ff9a6a');
      }
      tag(c, LOCK[0] - 70, LOCK[1] - 150, LOCK[0] - 380, LOCK[1] - 330, ['CYP17', '17α-羟化酶 / C17,20-裂解酶'], { color: C.dose, prog: p(t, L14.s + .4, L14.s + 1.6), alpha: eA * (1 - smooth(p(t, L16.s, L16.s + .8))), size: 28 });
    }
    // 癌细胞：雄激素到达时发热；对接后冷却
    const cA = smooth(p(t, L15.s - .3, L15.s + .8)) * (1 - out);
    if (cA > 0) {
      const heat = smooth(p(t, L15.s, L15.s + 1.6)) * (1 - .85 * smooth(p(t, L15.e + 1.2, L15.e + 2.6)));
      CELLS.forEach(([x, y, r], i) => cell(c, x + Math.sin(t * .5 + i) * 6, y + Math.cos(t * .4 + i) * 5, r * (1 + .05 * heat * Math.sin(t * 3 + i)), t, cA, heat, i));
      const tl = env(t, L15.s + .3, L15.e + 2.2, .4, .5);
      text(c, '前列腺癌细胞', 1735, 790, { size: 30, family: 'SHSans', weight: 700, color: '#ffb09a', align: 'center', alpha: tl });
      text(c, '雄激素 = 燃料', 1735, 830, { size: 24, family: 'SHSans', weight: 500, color: rgba('#ffb09a', .75), align: 'center', alpha: tl });
    }
    // 分子 + 钥匙虚影
    if (molA > 0) {
      const keyA = env(t, cue(S, 'D013', '钥匙') - .2, L14.s + .8, .4, .6) * (1 - dock);
      if (keyA > 0) {
        c.save(); c.globalAlpha = keyA * .5; c.strokeStyle = rgba(C.dose, .8); c.lineWidth = 3; c.translate(mx, my); c.rotate(-.55);
        c.beginPath(); c.arc(-250, 0, 70, 0, TAU); c.stroke(); c.beginPath(); c.arc(-250, 0, 34, 0, TAU); c.stroke();
        c.beginPath(); c.moveTo(-180, -14); c.lineTo(250, -14); c.lineTo(250, 14); c.lineTo(-180, 14); c.stroke();
        c.beginPath(); c.moveTo(170, 14); c.lineTo(170, 70); c.lineTo(205, 70); c.lineTo(205, 40); c.lineTo(230, 40); c.lineTo(230, 14); c.stroke();
        c.restore();
      }
      drawMol(c, mx, my, ms, t, { alpha: molA, yaw, glow: 1 + .8 * dock * (1 - on) });
      const la = env(t, L13.s + .2, L14.s + .2, .5, .5);
      text(c, '醋 酸 阿 比 特 龙', mx0, my0 + 230, { size: 34, family: 'SHSerif', weight: 600, color: '#f3e6cc', align: 'center', ls: 6, alpha: la });
      text(c, 'ABIRATERONE ACETATE', mx0, my0 + 272, { size: 22, family: 'Cinzel', weight: 700, color: rgba(C.dose, .9), align: 'center', ls: 10, alpha: la });
    }
    // 对接瞬间：冲击波 + 锁住的标记
    const td = L15.e + 1.0;
    if (t > td - .05 && out < 1) {
      shock(c, LOCK[0], LOCK[1], p(t, td, td + 1.1), C.dose, 700, 1 - out);
      S.post.flash = Math.max(S.post.flash, .2 * Math.max(0, 1 - p(t, td, td + .2)));
      const ka = env(t, td + .2, L16.s + 2.5, .3, .6);
      text(c, '锁 住', LOCK[0], LOCK[1] + 240, { size: 44, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center', ls: 20, alpha: ka, shadow: rgba(C.dose, .8), shadowBlur: 30 });
      text(c, '雄激素合成被阻断（示意）', LOCK[0], LOCK[1] + 284, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .65), align: 'center', alpha: ka });
    }
    // 17 年时间线
    const tA = env(t, L16.s - .2, L17.s + .3, .5, .6);
    if (tA > 0) {
      const y = 880, x0 = 360, x1 = 1560;
      const kk = eInOut(p(t, cue(S, 'D016', '1994'), cue(S, 'D016', '2011')));
      c.save(); c.globalAlpha = tA;
      line(c, x0, y, x1, y, 'rgba(255,255,255,.15)', 2);
      c.save(); c.globalCompositeOperation = 'lighter'; line(c, x0, y, lerp(x0, x1, kk), y, rgba(C.dose, .9), 3); glowDot(c, lerp(x0, x1, kk), y, 40, C.dose, .8 * (kk > 0 && kk < 1 ? 1 : 0)); c.restore();
      for (let i = 0; i <= 17; i++) {
        const x = lerp(x0, x1, i / 17), lit = kk >= i / 17 - 1e-6;
        line(c, x, y - (i % 5 === 0 || i === 17 ? 16 : 9), x, y + (i % 5 === 0 || i === 17 ? 16 : 9), lit ? C.dose : 'rgba(255,255,255,.25)', lit ? 2.5 : 1.5);
      }
      text(c, '1994', x0, y - 36, { size: 54, family: 'JB', weight: 700, color: C.doseL, align: 'center' });
      text(c, '首篇论文 · 小鼠实验', x0, y + 52, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .65), align: 'center' });
      const a2 = smooth(p(kk, .92, 1));
      text(c, '2011', x1, y - 36, { size: 54, family: 'JB', weight: 700, color: C.doseL, align: 'center', alpha: a2 });
      text(c, 'FDA 批准上市', x1, y + 52, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .65), align: 'center', alpha: a2 });
      const t17 = cue(S, 'D016', '17');
      const k17 = p(t, t17 - .1, t17 + .5);
      if (k17 > 0) { glowText(c, '17 年', (x0 + x1) / 2, y - 60, { size: lerp(120, 76, eOutExpo(k17)), family: 'SHSerif', color: '#fff6e2', alpha: Math.min(1, k17 * 3) }); }
      c.restore();
      srcTag(c, 'PubMed · Drugs@FDA', tA);
    }
    // 第四句：分子压成药片，坠落；“卡住了”时定格一拍，再掉下去
    if (t > L17.s - .3) {
      const k = eInOut(p(t, L17.s - .3, L17.s + .8));
      const st = cue(S, 'D017', '卡住了'), FZ = .6;
      const ft = t < st ? t : (t < st + FZ ? st : t - FZ);           // 定格期间时间停住
      const fall = p(ft, L17.s + .6, S.dur - FZ + .3);
      const freeze = t >= st && t < st + FZ ? 1 - smooth(p(t, st + FZ - .1, st + FZ)) : 0;
      const tx = W / 2, ty = H * .45 + 820 * eIn(fall), sc = lerp(.4, 1, k);
      const a = smooth(p(t, L17.s, L17.s + .4));
      if (k < 1) drawMol(c, lerp(mx, tx, k), lerp(my, H * .45, k), lerp(ms, 10, k), t, { alpha: (1 - k) * .9 });
      const vel = freeze > 0 ? 0 : 820 * 2 * fall / (S.dur - FZ + .3 - L17.s - .6);   // 速度（像素/秒），给拖影用
      c.save(); c.translate(tx, ty); c.scale(sc, sc);
      for (let g = 1; g <= 4 && vel > 40; g++) { c.globalAlpha = a * .1 * (5 - g); tablet(c, 0, -g * Math.min(60, vel * .025), 260, 126, '#6E4A93', 'AA', t); }
      c.globalAlpha = a; tablet(c, 0, 0, 260, 126, '#6E4A93', 'AA', t);
      c.restore();
      if (freeze > 0) {
        S.post.sat = lerp(1, .25, freeze); S.post.glitch = Math.max(S.post.glitch, .25 * freeze * (hash1(Math.floor(t * 30)) > .5 ? 1 : .3));
        brackets(c, tx - 190, ty - 110, 380, 220, { color: C.risk, alpha: freeze, len: 34, lw: 3 });
        text(c, 'STUCK', tx, ty - 130, { size: 26, family: 'JB', weight: 700, color: '#ff6a5a', align: 'center', ls: 10, alpha: freeze });
      }
    }
    chap(S, '第 一 章', '一条河');
  },
});
transition('s04_river', { type: 'cross', d: .8 });

// ------------------------------------------------------------------ s04 一条河：沉底的石子
const CRY = once('cry1', () => { const r = rng(57), a = []; for (let i = 0; i < 80; i++) a.push({ dx: (r() - .5) * 220, bed: RIV.bot - 30 - r() * 70, sink: .9 + r() * 1.6, v: 80 + r() * 90, s: 7 + r() * 11, rot: r() * TAU, spin: (r() - .5) * 1.2, diss: r() }); return a; });
function cryPos(k, tau, x0, y0, flow = 1) {
  const q = CRY[k];
  const x = x0 + q.dx * (1 - Math.exp(-tau * 2.2)) + q.v * flow * Math.max(0, tau - .6);
  const y = lerp(y0, q.bed, eOut(Math.min(1, tau / q.sink))) + Math.sin(tau * 1.3 + k) * 3;
  return [x, y];
}

def('s04_river', {
  clear: '#05070a',
  post: (S) => ({ bloom: .55, thr: .78, ca: .0018, vig: .55, grain: .045, tint: [.96, 1.0, 1.04], con: 1.05 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L18 = S.L('D018'), L19 = S.L('D019'), L20 = S.L('D020'), L21 = S.L('D021'), L22 = S.L('D022');
    const tc = cue(S, 'D020', '几乎不溶');          // 药片崩解
    const dive = eOutExpo(p(t, 0, 2.6));
    const flow = 1 + .5 * smooth(p(t, L19.s, L19.s + 1.5)) - .3 * smooth(p(t, L20.s, L20.s + 1));
    // 推镜：从水面特写拉开
    c.save(); const z = lerp(1.9, 1, dive), fx = lerp(330, W / 2, dive), fy = lerp(380, H / 2, dive);
    c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-fx, -fy);
    // 绒毛被溶解的少量药点亮
    const lit = new Array(70).fill(0);
    for (let k = 0; k < CRY.length; k++) { const q = CRY[k]; if (q.diss > .12) continue; const [x] = cryPos(k, t - tc, 330, 360); if (x > RIV.bank0 && x < RIV.bank1) { const i = Math.round((x + 5) / 30); for (const d of [-1, 0, 1]) if (lit[i + d] !== undefined) lit[i + d] = Math.max(lit[i + d], .5 - .2 * Math.abs(d)); } }
    river(c, t, { flow, lit });
    // 药片：落水、漂浮、崩解
    const drop = p(t, .1, 1.0);
    if (t < tc + .4) {
      const y = lerp(160, 360, eIn(drop)) + Math.sin(t * 2.2) * 4 * smooth(p(t, 1, 2));
      const a = 1 - smooth(p(t, tc, tc + .35));
      c.save(); c.globalAlpha = a; tablet(c, 330 + Math.sin(t * .7) * 6, y, 130, 64, '#6E4A93', 'AA', t); c.restore();
    }
    const sp = p(t, .95, 2.6);
    if (sp > 0 && sp < 1) { c.save(); c.globalCompositeOperation = 'lighter'; const r = rng(5); for (let i = 0; i < 46; i++) { const u = clamp(sp * 1.4 - r() * .4); if (u <= 0) continue; const bx = 330 + (r() - .5) * 150 * u + Math.sin(u * 8 + i) * 8, by = 370 + 160 * r() - u * (120 + 220 * r()); c.strokeStyle = `rgba(200,235,255,${.7 * (1 - u)})`; c.lineWidth = 1.4; c.beginPath(); c.arc(bx, by, 2 + 6 * r(), 0, TAU); c.stroke(); } glowDot(c, 330, 380, 200, '#bfe6ff', .25 * (1 - sp)); c.restore(); }
    if (t > tc) {
      glowDot(c, 330, 360, 160, '#e6f4ff', .35 * (1 - smooth(p(t, tc, tc + .7))));
      for (let k = 0; k < CRY.length; k++) {
        const q = CRY[k], tau = t - tc; const [x, y] = cryPos(k, tau, 330, 360, flow);
        if (x > RIV.gate + 80) continue;
        const fa = 1 - smooth(p(x, RIV.gate - 40, RIV.gate + 70));
        crystal(c, x, y, q.s, q.rot + q.spin * tau, fa, { seed: k });
        if (q.diss < .12 && x > RIV.bank0 && x < RIV.bank1) { const u = (t * .9 + q.diss * 10) % 1; c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, lerp(y, RIV.top + 60, u), 10, '#bfe6ff', .6 * (1 - u)); c.restore(); }
      }
    }
    c.restore();
    schemTag(c, '示意 · 肠道与吸收', smooth(p(t, 1.5, 2.5)));
    // 标注
    tag(c, (RIV.bank0 + RIV.bank1) / 2, RIV.top + 70, (RIV.bank0 + RIV.bank1) / 2 + 120, 200, ['吸收最好的一段', 'ABSORPTION'], { color: C.dose, prog: p(t, cue(S, 'D018', '被吸收') - .3, cue(S, 'D018', '被吸收') + 1), alpha: env(t, cue(S, 'D018', '被吸收') - .3, L20.s + .5, .3, .5), size: 26 });
    const fA = env(t, L19.s, L20.s + .4, .4, .5);
    if (fA > 0) { c.save(); c.globalAlpha = fA; c.globalCompositeOperation = 'lighter'; for (let k = 0; k < 3; k++) { const u = (t * .5 + k / 3) % 1; const x = 560 + u * 900; line(c, x, 620, x + 120, 620, rgba('#bfe6ff', .5 * Math.sin(u * Math.PI)), 3); c.beginPath(); c.moveTo(x + 135, 620); c.lineTo(x + 112, 608); c.lineTo(x + 112, 632); c.closePath(); c.fillStyle = rgba('#bfe6ff', .5 * Math.sin(u * Math.PI)); c.fill(); } c.restore(); text(c, '水流 · 一刻不停', 1010, 680, { size: 28, family: 'SHSans', weight: 500, color: '#cfe8ff', align: 'center', alpha: fA }); }
    const sA = env(t, L20.s + .2, L21.s + 2.5, .4, .6);
    if (sA > 0) {
      text(c, 'practically insoluble in water', 140, 200, { size: 40, family: 'IMFell', italic: true, color: '#f3e6cc', alpha: sA });
      text(c, '几乎不溶于水 · 脂水分配系数 Log P 5.12', 142, 246, { size: 26, family: 'SHSans', weight: 500, color: C.dose, alpha: sA });
      srcTag(c, 'ZYTIGA 标签 §11', sA);
    }
    // 88% 仪表
    const gA = smooth(p(t, L22.s - .2, L22.s + .6));
    if (gA > 0) {
      const gx = 1560, gy = 600;
      c.save(); c.globalAlpha = gA; c.fillStyle = radial(c, gx, gy, 330, [[0, 'rgba(0,0,0,.85)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(gx - 400, gy - 400, 800, 800); c.restore();
      const f88 = .88 * eOut(p(t, cue(S, 'D022', '88') - .8, cue(S, 'D022', '88') + .3));
      const f55 = .55 * eOut(p(t, cue(S, 'D022', '一大半') - .2, cue(S, 'D022', '一大半') + .9));
      gauge(c, gx, gy, 170, [{ f: f88, col: C.dose, w: 20 }, { f: f55, col: '#f3e6cc', w: 10, r: 140 }, { f0: .88, f: .88 + .05 * smooth(p(t, cue(S, 'D022', '88') + .2, cue(S, 'D022', '88') + .8)), col: C.sim, w: 20 }], gA);
      text(c, Math.round(f88 * 100) + '%', gx, gy + 24, { size: 84, family: 'JB', weight: 800, color: '#fff', align: 'center', alpha: gA });
      text(c, '粪便回收', gx, gy + 70, { size: 26, family: 'SHSans', weight: 700, color: C.dose, align: 'center', alpha: gA });
      text(c, '放射性标记研究', gx, gy - 240, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center', alpha: gA });
      const a55 = smooth(p(t, cue(S, 'D022', '一大半'), cue(S, 'D022', '一大半') + .8));
      text(c, '其中原形醋酸阿比特龙 ≈ 55%', gx, gy + 245, { size: 26, family: 'SHSans', weight: 700, color: '#f3e6cc', align: 'center', alpha: a55 * gA });
      text(c, '尿 ≈ 5% · 均为给药量的百分比', gx, gy + 283, { size: 22, family: 'SHSans', weight: 500, color: rgba(C.sim, .9), align: 'center', alpha: a55 * gA });
      srcTag(c, 'ZYTIGA 标签 §12.3', gA);
    }
  },
});
transition('s05_bile', { type: 'cross', d: .7 });

// ------------------------------------------------------------------ s05 早餐、胆汁、胶束
const CRY2 = once('cry2', () => { const r = rng(73), a = []; for (let i = 0; i < 44; i++) a.push({ dx: (r() - .5) * 260, bed: RIV.bot - 40 - r() * 60, sink: 1 + r() * 1.2, v: 18 + r() * 22, s: 8 + r() * 9, rot: r() * TAU, spin: (r() - .5), bx: RIV.bank0 + 30 + r() * (RIV.bank1 - RIV.bank0 - 60), sx: 220 + r() * 520, sy: 380 + r() * 260, ord: r() }); return a; });
const BILE = once('bile', () => { const r = rng(79), a = []; for (let i = 0; i < 160; i++) a.push({ d: r() * 2.6, sp: 220 + r() * 260, dy: r(), sz: 2 + r() * 5, ph: r() * TAU }); return a; });

def('s05_bile', {
  clear: '#05070a',
  post: (S) => {
    const L27 = S.L('D027'), L28 = S.L('D028');
    const fr = smooth(p(S.t, L27.s - .1, L27.s + .7)) * (1 - smooth(p(S.t, L28.s + 1.4, L28.s + 2.2)));
    return { bloom: .6, thr: .76, ca: .0018, vig: .55, grain: .045, tint: [1.06, 1.0, .9], con: 1.05, sat: lerp(1, .35, fr) };
  },
  draw(S) {
    const c = S.ctx, T = S.t;
    const L23 = S.L('D023'), L24 = S.L('D024'), L25 = S.L('D025'), L26 = S.L('D026'), L27 = S.L('D027'), L28 = S.L('D028');
    // 第五句起画面近乎定格：动画时间放慢到 0.12 倍
    const f0 = L27.s; const t = T < f0 ? T : f0 + (T - f0) * .12;
    const tb = cue(S, 'D024', '胆囊收缩');             // 胆汁闸门打开
    const tcr = L23.s + 1.3;                            // 第二颗药（随早餐）崩解
    const tm = cue(S, 'D025', '胶束') - .6;             // 胶束成形
    const warmFront = t > tb ? 220 + 420 * (t - tb) : -500;
    // 绒毛点亮：渡船到岸
    const lit = new Array(70).fill(0);
    const ships = CRY2.map((q, k) => {
      const tg = tm + q.ord * 1.4;                                  // 渡船出现
      const tcap = Math.max(tg + .9, L26.s + q.ord * 3.2);           // 装货
      const tarr = tcap + 2.2 + hash1(k * 3) * 1.2;                  // 到岸
      return { q, k, tg, tcap, tarr };
    });
    for (const s of ships) { const u = smooth(p(t, s.tarr, s.tarr + .6)); if (u > 0) { const i = Math.round((s.q.bx + 5) / 30); for (const d of [-1, 0, 1]) if (lit[i + d] !== undefined) lit[i + d] = Math.min(1, lit[i + d] + u * (1 - .4 * Math.abs(d))); } }
    // 推镜：渡船阶段慢慢推近吸收岸
    const push = eInOut(p(t, L26.s - .5, L27.s));
    c.save(); const z = lerp(1, 1.18, push); c.translate(W / 2, H / 2); c.scale(z, z); c.translate(-lerp(W / 2, 980, push), -lerp(H / 2, 560, push));
    river(c, t, { warm: smooth(p(t, tb, tb + 2.5)), warmFront, lit, flow: .55 });
    // 上游的晨光
    const sunA = smooth(p(t, L23.s - .2, L23.s + 1.2));
    if (sunA > 0) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = sunA;
      for (let i = 0; i < 9; i++) { const a0 = .25 + i * .07 + Math.sin(t * .2 + i) * .02; const g = c.createLinearGradient(0, RIV.top, 0, RIV.bot); g.addColorStop(0, rgba(C.dose, .16)); g.addColorStop(1, rgba(C.dose, 0)); c.fillStyle = g; c.beginPath(); c.moveTo(80 + i * 60, RIV.top); c.lineTo(80 + i * 60 + 40, RIV.top); c.lineTo(80 + i * 60 + 40 + Math.cos(a0) * 900, RIV.bot); c.lineTo(80 + i * 60 + Math.cos(a0) * 900 - 60, RIV.bot); c.closePath(); c.fill(); }
      glowDot(c, 150, 170, 220, '#ffcf7a', .45); c.restore();
      circle(c, 150, 170, 34, { fill: '#ffb23d', alpha: sunA });
      text(c, '早餐', 150, 245, { size: 28, family: 'SHSans', weight: 700, color: C.doseL, align: 'center', alpha: sunA });
    }
    // 胆汁：闸门 + 金色涌流
    const op = eOut(p(t, tb - .2, tb + .8));
    if (op > 0) {
      c.fillStyle = rgba('#2a160a', 1); rrect(c, 190, RIV.top - 70, 64, 76, 10); c.fill();
      c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, 222, RIV.top, 160 * op, '#ffc24d', .7 * op); c.restore();
      for (const b of BILE) {
        const tau = t - tb - b.d * .9; if (tau < 0 || tau > 8) continue;
        const x = 222 + b.sp * tau * (.6 + .4 * Math.exp(-tau * .2)) + noise2(b.ph, tau * .7) * 80 * Math.min(1, tau);
        const y = lerp(RIV.top + 10, RIV.top + 40 + b.dy * (RIV.bot - RIV.top - 120), eOut(Math.min(1, tau / 1.8))) + noise2(tau * .6, b.ph) * 50;
        const a = (1 - tau / 8) * (1 - smooth(p(t, tm + .4, tm + 1.6)) * .8);
        c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, b.sz * 4, '#ffb84a', .5 * a); c.restore();
      }
      text(c, '胆汁', 300, RIV.top - 92, { size: 30, family: 'SHSans', weight: 700, color: C.doseL, alpha: env(t, tb, L25.s + 2, .4, .6) });
    }
    // 第二颗药
    if (t > L23.s && t < tcr + .4) tablet(c, 420, lerp(140, 380, eIn(p(t, L23.s + .2, L23.s + 1.1))), 120, 58, '#6E4A93', 'AA', t);
    if (t > tcr) glowDot(c, 420, 380, 150, '#e6f4ff', .3 * (1 - smooth(p(t, tcr, tcr + .7))));
    // 晶体与渡船
    for (const s of ships) {
      const { q, k } = s; if (t < tcr) break;
      const tau = t - tcr;
      const bx = 420 + q.dx * (1 - Math.exp(-tau * 2)) + q.v * Math.max(0, tau - .6), by = lerp(380, q.bed, eOut(Math.min(1, tau / q.sink))) + Math.sin(tau + k) * 2;
      const cap = smooth(p(t, s.tcap, s.tcap + .5));
      // 渡船位置：出现 → 驶向晶体 → 载着晶体浮上岸
      const appear = smooth(p(t, s.tg, s.tg + .6));
      const toC = eInOut(p(t, s.tg, s.tcap));
      const cx0 = q.sx + Math.sin(t * .8 + k) * 20, cy0 = q.sy + Math.cos(t * .7 + k) * 16;
      let mx = lerp(cx0, bx, toC), my = lerp(cy0, by - 4, toC);
      const up = eInOut(p(t, s.tcap + .3, s.tarr));
      mx = lerp(mx, q.bx, up); my = lerp(my, RIV.top + 70 + (k % 4) * 22, up) + Math.sin(t * 2 + k) * 4 * (1 - up);
      const gone = smooth(p(t, s.tarr - .2, s.tarr + .35));
      if (cap < 1 && (t < s.tcap + .5)) crystal(c, bx, by, q.s, q.rot + q.spin * tau, 1 - cap, { seed: k + 100 });
      if (appear > 0 && gone < 1) micelle(c, mx, my, 20 + 6 * hash1(k), t, appear * (1 - gone) * .85, cap, k);
      if (t > s.tarr && t < s.tarr + .9) { const u = p(t, s.tarr, s.tarr + .9); c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, q.bx, RIV.top + 40 - u * 50, 22, C.doseL, .45 * (1 - u)); c.restore(); }
    }
    c.restore();
    schemTag(c, '示意 · 胶束已放大', smooth(p(t, L25.s, L25.s + .8)));
    // 胶束标注（跟随第一艘船）
    const s0 = ships.reduce((a, b) => (b.tg < a.tg ? b : a));
    const mA = env(t, s0.tg + .3, L26.s + 1.5, .4, .6);
    if (mA > 0) text(c, '胶束 MICELLE · 纳米级', 1000, 250, { size: 30, family: 'SHSans', weight: 700, color: C.doseL, align: 'center', alpha: mA });
    // 三个假说
    const hA = smooth(p(T, L27.s - .1, L27.s + .5));
    if (hA > 0) {
      c.save(); c.fillStyle = `rgba(0,0,0,${.55 * hA})`; c.fillRect(0, 0, W, H); c.restore();
      const hyp = [['胆汁胶束增溶', '溶得更多', L27.s + .1], ['胃排空变慢', '走得更慢', cue(S, 'D027', '胃排空')], ['在肠道停留更久', '待得更久', cue(S, 'D027', '停留更久')]];
      const conv = eInOut(p(T, L28.s + .2, L28.s + 1.6));
      hyp.forEach(([a, b, t0], i) => {
        const k = eOutBack(p(T, t0, t0 + .5)); if (k <= 0) return;
        const x = 380 + i * 580, y = lerp(330, 240, conv);
        c.save(); c.globalAlpha = Math.min(1, k) * hA; c.translate(x, y); c.scale(lerp(.8, 1, Math.min(1, k)), lerp(.8, 1, Math.min(1, k)));
        panel(c, -230, -80, 460, 160, { fill: 'rgba(16,14,10,.88)', stroke: rgba(C.dose, .6), r: 16 });
        text(c, a + ' ？', 0, -8, { size: 40, family: 'SHSerif', weight: 900, color: '#fff', align: 'center' });
        text(c, b, 0, 44, { size: 24, family: 'SHSans', weight: 500, color: rgba(C.dose, .9), align: 'center', ls: 6 });
        c.restore();
      });
      // 一条曲线收下三个解释
      if (conv > 0) {
        const X0 = 560, X1 = 1360, Y0 = 860, U = 300;
        c.save(); c.globalAlpha = conv * hA;
        line(c, X0, Y0, X1 + 20, Y0, 'rgba(255,255,255,.3)', 2);
        const n = Math.floor(200 * eOut(p(T, L28.s + .6, L28.s + 2.2)));
        c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.dose, .95); c.lineWidth = 4; c.beginPath();
        for (let i = 0; i <= n; i++) { const xx = i / 200 * 24; const px = X0 + (X1 - X0) * xx / 24, py = Y0 - U * pk(xx) / PKMAX; i ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke(); c.globalCompositeOperation = 'source-over';
        [380, 960, 1540].forEach((x) => { const tgx = X0 + (X1 - X0) * 1.8 / 24, tgy = Y0 - U; const q = eOut(p(T, L28.s + .4, L28.s + 1.4)); line(c, x, 320, lerp(x, tgx, q), lerp(320, tgy, q), rgba(C.dose, .5), 2); });
        text(c, '同一条血药曲线', (X0 + X1) / 2, Y0 + 50, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center' });
        c.restore();
      }
      const ob = cue(S, 'D028', '观察');
      const oA = smooth(p(T, ob - .1, ob + .6));
      if (oA > 0) { c.save(); c.fillStyle = `rgba(0,0,0,${.5 * oA})`; c.fillRect(0, 380, W, 300); c.restore(); glowText(c, '观察  ≠  机制', W / 2, 570, { size: 120, alpha: oA, color: '#fff6e2' }); }
      schemTag(c, '示意 · 曲线形状非真实数据', hA);
    }
  },
});
transition('s06_idcard', { type: 'black', d: 1.0 });
