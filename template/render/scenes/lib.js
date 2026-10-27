// 可复用视觉组件库（来自《监查者》）。每个函数都是 (ctx, 位置, 尺寸, t, 选项) → 直接绘制，纯函数、可随时间动画。
import { W, H, C, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2, fbm,
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
export function hudRings(c, x, y, R, t, a) {
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

export function hudCorner(c, t, a, lines) {
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
export function ecg(x) { // x 以“拍”为单位，返回 -1..1
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
export function rotY(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]; }
export function rotX(v, a) { const c = Math.cos(a), s = Math.sin(a); return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]; }
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


// ------------------------------------------------------------ 纸张纹理（缓存）
export const PAPER = once('paper', () => {
  const cv = mkCanvas(W, H), c = cv.getContext('2d');
  c.fillStyle = '#d4c19b'; c.fillRect(0, 0, W, H);
  const img = c.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const n = fbm(x / 180, y / 180, 4) * 18 + fbm(x / 22, y / 22, 2) * 6 + (hash2(x, y) - .5) * 10;
    const edge = Math.min(x, y, W - x, H - y); const burn = edge < 140 ? (140 - edge) / 140 : 0;
    d[i] = clamp(212 + n - burn * 80, 0, 255); d[i + 1] = clamp(193 + n - burn * 92, 0, 255); d[i + 2] = clamp(152 + n * .8 - burn * 95, 0, 255);
  }
  c.putImageData(img, 0, 0);
  // 污渍
  const r = rng(4); for (let k = 0; k < 14; k++) { const x = r() * W, y = r() * H, rr = 30 + r() * 140; c.fillStyle = radial(c, x, y, rr, [[0, 'rgba(120,80,30,.10)'], [.7, 'rgba(120,80,30,.05)'], [1, 'rgba(120,80,30,0)']]); c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return cv;
});
export const INK = '#2a1d10', INK2 = 'rgba(42,29,16,';

// ------------------------------------------------------------ 帆船剪影
export function ship(c, x, y, s, t, o = {}) {
  const { alpha = 1, ink = '#120c06', sail = 'rgba(214,196,160,.85)' } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y + Math.sin(t * .8) * 6 * s); c.rotate(Math.sin(t * .6) * .025); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // 桅与帆
  const masts = [[-140, 330], [0, 390], [140, 300]];
  for (const [mx, mh] of masts) {
    c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.moveTo(mx, -40); c.lineTo(mx, -40 - mh); c.stroke();
    const rows = 3; for (let k = 0; k < rows; k++) {
      const y0 = -60 - mh * (k / rows) * .92, y1 = -60 - mh * ((k + 1) / rows) * .92 + 12; const w0 = 110 - k * 22, w1 = 92 - k * 22;
      const bill = 14 + 6 * Math.sin(t * .9 + k + mx);
      c.fillStyle = sail; c.strokeStyle = ink; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(mx - w1, y1); c.lineTo(mx + w1, y1); c.quadraticCurveTo(mx + w0 + bill, (y0 + y1) / 2, mx + w0, y0); c.lineTo(mx - w0, y0); c.quadraticCurveTo(mx - w0 + bill * .6, (y0 + y1) / 2, mx - w1, y1); c.closePath(); c.fill(); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(mx - w1 - 10, y1); c.lineTo(mx + w1 + 10, y1); c.stroke();
    }
    c.fillStyle = ink; c.beginPath(); c.moveTo(mx, -40 - mh); c.lineTo(mx + 34, -40 - mh + 8 + Math.sin(t * 2 + mx) * 3); c.lineTo(mx, -40 - mh + 16); c.closePath(); c.fill();
  }
  // 索具
  c.strokeStyle = 'rgba(18,12,6,.7)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-140, -370); c.lineTo(-300, -40); c.moveTo(0, -430); c.lineTo(-300, -40); c.moveTo(0, -430); c.lineTo(330, -60); c.moveTo(140, -340); c.lineTo(330, -60); c.stroke();
  // 船身
  c.fillStyle = ink; c.beginPath(); c.moveTo(-300, -70); c.lineTo(-260, -30); c.quadraticCurveTo(-220, 40, -120, 46); c.lineTo(160, 46); c.quadraticCurveTo(260, 30, 300, -40); c.lineTo(330, -60); c.lineTo(250, -50); c.lineTo(-250, -50); c.closePath(); c.fill();
  c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(280, -50); c.lineTo(420, -110); c.stroke();// 船首斜桅
  c.fillStyle = 'rgba(255,190,110,.55)'; for (let i = 0; i < 11; i++) c.fillRect(-200 + i * 36, -18, 12, 9);// 炮门微光
  c.restore();
  glowDot(c, x - 290 * s, y - 70 * s + Math.sin(t * .8) * 6 * s, 50 * s, '#ffb35a', .8 * alpha);// 船尾灯
}
export function sea(c, t, horizon, o = {}) {
  const { ink = 'rgba(15,10,5,', moonX = 1400 } = o;
  for (let i = 0; i < 22; i++) {
    const y0 = horizon + Math.pow(i / 22, 1.7) * (H - horizon + 40);
    const amp = 2 + i * .9, fr = .012 - i * .0003, sp = .5 + i * .04;
    c.strokeStyle = ink + (.25 + i * .025) + ')'; c.lineWidth = 1 + i * .12;
    c.beginPath();
    for (let x = -20; x <= W + 20; x += 14) { const y = y0 + Math.sin(x * fr + t * sp + i * 1.7) * amp + noise2(x * .004 + i, t * .2) * amp; if (x === -20) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
  }
  // 月光倒影
  const r = rng(13); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const yy = horizon + 6 + r() * (H - horizon); const k = (yy - horizon) / (H - horizon); const w = 20 + r() * 90 * (1 + k * 2); const x = moonX + (r() - .5) * (60 + k * 300) + Math.sin(t + i) * 8; c.fillStyle = `rgba(255,235,190,${.10 + .18 * (1 - k) * (.5 + .5 * Math.sin(t * 2 + i))})`; c.fillRect(x - w / 2, yy, w, 2); }
  c.restore();
}

// ------------------------------------------------------------ 水兵（墨线小人）
export function sailor(c, x, y, s, u, o = {}) { // u: 0 病倒 → 1 站起
  const { col = INK, alpha = 1, lw = 4 } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const hip = [0, lerp(-46, -70, u)], neck = [lerp(22, 2, u), lerp(-80, -128, u)], head = [lerp(30, 4, u), lerp(-98, -150, u)];
  c.beginPath(); c.arc(head[0], head[1], 13, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.quadraticCurveTo(lerp(-6, 0, u), lerp(-70, -100, u), neck[0], neck[1]); c.stroke();
  // 腿
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(lerp(34, 6, u), lerp(-26, -36, u)); c.lineTo(lerp(44, 10, u), 0); c.stroke();
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(lerp(26, -8, u), lerp(-20, -36, u)); c.lineTo(lerp(52, -12, u), lerp(-4, 0, u)); c.stroke();
  // 手臂
  c.beginPath(); c.moveTo(neck[0] - 2, neck[1] + 10); c.lineTo(lerp(34, -22, u), lerp(-58, -96, u)); c.lineTo(lerp(42, -30, u), lerp(-40, -64, u)); c.stroke();
  if (u > .5) { c.beginPath(); c.moveTo(neck[0] + 2, neck[1] + 10); c.lineTo(lerp(20, 28, u), lerp(-80, -110, u)); c.lineTo(lerp(24, 44, u), lerp(-70, -140, u)); c.stroke(); }
  c.restore();
}

// ------------------------------------------------------------ 印章
export function stamp(c, x, y, lines, o = {}) {
  const { col = '#c4162f', rot = -.08, k = 1, w = 520, h = 150, alpha = 1, seed = 1, size = 44 } = o;
  if (k <= 0) return;
  const sc = lerp(1.5, 1, eOutBack(k, 1.4)); const a = smooth(p(k, 0, .25)) * alpha;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
  c.strokeStyle = col; c.lineWidth = 6; rrect(c, -w / 2, -h / 2, w, h, 10); c.stroke(); c.lineWidth = 2; rrect(c, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 6); c.stroke();
  lines.forEach((l, i) => text(c, l, 0, -h / 2 + (i + 1) * (h / (lines.length + 1)) + size * .35 * (i === 0 ? 1 : .7), { size: i === 0 ? size : size * .55, family: i === 0 ? 'SHSerif' : 'SHSans', weight: i === 0 ? 900 : 700, color: col, align: 'center', ls: i === 0 ? 6 : 2 }));
  // 做旧：随机擦除点
  c.globalCompositeOperation = 'destination-out'; const r = rng(seed);
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(0,0,0,${.3 + r() * .7})`; const s = r() * 4; c.fillRect((r() - .5) * w, (r() - .5) * h, s, s); }
  c.restore();
}


export function hazard(c, y, h, t, a) {
  c.save(); c.globalAlpha = a; c.beginPath(); c.rect(0, y, W, h); c.clip(); c.fillStyle = '#f2c230'; c.fillRect(0, y, W, h);
  c.fillStyle = '#111'; const off = (t * 120) % 80; for (let x = -200; x < W + 200; x += 80) { c.beginPath(); c.moveTo(x + off, y + h); c.lineTo(x + off + 40, y + h); c.lineTo(x + off + 40 + h, y); c.lineTo(x + off + h, y); c.closePath(); c.fill(); }
  c.restore();
}
export function warp(c, t, k, col = '#9fe9ff') { // 超空间拉丝
  if (k <= 0) return; const r = rng(66); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i++) {
    const a = r() * TAU, d0 = r(); const sp = .4 + r() * 1.6; const d = ((d0 + t * sp * .6) % 1);
    const r0 = Math.pow(d, 2.2) * 1400, r1 = r0 + (40 + 900 * k) * d;
    c.strokeStyle = rgba(col, (.15 + .6 * d) * k); c.lineWidth = 1 + 2 * d;
    c.beginPath(); c.moveTo(W / 2 + Math.cos(a) * r0, H / 2 + Math.sin(a) * r0); c.lineTo(W / 2 + Math.cos(a) * r1, H / 2 + Math.sin(a) * r1); c.stroke();
  }
  c.restore();
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
