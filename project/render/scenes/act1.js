// 第一章：没有监查员的年代（1747）→ 用血写成的规则（1947—1964）
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2, fbm,
  rgba, text, measure, typeText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt, chapterCard } from '../engine.js';

// ------------------------------------------------------------ 纸张纹理（缓存）
export const PAPER = once('paper', () => {
  const cv = mkCanvas(W, H), c = cv.getContext('2d');
  c.fillStyle = '#d4c19b'; c.fillRect(0, 0, W, H);
  const img = c.getImageData(0, 0, W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    const n = fbm(x / 180, y / 180, 4) * 18 + fbm(x / 22, y / 22, 2) * 6 + (hash2(x, y) - .5) * 10;
    const edge = Math.min(x, y, W - x, H - y); const burn = edge < 140 ? (140 - edge) / 140 : 0;
    d[i] = clamp(212 + n - burn * 80, 0, 255); d[i + 1] = clamp(193 + n - burn * 92, 0, 255); d[i + 2] = clamp(152 + n * .8 - burn * 95, 0, 255);
  }
  c.putImageData(img, 0, 0);
  // 污渍
  const r = rng(4); for (let k = 0; k < 14; k++) { const x = r() * W, y = r() * H, rr = 30 + r() * 140; c.fillStyle = radial(c, x, y, rr, [[0, 'rgba(120,80,30,.10)'], [.7, 'rgba(120,80,30,.05)'], [1, 'rgba(120,80,30,0)']]); c.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  return cv;
});
const INK = '#2a1d10', INK2 = 'rgba(42,29,16,';

// ------------------------------------------------------------ 帆船剪影
function ship(c, x, y, s, t, o = {}) {
  const { alpha = 1, ink = '#120c06', sail = 'rgba(214,196,160,.85)' } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y + Math.sin(t * .8) * 6 * s); c.rotate(Math.sin(t * .6) * .025); c.scale(s, s);
  c.lineJoin = 'round'; c.lineCap = 'round';
  // 桅与帆
  const masts = [[-140, 330], [0, 390], [140, 300]];
  for (const [mx, mh] of masts) {
    c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.moveTo(mx, -40); c.lineTo(mx, -40 - mh); c.stroke();
    const rows = 3; for (let k = 0; k < rows; k++) {
      const y0 = -60 - mh * (k / rows) * .92, y1 = -60 - mh * ((k + 1) / rows) * .92 + 12; const w0 = 110 - k * 22, w1 = 92 - k * 22;
      const bill = 14 + 6 * Math.sin(t * .9 + k + mx);
      c.fillStyle = sail; c.strokeStyle = ink; c.lineWidth = 2.4;
      c.beginPath(); c.moveTo(mx - w1, y1); c.lineTo(mx + w1, y1); c.quadraticCurveTo(mx + w0 + bill, (y0 + y1) / 2, mx + w0, y0); c.lineTo(mx - w0, y0); c.quadraticCurveTo(mx - w0 + bill * .6, (y0 + y1) / 2, mx - w1, y1); c.closePath(); c.fill(); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.moveTo(mx - w1 - 10, y1); c.lineTo(mx + w1 + 10, y1); c.stroke();
    }
    c.fillStyle = ink; c.beginPath(); c.moveTo(mx, -40 - mh); c.lineTo(mx + 34, -40 - mh + 8 + Math.sin(t * 2 + mx) * 3); c.lineTo(mx, -40 - mh + 16); c.closePath(); c.fill();
  }
  // 索具
  c.strokeStyle = 'rgba(18,12,6,.7)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(-140, -370); c.lineTo(-300, -40); c.moveTo(0, -430); c.lineTo(-300, -40); c.moveTo(0, -430); c.lineTo(330, -60); c.moveTo(140, -340); c.lineTo(330, -60); c.stroke();
  // 船身
  c.fillStyle = ink; c.beginPath(); c.moveTo(-300, -70); c.lineTo(-260, -30); c.quadraticCurveTo(-220, 40, -120, 46); c.lineTo(160, 46); c.quadraticCurveTo(260, 30, 300, -40); c.lineTo(330, -60); c.lineTo(250, -50); c.lineTo(-250, -50); c.closePath(); c.fill();
  c.strokeStyle = ink; c.lineWidth = 5; c.beginPath(); c.moveTo(280, -50); c.lineTo(420, -110); c.stroke();// 船首斜桅
  c.fillStyle = 'rgba(255,190,110,.55)'; for (let i = 0; i < 11; i++) c.fillRect(-200 + i * 36, -18, 12, 9);// 炮门微光
  c.restore();
  glowDot(c, x - 290 * s, y - 70 * s + Math.sin(t * .8) * 6 * s, 50 * s, '#ffb35a', .8 * alpha);// 船尾灯
}
function sea(c, t, horizon, o = {}) {
  const { ink = 'rgba(15,10,5,', moonX = 1400 } = o;
  for (let i = 0; i < 22; i++) {
    const y0 = horizon + Math.pow(i / 22, 1.7) * (H - horizon + 40);
    const amp = 2 + i * .9, fr = .012 - i * .0003, sp = .5 + i * .04;
    c.strokeStyle = ink + (.25 + i * .025) + ')'; c.lineWidth = 1 + i * .12;
    c.beginPath();
    for (let x = -20; x <= W + 20; x += 14) { const y = y0 + Math.sin(x * fr + t * sp + i * 1.7) * amp + noise2(x * .004 + i, t * .2) * amp; if (x === -20) c.moveTo(x, y); else c.lineTo(x, y); }
    c.stroke();
  }
  // 月光倒影
  const r = rng(13); c.save(); c.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 70; i++) { const yy = horizon + 6 + r() * (H - horizon); const k = (yy - horizon) / (H - horizon); const w = 20 + r() * 90 * (1 + k * 2); const x = moonX + (r() - .5) * (60 + k * 300) + Math.sin(t + i) * 8; c.fillStyle = `rgba(255,235,190,${.10 + .18 * (1 - k) * (.5 + .5 * Math.sin(t * 2 + i))})`; c.fillRect(x - w / 2, yy, w, 2); }
  c.restore();
}

// ------------------------------------------------------------ 水兵（墨线小人）
function sailor(c, x, y, s, u, o = {}) { // u: 0 病倒 → 1 站起
  const { col = INK, alpha = 1, lw = 4 } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s, s); c.strokeStyle = col; c.fillStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round';
  const hip = [0, lerp(-46, -70, u)], neck = [lerp(22, 2, u), lerp(-80, -128, u)], head = [lerp(30, 4, u), lerp(-98, -150, u)];
  c.beginPath(); c.arc(head[0], head[1], 13, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.quadraticCurveTo(lerp(-6, 0, u), lerp(-70, -100, u), neck[0], neck[1]); c.stroke();
  // 腿
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(lerp(34, 6, u), lerp(-26, -36, u)); c.lineTo(lerp(44, 10, u), 0); c.stroke();
  c.beginPath(); c.moveTo(hip[0], hip[1]); c.lineTo(lerp(26, -8, u), lerp(-20, -36, u)); c.lineTo(lerp(52, -12, u), lerp(-4, 0, u)); c.stroke();
  // 手臂
  c.beginPath(); c.moveTo(neck[0] - 2, neck[1] + 10); c.lineTo(lerp(34, -22, u), lerp(-58, -96, u)); c.lineTo(lerp(42, -30, u), lerp(-40, -64, u)); c.stroke();
  if (u > .5) { c.beginPath(); c.moveTo(neck[0] + 2, neck[1] + 10); c.lineTo(lerp(20, 28, u), lerp(-80, -110, u)); c.lineTo(lerp(24, 44, u), lerp(-70, -140, u)); c.stroke(); }
  c.restore();
}

// ------------------------------------------------------------ 印章
export function stamp(c, x, y, lines, o = {}) {
  const { col = '#c4162f', rot = -.08, k = 1, w = 520, h = 150, alpha = 1, seed = 1, size = 44 } = o;
  if (k <= 0) return;
  const sc = lerp(1.5, 1, eOutBack(k, 1.4)); const a = smooth(p(k, 0, .25)) * alpha;
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.rotate(rot); c.scale(sc, sc);
  c.strokeStyle = col; c.lineWidth = 6; rrect(c, -w / 2, -h / 2, w, h, 10); c.stroke(); c.lineWidth = 2; rrect(c, -w / 2 + 10, -h / 2 + 10, w - 20, h - 20, 6); c.stroke();
  lines.forEach((l, i) => text(c, l, 0, -h / 2 + (i + 1) * (h / (lines.length + 1)) + size * .35 * (i === 0 ? 1 : .7), { size: i === 0 ? size : size * .55, family: i === 0 ? 'SHSerif' : 'SHSans', weight: i === 0 ? 900 : 700, color: col, align: 'center', ls: i === 0 ? 6 : 2 }));
  // 做旧：随机擦除点
  c.globalCompositeOperation = 'destination-out'; const r = rng(seed);
  for (let i = 0; i < 260; i++) { c.fillStyle = `rgba(0,0,0,${.3 + r() * .7})`; const s = r() * 4; c.fillRect((r() - .5) * w, (r() - .5) * h, s, s); }
  c.restore();
}

// ============================================================ s03 1747
const TREAT = [['苹果酒', 'Cider'], ['稀硫酸', 'Elixir of vitriol'], ['醋', 'Vinegar'], ['海水', 'Sea-water'], ['橘子与柠檬', 'Oranges & lemons'], ['药糊', 'Electuary']];
def('s03_1747', {
  clear: '#140d06',
  post: (S) => { const pg = smooth(p(S.t, S.L('L011').s - .2, S.L('L011').s + 1.2)); return { bloom: lerp(.42, .1, pg), thr: lerp(.74, .95, pg), ca: .0018, vig: .62, grain: .06, tint: [1.06, 1.0, .88], sat: lerp(.78, .95, pg), con: 1.05 }; },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L10 = S.L('L010'), L11 = S.L('L011'), L12 = S.L('L012'), L13 = S.L('L013');
    const page = smooth(p(t, L11.s - .2, L11.s + 1.2)); // 夜海 → 羊皮纸
    // ---- 夜海
    if (page < 1) {
      c.save(); c.globalAlpha = 1 - page;
      const hz = 640;
      c.fillStyle = (() => { const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#0d0905'); g.addColorStop(1, '#3a2814'); return g; })(); c.fillRect(0, 0, W, hz);
      const r = rng(31); for (let i = 0; i < 220; i++) { const x = r() * W, y = r() * hz * .9; c.fillStyle = `rgba(255,236,200,${.15 + .5 * r() * (.6 + .4 * Math.sin(t * 2 + i))})`; c.fillRect(x, y, 1.6, 1.6); }
      glowDot(c, 1400, 230, 260, '#ffe6b0', .35); circle(c, 1400, 230, 52, { fill: '#f6e7c3' }); circle(c, 1388, 222, 52, { fill: 'rgba(0,0,0,.05)' });
      c.fillStyle = '#20160c'; c.fillRect(0, hz, W, H - hz);
      sea(c, t, hz);
      ship(c, 760 + t * 6, hz + 10, 1.05, t);
      // 航海日志卡片
      const ca = env(t, L10.s - .2, L11.s + .6, .8, .6);
      if (ca > 0) {
        c.save(); c.globalAlpha *= ca; c.translate(120, 150); c.rotate(-.035);
        c.drawImage(PAPER, 300, 200, 640, 380, 0, 0, 640, 380); c.fillStyle = 'rgba(40,24,8,.42)'; c.fillRect(0, 0, 640, 380);
        c.strokeStyle = INK2 + '.7)'; c.lineWidth = 2; c.strokeRect(14, 14, 612, 352);
        text(c, 'H.M.S. SALISBURY', 320, 86, { size: 50, family: 'IMFell', color: '#1a1008', align: 'center', ls: 4 });
        text(c, 'at sea · May the 20th, 1747', 320, 136, { size: 34, family: 'IMFell', italic: true, color: '#1a1008', align: 'center' });
        line(c, 100, 166, 540, 166, INK2 + '.6)', 2);
        typeText(c, '“twelve patients in the scurvy”', 320, 232, p(t, L10.s + 3.2, L10.s + 6), { size: 38, family: 'IMFell', italic: true, color: '#4a0f06', align: 'center' });
        text(c, '詹姆斯·林德  James Lind（1716—1794）', 320, 310, { size: 30, family: 'WenKai', weight: 500, color: '#1a1008', align: 'center', alpha: smooth(p(t, L10.s + 4.5, L10.s + 5.5)) });
        c.restore();
      }
      c.restore();
    }
    // ---- 羊皮纸：十二名水手
    if (page > 0) {
      c.save(); c.globalAlpha = page; c.drawImage(PAPER, 0, 0);
      text(c, 'A TREATISE OF THE SCURVY', W / 2, 150, { size: 46, family: 'IMFell', color: INK, align: 'center', ls: 8 });
      text(c, '十二名水手 · 六组 · 每组两人', W / 2, 205, { size: 34, family: 'WenKai', weight: 500, color: rgba('#5a3a1a', 1), align: 'center', ls: 6 });
      const x0 = 250, gap = (W - 500) / 5, base = 640;
      for (let g = 0; g < 6; g++) {
        const gx = x0 + g * gap; const ga = smooth(p(t, L11.s + 3.4 + g * .45, L11.s + 4.2 + g * .45));
        if (ga <= 0) continue;
        const cured = g === 4 ? eInOut(p(t, L12.s + .4, L12.s + 2.0)) : 0;
        if (g === 4 && cured > 0) { c.save(); c.globalCompositeOperation = 'source-over'; c.fillStyle = radial(c, gx, base - 90, 210, [[0, `rgba(255,160,40,${.45 * cured})`], [1, 'rgba(255,160,40,0)']]); c.fillRect(gx - 220, base - 300, 440, 420); c.restore(); }
        for (let k = 0; k < 2; k++) sailor(c, gx - 52 + k * 84, base, 1.55, g === 4 ? cured : 0, { alpha: ga, lw: 5, col: g === 4 && cured > .3 ? '#7a3a08' : INK });
        line(c, gx - 95, base + 26, gx + 95, base + 26, INK2 + (.6 * ga) + ')', 2);
        text(c, TREAT[g][0], gx, base + 78, { size: 38, family: 'WenKai', weight: 500, color: g === 4 ? '#8a3b00' : INK, align: 'center', alpha: ga });
        text(c, TREAT[g][1], gx, base + 116, { size: 24, family: 'IMFell', italic: true, color: rgba('#4a3420', 1), align: 'center', alpha: ga });
        // 橘子图标
        if (g === 4) { for (let q = 0; q < 3; q++) circle(c, gx - 30 + q * 30, base + 160, 12, { fill: q === 2 ? '#d8c33a' : '#e08a1e', alpha: ga }); }
      }
      // 疗效注记
      const n6 = smooth(p(t, L12.s + 1.4, L12.s + 2.4)) * (1 - smooth(p(t, L13.s + .2, L13.s + .9)));
      if (n6 > 0) {
        const gx = x0 + 4 * gap;
        c.save(); c.globalAlpha = n6; c.strokeStyle = '#8a3b00'; c.lineWidth = 3; c.beginPath(); c.moveTo(gx, base - 290); c.quadraticCurveTo(gx - 10, base - 330, gx - 60, base - 345); c.stroke(); c.restore();
        text(c, '六天后，其中一人已可重返岗位', gx - 70, base - 340, { size: 34, family: 'WenKai', weight: 500, color: '#8a3b00', align: 'right', alpha: n6 });
      }
      // 缺失清单
      const ka = smooth(p(t, L13.s - .2, L13.s + .6));
      if (ka > 0) {
        c.fillStyle = `rgba(230,217,187,${.82 * ka})`; c.fillRect(0, 0, W, H);
        text(c, '1747 年的这场试验里——', W / 2, 330, { size: 40, family: 'SHSerif', weight: 700, color: INK, align: 'center', alpha: ka });
        const items = ['知情同意', '伦理委员会', '核对记录的人'];
        items.forEach((it, i) => {
          const tt = [L13.s + .3, L13.s + 1.3, L13.s + 3.0][i];
          const a = smooth(p(t, tt, tt + .4)); const y = 460 + i * 130;
          text(c, it, W / 2, y, { size: 64, family: 'SHSerif', weight: 900, color: INK, align: 'center', alpha: a, ls: 10 });
          const x = eOut(p(t, tt + .35, tt + .8));
          if (x > 0) { const w = measure(c, it, { size: 64, family: 'SHSerif', weight: 900, ls: 10 }) + 40; c.save(); c.strokeStyle = '#b3122a'; c.lineWidth = 9; c.lineCap = 'round'; c.beginPath(); c.moveTo(W / 2 - w / 2, y - 22); c.lineTo(W / 2 - w / 2 + w * x, y - 22 + (hash1(i) - .5) * 14); c.stroke(); c.restore(); }
          const nn = smooth(p(t, tt + .7, tt + 1.1)); text(c, '无', W / 2 + 280, y + 4, { size: 50, family: 'MaShan', color: '#b3122a', alpha: nn });
        });
      }
      c.restore();
    }
    chapterCard(S, '第 一 章', '没有监查员的年代', { sub: '1747', color: C.amber });
  },
});
transition('s04_blood', { type: 'black', d: .8 });

// ============================================================ s04 用血写成的规则
const NUREM = '1. The voluntary consent of the human subject is absolutely essential.';
def('s04_blood', {
  clear: '#0d0b09',
  post(S) {
    const t = S.t, L15 = S.L('L015'), L17 = S.L('L017');
    const bw = env(t, L15.s - .6, L17.s - .2, .6, .6);
    const fl = 1 + (hash1(Math.floor(t * 24)) - .5) * .08 * bw;
    const paper = env(t, S.L('L018').s - .3, S.L('L019').s + .5, .5, .6);
    return { bloom: lerp(.45, .16, Math.max(bw, paper)), thr: lerp(.75, .93, Math.max(bw, paper)), ca: .0016, vig: .6, grain: lerp(.05, .1, bw), sat: lerp(.85, 0, bw), exp: fl, tint: [1.04, 1, .92], con: 1.08 };
  },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L14 = S.L('L014'), L15 = S.L('L015'), L16 = S.L('L016'), L17 = S.L('L017'), L18 = S.L('L018'), L19 = S.L('L019');
    // ---- 时间尺 1747 → 1947
    const rA = env(t, -1, L15.s + .2, .1, .7);
    if (rA > 0) {
      c.drawImage(PAPER, 0, 0); c.fillStyle = 'rgba(20,14,8,.75)'; c.fillRect(0, 0, W, H);
      const k = eInOut(p(t, L14.s + .3, L14.e - .2)); const yr = lerp(1747, 1947, k);
      c.save(); c.globalAlpha = rA;
      const px = 18; // 每年像素
      for (let y = 1740; y <= 1960; y++) {
        const x = W / 2 + (y - yr) * px; if (x < -50 || x > W + 50) continue;
        const big = y % 10 === 0; line(c, x, H / 2 + 60, x, H / 2 + 60 - (big ? 60 : 24), rgba('#f0dcb0', big ? .9 : .4), big ? 3 : 1.5);
        if (big) text(c, String(y), x, H / 2 + 110, { size: 28, family: 'JB', color: rgba('#f0dcb0', .8), align: 'center' });
      }
      text(c, String(Math.round(yr)), W / 2, H / 2 - 60, { size: 180, family: 'SHSerif', weight: 900, color: '#f6e7c8', align: 'center' });
      line(c, W / 2, H / 2 - 20, W / 2, H / 2 + 70, C.red, 4);
      text(c, '两 百 年', W / 2, H / 2 + 220, { size: 40, family: 'SHSerif', weight: 600, color: rgba('#f0dcb0', .8), align: 'center', ls: 20, alpha: smooth(p(t, L14.s + 1.2, L14.s + 2.2)) });
      c.restore();
    }
    // ---- 纽伦堡法典（黑白档案）
    const nA = env(t, L15.s - .4, L17.s + .2, .6, .7);
    if (nA > 0) {
      c.save(); c.globalAlpha = nA;
      c.fillStyle = '#151311'; c.fillRect(0, 0, W, H);
      const jx = (hash1(Math.floor(t * 24)) - .5) * 3, jy = (hash1(Math.floor(t * 24) + 9) - .5) * 3;
      c.translate(W / 2 + jx, H / 2 + jy); c.rotate(-.012);
      c.drawImage(PAPER, 200, 120, 1400, 760, -680, -380, 1360, 740);
      c.fillStyle = 'rgba(255,255,255,.06)'; c.fillRect(-680, -380, 1360, 740);
      text(c, 'PERMISSIBLE MEDICAL EXPERIMENTS', 0, -250, { size: 46, family: 'Elite', color: '#1b1915', align: 'center', ls: 3 });
      line(c, -420, -222, 420, -222, '#1b1915', 2);
      // 打字
      const prog = p(t, L15.s + .1, L15.e - .4); const n = Math.floor(prog * NUREM.length);
      const words = NUREM.slice(0, n); const maxw = 1120; let xx = -560, yy = -120; const sz = 50;
      c.font = `400 ${sz}px Elite`; c.textBaseline = 'alphabetic';
      for (let i = 0; i < words.length; i++) {
        const ch = words[i]; const w = c.measureText(ch).width;
        if (ch === ' ') { const nextSpace = NUREM.indexOf(' ', i + 1); const wordW = c.measureText(NUREM.slice(i + 1, nextSpace < 0 ? NUREM.length : nextSpace)).width; if (xx + w + wordW > -560 + maxw) { xx = -560; yy += sz * 1.6; continue; } }
        c.fillStyle = `rgba(20,18,15,${.75 + .25 * hash1(i * 7)})`; c.fillText(ch, xx, yy + (hash1(i) - .5) * 2.5); xx += w;
      }
      // 红铅笔下划线（第16句）
      const ul = eOut(p(t, L16.s + 2.2, L16.s + 3.6));
      if (ul > 0) { c.strokeStyle = 'rgba(190,20,40,.85)'; c.lineWidth = 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(-560, -120 + 18); c.lineTo(-560 + 1100 * ul, -120 + 18 + Math.sin(ul * 9) * 3); c.stroke(); }
      const la = smooth(p(t, L16.s, L16.s + .8));
      text(c, 'THE NUREMBERG CODE · 1947', 0, 230, { size: 34, family: 'Elite', color: '#3a3630', align: 'center', ls: 6, alpha: la });
      text(c, '《纽伦堡法典》· 第一条', 0, 290, { size: 40, family: 'SHSerif', weight: 700, color: '#2a2622', align: 'center', alpha: la });
      c.restore();
      // 胶片划痕
      const r = rng(Math.floor(t * 24)); c.save(); c.globalAlpha = nA;
      for (let i = 0; i < 4; i++) { if (r() < .5) { const x = r() * W; line(c, x, 0, x + (r() - .5) * 20, H, `rgba(255,255,255,${.06 + r() * .12})`, 1 + r()); } }
      for (let i = 0; i < 30; i++) { c.fillStyle = `rgba(0,0,0,${r() * .5})`; c.fillRect(r() * W, r() * H, 1 + r() * 4, 1 + r() * 4); }
      c.restore();
    }
    // ---- 沙利度胺：一万多个点
    const tA = env(t, L17.s - .3, L18.s + .4, .7, .6);
    if (tA > 0) {
      c.save(); c.globalAlpha = tA; c.fillStyle = '#0c0708'; c.fillRect(0, 0, W, H);
      const pill = 1 - smooth(p(t, L17.s + 3.6, L17.s + 4.4));
      if (pill > 0) {
        c.save(); c.translate(W / 2, H / 2 - 20); c.rotate(-.3); c.globalAlpha *= pill;
        rrect(c, -120, -48, 240, 96, 48); c.fillStyle = '#f2efe9'; c.fill();
        c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(-2, -48, 4, 96);
        c.restore();
        text(c, '沙利度胺  Thalidomide', W / 2, H / 2 + 140, { size: 44, family: 'SHSerif', weight: 700, color: '#efe6dd', align: 'center', alpha: pill * smooth(p(t, L17.s + .8, L17.s + 1.6)) });
        text(c, '1957 年上市 · 曾用于缓解孕吐（“反应停”）', W / 2, H / 2 + 196, { size: 28, family: 'SHSans', color: rgba('#efe6dd', .7), align: 'center', alpha: pill * smooth(p(t, L17.s + 1.4, L17.s + 2.2)) });
      }
      const dk = p(t, L17.s + 3.8, L17.e - .5);
      if (dk > 0) {
        const cols = 125, rows = 80, sp = 8.6, ox = W / 2 - cols * sp / 2, oy = 205;
        for (let i = 0; i < cols * rows; i++) {
          const order = ihash(i); if (order > dk) continue;
          const x = ox + (i % cols) * sp, y = oy + Math.floor(i / cols) * sp;
          const fresh = clamp((dk - order) * 8); const tw = .6 + .4 * Math.sin(t * 2 + ihash(i + 7) * 40);
          c.fillStyle = `rgba(255,${190 - 80 * (1 - fresh) | 0},${185 - 90 * (1 - fresh) | 0},${(.35 + .5 * fresh) * tw})`;
          c.fillRect(x, y, 4.6, 4.6);
        }
        const cnt = Math.floor(10000 * eOut(dk));
        text(c, fmt(cnt) + (dk > .98 ? '+' : ''), W / 2, 150, { size: 84, family: 'JB', weight: 700, color: '#ffd7d7', align: 'center' });
        text(c, '1961 年 · 被发现可致胎儿畸形 · 全球一万多名婴儿受到影响', W / 2, 945, { size: 30, family: 'SHSans', weight: 500, color: rgba('#ffe1e1', .85), align: 'center', alpha: smooth(p(t, L17.s + 4.5, L17.s + 5.5)) });
      }
      c.restore();
    }
    // ---- 1962 / 1964 印章
    const sA = env(t, L18.s - .3, L19.s + .5, .5, .6);
    if (sA > 0) {
      c.save(); c.globalAlpha = sA; c.drawImage(PAPER, 0, 0); c.fillStyle = 'rgba(40,28,16,.35)'; c.fillRect(0, 0, W, H);
      const k1 = p(t, L18.s + .2, L18.s + .9), k2 = p(t, L18.s + 5.9, L18.s + 6.6);
      stamp(c, W / 2 - 360, H / 2 - 40, ['1962 · 美国修法', 'KEFAUVER-HARRIS 修正案', '新药须证明有效 · 受试者须知情同意'], { k: k1, rot: -.06, w: 640, h: 250, size: 58, seed: 3 });
      stamp(c, W / 2 + 380, H / 2 + 120, ['1964 · 赫尔辛基宣言', 'DECLARATION OF HELSINKI', '世界医学会 · 医学研究伦理原则'], { k: k2, rot: .05, w: 700, h: 250, size: 58, seed: 5, col: '#a8102a' });
      S.post.exp = 1 + .05 * (Math.max(0, 1 - p(t, L18.s + .25, L18.s + .5)) + Math.max(0, 1 - p(t, L18.s + 5.95, L18.s + 6.2)));
      c.restore();
    }
    // ---- GCP：血写的规则
    const gA = smooth(p(t, L19.s - .4, L19.s + .5));
    if (gA > 0) {
      c.save(); c.globalAlpha = gA; c.fillStyle = '#0c0606'; c.fillRect(0, 0, W, H);
      // 背景条文
      for (let i = 0; i < 16; i++) {
        const y = 110 + i * 58; const a = .08 + .05 * hash1(i);
        text(c, `第${'一二三四五六七八九十'[i % 10]}${i >= 10 ? '十' : ''}条  ` + '受试者的权益和安全是首要考虑……试验应当遵循科学与伦理……'.slice(0, 20 + (i * 7) % 10), 140 + (i % 3) * 30, y, { size: 30, family: 'SHSerif', color: rgba('#ffb0b0', a) });
      }
      const k = eOut(p(t, L19.s + .2, L19.s + 1.8));
      text(c, 'GCP', W / 2, H / 2 + 120, { size: 360, family: 'SHSerif', weight: 900, color: '#b3122a', align: 'center', ls: 30, alpha: k });
      text(c, 'GOOD CLINICAL PRACTICE · 药物临床试验质量管理规范', W / 2, H / 2 + 230, { size: 30, family: 'SHSans', weight: 500, color: rgba('#ffcccc', .75), align: 'center', ls: 4, alpha: smooth(p(t, L19.s + 1, L19.s + 2)) });
      // 血滴
      const dr = p(t, L19.s + 1.6, L19.e + 1.5);
      if (dr > 0) {
        const r = rng(8);
        for (let i = 0; i < 16; i++) {
          const x = W / 2 - 420 + r() * 840, y0 = H / 2 + 100 + r() * 20, sp = .4 + r() * .8, len = eIn(clamp(dr * sp * 1.6 - r() * .3)) * (180 + r() * 380);
          if (len <= 2) continue;
          c.strokeStyle = '#a10f25'; c.lineWidth = 5 + r() * 6; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y0); c.lineTo(x, y0 + len); c.stroke();
          circle(c, x, y0 + len, 6 + r() * 5, { fill: '#a10f25' }); circle(c, x - 2, y0 + len - 3, 2, { fill: 'rgba(255,200,200,.5)' });
        }
      }
      const q = smooth(p(t, L19.s + 3.6, L19.s + 4.6));
      text(c, '“每一条，都是用血写成的”', W / 2, 190, { size: 50, family: 'SHSerif', weight: 700, color: '#ffd9d9', align: 'center', ls: 6, alpha: q });
      c.restore();
      S.post.sat = lerp(S.post.sat, 1, gA); S.post.grain = lerp(S.post.grain, .05, gA);
    }
  },
});
transition('s05_1996', { type: 'black', d: 1.0 });
