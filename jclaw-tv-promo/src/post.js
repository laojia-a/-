// Post-processing: multi-scale bloom, halation, anamorphic streak and a per-pixel film grade
// (filmic tone curve, lift, contrast, saturation, split toning, radial chromatic aberration, vignette, chroma grain, dither).
const { canvas, clamp, rng, W, H } = require('./lib');

// Grade presets. Tints are additive offsets (0..1 scale) weighted toward shadows / highlights.
const GRADES = {
  night: { exposure: 1.0, filmic: 0.9, con: 1.06, sat: 0.9, black: 0.022, split: 0.55, shadow: [-0.02, 0.025, 0.05], high: [0.05, 0.025, -0.02], vig: 0.62, grain: 0.05, grainChroma: 0.3, ca: 1.2, bloom: 0.55, thr: 0.62, halation: 0.22, streak: 0.18 },
  storm: { exposure: 1.05, filmic: 0.85, con: 1.12, sat: 0.95, black: 0.012, split: 0.65, shadow: [-0.03, 0.03, 0.07], high: [0.06, 0.03, -0.03], vig: 0.58, grain: 0.045, grainChroma: 0.25, ca: 2.0, bloom: 0.75, thr: 0.58, halation: 0.18, streak: 0.42 },
  hero: { exposure: 1.02, filmic: 0.9, con: 1.1, sat: 1.0, black: 0.012, split: 0.6, shadow: [-0.03, 0.02, 0.06], high: [0.07, 0.035, -0.02], vig: 0.6, grain: 0.04, grainChroma: 0.25, ca: 1.4, bloom: 0.6, thr: 0.62, halation: 0.25, streak: 0.5 },
  paper: { exposure: 1.0, filmic: 0.8, con: 1.08, sat: 1.0, black: 0.02, split: 0.35, shadow: [-0.01, 0.015, 0.02], high: [0.03, 0.02, -0.015], vig: 0.45, grain: 0.04, grainChroma: 0.3, ca: 0.8, bloom: 0.16, thr: 0.9, halation: 0.06, streak: 0 },
  chalk: { exposure: 1.02, filmic: 0.85, con: 1.05, sat: 0.95, black: 0.03, split: 0.4, shadow: [-0.015, 0.03, 0.01], high: [0.05, 0.035, -0.02], vig: 0.55, grain: 0.05, grainChroma: 0.3, ca: 1.0, bloom: 0.38, thr: 0.7, halation: 0.12, streak: 0.06 },
  data: { exposure: 1.04, filmic: 0.9, con: 1.12, sat: 1.04, black: 0.012, split: 0.6, shadow: [-0.035, 0.03, 0.05], high: [0.08, 0.03, -0.03], vig: 0.6, grain: 0.04, grainChroma: 0.25, ca: 1.6, bloom: 0.7, thr: 0.58, halation: 0.2, streak: 0.45 },
  glass: { exposure: 1.02, filmic: 0.85, con: 1.05, sat: 1.0, black: 0.02, split: 0.4, shadow: [-0.01, -0.005, 0.04], high: [0.03, 0.02, 0.0], vig: 0.5, grain: 0.035, grainChroma: 0.25, ca: 1.0, bloom: 0.42, thr: 0.72, halation: 0.1, streak: 0.12 },
};
function mixGrade(a, b, k) {
  const o = {};
  for (const key of Object.keys(a)) {
    const x = a[key], y = b[key];
    o[key] = Array.isArray(x) ? x.map((v, i) => v + (y[i] - v) * k) : x + (y - x) * k;
  }
  return o;
}

class Post {
  constructor() {
    this.q = canvas(W / 4, H / 4); this.qx = this.q.getContext('2d');
    this.e = canvas(W / 8, H / 8); this.ex = this.e.getContext('2d');
    this.s = canvas(W / 16, H / 16); this.sx = this.s.getContext('2d');
    this.h = canvas(W / 8, H / 8); this.hx = this.h.getContext('2d');
    // vignette weights
    this.vig = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = (x - W / 2) / (W / 2), dy = (y - H / 2) / (H / 2);
      const d = Math.sqrt(dx * dx * 0.82 + dy * dy * 1.0);
      this.vig[y * W + x] = clamp((d - 0.45) / 0.95);
    }
    // grain: 3 channels of gaussian-ish noise at half resolution, sampled with per-frame offsets (2x2 clumps = film-like grain size)
    const GW = W / 2, GH = H / 2;
    this.GW = GW; this.GH = GH;
    const r = rng(1234);
    this.grainTex = new Float32Array(GW * GH * 3 + 64);
    for (let i = 0; i < this.grainTex.length; i++) this.grainTex[i] = (r() + r() + r() + r() - 2) * 1.2;
    this.dith = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) this.dith[i] = r() - 0.5;
    this.lut = [new Float32Array(256), new Float32Array(256), new Float32Array(256)];
    this.copy = new Uint8ClampedArray(W * H * 4);
  }
  // multi-scale bloom with a soft threshold (brightness/contrast pass), plus red-orange halation
  bloom(ctx, src, g) {
    const amt = g.bloom, thr = g.thr;
    if (amt <= 0.01) return;
    const { qx, ex, sx, hx } = this;
    const b = 1 - thr * 0.55, c = 1 + thr * 3.2;
    qx.globalCompositeOperation = 'copy';
    qx.filter = `brightness(${b.toFixed(3)}) contrast(${c.toFixed(3)}) blur(3px)`;
    qx.drawImage(src, 0, 0, W / 4, H / 4);
    qx.filter = 'none';
    ex.globalCompositeOperation = 'copy'; ex.filter = 'blur(5px)'; ex.drawImage(this.q, 0, 0, W / 8, H / 8); ex.filter = 'none';
    sx.globalCompositeOperation = 'copy'; sx.filter = 'blur(5px)'; sx.drawImage(this.e, 0, 0, W / 16, H / 16); sx.filter = 'none';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = amt * 0.32; ctx.drawImage(this.q, 0, 0, W, H);
    ctx.globalAlpha = amt * 0.42; ctx.drawImage(this.e, 0, 0, W, H);
    ctx.globalAlpha = amt * 0.55; ctx.drawImage(this.s, 0, 0, W, H);
    ctx.restore();
    if (g.halation > 0.01) {
      hx.globalCompositeOperation = 'copy'; hx.filter = 'blur(2px)'; hx.drawImage(this.q, 0, 0, W / 8, H / 8); hx.filter = 'none';
      hx.globalCompositeOperation = 'destination-over'; hx.fillStyle = '#000'; hx.fillRect(0, 0, W / 8, H / 8);
      hx.globalCompositeOperation = 'multiply'; hx.fillStyle = 'rgb(255,92,40)'; hx.fillRect(0, 0, W / 8, H / 8);
      hx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = g.halation; ctx.drawImage(this.h, 0, 0, W, H); ctx.restore();
    }
  }
  // anamorphic streak: very bright areas smeared horizontally, blue tint
  streak(ctx, src, amt, tint = 'rgb(90,170,255)') {
    if (amt <= 0.01) return;
    const { hx } = this;
    hx.globalCompositeOperation = 'copy';
    hx.filter = 'brightness(0.55) contrast(6)';
    hx.drawImage(src, 0, 0, W / 8, H / 8);
    hx.filter = 'none';
    hx.globalCompositeOperation = 'destination-over'; hx.fillStyle = '#000'; hx.fillRect(0, 0, W / 8, H / 8);
    hx.globalCompositeOperation = 'multiply'; hx.fillStyle = tint; hx.fillRect(0, 0, W / 8, H / 8);
    hx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.filter = 'blur(3px)';
    for (let i = 1; i <= 4; i++) { ctx.globalAlpha = amt * (0.5 / i); ctx.drawImage(this.h, -W * 0.3 * i, H * 0.006 * i, W * (1 + 0.6 * i), H * (1 - 0.012 * i)); }
    ctx.filter = 'none';
    ctx.restore();
  }
  // per-pixel grade on the final composite
  grade(ctx, g, frame, extraCA = 0) {
    const id = ctx.getImageData(0, 0, W, H), d = id.data;
    // tone LUT: approx-linearise, exposure, filmic (ACES fit) blended with linear, contrast pivot, lift
    const aces = (x) => clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14));
    for (let ch = 0; ch < 3; ch++) {
      const L = this.lut[ch];
      for (let v = 0; v < 256; v++) {
        let x = Math.pow(v / 255, 2.2) * g.exposure;
        const f = aces(x * 1.35);
        x = clamp(x) * (1 - g.filmic) + f * g.filmic;
        x = Math.pow(x, 1 / 2.2);
        x = 0.5 + (x - 0.5) * g.con;
        x = g.black + clamp(x) * (1 - g.black);
        L[v] = x * 255;
      }
    }
    const [L0, L1, L2] = this.lut;
    const sat = g.sat, split = g.split * 255;
    const sr = g.shadow[0] * split, sg = g.shadow[1] * split, sb = g.shadow[2] * split;
    const hr = g.high[0] * split, hg = g.high[1] * split, hb = g.high[2] * split;
    const vigA = g.vig, grainA = g.grain * 255, gch = g.grainChroma;
    const ca = g.ca + extraCA;
    const vig = this.vig, gt = this.grainTex, dith = this.dith;
    const GW = this.GW;
    const r1 = rng(frame * 7919 + 3);
    const goff = Math.floor(r1() * GW * 200), goff2 = Math.floor(r1() * GW * 200), goff3 = Math.floor(r1() * GW * 200);
    const gmax = gt.length - 4;
    let src = d;
    if (ca > 0.25) { this.copy.set(d); src = this.copy; }
    const cxW = W / 2, cyH = H / 2, caK = ca / (W / 2);
    for (let y = 0; y < H; y++) {
      const gy = (y >> 1) * GW;
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        let R, G, B;
        G = src[i + 1];
        if (ca > 0.25) {
          const dx = x - cxW, dy = y - cyH;
          const s = caK * Math.sqrt(dx * dx + dy * dy) / (W / 2);
          let xr = Math.round(x + dx * s), yr = Math.round(y + dy * s), xb = Math.round(x - dx * s), yb = Math.round(y - dy * s);
          xr = xr < 0 ? 0 : xr >= W ? W - 1 : xr; yr = yr < 0 ? 0 : yr >= H ? H - 1 : yr;
          xb = xb < 0 ? 0 : xb >= W ? W - 1 : xb; yb = yb < 0 ? 0 : yb >= H ? H - 1 : yb;
          R = src[(yr * W + xr) * 4]; B = src[(yb * W + xb) * 4 + 2];
        } else { R = src[i]; B = src[i + 2]; }
        let r = L0[R], gg = L1[G], b = L2[B];
        const l = 0.2126 * r + 0.7152 * gg + 0.0722 * b;
        r = l + (r - l) * sat; gg = l + (gg - l) * sat; b = l + (b - l) * sat;
        const ln = l / 255, ws = (1 - ln) * (1 - ln), wh = ln * ln;
        r += sr * ws + hr * wh; gg += sg * ws + hg * wh; b += sb * ws + hb * wh;
        const v = 1 - vig[y * W + x] * vigA;
        const gi = gy + (x >> 1);
        const gw = grainA * (0.35 + 2.6 * ln * (1 - ln));
        const n0 = gt[(gi + goff) % gmax];
        const nr = n0 + gch * (gt[(gi + goff2) % gmax] - n0), nb = n0 + gch * (gt[(gi + goff3) % gmax] - n0);
        const dz = dith[(x * 7 + y * 131 + frame * 31) & 4095];
        d[i] = r * v + nr * gw + dz;
        d[i + 1] = gg * v + n0 * gw + dz;
        d[i + 2] = b * v + nb * gw + dz;
        d[i + 3] = 255;
      }
    }
    ctx.putImageData(id, 0, 0);
  }
}

// TV static: a few low-res noise frames drawn with nearest-neighbour scaling.
let _static = null;
function staticTex() {
  if (_static) return _static;
  _static = [];
  const r = rng(777);
  for (let k = 0; k < 8; k++) {
    const c = canvas(640, 400), x = c.getContext('2d');
    const im = x.createImageData(640, 400), dd = im.data;
    for (let i = 0; i < dd.length; i += 4) { const v = Math.pow(r(), 1.4) * 255; dd[i] = v; dd[i + 1] = v; dd[i + 2] = v * 1.02; dd[i + 3] = 255; }
    x.putImageData(im, 0, 0);
    _static.push(c);
  }
  return _static;
}
function drawStatic(ctx, x, y, w, h, seed, alpha = 1) {
  const tex = staticTex();
  const r = rng(seed * 31 + 7);
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.imageSmoothingEnabled = false;
  const k = Math.floor(r() * tex.length);
  const ox = r() * 120, oy = r() * 80;
  ctx.drawImage(tex[k], ox, oy, 640 - 120 * (w / W < 0.8 ? 1 : 2.5), 400 - 80 * (w / W < 0.8 ? 1 : 2.5), x, y, w, h);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();
}

module.exports = { Post, GRADES, mixGrade, drawStatic };
