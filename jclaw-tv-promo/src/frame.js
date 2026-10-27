// Frame compositor: scene (with optional motion-blur sub-frames) -> shake / gate weave -> bloom, halation, streak
// -> flash -> per-pixel film grade -> 2.39:1 letterbox -> subtitles -> global fades.
const L = require('./lib');
const T = require('./timeline');
const { Post, GRADES, mixGrade } = require('./post');
const SCENES = require('./scenes');
const { canvas, clamp, inv, E, noise1, text, font, W, H } = L;

const BAR = Math.round((H - W / 2.39) / 2); // 138 px

class Renderer {
  constructor() {
    L.registerFonts();
    this.scene = canvas(W, H); this.sx = this.scene.getContext('2d');
    this.acc = canvas(W, H); this.ax = this.acc.getContext('2d');
    this.out = canvas(W, H); this.ox = this.out.getContext('2d');
    this.post = new Post();
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
  sceneAt(t) { return T.SCENES.find((s) => t >= s.start && t < s.end) || T.SCENES[T.SCENES.length - 1]; }
  drawScene(t) {
    const sc = this.sceneAt(t);
    const sx = this.sx;
    sx.save();
    sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalAlpha = 1; sx.globalCompositeOperation = 'source-over'; sx.filter = 'none';
    sx.fillStyle = '#000'; sx.fillRect(0, 0, W, H);
    const res = SCENES[sc.id](sx, t - sc.start, t) || {};
    sx.restore();
    return res;
  }
  render(t, frame) {
    const mbr = T.MOTION_BLUR.find(([a, b]) => t >= a && t < b);
    const n = mbr ? mbr[2] : 1;
    let res;
    if (n > 1) {
      const ax = this.ax;
      for (let i = 0; i < n; i++) {
        const ts = t + (i / n - 0.5) * (0.5 / T.FPS); // 180° shutter centred on t
        const r = this.drawScene(Math.max(0, ts));
        if (i === Math.floor(n / 2)) res = r;
        ax.globalAlpha = 1 / (i + 1); ax.globalCompositeOperation = 'source-over';
        ax.drawImage(this.scene, 0, 0);
      }
      ax.globalAlpha = 1;
    } else {
      res = this.drawScene(t);
    }
    const src = n > 1 ? this.acc : this.scene;
    const ox = this.ox;
    const im = this.impulses(t);
    const shake = im.shake + (res.shake || 0);
    ox.setTransform(1, 0, 0, 1, 0, 0); ox.globalAlpha = 1; ox.globalCompositeOperation = 'source-over'; ox.filter = 'none';
    ox.fillStyle = '#000'; ox.fillRect(0, 0, W, H);
    // gate weave (quantised to 24 fps like a film gate) + shake
    const wf = Math.floor(t * 24);
    const wx = noise1(wf * 0.37) * 0.9, wy = noise1(wf * 0.41 + 50) * 0.7;
    const dx = noise1(t * 23) * shake + wx, dy = noise1(t * 23 + 71) * shake + wy, rot = noise1(t * 17 + 13) * shake * 0.0005;
    const z = 1 + shake * 0.0016;
    ox.save();
    ox.translate(W / 2 + dx, H / 2 + dy); ox.rotate(rot); ox.scale(z, z); ox.translate(-W / 2, -H / 2);
    ox.drawImage(src, 0, 0);
    ox.restore();

    let g = res.grade ? (typeof res.grade === 'string' ? GRADES[res.grade] : res.grade) : GRADES.night;
    if (res.gradeOverride) g = Object.assign({}, g, res.gradeOverride);
    this.post.bloom(ox, this.out, g);
    this.post.streak(ox, this.out, g.streak * (res.streakMul == null ? 1 : res.streakMul), res.streakTint);
    if (im.flash > 0.005) {
      ox.save(); ox.globalCompositeOperation = 'screen'; ox.fillStyle = `rgba(240,246,255,${im.flash})`; ox.fillRect(0, 0, W, H); ox.restore();
    }
    if (res.dark) { ox.fillStyle = `rgba(0,0,0,${res.dark})`; ox.fillRect(0, 0, W, H); }
    this.post.grade(ox, g, frame, im.chroma * 1.2);
    if (res.overlay) { ox.save(); res.overlay(ox); ox.restore(); }

    ox.fillStyle = '#000'; ox.fillRect(0, 0, W, BAR); ox.fillRect(0, H - BAR, W, BAR);
    this.subtitles(ox, t);
    const fadeIn = 1 - inv(0, 0.4, t), fadeOut = inv(T.DURATION - 1.0, T.DURATION - 0.2, t);
    const black = Math.max(fadeIn, fadeOut);
    if (black > 0) { ox.fillStyle = `rgba(0,0,0,${black})`; ox.fillRect(0, 0, W, H); }
    return this.out;
  }
  subtitles(ox, t) {
    for (const [a, b, zh, en] of T.SUBS) {
      if (t < a - 0.01 || t > b) continue;
      const q = Math.min(clamp((t - a) / 0.22), clamp((b - t) / 0.28));
      const rise = (1 - E.outCubic(clamp((t - a) / 0.4))) * 8;
      text(ox, zh, W / 2, H - BAR + 54 + rise, { font: font(500, 34), color: '#f4f6f8', alpha: q, spacing: 1.5 });
      text(ox, en, W / 2, H - BAR + 96 + rise, { font: font(400, 21, 'inter'), color: '#93a1ab', alpha: q * 0.95, spacing: 0.6 });
    }
  }
}

module.exports = { Renderer, BAR };
