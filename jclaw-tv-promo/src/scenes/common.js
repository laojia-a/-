// Shared scene pieces: dark room around the TV, dust motes, channel bug, channel-switch FX, test card, demo-data tag.
const L = require('../lib');
const { canvas, clamp, lerp, rrect, text, font, rng, noise1, project, hex, E, W, H } = L;
const { drawStatic } = require('../post');
const TV = require('../tv');

const BAR = Math.round((H - W / 2.39) / 2);
const SAFE_T = BAR + 36, SAFE_B = H - BAR - 30;

// Channel identities: names, numbers and theme colours follow home/src/animations/sites/*/manifest.json.
const CH = {
  1: { no: '01', name: '临床工具集', en: 'CLINICAL TOOLKIT', url: 'cth.jclaw.top', bg: '#e9e2ce', dark: '#384b38', ink: '#364331', accent: '#7b8153' },
  2: { no: '02', name: '临研知视', en: 'CLINICAL VISION', url: 'cv.jclaw.top', bg: '#183c2d', dark: '#0b251b', ink: '#e9efd8', accent: '#c4da93' },
  3: { no: '03', name: 'BE Workbench', en: 'BE WORKBENCH', url: 'be-workbench.jclaw.top', bg: '#152b31', dark: '#0e1f26', ink: '#e4e7df', accent: '#ed977b' },
  4: { no: '04', name: 'EZCTD', en: 'EZCTD', url: '本机工作台', bg: '#ece3e2', dark: '#5c4f5b', ink: '#574755', accent: '#9c657e' },
  5: { no: '05', name: 'BE Solo', en: 'BE SOLO', url: 'be-solo.jclaw.top', bg: '#e2e6eb', dark: '#414b66', ink: '#39475a', accent: '#677d9c' },
  6: { no: '06', name: 'BE Oracle', en: 'BE ORACLE', url: '', bg: '#dce4d5', dark: '#334b3f', ink: '#324e40', accent: '#708e60' },
  7: { no: '07', name: '2026 · 学习资料', en: 'STUDY 2026', url: '', bg: '#eee3ca', dark: '#5a543d', ink: '#534b35', accent: '#a0864b' },
};

// ---------- room ----------
// screenCol: [r,g,b] average screen colour; glow 0..1 how much the screen lights the room
function room(ctx, cam, pose, screenCol, glow, opts = {}) {
  const [r, g, b] = screenCol;
  // wall
  let gr = ctx.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, '#040507'); gr.addColorStop(0.6, '#07090c'); gr.addColorStop(1, '#030405');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  const c = project(cam, TV.screenCenter(pose));
  if (!c) return;
  const s = pose.s || 1;
  // back-scatter halo on the wall behind the set
  const R = c.k * 1.6 * s;
  gr = ctx.createRadialGradient(c.x, c.y, 0, c.x, c.y, R);
  gr.addColorStop(0, `rgba(${r},${g},${b},${0.22 * glow})`); gr.addColorStop(0.45, `rgba(${r},${g},${b},${0.07 * glow})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  // table top: a horizontal plane under the set
  const fy = TV.BH / 2 + 0.075;
  const near = project(cam, [pose.x, pose.y + fy * s, pose.z - 1.4 * s]);
  const far = project(cam, [pose.x, pose.y + fy * s, pose.z + 0.6 * s]);
  if (far) {
    const top = Math.max(0, far.y);
    gr = ctx.createLinearGradient(0, top, 0, H);
    gr.addColorStop(0, '#0b0c0d'); gr.addColorStop(1, '#050505');
    ctx.fillStyle = gr; ctx.fillRect(0, top, W, H - top);
    // edge highlight of the table
    ctx.fillStyle = `rgba(${r},${g},${b},${0.08 * glow})`; ctx.fillRect(0, top, W, 1.5);
    // light pool in front of the screen
    const pc = project(cam, [pose.x, pose.y + fy * s, pose.z - 0.55 * s]);
    if (pc) {
      ctx.save();
      ctx.translate(pc.x, pc.y); ctx.scale(1, near ? clamp((near.y - far.y) / (pc.k * 1.4 * s), 0.08, 0.6) : 0.25);
      const rr = pc.k * 1.1 * s;
      gr = ctx.createRadialGradient(0, 0, 0, 0, 0, rr);
      gr.addColorStop(0, `rgba(${r},${g},${b},${0.3 * glow})`); gr.addColorStop(0.5, `rgba(${r},${g},${b},${0.09 * glow})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }
  if (opts.key) {
    // warm key light from upper left (product shots)
    gr = ctx.createRadialGradient(W * 0.18, H * 0.05, 0, W * 0.18, H * 0.05, W * 0.8);
    gr.addColorStop(0, `rgba(255,200,140,${0.10 * opts.key})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
  }
}

// light beam from the screen toward the camera + motes in it
function beamAndMotes(ctx, cam, pose, screenCol, glow, t, n = 140) {
  const [r, g, b] = screenCol;
  const corners = TV.screenCorners(pose).map((v) => project(cam, v));
  const c = project(cam, TV.screenCenter(pose));
  if (!c || corners.some((v) => !v)) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const rnd = rng(42);
  const s = pose.s || 1;
  for (let i = 0; i < n; i++) {
    const lx = (rnd() - 0.5) * 1.6, ly = (rnd() - 0.5) * 1.0, lz = -0.25 - rnd() * 1.4;
    const sp = 0.015 + rnd() * 0.03, ph = rnd() * 100;
    const px = lx + noise1(t * sp * 3 + ph) * 0.08, py = ly + ((t * sp + ph) % 1.2) - 0.6, pz = lz + noise1(t * sp + ph * 2) * 0.05;
    const q = project(cam, [pose.x + px * s, pose.y + py * s, pose.z + pz * s]);
    if (!q) continue;
    const inBeam = clamp(1 - Math.hypot(px / 0.9, py / 0.55));
    const a = glow * inBeam * (0.25 + 0.75 * Math.abs(noise1(t * 0.7 + ph))) * 0.5;
    if (a < 0.01) continue;
    const rad = Math.max(0.6, q.k * 0.0016 * s);
    ctx.fillStyle = `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},${a})`;
    ctx.beginPath(); ctx.arc(q.x, q.y, rad, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// average colour of a canvas (cheap)
const _avg = canvas(4, 4);
function avgColor(cv) {
  const x = _avg.getContext('2d');
  x.clearRect(0, 0, 4, 4);
  x.drawImage(cv, 0, 0, 4, 4);
  const d = x.getImageData(0, 0, 4, 4).data;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 64; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
  return [Math.round(r / 16), Math.round(g / 16), Math.round(b / 16)];
}

// ---------- on-screen channel bug (like the real TV overlay: mark + name + segment) ----------
function channelBug(ctx, ch, seg, alpha = 1, light = false) {
  const C = CH[ch];
  ctx.save();
  ctx.globalAlpha *= alpha;
  const x = 96, y = SAFE_T + 6;
  const fg = light ? C.ink : '#eef2ea';
  const w = 70 + L.measure(ctx, C.name, font(700, 22)) + 26 + L.measure(ctx, seg, font(500, 17));
  rrect(ctx, x, y, w + 24, 52, 12);
  ctx.fillStyle = light ? 'rgba(255,255,255,0.55)' : 'rgba(10,14,12,0.42)'; ctx.fill();
  ctx.lineWidth = 1; ctx.strokeStyle = light ? 'rgba(60,70,50,0.25)' : 'rgba(255,255,255,0.16)'; ctx.stroke();
  rrect(ctx, x + 8, y + 8, 56, 36, 8); ctx.fillStyle = light ? C.dark : C.accent; ctx.fill();
  text(ctx, 'CH' + C.no, x + 36, y + 27, { font: font(800, 16, 'inter'), color: light ? '#f5f1e6' : C.dark });
  const nw = text(ctx, C.name, x + 76, y + 27, { font: font(700, 22), color: fg, align: 'left' });
  text(ctx, seg, x + 76 + nw + 18, y + 28, { font: font(500, 17), color: fg, align: 'left', alpha: 0.7 });
  ctx.restore();
}
// "示例数据" tag
function demoTag(ctx, x, y, alpha = 1, light = false, label = '示例数据 · DEMO DATA') {
  ctx.save(); ctx.globalAlpha *= alpha;
  const w = L.measure(ctx, label, font(600, 15)) + 26;
  rrect(ctx, x - w, y, w, 28, 14);
  ctx.strokeStyle = light ? 'rgba(80,70,50,0.5)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.2; ctx.stroke();
  text(ctx, label, x - w / 2, y + 14.5, { font: font(600, 15), color: light ? 'rgba(70,60,45,0.85)' : 'rgba(255,255,255,0.75)' });
  ctx.restore();
}

// ---------- channel switch: static burst, roll bar, tearing ----------
function switchIn(ctx, lt, seed, dur = 0.55) {
  if (lt > dur) return;
  const k = 1 - E.outCubic(clamp(lt / dur));
  // horizontal tearing of current content
  if (k > 0.2) {
    const src = ctx.canvas;
    const r = rng(seed + Math.floor(lt * 60));
    for (let i = 0; i < 9; i++) {
      const y = r() * H, h = 8 + r() * 60, dx = (r() - 0.5) * 160 * k;
      ctx.drawImage(src, 0, y, W, h, dx, y, W, h);
    }
  }
  drawStatic(ctx, 0, 0, W, H, seed + Math.floor(lt * 30), Math.pow(k, 1.3) * 0.95);
  const yy = ((lt * 2.6) % 1) * H;
  const g = ctx.createLinearGradient(0, yy - 120, 0, yy + 120);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, `rgba(255,255,255,${0.35 * k})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, yy - 120, W, 240);
}
function switchOut(ctx, lt, end, seed, dur = 0.18) {
  const q = clamp((lt - (end - dur)) / dur);
  if (q <= 0) return;
  drawStatic(ctx, 0, 0, W, H, seed + Math.floor(lt * 30), q * 0.9);
}

// ---------- JCLAW test card: seven bars in the seven channel colours ----------
function testCard(ctx, w, h, t, o = {}) {
  ctx.save();
  ctx.fillStyle = '#10140f'; ctx.fillRect(0, 0, w, h);
  // one bar per channel, in channel order, using each channel's theme colour (brightened for the dark ones)
  const bars = [CH[1].bg, '#4f8a63', '#3a6e78', CH[4].accent, CH[5].accent, CH[6].accent, CH[7].accent];
  const barH = h * 0.62, bw = w / 7;
  bars.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * bw, 0, bw + 1, barH); });
  // lower strip: dark castellations + greyscale steps
  for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 2 ? '#1b211b' : '#e9e2ce'; ctx.fillRect((i * w) / 14, barH, w / 14 + 1, h * 0.08); }
  for (let i = 0; i < 8; i++) { const v = Math.round(20 + i * 30); ctx.fillStyle = `rgb(${v},${v},${v - 4})`; ctx.fillRect((i * w) / 8, barH + h * 0.08, w / 8 + 1, h * 0.3); }
  // centre circle with ident
  const cx = w / 2, cy = h * 0.47, R = h * 0.3;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = '#f3ecdc'; ctx.fill();
  ctx.lineWidth = h * 0.012; ctx.strokeStyle = '#1f2a20'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.lineWidth = h * 0.003; ctx.strokeStyle = 'rgba(30,40,30,0.25)'; ctx.stroke();
  ctx.save(); ctx.translate(cx + h * 0.012, cy - h * 0.035); ctx.transform(1, 0, -0.18, 1, 0, 0);
  text(ctx, 'JCLAW', 0, 0, { font: font(900, h * 0.13, 'inter'), color: '#244232', align: 'right' });
  ctx.restore();
  rrect(ctx, cx + h * 0.03, cy - h * 0.1, h * 0.13, h * 0.13, h * 0.02); ctx.lineWidth = h * 0.009; ctx.strokeStyle = '#244232'; ctx.stroke();
  text(ctx, 'TV', cx + h * 0.095, cy - h * 0.034, { font: font(800, h * 0.065, 'inter'), color: '#244232' });
  text(ctx, 'BROADCAST NETWORK · 七频导航', cx, cy + h * 0.1, { font: font(600, h * 0.032), color: '#3b4a3c', spacing: h * 0.006 });
  if (o.clock) text(ctx, o.clock, cx, cy + h * 0.17, { font: font(500, h * 0.03, 'mono'), color: '#5a6a58' });
  ctx.restore();
}

// padlock icon centred at x,y with body height s
function lockIcon(ctx, x, y, s, col, open = 0) {
  ctx.save(); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = s * 0.16;
  ctx.beginPath(); ctx.arc(x, y - s * 0.32 - open * s * 0.3, s * 0.3, Math.PI, 0); ctx.lineTo(x + s * 0.3, y - s * 0.1 - open * s * 0.3); ctx.moveTo(x - s * 0.3, y - s * 0.32 - open * s * 0.3); ctx.lineTo(x - s * 0.3, y - s * 0.1); ctx.stroke();
  rrect(ctx, x - s * 0.45, y - s * 0.12, s * 0.9, s * 0.7, s * 0.12); ctx.fill();
  ctx.restore();
}

module.exports = { lockIcon, BAR, SAFE_T, SAFE_B, CH, room, beamAndMotes, avgColor, channelBug, demoTag, switchIn, switchOut, testCard };
