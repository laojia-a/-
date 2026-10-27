// 0–10 s · Cold open: black room, power LED, CRT power-on line, seven-colour test card, slow push, dive into static.
const L = require('../lib');
const { canvas, clamp, inv, E, makeCam, lookAt, track, W, H } = L;
const TV = require('../tv');
const C = require('./common');
const { drawStatic } = require('../post');
const T = require('../timeline');

const buf = canvas(W, H), bx = buf.getContext('2d');
const POSE = { x: 0, y: 0, z: 0 };

module.exports = function cold(ctx, lt) {
  const t = lt;
  // camera: slow HBO push, then accelerate into the glass
  const pos = track([[0, [0.42, -0.08, -2.5]], [8.4, [0.18, -0.05, -1.85]], [10, [-0.03, -0.035, -0.32]]], t, (q) => q);
  const push = E.inExpo(inv(8.4, 10, t));
  const p0 = track([[0, [0.42, -0.08, -2.5]], [8.4, [0.18, -0.05, -1.85]]], t, E.inOutSine);
  const camPos = t < 8.4 ? p0 : [L.lerp(p0[0], -0.03, push), L.lerp(p0[1], -0.035, push), L.lerp(-1.85, -0.3, push)];
  void pos;
  const cam = makeCam({ x: camPos[0], y: camPos[1], z: camPos[2], fov: 0.72 });
  lookAt(cam, [L.lerp(0.04, -0.03, push), -0.035, 0], L.noise1(t * 0.3) * 0.004);

  // power + LED
  const ledBlink = t < T.K.ledOn ? 0 : t < T.K.ledOn + 0.12 ? 1 : t < T.K.ledOn + 0.3 ? 0.15 : 1;
  const pw = t < T.K.powerOn ? 0 : clamp((t - T.K.powerOn) / 0.7);
  // screen content
  bx.setTransform(1, 0, 0, 1, 0, 0);
  C.testCard(bx, W, H, t, { clock: '2026-10-27  07:00' });
  const st = { ch: 1, power: pw, led: ledBlink, screen: buf, staticAmt: clamp((t - 8.3) / 1.2) * 0.9 + (pw > 0 && pw < 1 ? 0.3 : 0), seed: Math.floor(t * 30), scale: 1 + push * 1.5 };
  const scrCol = pw > 0 ? [190, 196, 170] : [0, 0, 0];
  const glow = E.outCubic(clamp((t - T.K.powerOn - 0.2) / 1.6)) * (1 - push * 0.3);
  C.room(ctx, cam, POSE, scrCol, glow);
  TV.drawTV(ctx, cam, POSE, st, 0.03 + glow * 0.05, glow);
  C.beamAndMotes(ctx, cam, POSE, scrCol, glow * 0.9, t);
  // LED bloom before the screen is on (so the dot reads in the dark)
  if (ledBlink > 0 && t < T.K.powerOn + 0.6) {
    const ledLocal = [((1204 + 152 - 16) / TV.TW - 0.5) * TV.BW, ((320 + 31) / TV.TH - 0.5) * TV.BH, -TV.BD / 2 - 0.002];
    const q = L.project(cam, ledLocal);
    if (q) {
      const g = ctx.createRadialGradient(q.x, q.y, 0, q.x, q.y, 40);
      g.addColorStop(0, `rgba(90,255,130,${0.55 * ledBlink})`); g.addColorStop(1, 'rgba(90,255,130,0)');
      ctx.fillStyle = g; ctx.fillRect(q.x - 40, q.y - 40, 80, 80);
    }
  }
  // final dive: static fills the frame
  const sAmt = E.inCubic(inv(9.3, 10, t));
  if (sAmt > 0) drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), sAmt);
  return { grade: 'night', streakMul: 0.6 };
};
