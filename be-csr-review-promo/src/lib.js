// Rendering toolkit: math, easing, 3D projection, drawing helpers, post-processing.
const path = require('path');
const { createCanvas, GlobalFonts } = require('@napi-rs/canvas');
const { W, H } = require('./timeline');

// ---------- fonts ----------
let fontsReady = false;
function registerFonts() {
  if (fontsReady) return;
  const dir = path.join(__dirname, '..', 'fonts');
  const list = [
    ['NotoSansSC-Black.otf', 'SCBlack'],
    ['NotoSansSC-Bold.otf', 'SCBold'],
    ['NotoSansSC-Medium.otf', 'SCMedium'],
    ['NotoSansSC-Regular.otf', 'SCRegular'],
    ['NotoSansSC-Light.otf', 'SCLight'],
    ['NotoSerifSC-Black.otf', 'SerifBlack'],
    ['BebasNeue-Regular.ttf', 'Bebas'],
    ['JetBrainsMono.ttf', 'Mono'],
  ];
  for (const [f, name] of list) GlobalFonts.registerFromPath(path.join(dir, f), name);
  fontsReady = true;
}

// ---------- math ----------
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const inv = (a, b, x) => clamp((x - a) / (b - a));
const smooth = (t) => t * t * (3 - 2 * t);
const E = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
  inOutExpo: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2),
  outBack: (t) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
};
// fade window: rises over `fi` after a, falls over `fo` before b
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

// ---------- color ----------
function hex(h, a = 1) {
  const n = parseInt(h.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
const C = {
  bg: '#02050b', navy: '#071426', cyan: '#3fe6ff', teal: '#19c2c9', ice: '#d8f3ff',
  gold: '#ffbf4d', orange: '#ff7a1f', red: '#ff3550', green: '#36ffa2', white: '#f2f8ff', violet: '#8c7bff',
};

// ---------- 3D ----------
function makeCam(o = {}) {
  const fov = o.fov || 0.9;
  return { x: o.x || 0, y: o.y || 0, z: o.z || 0, yaw: o.yaw || 0, pitch: o.pitch || 0, roll: o.roll || 0, f: (H / 2) / Math.tan(fov / 2) };
}
function project(cam, p) {
  const dx = p[0] - cam.x, dy = p[1] - cam.y, dz = p[2] - cam.z;
  let c = Math.cos(cam.yaw), s = Math.sin(cam.yaw);
  const x1 = c * dx - s * dz, z1 = s * dx + c * dz;
  c = Math.cos(cam.pitch); s = Math.sin(cam.pitch);
  const y2 = c * dy - s * z1, z2 = s * dy + c * z1;
  c = Math.cos(cam.roll); s = Math.sin(cam.roll);
  const x3 = c * x1 - s * y2, y3 = s * x1 + c * y2;
  if (z2 < 0.08) return null;
  const k = cam.f / z2;
  return { x: W / 2 + x3 * k, y: H / 2 + y3 * k, z: z2, k };
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
// plane: { c:[x,y,z], rx, ry, rz }  local coords in world units
function planePt(pl, lx, ly) {
  const r = rot3([lx, ly, 0], pl.rx || 0, pl.ry || 0, pl.rz || 0);
  return [pl.c[0] + r[0], pl.c[1] + r[1], pl.c[2] + r[2]];
}
function planeQuad(ctx, cam, pl, x0, y0, x1, y1) {
  const a = project(cam, planePt(pl, x0, y0)), b = project(cam, planePt(pl, x1, y0));
  const c = project(cam, planePt(pl, x1, y1)), d = project(cam, planePt(pl, x0, y1));
  if (!a || !b || !c || !d) return false;
  ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.closePath();
  return true;
}
function planeLine(ctx, cam, pl, x0, y0, x1, y1) {
  const a = project(cam, planePt(pl, x0, y0)), b = project(cam, planePt(pl, x1, y1));
  if (!a || !b) return;
  ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
}
// Text laid on a plane through a local affine transform. size = world-units font size.
function planeText(ctx, cam, pl, lx, ly, text, size, font, fill, align = 'left') {
  const e = 0.01;
  const p0 = project(cam, planePt(pl, lx, ly));
  const pu = project(cam, planePt(pl, lx + e, ly));
  const pv = project(cam, planePt(pl, lx, ly + e));
  if (!p0 || !pu || !pv) return null;
  const s = size / 100;
  ctx.save();
  ctx.setTransform((pu.x - p0.x) / e * s, (pu.y - p0.y) / e * s, (pv.x - p0.x) / e * s, (pv.y - p0.y) / e * s, p0.x, p0.y);
  ctx.font = `100px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fill;
  ctx.fillText(text, 0, 0);
  ctx.restore();
  return p0;
}

// ---------- 2D helpers ----------
function rrect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function text(ctx, s, x, y, o = {}) {
  ctx.save();
  ctx.font = `${o.size || 40}px ${o.font || 'SCBold'}`;
  ctx.textAlign = o.align || 'center';
  ctx.textBaseline = o.baseline || 'middle';
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;
  if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = o.blur || 24; }
  ctx.fillStyle = o.color || C.white;
  if (o.spacing) {
    // manual tracking
    const chars = [...s];
    const ws = chars.map((ch) => ctx.measureText(ch).width);
    const total = ws.reduce((a, b) => a + b, 0) + o.spacing * (chars.length - 1);
    let cx = o.align === 'left' ? x : o.align === 'right' ? x - total : x - total / 2;
    ctx.textAlign = 'left';
    chars.forEach((ch, i) => { ctx.fillText(ch, cx, y); cx += ws[i] + o.spacing; });
  } else {
    ctx.fillText(s, x, y);
  }
  ctx.restore();
}
function measure(ctx, s, size, font) { ctx.save(); ctx.font = `${size}px ${font}`; const w = ctx.measureText(s).width; ctx.restore(); return w; }

// Per-character reveal (rise + fade + blur-free glow)
function revealText(ctx, s, x, y, t, o = {}) {
  const chars = [...s];
  const size = o.size || 60, font = o.font || 'SCBold', stagger = o.stagger || 0.04, dur = o.dur || 0.5;
  ctx.save();
  ctx.font = `${size}px ${font}`;
  const sp = o.spacing || 0;
  const ws = chars.map((ch) => ctx.measureText(ch).width);
  const total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let cx = o.align === 'left' ? x : x - total / 2;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    const p = clamp((t - i * stagger) / dur);
    if (p > 0) {
      const e = E.outCubic(p);
      ctx.globalAlpha = e * (o.alpha == null ? 1 : o.alpha);
      ctx.fillStyle = o.color || C.white;
      if (o.glow) { ctx.shadowColor = o.glow; ctx.shadowBlur = (o.blur || 20) * (1.6 - e * 0.6); }
      ctx.fillText(ch, cx, y + (1 - e) * (o.rise == null ? size * 0.5 : o.rise));
    }
    cx += ws[i] + sp;
  });
  ctx.restore();
  return total;
}
// Decoding/scramble text
const GLYPHS = '0123456789ABCDEF#%&@$=<>/\\+*';
function scramble(s, p, seed = 1) {
  const r = rng(seed + Math.floor(p * 40));
  return [...s].map((ch, i) => (ch === ' ' || i / s.length < p ? ch : GLYPHS[Math.floor(r() * GLYPHS.length)])).join('');
}

// ---------- post-processing ----------
class Post {
  constructor() {
    this.q = createCanvas(W / 4, H / 4); this.qx = this.q.getContext('2d');
    this.e = createCanvas(W / 8, H / 8); this.ex = this.e.getContext('2d');
    this.grain = [];
    const r = rng(99);
    for (let g = 0; g < 4; g++) {
      const cv = createCanvas(W / 2, H / 2), cx = cv.getContext('2d');
      const id = cx.createImageData(W / 2, H / 2), d = id.data;
      for (let i = 0; i < d.length; i += 4) { const v = 128 + (r() + r() + r() - 1.5) * 90; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; }
      cx.putImageData(id, 0, 0); this.grain.push(cv);
    }
    this.vig = createCanvas(W, H);
    const vx = this.vig.getContext('2d');
    const g = vx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 1.05);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.85)');
    vx.fillStyle = g; vx.fillRect(0, 0, W, H);
  }
  bloom(ctx, src, strength = 0.9) {
    const { qx, ex } = this;
    qx.globalCompositeOperation = 'copy';
    qx.filter = 'brightness(0.72) contrast(3.2) blur(5px)';
    qx.drawImage(src, 0, 0, W / 4, H / 4);
    qx.filter = 'none';
    ex.globalCompositeOperation = 'copy';
    ex.filter = 'blur(6px)';
    ex.drawImage(this.q, 0, 0, W / 8, H / 8);
    ex.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength * 0.42; ctx.drawImage(this.q, 0, 0, W, H);
    ctx.globalAlpha = strength * 0.6; ctx.drawImage(this.e, 0, 0, W, H);
    ctx.restore();
  }
  // anamorphic streak from bright areas: squash vertically, blur horizontally
  streak(ctx, src, strength) {
    if (strength <= 0.01) return;
    const { ex } = this;
    ex.globalCompositeOperation = 'copy';
    ex.filter = 'brightness(0.7) contrast(4) blur(1px)';
    ex.drawImage(src, 0, 0, W / 8, H / 8);
    ex.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = strength;
    ctx.filter = 'blur(2px)';
    for (let i = 1; i <= 3; i++) ctx.drawImage(this.e, -W * 0.25 * i, 0, W * (1 + 0.5 * i), H);
    ctx.filter = 'none';
    ctx.restore();
  }
  grade(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(0,150,190,0.55)'); g.addColorStop(0.55, 'rgba(20,40,80,0.2)'); g.addColorStop(1, 'rgba(255,140,40,0.45)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  vignette(ctx) { ctx.drawImage(this.vig, 0, 0); }
  film(ctx, frame, amount = 0.07) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = amount;
    const g = this.grain[frame % 4];
    const ox = (frame * 37) % 40, oy = (frame * 53) % 40;
    ctx.drawImage(g, -ox, -oy, W + 40, H + 40);
    ctx.restore();
  }
  chroma(ctx, px) {
    px = Math.round(px);
    if (px < 1) return;
    const id = ctx.getImageData(0, 0, W, H), d = id.data;
    const out = new Uint8ClampedArray(d);
    const row = W * 4;
    for (let y = 0; y < H; y++) {
      const base = y * row;
      // radial-ish: scale shift by distance from vertical center
      const s = Math.round(px * (0.5 + Math.abs(y - H / 2) / H));
      for (let x = 0; x < W; x++) {
        const i = base + x * 4;
        const xr = x - s < 0 ? 0 : x - s, xb = x + s >= W ? W - 1 : x + s;
        out[i] = d[base + xr * 4];
        out[i + 2] = d[base + xb * 4 + 2];
      }
    }
    id.data.set(out);
    ctx.putImageData(id, 0, 0);
  }
}

module.exports = {
  createCanvas, registerFonts, clamp, lerp, inv, smooth, E, win, rng, hash1, noise1, hex, C,
  makeCam, project, rot3, planePt, planeQuad, planeLine, planeText, rrect, text, measure, revealText, scramble, Post, W, H,
};
