// 终章：签名的重量 → 谁来看守看守者 → 林夏 → 主线/支线 → 片尾
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2, fbm,
  rgba, text, measure, typeText, scrambleText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt, chapterCard } from '../engine.js';
import { dust, drawEye, drawRoom, drawLaptop, drawPerson } from './act0.js';
import { PAPER } from './act1.js';

// ------------------------------------------------------------ 知情同意书
function icf(c, x, y, s, t, o = {}) {
  const { sig = 0, alpha = 1, warm = 0 } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s, s);
  c.fillStyle = 'rgba(0,0,0,.45)'; c.fillRect(-330 + 16, -420 + 20, 660, 840);
  c.drawImage(PAPER, 600, 100, 660, 840, -330, -420, 660, 840);
  c.fillStyle = `rgba(${warm ? '255,200,140' : '200,215,235'},${warm ? .08 : .12})`; c.fillRect(-330, -420, 660, 840);
  text(c, '知情同意书', 0, -330, { size: 52, family: 'SHSerif', weight: 900, color: '#1d1710', align: 'center', ls: 10 });
  text(c, '版本号：V3.0　　版本日期：2047-06-18', 0, -280, { size: 22, family: 'SHSans', color: '#3a3024', align: 'center' });
  for (let i = 0; i < 12; i++) { c.fillStyle = 'rgba(40,30,20,.35)'; c.fillRect(-270, -220 + i * 30, 540 - (i % 4 === 3 ? 200 : hash1(i) * 60), 8); }
  text(c, '我已阅读并理解上述内容，自愿参加本研究。', -270, 200, { size: 24, family: 'SHSans', weight: 500, color: '#2a2018' });
  text(c, '受试者 / 法定代理人签名：', -270, 280, { size: 24, family: 'SHSans', color: '#2a2018' });
  line(c, -20, 290, 290, 290, '#3a3024', 2);
  text(c, '日期：', -270, 350, { size: 24, family: 'SHSans', color: '#2a2018' });
  line(c, -190, 360, 90, 360, '#3a3024', 2);
  if (sig > 0) {
    c.save(); c.beginPath(); c.rect(-30, 210, 340 * sig, 100); c.clip();
    text(c, '陈秀云', 10, 282, { size: 72, family: 'MaoCao', color: '#1a2a6c' });
    c.restore();
    const dk = clamp(sig * 1.3 - .3);
    c.save(); c.beginPath(); c.rect(-200, 320, 300 * dk, 60); c.clip(); text(c, '2047.10.22', -180, 352, { size: 34, family: 'WenKai', weight: 500, color: '#1a2a6c' }); c.restore();
  }
  c.restore();
}
function corridor(c, t, a) {
  c.save(); c.globalAlpha = a;
  const vx = W / 2 + 120, vy = 470;
  c.fillStyle = '#120d09'; c.fillRect(0, 0, W, H);
  // 墙/地/顶 透视
  c.fillStyle = '#2a2018'; c.beginPath(); c.moveTo(0, 0); c.lineTo(vx - 160, vy - 110); c.lineTo(vx - 160, vy + 110); c.lineTo(0, H); c.closePath(); c.fill();
  c.fillStyle = '#231a14'; c.beginPath(); c.moveTo(W, 0); c.lineTo(vx + 160, vy - 110); c.lineTo(vx + 160, vy + 110); c.lineTo(W, H); c.closePath(); c.fill();
  c.fillStyle = '#1b140f'; c.beginPath(); c.moveTo(0, H); c.lineTo(vx - 160, vy + 110); c.lineTo(vx + 160, vy + 110); c.lineTo(W, H); c.closePath(); c.fill();
  c.fillStyle = '#17110c'; c.beginPath(); c.moveTo(0, 0); c.lineTo(vx - 160, vy - 110); c.lineTo(vx + 160, vy - 110); c.lineTo(W, 0); c.closePath(); c.fill();
  c.fillStyle = '#3b2c1f'; c.fillRect(vx - 160, vy - 110, 320, 220);
  // 顶灯（向远处排列）
  for (let i = 0; i < 7; i++) {
    const k = Math.pow(.62, i); const x = vx, y = lerp(vy - 110, 40, k); const w = 320 * k + 30;
    const on = !(i === 3 && Math.sin(t * 9) > .6);
    c.fillStyle = on ? `rgba(255,214,160,${.9 * (1 - i * .1)})` : 'rgba(120,90,60,.5)'; c.fillRect(x - w / 2, y - 6 * k - 2, w, 10 * k + 3);
    if (on) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = radial(c, x, y + 160 * k, 520 * k + 60, [[0, `rgba(255,190,120,${.16 * (1 - i * .1)})`], [1, 'rgba(255,190,120,0)']]); c.fillRect(x - 700, y - 100, 1400, 900); c.restore(); }
  }
  // 门
  for (const side of [-1, 1]) for (let i = 0; i < 4; i++) {
    const k = Math.pow(.6, i); const xo = lerp(160, W / 2 + 40, k) * side; const x = vx + xo, top = lerp(vy - 100, 160, k), bot = lerp(vy + 100, 930, k), w = 160 * k + 14;
    c.fillStyle = '#4a3828'; c.fillRect(x - (side > 0 ? 0 : w), top, w, bot - top);
  }
  // 长椅 + 孩子 + 母亲剪影
  c.fillStyle = '#0c0907'; c.fillRect(470, 820, 380, 26); c.fillRect(490, 846, 14, 70); c.fillRect(816, 846, 14, 70);
  // 孩子（坐）
  circle(c, 560, 742, 28, { fill: '#0c0907' }); rrect(c, 528, 768, 66, 70, 22); c.fill(); c.fillRect(540, 830, 20, 50); c.fillRect(568, 830, 20, 50);
  // 母亲（站，手里拿着同意书）
  const sway = Math.sin(t * .8) * 2;
  c.save(); c.translate(720 + sway, 0);
  circle(c, 0, 520, 40, { fill: '#0c0907' }); c.beginPath(); c.moveTo(-48, 580); c.quadraticCurveTo(-70, 760, -60, 930); c.lineTo(60, 930); c.quadraticCurveTo(70, 760, 48, 580); c.closePath(); c.fill();
  c.fillRect(-12, 552, 24, 34);
  c.fillStyle = '#d8cdb6'; c.save(); c.translate(-62, 712); c.rotate(-.25); c.fillRect(-22, -30, 44, 60); c.restore();
  c.strokeStyle = 'rgba(255,200,140,.5)'; c.lineWidth = 3; c.beginPath(); c.arc(0, 520, 40, -Math.PI * .9, -Math.PI * .1); c.stroke();
  c.restore();
  // 墙钟（时间流逝）
  const cx = 1500, cy = 300; circle(c, cx, cy, 64, { fill: '#e9dfc9', stroke: '#2a2018', lw: 6 });
  const hrs = t * .35, mins = t * 4.2; line(c, cx, cy, cx + Math.cos(mins - Math.PI / 2) * 50, cy + Math.sin(mins - Math.PI / 2) * 50, '#2a2018', 4); line(c, cx, cy, cx + Math.cos(hrs - Math.PI / 2) * 32, cy + Math.sin(hrs - Math.PI / 2) * 32, '#2a2018', 6);
  c.restore();
}

// ============================================================ s19 签名的重量
def('s19_signature', {
  post: (S) => { const w = smooth(p(S.t, S.L('L065').s - .6, S.L('L065').s + .8)); return { bloom: lerp(.6, .45, w), thr: lerp(.72, .8, w), ca: .0016, vig: lerp(.5, .66, w), grain: lerp(.035, .055, w), tint: [lerp(.97, 1.08, w), 1, lerp(1.06, .86, w)], sat: lerp(1, .9, w) }; },
  draw(S) {
    const c = S.ctx, t = S.t; const L63 = S.L('L063'), L64 = S.L('L064'), L65 = S.L('L065'), L66 = S.L('L066');
    c.fillStyle = '#03060b'; c.fillRect(0, 0, W, H);
    // 眼睛（略暗）
    const eyeA = env(t, -1, L64.s + .8, .1, .8);
    if (eyeA > 0) { dust(c, t, 100, '#9fdfff', .25, 41); drawEye(c, W / 2, H / 2, 260, t, { open: 1 - .3 * smooth(p(t, L63.s + 1, L63.e)), alpha: eyeA * .9, pupil: .26 }); }
    // ICF 0.3 秒核对
    const iA = env(t, L64.s - .2, L65.s + .2, .6, .6);
    if (iA > 0) {
      icf(c, W / 2 - 320, H / 2 + 20, .95, t, { alpha: iA, sig: 1 });
      const boxes = [[-330 + 290, 255, 400, 90, '签名 ✓', '0.1 s'], [-330 + 120, 330, 300, 60, '日期 ✓', '0.2 s'], [-330 + 0, -300, 600, 60, '版本 V3.0 ✓', '0.3 s']];
      boxes.forEach(([bx, by, bw, bh, lab, tm], i) => {
        const k = p(t, L64.s + 2.4 + i * .9, L64.s + 2.9 + i * .9); if (k <= 0) return;
        const X = W / 2 - 320 + (bx) * .95, Y = H / 2 + 20 + (by - bh / 2) * .95;
        brackets(c, X - 20, Y - 10, bw * .95 + 40, bh * .95 + 20, { color: C.cyan, len: 16, lw: 3, alpha: iA * smooth(k) });
        tag(c, X + bw * .95 + 20, Y + bh * .47, 1180, 360 + i * 150, [lab, 'ARGUS · ' + tm], { prog: k, alpha: iA, size: 34 });
      });
      const tm = clamp((t - (L64.s + 2.4)) / 2.7) * .3;
      text(c, tm.toFixed(2) + ' s', 1650, 250, { size: 86, family: 'JB', weight: 800, color: C.cyan, align: 'right', alpha: iA * smooth(p(t, L64.s + 2.2, L64.s + 2.6)) });
    }
    // 走廊（温暖、安静）
    const cA = env(t, L65.s - .5, L66.s + .3, .9, .7);
    if (cA > 0) {
      corridor(c, t, cA);
      const g = smooth(p(t, L65.s + 2.6, L65.s + 3.4)) * cA;
      if (g > 0) {
        const fl = hash1(Math.floor(t * 14)) > .5 ? 1 : .55;
        text(c, '等待时长：—— 无法计算', 1180, 640, { size: 30, family: 'JB', weight: 700, color: rgba(C.cyan, .8 * fl), alpha: g * (1 - smooth(p(t, L65.e - .6, L65.e + .4))) });
      }
    }
    // 签名特写
    const sA = smooth(p(t, L66.s - .5, L66.s + .2));
    if (sA > 0) {
      c.save(); c.globalAlpha = sA; c.fillStyle = '#100b07'; c.fillRect(0, 0, W, H);
      c.fillStyle = radial(c, W / 2, H / 2, 900, [[0, 'rgba(255,190,120,.16)'], [1, 'rgba(255,190,120,0)']]); c.fillRect(0, 0, W, H);
      c.translate(W / 2, H / 2 + 40); c.scale(2.3, 2.3); c.translate(-140, -285);
      icf(c, 0, 0, 1, t, { sig: eInOut(p(t, L66.s - .4, L66.s + 2.4)), warm: 1 });
      c.restore();
      const u = smooth(p(t, L66.s + 1.6, L66.s + 2.4));
      if (u > 0) {
        const fl = hash1(Math.floor(t * 12)) > .3 ? 1 : .4;
        panel(c, 1340, 160, 480, 170, { fill: 'rgba(4,14,26,.82)', stroke: C.cyan, lw: 2, r: 10, alpha: u * sA });
        text(c, '签名：✓ 已核对', 1370, 220, { size: 32, family: 'SHSans', weight: 700, color: C.cyan, alpha: u * sA });
        text(c, '重量：UNDEFINED', 1370, 290, { size: 34, family: 'JB', weight: 800, color: rgba('#ff8fa3', fl), alpha: u * sA });
      }
    }
    chapterCard(S, '终 章', '签名的重量', { color: C.gold });
  },
});
transition('s20_quis', { type: 'black', d: 1.2 });

// ============================================================ s20 谁来看守看守者
const MARBLE = once('marble', () => {
  const w = 960, h = 540, cv = mkCanvas(w, h), c = cv.getContext('2d'); const img = c.createImageData(w, h), d = img.data;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm(x / 140, y / 140, 5); const v = Math.sin((x * .6 + y * .25) / 40 + n * 6); const m = Math.pow(Math.abs(v), .35);
    const base = 26 + m * 22 + n * 10; const i = (y * w + x) * 4; d[i] = base * .95; d[i + 1] = base * .95; d[i + 2] = base * 1.02; d[i + 3] = 255;
  }
  c.putImageData(img, 0, 0); return cv;
});
def('s20_quis', {
  post: { bloom: .6, thr: .7, ca: .0014, vig: .62, grain: .04, tint: [1.03, 1, .96] },
  draw(S) {
    const c = S.ctx, t = S.t; const L67 = S.L('L067'), L68 = S.L('L068');
    c.drawImage(MARBLE, 0, 0, W, H);
    c.fillStyle = radial(c, W / 2, H / 2 - 60, 900, [[0, 'rgba(255,230,190,.10)'], [1, 'rgba(0,0,0,.35)']]); c.fillRect(0, 0, W, H);
    const la = smooth(p(t, L67.s + 1.6, L67.s + 3)) * (1 - smooth(p(t, L68.s + 1.6, L68.s + 2.4)));
    const lines = ['QUIS CUSTODIET', 'IPSOS CUSTODES?'];
    lines.forEach((l, i) => {
      const y = 430 + i * 150;
      text(c, l, W / 2 + 3, y + 4, { size: 120, family: 'Cinzel', weight: 900, color: 'rgba(0,0,0,.75)', align: 'center', ls: 14, alpha: la });
      text(c, l, W / 2 - 2, y - 2, { size: 120, family: 'Cinzel', weight: 900, color: 'rgba(255,240,215,.35)', align: 'center', ls: 14, alpha: la });
      text(c, l, W / 2, y, { size: 120, family: 'Cinzel', weight: 900, color: '#6d665e', align: 'center', ls: 14, alpha: la });
    });
    text(c, '谁来看守看守者？', W / 2, 760, { size: 54, family: 'SHSerif', weight: 700, color: '#efe4cf', align: 'center', ls: 12, alpha: la * smooth(p(t, L67.s + 3, L67.s + 3.8)) });
    text(c, '—— 尤维纳利斯《讽刺诗》，约公元 2 世纪', W / 2, 830, { size: 28, family: 'SHSans', color: rgba('#efe4cf', .6), align: 'center', alpha: la * smooth(p(t, L67.s + 3.4, L67.s + 4.2)) });
    const ra = smooth(p(t, L68.e - .5, L68.e + .5));
    if (ra > 0) {
      glowDot(c, W / 2, H / 2 - 20, 700, '#ffbf73', .35 * ra);
      text(c, '人', W / 2, H / 2 + 170, { size: 520, family: 'SHSerif', weight: 900, color: '#fff3df', align: 'center', alpha: ra });
    }
  },
});
transition('s21_lin', { type: 'cross', d: 1.0 });

// ============================================================ s21 林夏
function olderLin(c, t) {
  const x = 1060, y = 1100; const br = Math.sin(t * .9) * 3;
  c.save(); c.translate(x, y + br); c.scale(1.05, 1.05);
  c.fillStyle = '#05070b'; rrect(c, -270, -430, 540, 480, 48); c.fill();
  c.fillStyle = '#0b0f16'; c.beginPath(); c.moveTo(-258, 0); c.bezierCurveTo(-258, -270, -178, -352, 0, -362); c.bezierCurveTo(178, -352, 250, -270, 250, 0); c.closePath(); c.fill();
  c.fillRect(-42, -425, 84, 80); c.beginPath(); c.ellipse(0, -505, 92, 108, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(12, -606, 50, 42, -.2, 0, TAU); c.fill();
  // 银发
  c.strokeStyle = 'rgba(200,210,225,.28)'; c.lineWidth = 2.5; for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(-58 + i * 24, -590 + Math.abs(i - 2) * 8); c.quadraticCurveTo(-46 + i * 22, -545, -54 + i * 26, -480); c.stroke(); }
  // 轮廓光（来自阿格斯的青光）
  c.strokeStyle = 'rgba(62,230,255,.75)'; c.lineWidth = 5;
  c.beginPath(); c.ellipse(0, -505, 92, 108, 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke();
  c.beginPath(); c.moveTo(-180, -330); c.bezierCurveTo(-120, -356, -60, -362, 0, -362); c.bezierCurveTo(90, -358, 170, -330, 220, -260); c.stroke();
  c.strokeStyle = 'rgba(255,190,120,.45)'; c.lineWidth = 3; c.beginPath(); c.moveTo(-255, -40); c.bezierCurveTo(-255, -250, -185, -342, -60, -360); c.stroke();
  c.restore();
}
def('s21_lin', {
  post: (S) => { const f = 1 - smooth(p(S.t, S.L('L070').s - .6, S.L('L070').s + .6)); return { bloom: lerp(.75, .4, f), thr: lerp(.64, .8, f), ca: .002, vig: .55, grain: lerp(.04, .06, f), sat: lerp(1, .35, f), tint: [1, 1, 1.02] }; },
  draw(S) {
    const c = S.ctx, t = S.t; const L69 = S.L('L069'), L70 = S.L('L070'), L71 = S.L('L071');
    const fb = 1 - smooth(p(t, L70.s - .6, L70.s + .6));
    if (fb > 0) {
      c.save(); c.globalAlpha = fb;
      c.save(); c.translate(W / 2, H / 2); c.scale(1.08, 1.08); c.translate(-1040, -560); drawRoom(c, t + 40, S); drawLaptop(c, t + 40, S); c.save(); drawPerson(c, t); c.restore(); c.restore();
      text(c, '● ARCHIVE · 2026.10.22 23:47', 110, 118, { size: 24, family: 'JB', weight: 700, color: C.red, ls: 3 });
      c.restore();
      S.post.glitch = Math.max(S.post.glitch, (hash1(Math.floor(t * 10)) > .9 ? .25 : 0) * fb);
    }
    const nw = smooth(p(t, L70.s - .6, L70.s + .6));
    if (nw > 0) {
      c.save(); c.globalAlpha = nw;
      c.fillStyle = radial(c, W / 2, 420, 1200, [[0, '#0b1e33'], [1, '#02050a']]); c.fillRect(0, 0, W, H);
      // 弧形全息屏
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 26; i++) { const a = lerp(-1.0, 1.0, i / 25); const x = W / 2 + Math.sin(a) * 900, w = 64 * Math.cos(a); c.fillStyle = `rgba(62,200,255,${.04 + .03 * Math.sin(t + i)})`; c.fillRect(x - w / 2, 110 + Math.abs(a) * 40, w - 6, 520 - Math.abs(a) * 80); }
      c.restore();
      dust(c, t, 160, '#8fe6ff', .35, 52);
      drawEye(c, W / 2 + 40, 360, 210, t, { open: eOutExpo(p(t, L70.s - .2, L70.s + 1)), pupil: .27 + .03 * Math.sin(t) });
      olderLin(c, t);
      const hk = p(t, L70.s + .8, L70.s + 2.2);
      tag(c, 1060, 560, 1360, 700, ['林夏 · AI 监查官', 'SUPERVISOR · 2047 · 监查对象：ARGUS'], { prog: hk, alpha: nw * (1 - smooth(p(t, L71.s + 1, L71.s + 2))), size: 32, color: C.gold });
      text(c, '2047', 120, 150, { size: 34, family: 'JB', weight: 800, color: rgba(C.cyan, .8), ls: 10, alpha: nw });
      c.restore();
    }
  },
});
transition('s22_quest', { type: 'black', d: 1.0 });

// ============================================================ s22 主线 / 支线 → 署名
function logo(c, x, y, s, t, a, prog = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s);
  // 菱形任务标记
  const k = eOutBack(prog, 1.4);
  c.save(); c.translate(-410, -14); c.rotate(Math.PI / 4); c.scale(k, k);
  c.strokeStyle = C.gold; c.lineWidth = 7; c.strokeRect(-42, -42, 84, 84);
  c.fillStyle = C.gold; c.fillRect(-18, -18, 36, 36);
  c.restore();
  text(c, '支线进行中', 30, 30, { size: 120, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 12 });
  // 进度条
  const bw = 520; panel(c, -230, 80, bw, 16, { fill: 'rgba(255,255,255,.12)', stroke: null, r: 8 });
  const pr = (t * .22) % 1; const seg = 120;
  c.save(); c.beginPath(); rrect(c, -230, 80, bw, 16, 8); c.clip(); c.fillStyle = C.gold; c.fillRect(-230 - seg + (bw + seg) * pr, 80, seg, 16); c.restore();
  text(c, 'SIDE QUEST IN PROGRESS', 30, 150, { size: 26, family: 'JB', weight: 700, color: rgba(C.gold, .9), align: 'center', ls: 10 });
  c.restore();
}
export { logo };
def('s22_quest', {
  post: { bloom: .65, thr: .7, ca: .0016, vig: .5, grain: .035, mark: false },
  draw(S) {
    const c = S.ctx, t = S.t; const L72 = S.L('L072'), L73 = S.L('L073'), L74 = S.L('L074');
    c.fillStyle = radial(c, W / 2, H / 2, 1100, [[0, '#0f1424'], [1, '#03050a']]); c.fillRect(0, 0, W, H);
    dust(c, t, 160, '#ffe2a0', .28, 61);
    const qA = smooth(p(t, 0, .6)) * (1 - smooth(p(t, L74.s - .2, L74.s + .6)));
    if (qA > 0) {
      c.save(); c.globalAlpha = qA;
      const px = 260, py = 200, pw = 1400, ph = 640;
      panel(c, px, py, pw, ph, { fill: 'rgba(10,14,26,.94)', stroke: rgba(C.gold, .7), lw: 3, r: 6 });
      text(c, '任务  QUESTS', px + 40, py + 70, { size: 40, family: 'Pixel', color: C.gold });
      line(c, px + 40, py + 96, px + pw - 40, py + 96, rgba(C.gold, .4), 2);
      // 主线
      const m = smooth(p(t, L72.s, L72.s + .6)); const mh = env(t, L72.s, L73.s + .2, .4, .5);
      panel(c, px + 40, py + 130, pw - 80, 200, { fill: `rgba(255,214,107,${.06 + .1 * mh})`, stroke: rgba(C.gold, .4 + .5 * mh), lw: 2, r: 8, alpha: m });
      text(c, '◆ 主线任务', px + 80, py + 190, { size: 34, family: 'SHSans', weight: 900, color: C.gold, alpha: m });
      text(c, '守护每一个签名背后的人', px + 80, py + 268, { size: 64, family: 'SHSerif', weight: 900, color: '#fff', alpha: m });
      text(c, '执行者：人类', px + pw - 80, py + 190, { size: 30, family: 'SHSans', weight: 700, color: C.gold, align: 'right', alpha: m });
      text(c, '[ 进行中 · ∞ ]', px + pw - 80, py + 268, { size: 34, family: 'JB', weight: 800, color: C.gold, align: 'right', alpha: m });
      // 支线
      const sd = smooth(p(t, L73.s - .2, L73.s + .4)); const sh = env(t, L73.s, L74.s + .4, .4, .3);
      panel(c, px + 40, py + 370, pw - 80, 220, { fill: `rgba(62,230,255,${.04 + .1 * sh})`, stroke: rgba(C.cyan, .35 + .5 * sh), lw: 2, r: 8, alpha: sd });
      text(c, '◇ 支线任务', px + 80, py + 430, { size: 34, family: 'SHSans', weight: 900, color: C.cyan, alpha: sd });
      const items = ['核对', '追踪', '提醒', '预警', '归档', '翻译', '汇总', '……'];
      items.forEach((it, i) => { const k = smooth(p(t, L73.s + i * .12, L73.s + .3 + i * .12)); panel(c, px + 80 + i * 150, py + 470, 130, 64, { fill: 'rgba(62,230,255,.12)', stroke: rgba(C.cyan, .6), lw: 2, r: 32, alpha: sd * k }); text(c, it, px + 145 + i * 150, py + 514, { size: 30, family: 'SHSans', weight: 700, color: '#dffaff', align: 'center', alpha: sd * k }); });
      text(c, '执行者：ARGUS', px + pw - 80, py + 430, { size: 30, family: 'SHSans', weight: 700, color: C.cyan, align: 'right', alpha: sd });
      text(c, '[ 进行中 ]', px + pw - 80, py + 560, { size: 34, family: 'JB', weight: 800, color: C.cyan, align: 'right', alpha: sd });
      c.restore();
    }
    // 署名
    const lA = smooth(p(t, L74.s + .1, L74.s + 1.0));
    logo(c, W / 2, H / 2, 1.25, t, lA, p(t, L74.s + .2, L74.s + 1.1));
    S.post.flash = Math.max(S.post.flash, .25 * Math.max(0, 1 - p(t, L74.s + .3, L74.s + .9)) * (t > L74.s + .3 ? 1 : 0));
  },
});
transition('s23_end', { type: 'cross', d: 1.2 });

// ============================================================ s23 片尾
function iconLike(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; rrect(c, -28, -6, 16, 40, 4); c.fill(); c.beginPath(); c.moveTo(-8, -6); c.lineTo(4, -36); c.quadraticCurveTo(16, -40, 16, -26); c.lineTo(12, -8); c.lineTo(30, -8); c.quadraticCurveTo(40, -6, 36, 6); c.lineTo(28, 30); c.quadraticCurveTo(26, 34, 18, 34); c.lineTo(-8, 34); c.closePath(); c.fill(); c.restore(); }
function iconCoin(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); circle(c, 0, 0, 36, { stroke: col, lw: 6 }); text(c, '币', 0, 14, { size: 38, family: 'SHSans', weight: 900, color: col, align: 'center' }); c.restore(); }
function iconStar(c, x, y, s, col) { c.save(); c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 16 : 38, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.restore(); }
def('s23_end', {
  post: { bloom: .55, thr: .72, ca: .0014, vig: .5, grain: .035, mark: false },
  draw(S) {
    const c = S.ctx, t = S.t;
    c.fillStyle = radial(c, W / 2, H / 2, 1100, [[0, '#0f1424'], [1, '#03050a']]); c.fillRect(0, 0, W, H);
    dust(c, t, 160, '#ffe2a0', .28, 61);
    const out = 1 - smooth(p(t, S.dur - 1.6, S.dur - .2));
    const a1 = smooth(p(t, .4, 1.4)) * out;
    text(c, '你觉得，AI 会取代监查员吗？', W / 2, 330, { size: 76, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: a1, ls: 4 });
    text(c, '评论区聊聊 ↓', W / 2, 410, { size: 38, family: 'SHSans', weight: 700, color: C.gold, align: 'center', alpha: smooth(p(t, 1.2, 2)) * out, ls: 6 });
    const a2 = smooth(p(t, 2.0, 3.0)) * out;
    const cols = ['#ff6699', '#ffd66b', '#3ee6ff'];
    [[iconLike, '点赞'], [iconCoin, '投币'], [iconStar, '收藏']].forEach(([fn, lab], i) => {
      const x = W / 2 - 240 + i * 240, y = 560; const pop = eOutBack(p(t, 2.0 + i * .25, 2.6 + i * .25), 1.8);
      c.save(); c.globalAlpha = a2; fn(c, x, y, pop * 1.2, cols[i]); c.restore();
      text(c, lab, x, y + 80, { size: 28, family: 'SHSans', weight: 700, color: rgba('#fff', .8), align: 'center', alpha: a2 });
    });
    const a3 = smooth(p(t, 3.4, 4.4)) * out;
    const cred = ['出品 · 支线进行中', '旁白 · AI 语音合成（Kokoro）　　画面 / 音乐 / 音效 · 程序生成', '史实与数据来源见简介　·　“阿格斯”及 2027—2047 年情节为虚构推演'];
    cred.forEach((l, i) => text(c, l, W / 2, 760 + i * 46, { size: i === 0 ? 32 : 24, family: 'SHSans', weight: i === 0 ? 700 : 400, color: rgba('#fff', i === 0 ? .9 : .6), align: 'center', alpha: a3 }));
    logo(c, W / 2, 1000 - 40, .42, t, smooth(p(t, 4, 5)) * out, 1);
  },
});
