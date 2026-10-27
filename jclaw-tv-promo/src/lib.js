// Toolkit: fonts, math, easing, noise, colour, 3D camera, perspective texture mapping, text helpers.
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { W, H } = require('./timeline');

// ---------- fonts ----------
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(__dirname, '..', 'fonts');
  const files = [
    'NotoSansSC-Black.otf', 'NotoSansSC-Bold.otf', 'NotoSansSC-Medium.otf', 'NotoSansSC-Regular.otf', 'NotoSansSC-Light.otf',
    'NotoSerifSC-Black.otf', 'NotoSerifSC-Bold.otf', 'NotoSerifSC-SemiBold.otf',
    'Inter.ttf', 'CormorantGaramond.ttf', 'JetBrainsMono.ttf', 'Anton-Regular.ttf',
  ];
  for (const f of files) GlobalFonts.registerFromPath(path.join(dir, f));
  fontsReady = true;
}
const FAM = {
  sans: '"Noto Sans SC"', serif: '"Noto Serif SC"', inter: 'Inter, "Noto Sans SC"', mono: '"JetBrains Mono", "Noto Sans SC"',
  display: 'Anton, "Noto Sans SC"', garamond: '"Cormorant Garamond", "Noto Serif SC"',
};
// Register before any module draws text: Skia caches failed family lookups, so textures built at require-time
// (e.g. the CH02 chalkboard) would otherwise poison later lookups of the same family/weight.
registerFonts();
const font = (weight, size, fam = 'sans') => `${weight} ${size}px ${FAM[fam] || fam}`;

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const E = {
  linear: (t) => t,
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  outQuart: (t) => 1 - Math.pow(1 - t, 4),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inQuart: (t) => t * t * t * t,
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
};
// eased progress of t through [a,b]
const p = (t, a, b, e = E.outCubic) => e(inv(a, b, t));
// fade window: rises over fi after a, falls over fo before b
function win(t, a, b, fi = 0.3, fo = 0.3) {
  if (t < a || t > b) return 0;
  return Math.min(fi > 0 ? clamp((t - a) / fi) : 1, fo > 0 ? clamp((b - t) / fo) : 1);
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash1(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
function noise1(x) { const i = Math.floor(x), f = x - i; return lerp(hash1(i), hash1(i + 1), smooth(f)) * 2 - 1; }
function fbm(x, o = 3) { let v = 0, a = 0.5, f = 1; for (let i = 0; i < o; i++) { v += a * noise1(x * f + i * 17.3); a *= 0.5; f *= 2.03; } return v; }

// ---------- colour ----------
function rgbOf(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function hex(h, a = 1) { const [r, g, b] = rgbOf(h); return `rgba(${r},${g},${b},${a})`; }
function mixHex(a, b, t, al = 1) {
  const A = rgbOf(a), B = rgbOf(b);
  return `rgba(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))},${al})`;
}

// ---------- 3D ----------
function makeCam(o = {}) {
  const fov = o.fov || 0.9;
  return { x: o.x || 0, y: o.y || 0, z: o.z || 0, yaw: o.yaw || 0, pitch: o.pitch || 0, roll: o.roll || 0, f: (H / 2) / Math.tan(fov / 2), cx: o.cx == null ? W / 2 : o.cx, cy: o.cy == null ? H / 2 : o.cy };
}
function toCam(cam, p) {
  const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
  let c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  const x1 = c * dx - s * dz, z1 = s * dx + c * dz;
  c = Math.cos(cam.pitch); s = Math.sin(cam.pitch);
  const y2 = c * dy - s * z1, z2 = s * dy + c * z1;
  c = Math.cos(cam.roll); s = Math.sin(cam.roll);
  return [c * x1 - s * y2, s * x1 + c * y2, z2];
}
function project(cam, p, near = 0.05) {
  const [x, y, z] = toCam(cam, p);
  if (z < near) return null;
  const k = cam.f / z;
  return { x: cam.cx + x * k, y: cam.cy + y * k, z, k };
}
function rot3(p, rx, ry, rz) {
  let [x, y, z] = p;
  let c = Math.cos(rx), s = Math.sin(rx);
  [y, z] = [c * y - s * z, s * y + c * z];
  c = Math.cos(ry); s = Math.sin(ry);
  [x, z] = [c * x + s * z, -s * x + c * z];
  c = Math.cos(rz); s = Math.sin(rz);
  [x, y] = [c * x - s * y, s * x + c * y];
  return [x, y, z];
}
// plane: { c:[x,y,z], rx, ry, rz }; local x right, y down, in world units
function planePt(pl, lx, ly, lz = 0) {
  const r = rot3([lx, ly, lz], pl.rx || 0, pl.ry || 0, pl.rz || 0);
  return [pl.c[0] + r[0], pl.c[1] + r[1], pl.c[2] + r[2]];
}
function planeNormal(pl) { return rot3([0, 0, -1], pl.rx || 0, pl.ry || 0, pl.rz || 0); }
// Is the front (local -z side) of the plane facing the camera?
function facing(cam, pl) {
  const n = planeNormal(pl);
  const v = [cam.x - pl.c[0], cam.y - pl.c[1], cam.z - pl.c[2]];
  return n[0] * v[0] + n[1] * v[1] + n[2] * v[2] > 0;
}
function camDepth(cam, p) { return toCam(cam, p)[2]; }
// point the camera at a target
function lookAt(cam, target, roll = 0) {
  const dx = target[0] - cam.x, dy = target[1] - cam.y, dz = target[2] - cam.z;
  cam.yaw = Math.atan2(dx, dz);
  const z1 = Math.sin(cam.yaw) * dx + Math.cos(cam.yaw) * dz;
  cam.pitch = Math.atan2(dy, z1);
  cam.roll = roll;
  return cam;
}
// keyframed vector track: keys = [[t, [x,y,z]], ...], eased between keys
function track(keys, t, ease = (q) => q * q * (3 - 2 * q)) {
  if (t <= keys[0][0]) return keys[0][1].slice();
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, a] = keys[i], [t1, b] = keys[i + 1];
    if (t <= t1) { const q = ease((t - t0) / (t1 - t0)); return a.map((v, j) => v + (b[j] - v) * q); }
  }
  return keys[keys.length - 1][1].slice();
}

// Affine-map source triangle onto destination triangle (with slight dilation to hide seams).
function drawTri(ctx, img, s0, s1, s2, d0, d1, d2) {
  const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = (d) => { const dx = d[0] - cx, dy = d[1] - cy, l = Math.hypot(dx, dy) || 1; return [d[0] + dx / l * 0.7, d[1] + dy / l * 0.7]; };
  const D0 = grow(d0), D1 = grow(d1), D2 = grow(d2);
  ctx.save();
  ctx.beginPath(); ctx.moveTo(D0[0], D0[1]); ctx.lineTo(D1[0], D1[1]); ctx.lineTo(D2[0], D2[1]); ctx.closePath(); ctx.clip();
  const [x0, y0] = s0, [x1, y1] = s1, [x2, y2] = s2;
  const den = x0 * (y2 - y1) - x1 * y2 + x2 * y1 + (x1 - x2) * y0;
  if (Math.abs(den) < 1e-9) { ctx.restore(); return; }
  const a = -(y0 * (d2[0] - d1[0]) - y1 * d2[0] + y2 * d1[0] + (y1 - y2) * d0[0]) / den;
  const b = (y1 * d2[1] + y0 * (d1[1] - d2[1]) - y2 * d1[1] + (y2 - y1) * d0[1]) / den;
  const c = (x0 * (d2[0] - d1[0]) - x1 * d2[0] + x2 * d1[0] + (x1 - x2) * d0[0]) / den;
  const d = -(x1 * d2[1] + x0 * (d1[1] - d2[1]) - x2 * d1[1] + (x2 - x1) * d0[1]) / den;
  const e = (x0 * (y2 * d1[0] - y1 * d2[0]) + y0 * (x1 * d2[0] - x2 * d1[0]) + (x2 * y1 - x1 * y2) * d0[0]) / den;
  const f = (x0 * (y2 * d1[1] - y1 * d2[1]) + y0 * (x1 * d2[1] - x2 * d1[1]) + (x2 * y1 - x1 * y2) * d0[1]) / den;
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// Draw an image onto a 3D plane of size w×h (world units) centred at pl.c. Subdivides for perspective-correct mapping.
// opts: { alpha, nx, ny, shade (0..1 darken), backface (draw even when facing away), sx, sy, sw, sh }
function texPlane(ctx, cam, pl, w, h, img, opts = {}) {
  if (!opts.backface && !facing(cam, pl)) return false;
  const iw = opts.sw || img.width, ih = opts.sh || img.height, ox = opts.sx || 0, oy = opts.sy || 0;
  // choose subdivision from projected size
  const c0 = project(cam, planePt(pl, 0, 0));
  if (!c0) return false;
  const nx = opts.nx || Math.max(2, Math.min(14, Math.round(w * c0.k / 160)));
  const ny = opts.ny || Math.max(2, Math.min(10, Math.round(h * c0.k / 160)));
  const pts = [];
  for (let j = 0; j <= ny; j++) {
    const row = [];
    for (let i = 0; i <= nx; i++) {
      const q = project(cam, planePt(pl, -w / 2 + (w * i) / nx, -h / 2 + (h * j) / ny), 0.02);
      if (!q) return false;
      row.push([q.x, q.y]);
    }
    pts.push(row);
  }
  // cull fully offscreen
  let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
  for (const r of pts) for (const q of r) { minx = Math.min(minx, q[0]); maxx = Math.max(maxx, q[0]); miny = Math.min(miny, q[1]); maxy = Math.max(maxy, q[1]); }
  if (maxx < 0 || minx > W || maxy < 0 || miny > H) return false;
  ctx.save();
  ctx.globalAlpha *= opts.alpha == null ? 1 : opts.alpha;
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const sx0 = ox + (iw * i) / nx, sx1 = ox + (iw * (i + 1)) / nx, sy0 = oy + (ih * j) / ny, sy1 = oy + (ih * (j + 1)) / ny;
      const a = pts[j][i], b = pts[j][i + 1], c = pts[j + 1][i + 1], d = pts[j + 1][i];
      drawTri(ctx, img, [sx0, sy0], [sx1, sy0], [sx1, sy1], a, b, c);
      drawTri(ctx, img, [sx0, sy0], [sx1, sy1], [sx0, sy1], a, c, d);
    }
  }
  ctx.restore();
  if (opts.shade) {
    ctx.save();
    ctx.globalAlpha = clamp(opts.shade);
    quadPath(ctx, cam, pl, -w / 2, -h / 2, w / 2, h / 2);
    ctx.fillStyle = opts.shadeColor || '#000'; ctx.fill();
    ctx.restore();
  }
  return true;
}
function quadPath(ctx, cam, pl, x0, y0, x1, y1) {
  const a = project(cam, planePt(pl, x0, y0)), b = project(cam, planePt(pl, x1, y0));
  const c = project(cam, planePt(pl, x1, y1)), d = project(cam, planePt(pl, x0, y1));
  if (!a || !b || !c || !d) return false;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  return true;
}
function polyPath(ctx, cam, pts3) {
  const q = pts3.map((p3) => project(cam, p3));
  if (q.some((v) => !v)) return false;
  ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath();
  return true;
}

// ---------- 2D helpers ----------
function rrect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function canvas(w, h) { const c = createCanvas(Math.max(1, Math.round(w)), Math.max(1, Math.round(h))); return c; }
// text with optional tracking (spacing in px), glow, alpha
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = o.font || font(o.weight || 700, o.size || 40, o.fam || 'sans');
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  if (o.alpha != null) ctx.globalAlpha *= o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 24; }
  ctx.fillStyle = o.color || '#fff';
  const sp = o.spacing || 0;
  let width;
  if (sp) {
    const chars = [...s];
    const ws = chars.map((ch) => ctx.measureText(ch).width);
    width = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let cx = ctx.textAlign === 'left' ? x : ctx.textAlign === 'right' ? x - width : x - width / 2;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += ws[i] + sp; });
  } else {
    width = ctx.measureText(s).width;
    if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = o.strokeW || 2; ctx.strokeText(s, x, y); }
    ctx.fillText(s, x, y);
  }
  ctx.restore();
  return width;
}
function measure(ctx, s, f, spacing = 0) { ctx.save(); ctx.font = f; const w = ctx.measureText(s).width + spacing * Math.max(0, [...s].length - 1); ctx.restore(); return w; }
// per-character reveal: rise + fade (+ optional blur-like glow)
function reveal(ctx, s, x, y, t, o = {}) {
  const chars = [...s];
  const stagger = o.stagger == null ? 0.035 : o.stagger, dur = o.dur || 0.5;
  ctx.save();
  ctx.font = o.font || font(o.weight || 700, o.size || 60, o.fam || 'sans');
  const sp = o.spacing || 0;
  const ws = chars.map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  const size = o.size || 60;
  chars.forEach((ch, i) => {
    const q = clamp((t - i * stagger) / dur);
    if (q > 0) {
      const e = E.outCubic(q);
      ctx.globalAlpha = e * (o.alpha == null ? 1 : o.alpha);
      ctx.fillStyle = o.color || '#fff';
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.blur || 20) * (1.6 - e * 0.6); }
      ctx.fillText(ch, cx, y + (1 - e) * (o.rise == null ? size * 0.4 : o.rise));
    }
    cx += ws[i] + sp;
  });
  ctx.restore();
  return total;
}
const GLYPHS = '0123456789ABCDEF#%&@$=<>/+*';
function scramble(s, q, seed = 1) {
  const r = rng(seed + Math.floor(q * 40));
  return [...s].map((ch, i) => (ch === ' ' || i / s.length < q ? ch : GLYPHS[Math.floor(r() * GLYPHS.length)])).join('');
}
// number formatting
function fmt(n, d = 0) { return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }

// Hand-drawn wobbly line (deterministic)
function wobble(ctx, pts, seed = 1, amp = 1.6) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => {
    const nx = x + noise1(seed + i * 0.7) * amp, ny = y + noise1(seed + 40 + i * 0.7) * amp;
    if (i) ctx.lineTo(nx, ny); else ctx.moveTo(nx, ny);
  });
}
function wobbleLine(ctx, x0, y0, x1, y1, seed = 1, amp = 1.4, seg = 18) {
  const pts = [];
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / seg));
  for (let i = 0; i <= n; i++) pts.push([lerp(x0, x1, i / n), lerp(y0, y1, i / n)]);
  wobble(ctx, pts, seed, amp);
}

// Cache for textures that do not change over time (built once per worker process).
const _cache = new Map();
function cached(key, w, h, draw) {
  let c = _cache.get(key);
  if (!c) { c = canvas(w, h); draw(c.getContext('2d'), c.width, c.height); _cache.set(key, c); }
  return c;
}

module.exports = {
  createCanvas, canvas, registerFonts, font, FAM, clamp, lerp, inv, smooth, E, p, win, rng, hash1, noise1, fbm,
  rgbOf, hex, mixHex, makeCam, toCam, project, lookAt, track, rot3, planePt, planeNormal, facing, camDepth, drawTri, texPlane, quadPath, polyPath,
  rrect, text, measure, reveal, scramble, fmt, wobble, wobbleLine, cached, W, H,
};
