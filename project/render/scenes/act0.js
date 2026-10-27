// 第0幕：冷开场（阿格斯之眼）→ 2026 深夜酒店 → 片名
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, noise1, noise2, fbm,
  rgba, text, measure, typeText, scrambleText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt } from '../engine.js';

// ------------------------------------------------------------ 共用：眼睛
const IRIS = once('iris', () => {
  const r = rng(7), fib = [];
  for (let i = 0; i < 1100; i++) {
    const a = r() * TAU, l0 = .26 + r() * .1, l1 = .62 + r() * .38;
    const hue = r(); fib.push({ a, l0, l1, w: .6 + r() * 1.8, hue, ph: r() * TAU, sp: .5 + r() });
  }
  return fib;
});
// 画一只眼。open: 0..1 眼睑张开度；R: 虹膜半径；look: 瞳孔偏移
export function drawEye(c, x, y, R, t, o = {}) {
  const { open = 1, pupil = .3, alpha = 1, detail = 1, lid = true, hueShift = 0, glow = 1 } = o;
  if (alpha <= 0 || open <= 0.001) return;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y);
  const ew = R * 2.35, eh = R * 1.32 * open;
  if (lid) { // 杏仁形眼睑裁切
    c.beginPath(); c.moveTo(-ew, 0); c.quadraticCurveTo(0, -eh * 1.55, ew, 0); c.quadraticCurveTo(0, eh * 1.55, -ew, 0); c.closePath();
    c.save(); c.clip();
  }
  // 巩膜暗底
  c.fillStyle = radial(c, 0, 0, R * 2.2, [[0, '#0b1a2b'], [.5, '#06101c'], [1, '#020409']]); c.fillRect(-ew, -R * 2, ew * 2, R * 4);
  // 虹膜底色
  c.fillStyle = radial(c, 0, 0, R, [[0, '#062033'], [.35, '#0b4a6e'], [.75, '#0a2c48'], [1, '#03101c']]);
  c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill();
  // 纤维
  c.globalCompositeOperation = 'lighter';
  const n = Math.floor(IRIS.length * detail);
  for (let i = 0; i < n; i++) {
    const f = IRIS[i];
    const sh = .55 + .45 * Math.sin(t * f.sp * 1.7 + f.ph);
    const a = f.a + Math.sin(t * .3 + f.ph) * .01;
    const ca = Math.cos(a), sa = Math.sin(a);
    const r0 = R * (f.l0 * (1 + (pupil - .3) * .9)), r1 = R * f.l1;
    let col;
    if (f.hue < .08) col = `rgba(255,184,90,${.5 * sh})`; else if (f.hue < .55) col = `rgba(70,${200 + 50 * sh | 0},255,${.32 * sh})`; else col = `rgba(30,${120 + 60 * sh | 0},230,${.28 * sh})`;
    c.strokeStyle = col; c.lineWidth = f.w * R / 300;
    c.beginPath(); c.moveTo(ca * r0, sa * r0); c.lineTo(ca * r1, sa * r1); c.stroke();
  }
  // 领口环（琥珀）
  c.strokeStyle = `rgba(255,170,80,${.35 * glow})`; c.lineWidth = R * .03; c.beginPath(); c.arc(0, 0, R * (pupil + .12), 0, TAU); c.stroke();
  c.globalCompositeOperation = 'source-over';
  // 角膜缘暗环
  c.strokeStyle = 'rgba(0,5,12,.85)'; c.lineWidth = R * .09; c.beginPath(); c.arc(0, 0, R * .985, 0, TAU); c.stroke();
  c.strokeStyle = `rgba(62,230,255,${.5 * glow})`; c.lineWidth = R * .012; c.beginPath(); c.arc(0, 0, R * 1.03, 0, TAU); c.stroke();
  // 瞳孔
  c.fillStyle = '#000'; c.beginPath(); c.arc(0, 0, R * pupil, 0, TAU); c.fill();
  c.strokeStyle = `rgba(62,230,255,${.55 * glow})`; c.lineWidth = R * .015; c.beginPath(); c.arc(0, 0, R * pupil * 1.02, 0, TAU); c.stroke();
  // 高光
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = radial(c, -R * .32, -R * .36, R * .22, [[0, 'rgba(255,255,255,.95)'], [.3, 'rgba(200,245,255,.35)'], [1, 'rgba(200,245,255,0)']]);
  c.fillRect(-R * .6, -R * .6, R * .6, R * .6);
  c.fillStyle = radial(c, R * .28, R * .22, R * .08, [[0, 'rgba(255,255,255,.6)'], [1, 'rgba(255,255,255,0)']]);
  c.fillRect(R * .18, R * .12, R * .2, R * .2);
  c.globalCompositeOperation = 'source-over';
  if (lid) {
    c.restore();
    c.strokeStyle = `rgba(62,230,255,${.75 * glow})`; c.lineWidth = Math.max(1.5, R * .012);
    c.beginPath(); c.moveTo(-ew, 0); c.quadraticCurveTo(0, -eh * 1.55, ew, 0); c.quadraticCurveTo(0, eh * 1.55, -ew, 0); c.stroke();
  }
  c.restore();
}

// HUD 圆环
function hudRings(c, x, y, R, t, a) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y);
  c.strokeStyle = rgba(C.cyan, .35); c.lineWidth = 1.5;
  for (const [rr, sp, seg] of [[1.35, .15, 120], [1.55, -.08, 60], [1.85, .05, 180]]) {
    c.save(); c.rotate(t * sp);
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * TAU; const big = i % 10 === 0;
      const r0 = R * rr, r1 = R * rr + (big ? 16 : 7);
      c.beginPath(); c.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); c.lineTo(Math.cos(a0) * r1, Math.sin(a0) * r1); c.stroke();
    }
    c.restore();
  }
  c.strokeStyle = rgba(C.cyan, .5); c.lineWidth = 2;
  c.save(); c.rotate(-t * .22); c.beginPath(); c.arc(0, 0, R * 1.7, 0, TAU * .18); c.stroke(); c.beginPath(); c.arc(0, 0, R * 1.7, TAU * .5, TAU * .62); c.stroke(); c.restore();
  c.restore();
}

function hudCorner(c, t, a, lines) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  text(c, 'ARGUS', 120, 132, { size: 30, family: 'Orbitron', weight: 800, color: C.cyan, ls: 8 });
  text(c, '// 临床试验监查智能体', 270, 131, { size: 24, family: 'SHSans', weight: 500, color: rgba(C.cyan, .9) });
  const sec = Math.floor(t) % 60;
  text(c, `LOG 2047.10.22  23:47:${String(sec).padStart(2, '0')}`, 120, 172, { size: 22, family: 'JB', weight: 400, color: rgba('#ffffff', .7), ls: 2 });
  (lines || []).forEach((l, i) => text(c, l, 120, 210 + i * 30, { size: 19, family: 'JB', color: rgba(C.cyan, .55), ls: 1 }));
  // 右下状态
  text(c, 'SYS ONLINE', W - 120, H - 150, { size: 20, family: 'JB', weight: 700, color: rgba(C.cyan, .8), align: 'right', ls: 4 });
  for (let i = 0; i < 12; i++) { c.fillStyle = rgba(C.cyan, (i < 9 + Math.floor(t * 3) % 4) ? .8 : .2); c.fillRect(W - 120 - 12 * 14 + i * 14, H - 138, 9, 14); }
  c.restore();
}

// 心电图波形
function ecg(x) { // x 以“拍”为单位，返回 -1..1
  const ph = x - Math.floor(x);
  const g = (m, s, a) => a * Math.exp(-((ph - m) ** 2) / (2 * s * s));
  return g(.18, .025, .12) - g(.36, .008, .18) + g(.39, .012, 1.0) - g(.42, .01, .32) + g(.62, .045, .26);
}

// 球面点
const SPHERE = once('sphere', () => {
  const N = 12000, pts = []; const r = rng(11);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i + .5) / N * 2, rad = Math.sqrt(1 - y * y), th = i * 2.399963229728653;
    pts.push([Math.cos(th) * rad, y, Math.sin(th) * rad, r(), r()]);
  }
  return pts;
});
const ARCS = once('arcs', () => { const r = rng(5), a = []; for (let i = 0; i < 70; i++) a.push([Math.floor(r() * 12000), Math.floor(r() * 12000), r(), .5 + r()]); return a; });
function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; }
function rotX(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
export function drawGlobe(c, cx, cy, R, t, o = {}) {
  const { alpha = 1, count = 12000, spin = t * .12, tilt = -.35, color = C.cyan, arcs = 1, warm = 0, highlight = 0 } = o;
  if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.globalCompositeOperation = 'lighter';
  // 大气光晕
  c.fillStyle = radial(c, cx, cy, R * 1.25, [[.75, rgba(color, 0)], [.82, rgba(color, .10)], [1, rgba(color, 0)]]); c.fillRect(cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6);
  for (let i = 0; i < count; i++) {
    const q = SPHERE[i]; let v = rotX(rotY(q, spin), tilt);
    const z = v[2]; const front = (z + 1) / 2;
    const x = cx + v[0] * R, y = cy - v[1] * R;
    const tw = q[3] > .985 ? (0.6 + .4 * Math.sin(t * 3 + q[4] * 20)) : 0;
    const a = (.08 + .5 * front * front) + tw * front;
    const big = q[3] > .985 || (highlight && q[4] < highlight);
    c.fillStyle = (warm && q[4] < warm) ? `rgba(255,180,90,${a})` : (big ? `rgba(200,250,255,${Math.min(1, a * 1.6)})` : `rgba(62,200,255,${a})`);
    const s = big ? 2.6 : 1.6; c.fillRect(x - s / 2, y - s / 2, s, s);
  }
  if (arcs > 0) {
    c.lineWidth = 1.4;
    for (const [i1, i2, ph, sp] of ARCS) {
      let a1 = rotX(rotY(SPHERE[i1], spin), tilt), a2 = rotX(rotY(SPHERE[i2], spin), tilt);
      if (a1[2] < -.2 && a2[2] < -.2) continue;
      const seg = 28; c.beginPath();
      const prog = ((t * .25 * sp + ph) % 1);
      for (let k = 0; k <= seg; k++) {
        const u = k / seg; let v = [lerp(a1[0], a2[0], u), lerp(a1[1], a2[1], u), lerp(a1[2], a2[2], u)];
        const L = Math.hypot(...v) || 1; const lift = 1 + .22 * Math.sin(u * Math.PI); v = v.map(x => x / L * lift);
        const x = cx + v[0] * R, y = cy - v[1] * R; if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = rgba(color, .16 * arcs); c.stroke();
      // 光点
      const u = prog; let v = [lerp(a1[0], a2[0], u), lerp(a1[1], a2[1], u), lerp(a1[2], a2[2], u)]; const L = Math.hypot(...v) || 1; const lift = 1 + .22 * Math.sin(u * Math.PI); v = v.map(x => x / L * lift);
      c.fillStyle = rgba('#ffffff', .9 * arcs); c.fillRect(cx + v[0] * R - 2, cy - v[1] * R - 2, 4, 4);
    }
  }
  c.restore();
}

// 漂浮粒子背景
export function dust(c, t, n = 160, color = '#9fdfff', a = .35, seed = 3) {
  const r = rng(seed); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x0 = r() * W, y0 = r() * H, sp = 6 + r() * 18, z = r();
    const x = (x0 + t * sp * (z + .3)) % (W + 40) - 20, y = (y0 + Math.sin(t * .4 + i) * 12 - t * sp * .3 * z + H * 10) % H;
    c.fillStyle = rgba(color, a * (.2 + .8 * z) * (.6 + .4 * Math.sin(t * 1.3 + i)));
    const s = 1 + z * 2.2; c.fillRect(x, y, s, s);
  }
  c.restore();
}

// ============================================================ s00 冷开场
def('s00_eye', {
  post: (S) => ({ bloom: .85, thr: .62, ca: .0022, vig: .5, grain: .042, tint: [.95, 1.0, 1.06], con: 1.06 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L1 = S.L('L001'), L2 = S.L('L002'), L3 = S.L('L003'), L4 = S.L('L004'), L5 = S.L('L005');
    // ---- 心电图开场
    if (t < 3.6) {
      const gA = smooth(p(t, .1, .8)) * (1 - smooth(p(t, 2.6, 3.3)));
      if (gA > 0) { c.save(); c.globalAlpha = gA * .5; c.strokeStyle = 'rgba(62,230,255,.10)'; c.lineWidth = 1;
        for (let x = 0; x < W; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
        for (let y = 20; y < H; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
        c.restore();
        text(c, '♥ 72', W - 150, 170, { size: 54, family: 'JB', weight: 700, color: C.cyan, align: 'right', alpha: gA });
        text(c, 'BPM · SUBJECT 012', W - 150, 206, { size: 20, family: 'JB', color: rgba(C.cyan, .6), align: 'right', ls: 3, alpha: gA }); }
      const head = p(t, .35, 2.55);
      const x0 = -40, x1 = W + 40, beats = 3.2;
      const hx = lerp(x0, x1, head);
      const fadeAll = 1 - smooth(p(t, 2.7, 3.3));
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineJoin = 'round';
      const step = 3;
      for (let x = x0; x < hx; x += step) {
        const u = (x - x0) / (x1 - x0); const y = H / 2 - ecg(u * beats + .55) * 260;
        const age = (hx - x) / 900; const a = Math.max(0, 1 - age) * fadeAll;
        if (a <= 0) continue;
        const u2 = (x + step - x0) / (x1 - x0); const y2 = H / 2 - ecg(u2 * beats + .55) * 260;
        c.strokeStyle = `rgba(62,230,255,${a})`; c.lineWidth = 4.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + step, y2); c.stroke();
      }
      if (head > 0 && head < 1) { const u = head; glowDot(c, hx, H / 2 - ecg(u * beats + .55) * 260, 46, C.cyan, fadeAll); }
      c.restore();
    }
    // ---- 眼睛
    const open = eOutExpo(p(t, 2.75, 4.2)) * (1 - .92 * env(t, 9.2, 9.5, .08, .12));// 中途眨眼
    const toMany = eInOut(p(t, L2.s + .6, L2.s + 2.6));
    const toGlobe = eInOut(p(t, L3.s - .4, L3.s + 1.4));
    const R = lerp(300, 120, toMany) * (1 + .04 * smooth(p(t, 3, 14)));
    const eyeA = 1 - smooth(p(t, L3.s - .2, L3.s + .8));
    const pupil = .30 + .06 * smooth(p(t, L1.s, L1.s + .8)) - .05 * smooth(p(t, L1.e, L1.e + 1)) + .02 * Math.sin(t * 1.7);
    hudRings(c, W / 2, H / 2, R, t, (smooth(p(t, 3.4, 4.6))) * (1 - toMany) * .9);
    // 百眼
    if (toMany > 0 && eyeA > 0) {
      const n = 100;
      for (let i = 1; i < n; i++) {
        const rr = 150 * Math.sqrt(i) * .78, th = i * 2.399963;
        const ex = W / 2 + Math.cos(th) * rr * 1.25, ey = H / 2 + Math.sin(th) * rr * .78;
        const delay = (i / n) * 1.8;
        const op = eOutBack(p(t, L2.s + 1.2 + delay, L2.s + 1.8 + delay), 1.2) * (1 - .9 * env(t, 9.5 + hash1(i) * 3, 9.7 + hash1(i) * 3, .06, .1));
        const er = (26 + 30 * (1 - i / n)) * (.9 + .2 * hash1(i * 3));
        drawEye(c, ex, ey, er, t + i, { open: op, alpha: eyeA * toMany, detail: .12, pupil: .3 + .05 * Math.sin(t + i), glow: .8 });
      }
    }
    drawEye(c, W / 2, H / 2, R, t, { open, pupil, alpha: eyeA, detail: 1 });
    // 神话铭文
    const myth = env(t, L2.s + .5, L2.e + .6, .8, .6);
    if (myth > 0) {
      text(c, 'ARGUS  PANOPTES', W / 2, 150, { size: 46, family: 'Cinzel', weight: 700, color: rgba('#e8f8ff', .92), align: 'center', ls: 22, alpha: myth });
      text(c, '百 眼 巨 人  ·  永 不 闭 眼 的 守 望 者', W / 2, 200, { size: 26, family: 'SHSerif', weight: 500, color: rgba(C.cyan, .85), align: 'center', ls: 6, alpha: myth });
    }
    // ---- 地球 / 12000 项试验
    const gA = smooth(p(t, L3.s - .2, L3.s + 1.4)) * (1 - smooth(p(t, L4.s + .4, L4.s + 1.6)));
    if (gA > 0) {
      const gR = lerp(120, 360, eOut(p(t, L3.s - .2, L3.s + 2))) * (1 - .9 * eIn(p(t, L4.s + .2, L4.s + 1.6)));
      const cnt = Math.floor(lerp(400, 12000, eOut(p(t, L3.s, L3.s + 2.8))));
      drawGlobe(c, W / 2, H / 2 + 10, gR, t, { alpha: gA, count: cnt, spin: t * .14 });
      const k = eOut(p(t, L3.s + .3, L3.s + 2.8));
      text(c, fmt(12000 * k), W - 330, 470, { size: 92, family: 'JB', weight: 700, color: '#fff', align: 'right', alpha: gA });
      text(c, '项临床试验 · 实时监查中', W - 330, 520, { size: 28, family: 'SHSans', weight: 500, color: C.cyan, align: 'right', alpha: gA });
      text(c, 'ACTIVE TRIALS / LIVE', W - 330, 556, { size: 20, family: 'JB', color: rgba(C.cyan, .6), align: 'right', ls: 4, alpha: gA });
      line(c, W - 330, 580, W - 640, 580, rgba(C.cyan, .5), 2, gA);
    }
    // ---- 1.1%
    const nA = env(t, L4.s + 1.9, L5.s + .3, .15, .9);
    if (nA > 0) {
      const g0 = Math.max(0, 1 - p(t, L4.s + 1.9, L4.s + 2.6)) + (hash1(Math.floor(t * 18)) > .93 ? .6 : 0);
      S.post.glitch = Math.max(S.post.glitch, g0 * .8);
      const fl = (t < L4.s + 2.4) ? (hash1(Math.floor(t * 30)) > .4 ? 1 : .25) : 1;
      const dis = p(t, L4.e + 1.2, L5.s + .3);
      c.save(); c.globalAlpha = nA * fl;
      // 分层切片
      const sz = 330; const str = '1.1%';
      for (let k = 0; k < 9; k++) {
        const y0 = H / 2 - sz * .62 + k * sz * .14, hh = sz * .14;
        const off = (hash2(k, Math.floor(t * 20)) - .5) * 60 * g0 + Math.sin(k * 3 + t * 2) * dis * 140;
        c.save(); c.beginPath(); c.rect(0, y0, W, hh + 1); c.clip();
        text(c, str, W / 2 + off, H / 2 + sz * .36, { size: sz, family: 'SHSerif', weight: 900, color: k % 3 === 0 ? '#ff5a74' : '#ff3b5c', align: 'center', alpha: 1 - dis });
        c.restore();
      }
      text(c, '[ ARCHIVE · 2014 ]', W / 2, H / 2 + 270, { size: 26, family: 'JB', color: rgba('#ffffff', .6), align: 'center', ls: 10, alpha: 1 - dis });
      c.restore();
      // 溶解为粒子
      if (dis > 0) {
        const r = rng(9); c.save(); c.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 1400; i++) {
          const x = W / 2 + (r() - .5) * 760, y = H / 2 + (r() - .5) * 260; const vx = (r() - .5) * 600, vy = -200 - r() * 500;
          const k = eOut(dis); c.fillStyle = `rgba(255,80,110,${(1 - dis) * .8})`;
          c.fillRect(x + vx * k, y + vy * k * k, 2.4, 2.4);
        }
        c.restore();
      }
    }
    // ---- 倒带 2047 → 2026
    const rw = p(t, L5.s + .2, L5.e - .3);
    if (t > L5.s - .1) {
      const a = smooth(p(t, L5.s - .1, L5.s + .5));
      const yr = Math.round(lerp(2047, 2026, eInOut(rw)));
      c.save(); c.globalAlpha = a;
      // 速度线
      c.globalCompositeOperation = 'lighter';
      const r = rng(21);
      for (let i = 0; i < 90; i++) {
        const y = r() * H, len = 200 + r() * 700, sp = 1400 + r() * 2600;
        const x = W - ((t * sp + r() * W * 3) % (W + len * 2)) + len;
        c.fillStyle = rgba(C.cyan, .05 + .12 * r()); c.fillRect(x, y, len, 1 + r() * 2);
      }
      c.globalCompositeOperation = 'source-over';
      const jitter = (rw > 0 && rw < 1) ? (hash1(Math.floor(t * 30)) - .5) * 10 : 0;
      text(c, String(yr), W / 2 + jitter, H / 2 + 80, { size: 260, family: 'JB', weight: 800, color: '#fff', align: 'center', ls: 10 });
      text(c, '◀◀  REWIND  ·  回溯归档影像', W / 2, H / 2 + 170, { size: 28, family: 'SHSans', weight: 500, color: C.cyan, align: 'center', ls: 6 });
      c.restore();
      S.post.scan = .12 * a; S.post.glitch = Math.max(S.post.glitch, (rw > 0 && rw < 1) ? .12 : 0);
    }
    hudCorner(c, t, smooth(p(t, 3.6, 4.8)) * (1 - smooth(p(t, L5.s, L5.s + .5))) * (1 - .85 * myth), ['MODE: OBSERVE', 'TRIALS: 12,000 / SUBJECTS: 4.0M', 'SIGNAL: NOMINAL']);
    S.post.mark = true; S.post.markA = smooth(p(t, 4, 6));
  },
});
transition('s01_hotel', { type: 'white', d: .5 });

// ============================================================ s01 2026 深夜酒店
const CITY = once('city', () => {
  const r = rng(42), b = [];
  let x = 0;
  while (x < 1100) { const w = 30 + r() * 80, h = 80 + r() * 330; b.push({ x, w, h, d: r(), win: [] }); x += w + r() * 10; }
  for (const bd of b) { const cols = Math.floor(bd.w / 11), rows = Math.floor(bd.h / 14); for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (r() < .32) bd.win.push([i, j, r()]); }
  return b;
});
export function drawRoom(c, t, S) {
  // 墙面
  c.fillStyle = '#0a0f17'; c.fillRect(-300, -300, W + 600, H + 600);
  c.fillStyle = radial(c, 1000, 520, 1200, [[0, '#1a2640'], [1, '#05080e']]); c.fillRect(-300, -300, W + 600, H + 600);
  // 窗
  const wx = 420, wy = 110, ww = 1040, wh = 560;
  c.save(); rrect(c, wx, wy, ww, wh, 6); c.clip();
  c.fillStyle = radial(c, wx + ww * .6, wy + wh, 900, [[0, '#33264a'], [.5, '#141c38'], [1, '#070b17']]); c.fillRect(wx, wy, ww, wh);
  for (const layer of [0, 1]) {
    for (const bd of CITY) {
      if ((bd.d > .5) !== !!layer) continue;
      const sc = layer ? 1 : .7; const bx = wx - 40 + bd.x * (layer ? 1.05 : .95) + (layer ? -t * 2 : -t * 1);
      const bh = bd.h * sc, by = wy + wh - bh;
      c.fillStyle = layer ? '#0b0f1b' : '#161d31'; c.fillRect(bx, by, bd.w * sc, bh);
      for (const [i, j, k] of bd.win) {
        const on = k > .25 || Math.sin(t * .5 + k * 40) > .3; if (!on) continue;
        c.fillStyle = k > .7 ? `rgba(255,200,120,${layer ? .9 : .55})` : `rgba(150,200,255,${layer ? .65 : .38})`;
        c.fillRect(bx + 4 + i * 11 * sc, by + 6 + j * 14 * sc, 5 * sc, 7 * sc);
      }
    }
  }
  if (Math.sin(t * 3) > .6) glowDot(c, wx + 640, wy + 205, 16, '#ff4040', .9);
  const r = rng(77); c.strokeStyle = 'rgba(180,210,255,.12)'; c.lineWidth = 1;
  for (let i = 0; i < 160; i++) { const x = wx + r() * ww, sp = 300 + r() * 300, y = wy + ((r() * wh + t * sp) % wh); c.beginPath(); c.moveTo(x, y); c.lineTo(x - 6, y + 22); c.stroke(); }
  for (let i = 0; i < 70; i++) { const x = wx + r() * ww, y = wy + r() * wh; circle(c, x, y + Math.sin(t + i) * 2, 1.5 + r() * 2.5, { fill: 'rgba(200,225,255,.13)' }); }
  c.restore();
  c.strokeStyle = '#1d2536'; c.lineWidth = 18; rrect(c, wx, wy, ww, wh, 6); c.stroke();
  c.fillStyle = '#1d2536'; c.fillRect(wx + ww / 2 - 6, wy, 12, wh);
  for (let i = 0; i < 8; i++) { const x = wx - 175 + i * 22; c.fillStyle = i % 2 ? '#151b29' : '#10151f'; c.fillRect(x, wy - 60, 26, wh + 200); }
  // 门（左）+ 门缝走廊光
  c.fillStyle = '#0e131d'; c.fillRect(-40, 60, 250, 905); c.strokeStyle = '#1c2434'; c.lineWidth = 6; c.strokeRect(-40, 60, 250, 905);
  circle(c, 175, 560, 9, { fill: '#6a7286' });
  c.save(); c.globalCompositeOperation = 'lighter';
  c.fillStyle = 'rgba(255,200,130,.85)'; c.fillRect(-40, 958, 250, 5);
  c.fillStyle = radial(c, 90, 965, 330, [[0, 'rgba(255,190,120,.30)'], [1, 'rgba(255,190,120,0)']]); c.fillRect(-260, 760, 700, 400);
  c.restore();
  drawSuitcase(c, 300, 960, 1.18, t);
  // 桌面
  c.fillStyle = '#1c1611'; c.beginPath(); c.moveTo(430, 772); c.lineTo(1760, 772); c.lineTo(1960, 1100); c.lineTo(330, 1100); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,190,120,.07)'; c.fillRect(430, 772, 1330, 6);
  // 台灯
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = radial(c, 560, 740, 430, [[0, 'rgba(255,170,90,.30)'], [1, 'rgba(255,170,90,0)']]); c.fillRect(100, 300, 900, 800); c.restore();
  c.fillStyle = '#2a2018'; c.fillRect(555, 640, 10, 132); c.beginPath(); c.moveTo(505, 645); c.lineTo(615, 645); c.lineTo(588, 600); c.lineTo(532, 600); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,200,130,.9)'; c.fillRect(522, 644, 76, 3);
  // 纸堆 + 便利贴 + 荧光笔
  for (let i = 0; i < 10; i++) { c.fillStyle = i % 2 ? '#d9d2c3' : '#c9c1af'; c.save(); c.translate(690, 800 - i * 7); c.rotate((hash1(i) - .5) * .06); c.fillRect(-105, -10, 210, 12); c.restore(); }
  c.fillStyle = '#e8b33d'; c.fillRect(612, 724, 40, 40); c.fillStyle = '#7ad3ff'; c.fillRect(720, 732, 34, 34);
  c.save(); c.translate(660, 880); c.rotate(-.35); c.fillStyle = '#f2e14a'; c.fillRect(-62, -8, 124, 16); c.fillStyle = '#222'; c.fillRect(48, -8, 14, 16); c.restore();
  // 闹钟（笔记本右侧）
  c.fillStyle = '#0c0c0e'; rrect(c, 1298, 716, 132, 60, 10); c.fill();
  text(c, '23:47', 1364, 760, { size: 40, family: 'JB', weight: 700, color: '#ff4a3a', align: 'center' });
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = radial(c, 1364, 746, 120, [[0, 'rgba(255,60,40,.18)'], [1, 'rgba(255,60,40,0)']]); c.fillRect(1260, 640, 260, 220); c.restore();
}
export function drawSuitcase(c, x, y, s, t) {
  c.save(); c.translate(x, y); c.scale(s, s);
  // 投影
  c.fillStyle = 'rgba(0,0,0,.5)'; c.beginPath(); c.ellipse(10, 6, 95, 14, 0, 0, TAU); c.fill();
  c.fillStyle = '#34466a'; rrect(c, -72, -240, 144, 240, 18); c.fill();
  c.fillStyle = 'rgba(255,200,140,.18)'; rrect(c, -72, -240, 30, 240, 18); c.fill();// 暖光侧
  c.strokeStyle = '#4a5f8c'; c.lineWidth = 4; for (let i = -40; i <= 40; i += 40) { c.beginPath(); c.moveTo(i, -230); c.lineTo(i, -10); c.stroke(); }
  c.fillStyle = '#212b40'; c.fillRect(-36, -345, 9, 108); c.fillRect(27, -345, 9, 108); c.fillRect(-38, -352, 76, 14);
  circle(c, -50, 4, 13, { fill: '#0a0d14' }); circle(c, 50, 4, 13, { fill: '#0a0d14' });
  c.save(); c.translate(56, -214); c.rotate(.16 + Math.sin(t * 1.2) * .04); c.strokeStyle = '#888'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(8, 16); c.stroke();
  c.fillStyle = '#e8b33d'; rrect(c, 0, 14, 36, 56, 5); c.fill(); c.fillStyle = '#7a5a10'; c.fillRect(6, 26, 24, 3); c.fillRect(6, 34, 18, 3); c.restore();
  c.fillStyle = '#c94d4d'; c.beginPath(); c.arc(-28, -128, 17, 0, TAU); c.fill();
  c.fillStyle = '#e9e1cf'; rrect(c, -4, -84, 54, 28, 5); c.fill();
  c.fillStyle = '#4fb38a'; rrect(c, -50, -200, 40, 22, 4); c.fill();
  c.restore();
}
export function drawLaptop(c, t, S) {
  const x = 780, y = 470, w = 500, h = 290;
  c.save();
  c.fillStyle = '#0d1016'; rrect(c, x - 14, y - 14, w + 28, h + 28, 14); c.fill();
  c.fillStyle = '#b9c4d6'; c.fillRect(x, y, w, h);
  c.fillStyle = '#25508f'; c.fillRect(x, y, w, 34);
  text(c, '监查访视报告  Monitoring Visit Report', x + 14, y + 23, { size: 15, family: 'SHSans', weight: 700, color: '#e8f0ff' });
  text(c, '第 37 / 52 页', x + w - 14, y + 23, { size: 14, family: 'SHSans', color: '#c8d8f8', align: 'right' });
  text(c, '中心 012 · 第 3 次常规监查访视', x + 18, y + 60, { size: 15, family: 'SHSans', weight: 700, color: '#1d2433' });
  const r = rng(3);
  for (let i = 0; i < 8; i++) { c.fillStyle = '#8e9ab0'; c.fillRect(x + 18, y + 78 + i * 18, (w - 60) * (.5 + .5 * r()), 7); }
  const L7 = S.L('L007'); const ck = p(t, L7.s + 2.2, L7.s + 3.6);
  c.strokeStyle = '#6f7d96'; c.lineWidth = 1; c.strokeRect(x + 18, y + 222, w - 36, 52);
  text(c, '知情同意书（ICF）版本号核对', x + 28, y + 244, { size: 14, family: 'SHSans', weight: 500, color: '#1d2433' });
  text(c, '受试者 012 · V3.0 / 2026-06-18', x + 28, y + 265, { size: 13, family: 'JB', color: '#3a4458' });
  if (ck > 0) text(c, '✓ 核对无误', x + w - 30, y + 256, { size: 16, family: 'SHSans', weight: 700, color: '#137a45', align: 'right', alpha: ck });
  if (Math.floor(t * 2) % 2 === 0) { c.fillStyle = '#1d2433'; c.fillRect(x + 18 + (w - 60) * .62, y + 78 + 7 * 18 - 4, 2, 15); }
  c.restore();
  c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = radial(c, x + w / 2, y + h / 2, 720, [[0, 'rgba(140,180,255,.16)'], [1, 'rgba(140,180,255,0)']]); c.fillRect(x - 650, y - 420, w + 1300, h + 950); c.restore();
  c.fillStyle = '#151922'; c.beginPath(); c.moveTo(x - 30, y + h + 14); c.lineTo(x + w + 30, y + h + 14); c.lineTo(x + w + 70, y + h + 62); c.lineTo(x - 70, y + h + 62); c.closePath(); c.fill();
}
export function drawPerson(c, t) {
  // 背影（右前景）：缩小并右移，露出闹钟
  const x = 1690, y = 1090; const br = Math.sin(t * 1.1) * 3;
  c.save(); c.translate(x, y + br); c.scale(.86, .86);
  c.fillStyle = '#06080c'; rrect(c, -265, -430, 530, 480, 44); c.fill();// 椅背
  c.fillStyle = '#0c1017';
  c.beginPath(); c.moveTo(-255, 0); c.bezierCurveTo(-255, -270, -175, -352, 0, -362); c.bezierCurveTo(175, -352, 248, -270, 248, 0); c.closePath(); c.fill();
  // 左臂伸向键盘
  c.beginPath(); c.moveTo(-200, -230); c.bezierCurveTo(-300, -200, -380, -170, -470, -170); c.lineTo(-470, -120); c.bezierCurveTo(-370, -120, -280, -150, -190, -150); c.closePath(); c.fill();
  c.fillRect(-42, -425, 84, 80);
  c.beginPath(); c.ellipse(0, -505, 92, 108, 0, 0, TAU); c.fill();
  // 发髻 + 碎发
  c.beginPath(); c.ellipse(12, -606, 48, 42, -.2, 0, TAU); c.fill();
  c.strokeStyle = '#0c1017'; c.lineWidth = 3; for (let i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-60 + i * 22, -420); c.quadraticCurveTo(-64 + i * 22 + Math.sin(t + i) * 3, -395, -58 + i * 22, -380); c.stroke(); }
  // 轮廓光
  c.strokeStyle = 'rgba(160,200,255,.7)'; c.lineWidth = 4.5;
  c.beginPath(); c.ellipse(0, -505, 92, 108, 0, Math.PI * .7, Math.PI * 1.35); c.stroke();
  c.beginPath(); c.moveTo(-250, -40); c.bezierCurveTo(-250, -255, -180, -344, -42, -360); c.stroke();
  c.strokeStyle = 'rgba(160,200,255,.45)'; c.beginPath(); c.ellipse(12, -606, 48, 42, -.2, Math.PI * .8, Math.PI * 1.5); c.stroke();
  c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-470, -170); c.bezierCurveTo(-380, -170, -300, -200, -205, -232); c.stroke();
  // 耳机线（细节）
  c.strokeStyle = 'rgba(230,230,240,.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-70, -470); c.bezierCurveTo(-90, -400, -60, -330, -110, -250); c.stroke();
  c.restore();
}

def('s01_hotel', {
  post: { bloom: .42, thr: .8, ca: .0024, vig: .55, grain: .055, tint: [1.02, .98, 1.02], con: 1.05, sat: .92 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L6 = S.L('L006'), L7 = S.L('L007'), L8 = S.L('L008'), L9 = S.L('L009');
    // 镜头：缓推 + 第8句时向左摇到拉杆箱，第9句回到人物
    const pan = eInOut(p(t, L8.s - .3, L8.s + 1.6)) - eInOut(p(t, L9.s - .4, L9.s + 1.2));
    const zoom = 1.04 + .07 * smooth(p(t, 0, S.dur)) + .1 * pan;
    const fx = lerp(1040, 520, pan), fy = lerp(560, 720, pan);
    c.save();
    c.translate(W / 2, H / 2); c.scale(zoom, zoom); c.translate(-fx, -fy);
    drawRoom(c, t, S);
    drawLaptop(c, t, S);
    // 前景人物（视差更强）
    c.save(); c.translate((fx - 1040) * .08, 0); drawPerson(c, t); c.restore();
    c.restore();
    // 档案影像质感：上下遮幅 + 时间码
    const fg = S.fg;
    fg.fillStyle = '#000'; fg.fillRect(0, 0, W, 64); fg.fillRect(0, H - 64, W, 64);
    const a0 = smooth(p(t, .3, 1.2));
    text(fg, '● ARCHIVE', 110, 118, { size: 22, family: 'JB', weight: 700, color: C.red, ls: 4, alpha: a0 * (Math.floor(t * 1.5) % 2 ? 1 : .35) });
    text(fg, `2026.10.22  23:47:${String(12 + Math.floor(t)).padStart(2, '0')}  ·  归档影像 #A-2026-1022`, 290, 118, { size: 22, family: 'JB', color: rgba('#fff', .75), alpha: a0 });
    // 把场景坐标映射到屏幕
    const toS = (x, y) => [W / 2 + (x - fx) * zoom, H / 2 + (y - fy) * zoom];
    // HUD 标注
    const [lx, ly] = toS(1030, 480);
    tag(fg, lx, ly, lx - 520, ly - 300, ['监查访视报告 · 第 37 页', 'MVR · DRAFT · 23:47'], { prog: p(t, L6.s + 3.5, L6.s + 5), alpha: env(t, L6.s + 3.5, L8.s - .2, .3, .4), size: 26 });
    const [ix, iy] = toS(1200, 735);
    tag(fg, ix, iy, ix - 610, iy + 80, ['ICF 版本号 ✓', 'SUBJECT 012 · V3.0'], { color: C.green, prog: p(t, L7.s + 2.6, L7.s + 3.8), alpha: env(t, L7.s + 2.6, L8.s, .3, .4), size: 26 });
    const [sx, sy] = toS(300, 790);
    tag(fg, sx, sy, sx + 120, sy - 260, ['拉杆箱 · 本月第 9 次出差', 'TRIPS 10月: 9 / 22 DAYS ON ROAD'], { color: C.amber, prog: p(t, L8.s + .9, L8.s + 2.2), alpha: env(t, L8.s + .9, L9.s + .5, .3, .5), size: 26 });
    if (t > L8.s + 1.6) { // 行程条
      const a = env(t, L8.s + 1.6, L9.s + .4, .4, .4);
      for (let i = 0; i < 31; i++) {
        const trip = [1, 2, 5, 6, 9, 12, 13, 16, 19, 20, 22].includes(i); const k = smooth(p(t, L8.s + 1.6 + i * .03, L8.s + 1.9 + i * .03));
        fg.fillStyle = trip ? rgba(C.amber, .9 * a * k) : rgba('#fff', .18 * a * k); fg.fillRect(sx + 120 + i * 17, sy - 160, 12, 26);
      }
      text(fg, '10 月', sx + 120, sy - 172, { size: 18, family: 'SHSans', color: rgba('#fff', .7), alpha: a });
    }
    // 第9句：锁定人物
    const [px, py] = toS(1690, 700);
    const lock = env(t, L9.s, S.dur + 1, .3, .1);
    if (lock > 0) {
      const k = eOutExpo(p(t, L9.s, L9.s + .8)); const bw = lerp(820, 470, k), bh = lerp(820, 560, k);
      brackets(fg, px - bw / 2, py - bh / 2, bw, bh, { alpha: lock, len: 40, lw: 3 });
      tag(fg, px - bw / 2, py - bh / 2 + 80, px - bw / 2 - 420, py - bh / 2 + 40, ['林夏  LIN XIA', 'CRA · 临床监查员 · 已标记 ◆'], { prog: p(t, L9.s + .5, L9.s + 1.8), alpha: lock, size: 30 });
      const mk = p(t, L9.s + 2.0, L9.s + 2.4); if (mk > 0) text(fg, '[ MARKED ]', px, py - bh / 2 - 18, { size: 26, family: 'JB', weight: 700, color: C.cyan, align: 'center', ls: 8, alpha: lock * mk });
    }
    S.post.flash = Math.max(S.post.flash, (1 - smooth(p(t, 0, .35))) * .0);
  },
});
transition('s02_title', { type: 'glitch', d: .5 });

// ============================================================ s02 片名
def('s02_title', {
  post: (S) => ({ bloom: .62, thr: .68, ca: .0025, vig: .5, grain: .04, mark: false }),
  draw(S) {
    const c = S.ctx, t = S.t;
    c.fillStyle = '#020409'; c.fillRect(0, 0, W, H);
    dust(c, t, 220, '#8fdcff', .45, 12);
    // 背后巨眼（极淡）
    drawEye(c, W / 2, H / 2 - 20, 380, t + 30, { open: eOut(p(t, 0, 1.4)), alpha: .16, detail: .5, glow: .6 });
    const hit = p(t, .25, .75);
    S.post.glitch = (t > .2 && t < .7) ? .8 * (1 - hit) : 0;
    S.post.ca = .0025 + .02 * Math.max(0, 1 - p(t, .25, 1.2));
    S.post.flash = .35 * Math.max(0, 1 - p(t, .25, .55)) * (t > .25 ? 1 : 0);
    const a = smooth(p(t, .25, .5)) * (1 - smooth(p(t, 5.6, 6.4)));
    // 主标题：切片拼合
    const str = '监查者', sz = 250;
    for (let k = 0; k < 12; k++) {
      const y0 = H / 2 - 210 + k * 22; const off = (1 - eOutExpo(p(t, .25 + k * .02, 1.1 + k * .02))) * (k % 2 ? 1 : -1) * (300 + hash1(k) * 400);
      c.save(); c.beginPath(); c.rect(0, y0, W, 23); c.clip();
      text(c, str, W / 2 + off, H / 2 + 40, { size: sz, family: 'SHSerif', weight: 900, color: '#ffffff', align: 'center', ls: 40, alpha: a });
      c.restore();
    }
    // 扫光
    const sw = p(t, 1.6, 3.2);
    if (sw > 0 && sw < 1) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = a * .7;
      const gx = lerp(W / 2 - 600, W / 2 + 600, sw); const g = c.createLinearGradient(gx - 120, 0, gx + 120, 0);
      g.addColorStop(0, 'rgba(62,230,255,0)'); g.addColorStop(.5, 'rgba(160,245,255,.65)'); g.addColorStop(1, 'rgba(62,230,255,0)');
      c.fillStyle = g; c.font = `900 ${sz}px SHSerif`; c.textAlign = 'center'; c.letterSpacing = '40px'; c.fillText(str, W / 2, H / 2 + 40);
      c.restore();
    }
    const b = smooth(p(t, 1.0, 1.8)) * (1 - smooth(p(t, 5.6, 6.4)));
    text(c, 'T H E   M O N I T O R', W / 2, H / 2 - 220, { size: 34, family: 'Cinzel', weight: 700, color: rgba(C.cyan, .95), align: 'center', ls: 10, alpha: b });
    line(c, W / 2 - 330 * b, H / 2 + 112, W / 2 + 330 * b, H / 2 + 112, rgba('#ffffff', .6), 2, b);
    text(c, 'AI × 临床试验监查 · 过去与未来', W / 2, H / 2 + 178, { size: 44, family: 'SHSerif', weight: 600, color: '#fff', align: 'center', ls: 8, alpha: smooth(p(t, 1.5, 2.3)) * (1 - smooth(p(t, 5.6, 6.4))) });
    text(c, '1747 ——— 2047', W / 2, H / 2 + 240, { size: 26, family: 'JB', weight: 500, color: rgba('#ffffff', .6), align: 'center', ls: 12, alpha: smooth(p(t, 2, 2.8)) * (1 - smooth(p(t, 5.6, 6.4))) });
    text(c, '本片中的“阿格斯”及 2027—2047 年情节为基于现实趋势的虚构推演；历史事件与数据均有公开来源（见简介）', W / 2, H - 60, { size: 20, family: 'SHSans', color: rgba('#ffffff', .5), align: 'center', alpha: smooth(p(t, 2.6, 3.4)) * (1 - smooth(p(t, 5.6, 6.4))) });
    text(c, '◇ 支线进行中 出品', W / 2, H - 120, { size: 26, family: 'SHSans', weight: 500, color: rgba('#ffffff', .7), align: 'center', ls: 6, alpha: smooth(p(t, 2.6, 3.4)) * (1 - smooth(p(t, 5.6, 6.4))) });
  },
});
transition('s03_1747', { type: 'black', d: .9 });
