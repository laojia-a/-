// JCLAW TV · S10 — procedural model of the home navigation TV (front texture + 3D box, handle, antennas, legs).
// Layout follows the real home page shell: screen left, CH display, 1–7 channel knob, power/pause/settings keys, speaker, JCLAW TV badge.
const L = require('./lib');
const { canvas, clamp, lerp, rrect, text, font, rot3, project, planePt, texPlane, polyPath, E } = L;
const { drawStatic } = require('./post');

const TW = 1400, TH = 780;              // front texture size at scale 1 (1 px = 0.001 world units)
const BW = 1.4, BH = 0.78, BD = 0.40;   // body size in world units
const SCR = { x: 50, y: 53, w: 1095, h: 603, r: 34 }; // glass inside the front texture
const KNOB = { x: 1283, y: 222, r: 50 };
const CREAM = '#f3ecdc', CREAM_D = '#e3d6b8', EDGE = '#c6bfae', INK = '#2c4a37', DARK = '#1d2a22';

const channelAngle = (ch) => -Math.PI / 2 + (ch - 1) * (2 * Math.PI / 7);

// one texture per integer scale (1..3); reallocating per frame would leak native memory
const _texs = {};
function frontTexture(st) {
  const sc = Math.max(1, Math.min(3, Math.ceil((st.scale || 1) - 0.01)));
  const _tex = _texs[sc] || (_texs[sc] = canvas(TW * sc, TH * sc));
  const c = _tex.getContext('2d');
  c.setTransform(sc, 0, 0, sc, 0, 0);
  c.clearRect(0, 0, TW, TH);
  drawFront(c, st);
  return _tex;
}

function drawFront(c, st) {
  // body
  rrect(c, 0, 0, TW, TH, 54);
  let g = c.createLinearGradient(0, 0, 0, TH);
  g.addColorStop(0, '#fbf6ea'); g.addColorStop(0.5, CREAM); g.addColorStop(1, CREAM_D);
  c.fillStyle = g; c.fill();
  // outer rim + bevel
  c.lineWidth = 6; c.strokeStyle = 'rgba(160,140,100,0.55)'; c.stroke();
  rrect(c, 10, 10, TW - 20, TH - 20, 46); c.lineWidth = 2.5; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.stroke();
  rrect(c, 18, 18, TW - 36, TH - 36, 40); c.lineWidth = 1.5; c.strokeStyle = 'rgba(170,150,110,0.35)'; c.stroke();
  // subtle plastic texture
  c.save(); c.globalAlpha = 0.05;
  for (let i = 0; i < 90; i++) { c.fillStyle = i % 2 ? '#fff' : '#a08a5a'; c.fillRect(0, i * 9, TW, 1); }
  c.restore();
  // bezel
  rrect(c, SCR.x - 22, SCR.y - 22, SCR.w + 44, SCR.h + 44, SCR.r + 18);
  g = c.createLinearGradient(0, SCR.y - 22, 0, SCR.y + SCR.h + 22);
  g.addColorStop(0, '#2b3229'); g.addColorStop(1, '#1a1f19');
  c.fillStyle = g; c.fill();
  rrect(c, SCR.x - 22, SCR.y - 22, SCR.w + 44, SCR.h + 44, SCR.r + 18); c.lineWidth = 3; c.strokeStyle = 'rgba(255,255,255,0.18)'; c.stroke();
  rrect(c, SCR.x - 8, SCR.y - 8, SCR.w + 16, SCR.h + 16, SCR.r + 6); c.fillStyle = '#3a4537'; c.fill();
  // screen
  drawScreen(c, st);
  // CH display
  const cx = 1218, cy = 73;
  rrect(c, cx, cy, 120, 50, 8); c.fillStyle = '#c9b88f'; c.fill();
  rrect(c, cx + 4, cy + 4, 112, 42, 6); c.fillStyle = '#16231b'; c.fill();
  const lit = st.power > 0.02 ? 1 : 0.25;
  text(c, 'CH', cx + 26, cy + 26, { font: font(700, 15, 'inter'), color: `rgba(220,235,220,${0.85 * lit})`, spacing: 1.5 });
  text(c, String(st.ch || 1).padStart(2, '0'), cx + 70, cy + 26, { font: font(800, 30, 'inter'), color: `rgba(245,250,240,${lit})` });
  c.beginPath(); c.arc(cx + 103, cy + 25, 3, 0, Math.PI * 2); c.fillStyle = `rgba(120,255,140,${0.9 * lit})`; c.fill();
  // knob numbers
  for (let n = 1; n <= 7; n++) {
    const a = channelAngle(n), rr = KNOB.r + 34;
    text(c, String(n), KNOB.x + Math.cos(a) * rr, KNOB.y + Math.sin(a) * rr, { font: font(700, 17, 'inter'), color: n === st.ch ? '#1f3a2a' : '#4b4a3c' });
  }
  drawKnob(c, st.knob == null ? channelAngle(st.ch || 1) : st.knob);
  // key panel
  rrect(c, 1196, 312, 168, 236, 30); c.fillStyle = '#e2d4b1'; c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(150,130,90,0.5)'; c.stroke();
  const keys = [['power', '开关'], ['pause', '暂停'], ['menu', '设置']];
  keys.forEach(([k, label], i) => drawKey(c, 1204, 320 + i * 76, k, label, st));
  // speaker
  c.save();
  c.beginPath(); c.ellipse(1282, 626, 58, 52, 0, 0, Math.PI * 2);
  g = c.createRadialGradient(1272, 610, 10, 1282, 626, 60); g.addColorStop(0, '#efe3c6'); g.addColorStop(1, '#c4b28a');
  c.fillStyle = g; c.fill(); c.lineWidth = 3; c.strokeStyle = 'rgba(140,120,80,0.6)'; c.stroke();
  c.beginPath(); c.ellipse(1282, 626, 46, 40, 0, 0, Math.PI * 2); c.clip();
  c.fillStyle = '#2a2f27'; c.fillRect(1230, 580, 110, 100);
  for (let i = 0; i < 10; i++) { c.fillStyle = '#d6c7a2'; c.fillRect(1230, 588 + i * 8.4, 110, 3.6); }
  c.restore();
  // badge + doodle
  c.save();
  c.translate(600, 742); c.transform(1, 0, -0.18, 1, 0, 0);
  text(c, 'JCLAW', 0, 0, { font: font(900, 34, 'inter'), color: INK, align: 'right' });
  c.restore();
  rrect(c, 608, 726, 30, 30, 5); c.lineWidth = 2.2; c.strokeStyle = INK; c.stroke();
  text(c, 'TV', 623, 742, { font: font(800, 15, 'inter'), color: INK });
  c.save(); c.strokeStyle = 'rgba(70,70,60,0.7)'; c.lineWidth = 2; c.beginPath();
  c.moveTo(42, 756); c.lineTo(62, 734); c.lineTo(74, 746); c.lineTo(88, 728); c.lineTo(108, 756); c.closePath(); c.stroke();
  star(c, 122, 732, 9); c.stroke(); c.restore();
}
function star(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  c.closePath();
}
function drawKnob(c, ang) {
  const { x, y, r } = KNOB;
  c.save();
  c.beginPath(); c.arc(x + 3, y + 5, r + 6, 0, Math.PI * 2); c.fillStyle = 'rgba(90,70,30,0.35)'; c.fill();
  let g = c.createRadialGradient(x - 18, y - 20, 4, x, y, r + 6);
  g.addColorStop(0, '#fff2c4'); g.addColorStop(0.55, '#d9b46a'); g.addColorStop(1, '#8c6a2c');
  c.beginPath(); c.arc(x, y, r + 5, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  // knurled rim
  c.translate(x, y); c.rotate(ang);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    c.beginPath(); c.moveTo(Math.cos(a) * (r - 2), Math.sin(a) * (r - 2)); c.lineTo(Math.cos(a) * (r + 5), Math.sin(a) * (r + 5));
    c.lineWidth = 1.6; c.strokeStyle = i % 2 ? 'rgba(110,80,30,0.65)' : 'rgba(255,240,200,0.55)'; c.stroke();
  }
  g = c.createRadialGradient(-12, -14, 3, 0, 0, r - 6);
  g.addColorStop(0, '#fbe6ac'); g.addColorStop(1, '#c49a4c');
  c.beginPath(); c.arc(0, 0, r - 6, 0, Math.PI * 2); c.fillStyle = g; c.fill();
  // pointer bar (along angle)
  c.rotate(Math.PI / 2);
  rrect(c, -9, -r + 10, 18, r * 1.45, 9);
  g = c.createLinearGradient(-9, 0, 9, 0); g.addColorStop(0, '#0f2418'); g.addColorStop(0.5, '#2e5a3e'); g.addColorStop(1, '#0c1d13');
  c.fillStyle = g; c.fill();
  rrect(c, -2, -r + 15, 4, 18, 2); c.fillStyle = '#f5f0dc'; c.fill();
  c.restore();
}
function drawKey(c, x, y, kind, label, st) {
  const w = 152, h = 62;
  c.save();
  rrect(c, x + 1, y + 4, w, h, 24); c.fillStyle = 'rgba(120,100,60,0.35)'; c.fill();
  rrect(c, x, y, w, h, 24);
  let g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#efe4cb');
  c.fillStyle = g; c.fill(); c.lineWidth = 1.5; c.strokeStyle = 'rgba(150,130,90,0.55)'; c.stroke();
  c.save(); rrect(c, x, y, w, h, 24); c.clip();
  g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, '#c9d8c8'); g.addColorStop(1, '#a8bca8');
  c.fillStyle = g; c.fillRect(x, y, 50, h); c.restore();
  c.strokeStyle = '#5b6f5d'; c.fillStyle = '#5b6f5d'; c.lineWidth = 2.4;
  const ix = x + 25, iy = y + h / 2;
  if (kind === 'power') { c.beginPath(); c.arc(ix, iy + 1, 9, -Math.PI * 0.32, Math.PI * 1.32); c.stroke(); c.beginPath(); c.moveTo(ix, iy - 11); c.lineTo(ix, iy + 1); c.stroke(); }
  if (kind === 'pause') { c.fillRect(ix - 6, iy - 9, 4, 18); c.fillRect(ix + 2, iy - 9, 4, 18); }
  if (kind === 'menu') { for (let i = -1; i <= 1; i++) { c.fillRect(ix - 5, iy + i * 6 - 1, 13, 2.4); c.fillRect(ix - 10, iy + i * 6 - 1, 2.4, 2.4); } }
  text(c, label, x + 78, y + h / 2 + 1, { font: font(700, 20), color: '#33402f', align: 'left' });
  if (kind === 'power') {
    const on = st.led == null ? (st.power > 0 ? 1 : 0) : st.led;
    c.beginPath(); c.arc(x + w - 16, y + h / 2, 4.5, 0, Math.PI * 2);
    c.fillStyle = `rgba(${lerp(70, 50, on)},${lerp(90, 240, on)},${lerp(70, 90, on)},1)`; c.fill();
    if (on > 0.05) { c.shadowColor = 'rgba(60,255,110,0.9)'; c.shadowBlur = 14 * on; c.fill(); }
  }
  c.restore();
}

// Screen: content canvas (or black), with power-on/off line, static, scanlines, vignette and glass reflection.
function drawScreen(c, st) {
  const { x, y, w, h, r } = SCR;
  c.save();
  rrect(c, x, y, w, h, r); c.clip();
  c.fillStyle = '#0b0f0c'; c.fillRect(x, y, w, h);
  const pw = st.power == null ? 1 : st.power; // 0 off · 0..1 opening · 1 on
  const off = st.off || 0;                   // 0..1 power-off collapse
  if (pw > 0) {
    // opening: thin bright line expands vertically
    let vh = h, vw = w, bright = 0;
    if (pw < 1) { const q = pw; vh = Math.max(2, h * E.inExpo(clamp((q - 0.25) / 0.75))); vw = w * E.outExpo(clamp(q / 0.3)); bright = 1 - q; }
    if (off > 0) { vh = Math.max(2, h * (1 - E.outExpo(clamp(off / 0.45)))); vw = w * (1 - E.inExpo(clamp((off - 0.4) / 0.4))); bright = Math.min(1, off * 2); }
    const ry = y + (h - vh) / 2, rx = x + (w - vw) / 2;
    c.save();
    c.beginPath(); c.rect(rx, ry, vw, vh); c.clip();
    if (st.screen) c.drawImage(st.screen, x, y, w, h);
    if (st.staticAmt > 0) drawStatic(c, x, y, w, h, st.seed || 1, st.staticAmt);
    if (bright > 0) { c.fillStyle = `rgba(235,250,255,${bright})`; c.fillRect(rx, ry, vw, vh); }
    c.restore();
    if (bright > 0 && vh < 30) {
      const gg = c.createLinearGradient(0, y + h / 2 - 40, 0, y + h / 2 + 40);
      gg.addColorStop(0, 'rgba(200,240,255,0)'); gg.addColorStop(0.5, `rgba(220,248,255,${0.8 * bright})`); gg.addColorStop(1, 'rgba(200,240,255,0)');
      c.fillStyle = gg; c.fillRect(rx, y + h / 2 - 40, vw, 80);
    }
    // roll bar (channel change)
    if (st.roll > 0) {
      const yy = y + ((st.rollPos || 0) % 1) * h;
      const gg = c.createLinearGradient(0, yy - 60, 0, yy + 60);
      gg.addColorStop(0, 'rgba(255,255,255,0)'); gg.addColorStop(0.5, `rgba(255,255,255,${0.22 * st.roll})`); gg.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gg; c.fillRect(x, yy - 60, w, 120);
    }
    // scanlines
    c.globalAlpha = 0.10 * (st.scan == null ? 1 : st.scan);
    c.fillStyle = '#000';
    for (let yy = y; yy < y + h; yy += 3) c.fillRect(x, yy, w, 1);
    c.globalAlpha = 1;
  }
  // curvature vignette
  let g = c.createRadialGradient(x + w / 2, y + h / 2, h * 0.35, x + w / 2, y + h / 2, h * 0.95);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.55)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  // glass reflection
  c.save(); c.globalCompositeOperation = 'screen';
  g = c.createLinearGradient(x, y, x + w * 0.6, y + h);
  g.addColorStop(0, `rgba(255,255,255,${0.10 * (st.glass == null ? 1 : st.glass)})`); g.addColorStop(0.35, 'rgba(255,255,255,0.025)'); g.addColorStop(0.36, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(x, y, w, h);
  c.restore();
  c.restore();
  rrect(c, x, y, w, h, r); c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.stroke();
}

// ---------- 3D ----------
// pose: { x, y, z, rx, ry, rz, s }
function toWorld(pose, lp) {
  const s = pose.s || 1;
  const r = rot3([lp[0] * s, lp[1] * s, lp[2] * s], pose.rx || 0, pose.ry || 0, pose.rz || 0);
  return [pose.x + r[0], pose.y + r[1], pose.z + r[2]];
}
function frontPlane(pose) {
  return { c: toWorld(pose, [0, 0, -BD / 2]), rx: pose.rx || 0, ry: pose.ry || 0, rz: pose.rz || 0 };
}
// world-space corners of the glass (TL, TR, BR, BL)
function screenCorners(pose) {
  const u = (px) => (px / TW - 0.5) * BW, v = (py) => (py / TH - 0.5) * BH;
  const z = -BD / 2 - 0.001;
  return [[u(SCR.x), v(SCR.y)], [u(SCR.x + SCR.w), v(SCR.y)], [u(SCR.x + SCR.w), v(SCR.y + SCR.h)], [u(SCR.x), v(SCR.y + SCR.h)]].map(([a, b]) => toWorld(pose, [a, b, z]));
}
function screenCenter(pose) {
  const u = ((SCR.x + SCR.w / 2) / TW - 0.5) * BW, v = ((SCR.y + SCR.h / 2) / TH - 0.5) * BH;
  return toWorld(pose, [u, v, -BD / 2]);
}

function shadeFill(ctx, col, k) { ctx.fillStyle = col; ctx.fill(); if (k > 0) { ctx.fillStyle = `rgba(0,0,0,${k})`; ctx.fill(); } }

// Draws the whole set. light: 0 (dark room, only rim) .. 1 (fully lit product shot)
function drawTV(ctx, cam, pose, st, light = 1, spill = 1) {
  const hw = BW / 2, hh = BH / 2, hd = BD / 2, rr = 0.05;
  const P = (x, y, z) => toWorld(pose, [x, y, z]);
  const dark = 1 - light;
  // floor shadow
  const fs = project(cam, P(0, hh + 0.075, 0.02));
  if (fs) {
    ctx.save();
    ctx.translate(fs.x, fs.y); ctx.scale(1, 0.18);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, fs.k * BW * (pose.s || 1) * 0.7);
    g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, fs.k * BW * (pose.s || 1) * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // which faces are visible
  const camL = (() => { // camera position in TV-local frame
    const s = pose.s || 1;
    const d = [cam.x - pose.x, cam.y - pose.y, cam.z - pose.z];
    // inverse rotation: apply -rz, -ry, -rx in reverse order
    let q = rot3(d, 0, 0, -(pose.rz || 0)); q = rot3(q, 0, -(pose.ry || 0), 0); q = rot3(q, -(pose.rx || 0), 0, 0);
    return [q[0] / s, q[1] / s, q[2] / s];
  })();
  // legs (behind body when seen from front)
  const leg = (x0) => {
    if (polyPath(ctx, cam, [P(x0, hh - 0.01, -hd + 0.06), P(x0 + 0.05, hh - 0.01, -hd + 0.06), P(x0 + 0.042, hh + 0.07, -hd + 0.05), P(x0 + 0.012, hh + 0.07, -hd + 0.05)])) {
      const g = ctx.createLinearGradient(0, 0, 0, 1); ctx.fillStyle = '#7a5a2a'; ctx.fill(); ctx.fillStyle = `rgba(0,0,0,${0.35 + dark * 0.4})`; ctx.fill();
      void g;
    }
  };
  leg(-hw + 0.17); leg(hw - 0.36);
  // antennas (from back-right top)
  const base = P(hw - 0.24, -hh + 0.005, hd * 0.2);
  const tips = [P(hw - 0.33, -hh - 0.25, hd * 0.25), P(hw - 0.13, -hh - 0.29, hd * 0.1)];
  const pb = project(cam, base);
  for (const tp of tips) {
    const pt = project(cam, tp);
    if (!pb || !pt) continue;
    ctx.save(); ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(${170 - dark * 120},${170 - dark * 120},${165 - dark * 115},1)`; ctx.lineWidth = Math.max(1, pt.k * 0.006);
    ctx.beginPath(); ctx.moveTo(pb.x, pb.y); ctx.lineTo(pt.x, pt.y); ctx.stroke();
    ctx.beginPath(); ctx.arc(pt.x, pt.y, Math.max(1.5, pt.k * 0.011), 0, Math.PI * 2); ctx.fillStyle = `rgba(${200 - dark * 140},${200 - dark * 140},${195 - dark * 140},1)`; ctx.fill();
    ctx.restore();
  }
  // handle (arc above the top)
  const hpts = [];
  for (let i = 0; i <= 24; i++) { const a = Math.PI + (i / 24) * Math.PI; hpts.push(P(-0.06 + Math.cos(a) * 0.19, -hh + 0.01 + Math.sin(a) * 0.075, 0)); }
  const hp = hpts.map((q) => project(cam, q));
  if (hp.every(Boolean)) {
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); hp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
    ctx.lineWidth = Math.max(2, hp[12].k * 0.02); ctx.strokeStyle = mix('#8a6a38', '#1c150b', dark * 0.8); ctx.stroke();
    ctx.lineWidth = Math.max(1, hp[12].k * 0.006); ctx.strokeStyle = `rgba(255,230,170,${0.35 + light * 0.3})`; ctx.stroke();
    ctx.restore();
  }
  // side faces
  const faces = [];
  if (camL[0] > hw) faces.push({ pts: [P(hw, -hh + rr, -hd), P(hw, -hh + rr, hd), P(hw, hh - rr, hd), P(hw, hh - rr, -hd)], col: '#d8c79f', k: 0.18 });
  if (camL[0] < -hw) faces.push({ pts: [P(-hw, -hh + rr, -hd), P(-hw, -hh + rr, hd), P(-hw, hh - rr, hd), P(-hw, hh - rr, -hd)], col: '#d2c096', k: 0.3 });
  if (camL[1] < -hh) faces.push({ pts: [P(-hw + rr, -hh, -hd), P(hw - rr, -hh, -hd), P(hw - rr, -hh, hd), P(-hw + rr, -hh, hd)], col: '#efe5cc', k: 0.0 });
  if (camL[1] > hh) faces.push({ pts: [P(-hw + rr, hh, -hd), P(hw - rr, hh, -hd), P(hw - rr, hh, hd), P(-hw + rr, hh, hd)], col: '#b9a57a', k: 0.4 });
  for (const f of faces) {
    if (polyPath(ctx, cam, f.pts)) {
      shadeFill(ctx, f.col, f.k + dark * 0.82);
      ctx.lineWidth = 1.5; ctx.strokeStyle = `rgba(255,240,210,${0.18 + light * 0.2})`; ctx.stroke();
    }
  }
  // side vents on the right side
  if (camL[0] > hw) {
    ctx.save(); ctx.strokeStyle = `rgba(80,60,30,${0.5 - dark * 0.2})`; ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      const a = project(cam, P(hw, -hh + 0.2 + i * 0.03, -hd + 0.07)), b = project(cam, P(hw, -hh + 0.19 + i * 0.03, -hd + 0.2));
      if (a && b) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    }
    ctx.restore();
  }
  // front face
  const tex = frontTexture(st);
  const fp = frontPlane(pose);
  const s = pose.s || 1;
  texPlane(ctx, cam, fp, BW * s, BH * s, tex, { nx: st.nx, ny: st.ny });
  if (dark > 0.01) {
    // darken body but keep the glass (it is emissive)
    ctx.save();
    const q = [P(-hw, -hh, -hd - 0.0005), P(hw, -hh, -hd - 0.0005), P(hw, hh, -hd - 0.0005), P(-hw, hh, -hd - 0.0005)].map((v) => project(cam, v));
    if (q.every(Boolean)) {
      ctx.beginPath(); q.forEach((v, i) => (i ? ctx.lineTo(v.x, v.y) : ctx.moveTo(v.x, v.y))); ctx.closePath();
      const sc = screenCorners(pose).map((v) => project(cam, v));
      if (sc.every(Boolean)) { ctx.moveTo(sc[0].x, sc[0].y); ctx.lineTo(sc[3].x, sc[3].y); ctx.lineTo(sc[2].x, sc[2].y); ctx.lineTo(sc[1].x, sc[1].y); ctx.closePath(); }
      ctx.clip('evenodd');
      // screen light spilling on the bezel/front: radial falloff from screen centre
      const c0 = project(cam, screenCenter(pose));
      const g = ctx.createRadialGradient(c0.x, c0.y, c0.k * 0.3 * s, c0.x, c0.y, c0.k * 0.95 * s);
      g.addColorStop(0, `rgba(4,6,8,${dark * (1 - 0.5 * spill)})`); g.addColorStop(1, `rgba(2,3,5,${dark * (1 - 0.1 * spill)})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, L.W, L.H);
    }
    ctx.restore();
  }
  return { tex };
}
function mix(a, b, t) { return L.mixHex(a, b, clamp(t)); }

module.exports = { drawTV, frontTexture, screenCorners, screenCenter, frontPlane, channelAngle, TW, TH, BW, BH, BD, SCR, KNOB, toWorld };
