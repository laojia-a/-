// 134–160 s · Finale — channel-flip montage inside the screen, pull out of the glass into the dark room,
// light beams from the screen to every entrance converging on www.jclaw.top, end title, CRT power-off to a dot, LED.
const L = require('../lib');
const { canvas, clamp, inv, lerp, E, rng, makeCam, lookAt, track, project, text, font, rrect, reveal, noise1, W, H } = L;
const TV = require('../tv');
const C = require('./common');
const T = require('../timeline');
const { drawStatic } = require('../post');

const buf = canvas(W, H), bx = buf.getContext('2d');
const POSE = { x: 0, y: 0, z: 0 };
// [scene module, local time to show, channel number for the knob]
const FLIPS = [['ch1', 3.2, 1], ['ch2', 11.0, 2], ['ch3', 15.6, 3], ['ch4', 7.0, 4], ['ch5', 11.8, 5], ['special', 4.0, 0]];
let MODS = null;
const mods = () => MODS || (MODS = Object.fromEntries(FLIPS.map(([id]) => [id, require('./' + id)])));

const ENTRANCES = [
  { ch: 1, name: '临床工具集', url: 'cth.jclaw.top', pos: [-1.2, -0.6, -0.45] },
  { ch: 2, name: '临研知视', url: 'cv.jclaw.top', pos: [-1.35, 0.05, -0.6] },
  { ch: 3, name: 'BE Workbench', url: 'be-workbench.jclaw.top', pos: [-1.15, 0.62, -0.5] },
  { ch: 4, name: 'EZCTD', url: '本机工作台', pos: [1.15, 0.62, -0.5] },
  { ch: 5, name: 'BE Solo', url: 'be-solo.jclaw.top · 私有', pos: [1.35, 0.05, -0.6] },
  { ch: 0, name: 'BE CSR Review', url: 'Agent Skill · 特别节目', pos: [1.2, -0.6, -0.45] },
];
const colOf = (ch) => (ch === 0 ? '#3fe6ff' : ch === 2 ? '#c4da93' : ch === 3 ? '#ed977b' : ch === 1 ? '#e9e2ce' : C.CH[ch].bg);

function flipFrame(c, k, lt) {
  const [id, at] = FLIPS[k];
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
  const res = mods()[id](c, at + lt * 0.6, 0) || {};
  c.restore();
  return res;
}

module.exports = function finale(ctx, lt, t) {
  // ---------- 0–3 · flip montage, full frame ----------
  if (lt < 3.0) {
    const k = Math.min(FLIPS.length - 1, Math.floor(lt / 0.5));
    const local = lt - k * 0.5;
    const res = flipFrame(ctx, k, local);
    const s = 1 - E.outCubic(clamp(local / 0.22));
    drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), s * 0.85);
    return { grade: res.grade || 'night', gradeOverride: res.gradeOverride, streakTint: res.streakTint, streakMul: 0.5 };
  }
  // ---------- 3–26 · in the room ----------
  const u = lt - 3.0;
  // camera: from inside the glass back out to a wide shot, then a slow drift; final framing for title
  const out = E.outExpo(clamp(u / 4.2));
  let pos = [lerp(-0.02, 0.0, out), lerp(-0.035, -0.12, out), lerp(-0.26, -3.15, out)];
  const drift = clamp((u - 4.2) / 18);
  pos = [pos[0] + Math.sin(drift * 1.4) * 0.12, pos[1] - drift * 0.06, pos[2] - drift * 0.25];
  const cam = makeCam({ x: pos[0], y: pos[1], z: pos[2], fov: 0.82 });
  const titleUp = E.inOutCubic(clamp((u - 11.6) / 1.4));
  cam.z -= titleUp * 0.55;
  lookAt(cam, [0, lerp(-0.03, -0.42, titleUp), 0], noise1(u * 0.3) * 0.004);

  // screen: guide / last channel, then power-off
  const offStart = T.K.powerOff - T.K.flip - 3.0; // 19.5
  const off = clamp((u - offStart) / 1.1);
  bx.setTransform(1, 0, 0, 1, 0, 0);
  if (u < 2.0) flipFrame(bx, 0, 0.4); else C.testCard(bx, W, H, t, { clock: 'www.jclaw.top' });
  const st = { ch: 1, power: 1, off, led: 1, screen: buf, staticAmt: u > 1.8 && u < 2.3 ? 0.8 : 0, seed: Math.floor(t * 30), scale: 1 + (1 - out) * 2 };
  const glow = 1 - off * 0.95;
  const scrCol = u < 2 ? [200, 190, 160] : [190, 196, 170];
  C.room(ctx, cam, POSE, scrCol, glow, { key: 0.25 * (1 - off) });
  TV.drawTV(ctx, cam, POSE, st, 0.05 + 0.12 * (1 - off), glow);
  C.beamAndMotes(ctx, cam, POSE, scrCol, glow * 0.9, t);

  // ---------- beams to entrances 5–12 ----------
  const sc = project(cam, TV.screenCenter(POSE));
  const ba = clamp((u - 5.0) / 0.4) * (1 - clamp((u - 12.2) / 0.8));
  if (sc && ba > 0) {
    const hub = project(cam, [0, -0.78, -0.3]);
    ENTRANCES.forEach((e, i) => {
      const q = E.outCubic(clamp((u - 5.2 - i * 0.32) / 0.6));
      if (q <= 0) return;
      const p = project(cam, e.pos);
      if (!p) return;
      const col = colOf(e.ch), rgb = L.rgbOf(col);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ba;
      const ex = lerp(sc.x, p.x, q), ey = lerp(sc.y, p.y, q);
      const g = ctx.createLinearGradient(sc.x, sc.y, ex, ey); g.addColorStop(0, `rgba(${rgb},0.0)`.replace(`${rgb}`, rgb.join(','))); g.addColorStop(1, `rgba(${rgb.join(',')},0.9)`);
      ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(sc.x, sc.y); ctx.quadraticCurveTo((sc.x + ex) / 2, (sc.y + ey) / 2 - 60, ex, ey); ctx.stroke();
      ctx.restore();
      // converge to the hub
      const cv = E.inOutCubic(clamp((u - 8.6 - i * 0.12) / 0.8));
      if (hub && cv > 0) {
        ctx.save(); ctx.globalAlpha = ba * 0.8; ctx.strokeStyle = `rgba(${rgb.join(',')},0.7)`; ctx.lineWidth = 2; ctx.setLineDash([8, 8]); ctx.lineDashOffset = -u * 30;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(lerp(p.x, hub.x, cv), lerp(p.y, hub.y, cv)); ctx.stroke(); ctx.restore();
      }
      // label
      if (q > 0.7) {
        const a = clamp((q - 0.7) / 0.3) * ba;
        const left = e.pos[0] < 0;
        ctx.save(); ctx.globalAlpha = a;
        const w = Math.max(L.measure(ctx, e.name, font(800, 32)), L.measure(ctx, e.url, font(500, 22, 'mono'))) + 70;
        const x = left ? p.x - w : p.x;
        rrect(ctx, x, p.y - 46, w, 92, 16); ctx.fillStyle = 'rgba(8,10,12,0.72)'; ctx.fill(); ctx.strokeStyle = `rgba(${rgb.join(',')},0.8)`; ctx.lineWidth = 2; ctx.stroke();
        rrect(ctx, x + 14, p.y - 30, 8, 60, 4); ctx.fillStyle = col; ctx.fill();
        text(ctx, (e.ch ? 'CH' + C.CH[e.ch].no + '  ' : '') + e.name, x + 38, p.y - 14, { font: font(800, 30), color: '#f4f1ea', align: 'left' });
        text(ctx, e.url, x + 38, p.y + 24, { font: font(500, 22, 'mono'), color: `rgba(${rgb.join(',')},1)`, align: 'left' });
        ctx.restore();
      }
    });
    const ha = clamp((u - 9.2) / 0.5) * ba;
    if (hub && ha > 0) {
      ctx.save(); ctx.globalAlpha = ha;
      rrect(ctx, hub.x - 230, hub.y - 40, 460, 80, 40); ctx.fillStyle = 'rgba(8,10,12,0.8)'; ctx.fill(); ctx.strokeStyle = '#24eb4f'; ctx.lineWidth = 2.5; ctx.stroke();
      text(ctx, 'www.jclaw.top', hub.x, hub.y + 1, { font: font(700, 36, 'mono'), color: '#e9f5ea' });
      ctx.restore();
    }
  }
  // ---------- end title 12.6–19.5 ----------
  const ta = clamp((u - 13.0) / 0.25) * (1 - clamp((u - 19.2) / 0.6));
  if (ta > 0) {
    const y = C.SAFE_T + 92;
    const tr = lerp(40, 10, E.outExpo(clamp((u - 13.0) / 2)));
    ctx.save(); ctx.globalAlpha = ta;
    ctx.save(); ctx.translate(W / 2 - 60, y); ctx.transform(1, 0, -0.16, 1, 0, 0);
    text(ctx, 'JCLAW', 0, 0, { font: font(900, 150, 'inter'), color: '#f6efdf', align: 'right', spacing: tr, glow: 'rgba(255,220,160,0.4)', blur: 30 });
    ctx.restore();
    rrect(ctx, W / 2 - 18, y - 67, 134, 134, 18); ctx.lineWidth = 10; ctx.strokeStyle = '#f6efdf'; ctx.stroke();
    text(ctx, 'TV', W / 2 + 49, y + 4, { font: font(900, 78, 'inter'), color: '#f6efdf' });
    ctx.restore();
    reveal(ctx, '转一下旋钮，就换一件工作。', W / 2, y + 128, u - 13.8, { font: font(700, 50, 'serif'), color: '#e9dcc0', spacing: 10, alpha: ta, stagger: 0.06 });
    text(ctx, 'Turn the dial. Switch the task.   ·   www.jclaw.top', W / 2, y + 186, { font: font(500, 24, 'inter'), color: '#b9ad92', alpha: ta * clamp((u - 14.6) / 0.5), spacing: 2 });
    const fa = ta * clamp((u - 15.2) / 0.6);
    text(ctx, 'home · 1-git-2-cloudflare · training-factory · be-workbench · EZCTD · BE-Solo · be-csr-review', W / 2, H - C.BAR - 74, { font: font(500, 19, 'mono'), color: '#8e8676', alpha: fa });
    text(ctx, '工具用于辅助计算与管理，不替代专业判断与监管结论 · 片中数据均为演示示例', W / 2, H - C.BAR - 38, { font: font(500, 20), color: '#8e8676', alpha: fa });
  }
  // power-off: bright dot lingers
  if (off > 0.75) {
    const c0 = project(cam, TV.screenCenter(POSE));
    if (c0) {
      const k = clamp((off - 0.75) / 0.25) * (1 - clamp((u - offStart - 1.4) / 1.2));
      const g = ctx.createRadialGradient(c0.x, c0.y, 0, c0.x, c0.y, 60);
      g.addColorStop(0, `rgba(240,250,255,${k})`); g.addColorStop(1, 'rgba(240,250,255,0)');
      ctx.fillStyle = g; ctx.fillRect(c0.x - 60, c0.y - 60, 120, 120);
    }
  }
  // fade to just the LED
  const fade = E.inOutCubic(clamp((u - offStart - 1.5) / 2.0));
  if (fade > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fade * 0.96})`; ctx.fillRect(0, 0, W, H);
    const ledLocal = TV.toWorld(POSE, [((1204 + 152 - 16) / TV.TW - 0.5) * TV.BW, ((320 + 31) / TV.TH - 0.5) * TV.BH, -TV.BD / 2 - 0.002]);
    const q = project(cam, ledLocal);
    if (q) {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 30);
      g.addColorStop(0, `rgba(90,255,130,${0.8 * (1 - clamp((u - 22.4) / 0.6))})`); g.addColorStop(1, 'rgba(90,255,130,0)');
      ctx.fillStyle = g; ctx.fillRect(q.x - 30, q.y - 30, 60, 60);
    }
  }
  return { grade: 'hero', streakTint: 'rgb(255,190,120)', streakMul: 0.6 };
};
