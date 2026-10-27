// Frame compositor: scene -> camera shake -> bloom/streak -> grade -> flash/chroma -> vignette/grain -> letterbox -> subtitles.
const L = require('./lib');
const T = require('./timeline');
const S = require('./scenes');
const { createCanvas, clamp, inv, E, noise1, hex, C, text, W, H } = L;

const BAR = Math.round((H - W / 2.39) / 2); // 2.39:1 scope letterbox

class Renderer {
  constructor() {
    L.registerFonts();
    this.scene = createCanvas(W, H); this.sx = this.scene.getContext('2d');
    this.out = createCanvas(W, H); this.ox = this.out.getContext('2d');
    this.post = new L.Post();
  }
  impulses(t) {
    let shake = 0, flash = 0, chroma = 0;
    for (const im of T.IMPULSES) {
      const d = t - im.t;
      if (d < 0 || d > im.decay * 3) continue;
      const e = Math.exp(-d / (im.decay / 3));
      shake += (im.shake || 0) * e; flash += (im.flash || 0) * Math.exp(-d / (im.decay / 5)); chroma += (im.chroma || 0) * e;
    }
    return { shake, flash: clamp(flash), chroma };
  }
  render(t, frame) {
    const sc = T.SCENES.find((s) => t >= s.start && t < s.end) || T.SCENES[T.SCENES.length - 1];
    const sx = this.sx, ox = this.ox;
    sx.save();
    const res = S[sc.id](sx, t - sc.start, t) || {};
    sx.restore();
    sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'; sx.setTransform(1, 0, 0, 1, 0, 0);

    const im = this.impulses(t);
    const shake = im.shake + (res.shake || 0);
    ox.setTransform(1, 0, 0, 1, 0, 0);
    ox.globalAlpha = 1; ox.globalCompositeOperation = 'source-over';
    ox.fillStyle = C.bg; ox.fillRect(0, 0, W, H);
    const dx = noise1(t * 23) * shake, dy = noise1(t * 23 + 71) * shake, rot = noise1(t * 17 + 13) * shake * 0.0006;
    const z = 1 + shake * 0.0018;
    ox.save();
    ox.translate(W / 2 + dx, H / 2 + dy); ox.rotate(rot); ox.scale(z, z); ox.translate(-W / 2, -H / 2);
    ox.drawImage(this.scene, 0, 0);
    ox.restore();

    this.post.bloom(ox, this.out, res.bloom == null ? 0.9 : res.bloom);
    this.post.streak(ox, this.out, (res.streak == null ? 0.25 : res.streak) * 0.5);
    this.post.grade(ox);
    if (im.flash > 0.005) {
      ox.save(); ox.globalCompositeOperation = 'screen'; ox.fillStyle = `rgba(235,248,255,${im.flash})`; ox.fillRect(0, 0, W, H); ox.restore();
    }
    if (res.dark) { ox.fillStyle = `rgba(0,0,0,${res.dark})`; ox.fillRect(0, 0, W, H); }
    this.post.chroma(ox, im.chroma);
    this.post.vignette(ox);
    this.post.film(ox, frame, 0.09);

    // letterbox
    const bar = BAR * E.inOutCubic(inv(0.0, 1.6, t));
    ox.fillStyle = '#000'; ox.fillRect(0, 0, W, bar); ox.fillRect(0, H - bar, W, bar);
    if (res.overlay) res.overlay(ox);
    this.subtitles(ox, t);

    // global fades
    const fadeIn = 1 - inv(0, 0.7, t), fadeOut = inv(T.DURATION - 2.2, T.DURATION - 0.3, t);
    const black = Math.max(fadeIn, fadeOut);
    if (black > 0) { ox.fillStyle = `rgba(0,0,0,${black})`; ox.fillRect(0, 0, W, H); }
    return this.out;
  }
  subtitles(ox, t) {
    for (const [a, b, zh, en] of T.SUBS) {
      if (t < a || t > b) continue;
      const p = Math.min(clamp((t - a) / 0.25), clamp((b - t) / 0.25));
      const rise = (1 - E.outCubic(clamp((t - a) / 0.35))) * 10;
      text(ox, zh, W / 2, H - BAR + 46 + rise, { font: 'SCBold', size: 38, color: '#ffffff', alpha: p, spacing: 2, glow: 'rgba(0,0,0,0.9)', blur: 8 });
      text(ox, en, W / 2, H - BAR + 98 + rise, { font: 'SCRegular', size: 22, color: '#93aec4', alpha: p * 0.95, spacing: 1 });
    }
  }
}

module.exports = { Renderer, BAR };
