// 第二章：拉杆箱时代（1996）→ SDV → EDC；第三章：1.1%
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2, ihash, noise1, noise2,
  rgba, text, measure, typeText, scrambleText, panel, brackets, tag, line, circle, glowDot, rrect, radial, once, mkCanvas, fmt, chapterCard, walker } from '../engine.js';
import { dust } from './act0.js';

// ------------------------------------------------------------ 通用：网络背景
function netNodes(seed, n) {
  const r = rng(seed), a = [];
  for (let i = 0; i < n; i++) { const ang = r() * TAU, rad = Math.pow(r(), .6) * 1; a.push({ x: Math.cos(ang) * rad * 860, y: Math.sin(ang) * rad * 430, d: r(), k: r() }); }
  return a;
}
const NET = once('net96', () => netNodes(96, 220));

function cra(c, x, y, s, col, a = 1) { // 小人 + 拉杆箱 图标
  c.save(); c.globalAlpha *= a; c.translate(x, y); c.scale(s, s); c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 3;
  c.beginPath(); c.arc(0, -26, 7, 0, TAU); c.fill(); rrect(c, -7, -17, 14, 22, 5); c.fill();
  c.fillRect(-6, 4, 5, 13); c.fillRect(1, 4, 5, 13);
  rrect(c, 11, -4, 12, 17, 2); c.fill(); c.beginPath(); c.moveTo(14, -4); c.lineTo(14, -14); c.lineTo(20, -14); c.lineTo(20, -4); c.stroke();
  c.restore();
}

// ============================================================ s05 1996 ICH E6
def('s05_1996', {
  post: { bloom: .38, thr: .86, ca: .0018, vig: .5, grain: .04, tint: [1.02, 1, .98] },
  draw(S) {
    const c = S.ctx, t = S.t; const L20 = S.L('L020'), L21 = S.L('L021');
    c.fillStyle = radial(c, W / 2, H / 2, 1100, [[0, '#0d1a2e'], [1, '#03060c']]); c.fillRect(0, 0, W, H);
    dust(c, t, 120, '#a8d8ff', .25, 4);
    // 三方汇合
    const cv = eInOut(p(t, L20.s - .2, L20.s + 2.4));
    const docA = smooth(p(t, L20.s + 1.8, L20.s + 2.8)) * (1 - smooth(p(t, L21.s + .2, L21.s + 1.4)));
    const regions = [['EU', '欧盟', -1], ['JAPAN', '日本', 0], ['USA', '美国', 1]];
    regions.forEach(([en, zh, k], i) => {
      const a = smooth(p(t, .4 + i * .3, 1.2 + i * .3)) * (1 - smooth(p(t, L20.s + 2.0, L20.s + 2.8)));
      const x = W / 2 + k * lerp(520, 0, cv), y = H / 2 + (k === 0 ? lerp(-260, 0, cv) : lerp(160, 0, cv));
      circle(c, x, y, lerp(130, 90, cv), { stroke: rgba(C.cyan, .8), lw: 3, alpha: a });
      circle(c, x, y, lerp(130, 90, cv), { fill: rgba(C.cyan, .07), alpha: a });
      text(c, en, x, y + 6, { size: 40, family: 'Orbitron', weight: 700, color: '#fff', align: 'center', alpha: a, ls: 4 });
      text(c, zh, x, y + 46, { size: 26, family: 'SHSans', weight: 500, color: C.cyan, align: 'center', alpha: a });
    });
    // 指南封面
    if (docA > 0) {
      const sc = lerp(.86, 1, eOutBack(p(t, L20.s + 1.8, L20.s + 3), 1.2));
      c.save(); c.globalAlpha = docA; c.translate(W / 2, H / 2 - 10); c.scale(sc, sc);
      c.fillStyle = 'rgba(0,0,0,.5)'; c.fillRect(-300 + 18, -390 + 22, 600, 780);
      c.fillStyle = '#d5dbe4'; c.fillRect(-300, -390, 600, 780);
      c.fillStyle = '#1b4f9c'; c.fillRect(-300, -390, 600, 120);
      text(c, 'INTERNATIONAL CONFERENCE ON HARMONISATION', 0, -334, { size: 17, family: 'SHSans', weight: 700, color: '#fff', align: 'center', ls: 2 });
      text(c, 'ICH', 0, -296, { size: 40, family: 'Orbitron', weight: 900, color: '#fff', align: 'center', ls: 10 });
      text(c, 'ICH HARMONISED TRIPARTITE GUIDELINE', 0, -200, { size: 22, family: 'SHSans', weight: 700, color: '#1b2a44', align: 'center', ls: 1 });
      line(c, -220, -175, 220, -175, '#1b4f9c', 2);
      text(c, 'GUIDELINE FOR', 0, -110, { size: 34, family: 'SHSerif', weight: 700, color: '#1b2a44', align: 'center' });
      text(c, 'GOOD CLINICAL PRACTICE', 0, -64, { size: 38, family: 'SHSerif', weight: 900, color: '#1b2a44', align: 'center' });
      text(c, 'E6', 0, 70, { size: 150, family: 'SHSerif', weight: 900, color: '#1b4f9c', align: 'center' });
      text(c, 'Recommended for Adoption at Step 4', 0, 190, { size: 22, family: 'SHSans', color: '#44506a', align: 'center' });
      text(c, 'of the ICH Process on 1 May 1996', 0, 222, { size: 22, family: 'SHSans', color: '#44506a', align: 'center' });
      c.restore();
      // 标注
      tag(c, W / 2 + 270, H / 2 + 200, W / 2 + 420, H / 2 + 260, ['国际统一的标准', 'EU · JAPAN · USA'], { prog: p(t, L20.s + 4.2, L20.s + 5.6), alpha: docA, size: 30 });
      text(c, '1996.05.01', W / 2 - 330, H / 2 - 300, { size: 46, family: 'JB', weight: 700, color: C.amber, align: 'right', alpha: docA * smooth(p(t, L20.s + 2.4, L20.s + 3.2)) });
    }
    // 全球网络：监查员铺开
    const nA = smooth(p(t, L21.s + .2, L21.s + 1.4));
    if (nA > 0) {
      const grow = eOut(p(t, L21.s + .4, L21.e));
      c.save(); c.translate(W / 2, H / 2 + 20); c.globalAlpha = nA;
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < NET.length; i++) {
        const n = NET[i]; const dist = Math.hypot(n.x / 860, n.y / 430); if (dist > grow * 1.05) continue;
        for (let j = i + 1; j < Math.min(NET.length, i + 4); j++) { const m = NET[j]; if (Math.hypot(m.x / 860, m.y / 430) > grow) continue; if (Math.hypot(n.x - m.x, n.y - m.y) < 260) line(c, n.x, n.y, m.x, m.y, rgba(C.amber, .18), 1.2); }
      }
      c.globalCompositeOperation = 'source-over';
      for (const n of NET) {
        const dist = Math.hypot(n.x / 860, n.y / 430); const a = smooth(clamp((grow - dist) * 6));
        if (a <= 0) continue;
        if (n.k < .35) cra(c, n.x, n.y, 1 + n.d * .5, C.amber, a); else circle(c, n.x, n.y, 3 + n.d * 2, { fill: rgba(C.amber, .7), alpha: a });
      }
      c.restore();
      const ta = smooth(p(t, L21.s + 2.2, L21.s + 3.2));
      c.fillStyle = `rgba(3,6,12,${.55 * ta})`; c.fillRect(0, H / 2 - 120, W, 240);
      text(c, '临 床 监 查 员', W / 2, H / 2 + 20, { size: 110, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: ta, ls: 10 });
      text(c, 'CRA · CLINICAL RESEARCH ASSOCIATE', W / 2, H / 2 + 86, { size: 28, family: 'JB', weight: 500, color: C.amber, align: 'center', ls: 8, alpha: ta });
    }
    chapterCard(S, '第 二 章', '拉杆箱时代', { sub: '1996 — 2012', color: C.amber });
  },
});
transition('s06_suitcase', { type: 'cross', d: .8 });

// ============================================================ s06 拉杆箱 / SDV
function airport(c, x0, t) {
  c.fillStyle = '#0d1626'; c.fillRect(x0, 0, 2000, 820);
  for (let i = 0; i < 9; i++) { c.fillStyle = '#16233a'; c.fillRect(x0 + 60 + i * 210, 120, 180, 520); c.fillStyle = radial(c, x0 + 150 + i * 210, 380, 260, [[0, 'rgba(255,170,90,.18)'], [1, 'rgba(255,170,90,0)']]); c.fillRect(x0 + 60 + i * 210, 120, 180, 520); }
  // 起飞飞机剪影
  const px = x0 + 600 + t * 160, py = 400 - t * 40;
  c.save(); c.translate(px, py); c.rotate(-.18); c.fillStyle = '#05080e'; rrect(c, -150, -16, 300, 32, 16); c.fill();
  c.beginPath(); c.moveTo(-30, 0); c.lineTo(40, 0); c.lineTo(-40, 110); c.lineTo(-80, 110); c.closePath(); c.fill();
  c.beginPath(); c.moveTo(-140, 0); c.lineTo(-110, 0); c.lineTo(-150, -60); c.lineTo(-170, -60); c.closePath(); c.fill(); c.restore();
  // 航班屏
  c.fillStyle = '#05070b'; c.fillRect(x0 + 1450, 150, 460, 300);
  const rows = [['CA1501', '北京', '登机'], ['MU5101', '上海', '延误'], ['CZ3101', '广州', '登机'], ['HU7181', '成都', '准点'], ['3U8881', '武汉', '准点']];
  rows.forEach((r, i) => { text(c, r[0], x0 + 1470, 200 + i * 50, { size: 26, family: 'JB', weight: 700, color: '#ffd24a' }); text(c, r[1], x0 + 1640, 200 + i * 50, { size: 26, family: 'SHSans', color: '#ffd24a' }); text(c, r[2], x0 + 1890, 200 + i * 50, { size: 26, family: 'SHSans', color: r[2] === '延误' ? '#ff5a5a' : '#7dff9a', align: 'right' }); });
  text(c, '出发 DEPARTURES', x0 + 1470, 140, { size: 22, family: 'SHSans', weight: 700, color: rgba('#fff', .7) });
}
function station(c, x0, t) {
  c.fillStyle = '#0b1220'; c.fillRect(x0, 0, 2000, 820);
  c.fillStyle = '#121c2e'; for (let i = 0; i < 8; i++) c.fillRect(x0 + 100 + i * 250, 90, 40, 730);
  c.fillStyle = '#9fb0c8'; c.fillRect(x0, 70, 2000, 20);
  // 疾驰列车
  const tx = x0 - 1200 + ((t * 2600) % 4400);
  c.fillStyle = '#aab6c6'; rrect(c, tx, 430, 2600, 260, 60); c.fill(); c.fillStyle = '#1d3b6e'; c.fillRect(tx, 560, 2600, 22);
  for (let i = 0; i < 24; i++) { c.fillStyle = '#25324a'; rrect(c, tx + 140 + i * 100, 470, 70, 60, 8); c.fill(); }
  c.fillStyle = 'rgba(200,220,255,.12)'; for (let i = 0; i < 20; i++) c.fillRect(x0 + ((i * 230 + t * 3000) % 2200) - 100, 440 + (i % 5) * 50, 400, 2);
  text(c, '高铁 · G 字头列车', x0 + 980, 160, { size: 40, family: 'SHSans', weight: 700, color: rgba('#fff', .65), align: 'center' });
}
function corridor(c, x0, t) {
  c.fillStyle = '#8f9ea6'; c.fillRect(x0, 0, 2200, 820);
  c.fillStyle = '#76868e'; c.fillRect(x0, 640, 2200, 180); c.fillStyle = '#4f8a83'; c.fillRect(x0, 600, 2200, 40);
  const doors = [['GCP 办公室', 260], ['资料室', 900], ['监查室', 1540]];
  for (const [nm, dx] of doors) {
    c.fillStyle = '#5d6e78'; c.fillRect(x0 + dx, 230, 260, 410); c.fillStyle = '#4d5d67'; c.fillRect(x0 + dx + 18, 250, 224, 390);
    c.fillStyle = '#2d6b8f'; rrect(c, x0 + dx + 20, 170, 220, 46, 6); c.fill();
    text(c, nm, x0 + dx + 130, 203, { size: 26, family: 'SHSans', weight: 700, color: '#fff', align: 'center' });
    circle(c, x0 + dx + 220, 450, 8, { fill: '#5f6e78' });
  }
  for (let i = 0; i < 10; i++) { c.fillStyle = 'rgba(255,255,240,.85)'; c.fillRect(x0 + 80 + i * 220, 40, 120, 14); }
}

const ROWS = [['血压', '138/86', 'mmHg'], ['心率', '76', '次/分'], ['体温', '36.8', '℃'], ['ALT', '32', 'U/L'], ['肌酐', '78', 'μmol/L'], ['不良事件', '头痛·轻度', ''], ['合并用药', '布洛芬 0.2g', '']];
def('s06_suitcase', {
  post: { bloom: .28, thr: .9, ca: .0016, vig: .45, grain: .04 },
  draw(S) {
    const c = S.ctx, t = S.t; const L22 = S.L('L022'), L23 = S.L('L023'), L24 = S.L('L024');
    // ---- 行走蒙太奇
    const wA = 1 - smooth(p(t, L23.s - .5, L23.s + .3));
    if (wA > 0) {
      c.save(); c.globalAlpha = wA;
      const camx = lerp(0, 5400, p(t, 0, L22.e + .4));
      c.save(); c.translate(-camx, 0);
      airport(c, 0, t); station(c, 2000, t); corridor(c, 4000, t);
      c.restore();
      // 地面
      c.fillStyle = '#0a0e15'; c.fillRect(0, 820, W, 260);
      c.fillStyle = 'rgba(255,255,255,.05)'; for (let i = 0; i < 30; i++) c.fillRect(((i * 160 - camx * 1.0) % (W + 160) + W + 160) % (W + 160) - 80, 860, 90, 4);
      const zone = camx < 1700 ? '机场' : camx < 3800 ? '车站' : '医院';
      walker(c, 840, 822, 1.55, t * 7.5, { color: '#05070b' });
      text(c, zone, 120, 960, { size: 64, family: 'SHSerif', weight: 900, color: rgba('#fff', .85) });
      text(c, zone === '机场' ? 'AIRPORT' : zone === '车站' ? 'RAILWAY STATION' : 'HOSPITAL', 124, 1004, { size: 22, family: 'JB', color: rgba(C.amber, .9), ls: 6 });
      // 里程计数
      const km = Math.floor(lerp(0, 2380, p(t, 0, L22.e)));
      text(c, fmt(km) + ' km', W - 120, 960, { size: 56, family: 'JB', weight: 700, color: C.amber, align: 'right' });
      text(c, '本周差旅里程', W - 120, 1004, { size: 22, family: 'SHSans', color: rgba('#fff', .7), align: 'right' });
      c.restore();
    }
    // ---- SDV 左右对照
    const sA = env(t, L23.s - .5, L24.s + .4, .6, .6);
    if (sA > 0) {
      c.save(); c.globalAlpha = sA;
      c.fillStyle = '#0b1018'; c.fillRect(0, 0, W, H);
      // 左：病历（手写）
      c.save(); c.translate(150, 150); c.rotate(-.01);
      c.fillStyle = '#d8cfb9'; c.fillRect(0, 0, 760, 720); c.fillStyle = 'rgba(120,90,40,.06)'; for (let y = 60; y < 720; y += 46) c.fillRect(0, y, 760, 2);
      text(c, '病  历', 380, 56, { size: 40, family: 'SHSerif', weight: 900, color: '#3a2d1a', align: 'center', ls: 10 });
      text(c, 'SOURCE DOCUMENT', 380, 92, { size: 20, family: 'JB', color: '#7a6a50', align: 'center', ls: 6 });
      c.restore();
      // 右：CRF
      c.save(); c.translate(1010, 150);
      c.fillStyle = '#d9dee8'; c.fillRect(0, 0, 760, 720); c.fillStyle = '#2b5cab'; c.fillRect(0, 0, 760, 110);
      text(c, '病例报告表', 380, 56, { size: 40, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: 6 });
      text(c, 'CASE REPORT FORM · CRF', 380, 92, { size: 20, family: 'JB', color: '#cfe0ff', align: 'center', ls: 6 });
      c.restore();
      const scanRow = (t - (L23.s + .6)) / .62;
      ROWS.forEach((r, i) => {
        const y = 150 + 170 + i * 80;
        const mism = i === 1; const crfVal = mism ? '67' : r[1];
        text(c, r[0], 200, y, { size: 30, family: 'WenKai', weight: 500, color: '#3a2d1a' });
        text(c, r[1] + ' ' + r[2], 470, y, { size: 38, family: 'WenKai', weight: 500, color: '#1d3a8a' });
        c.strokeStyle = '#c3ccda'; c.lineWidth = 1.5; c.strokeRect(1040, y - 40, 700, 58);
        text(c, r[0], 1060, y, { size: 26, family: 'SHSans', weight: 700, color: '#2b3a55' });
        text(c, crfVal + ' ' + r[2], 1320, y, { size: 32, family: 'JB', weight: 500, color: '#1a2233' });
        const done = scanRow > i + .6;
        if (scanRow > i - .2 && scanRow < i + 1) { c.save(); c.globalCompositeOperation = 'source-over'; c.fillStyle = 'rgba(255,230,60,.35)'; c.fillRect(180, y - 44, 700, 62); c.fillRect(1040, y - 40, 700, 58); c.restore(); line(c, 880, y - 12, 1040, y - 12, rgba(C.amber, .9), 3); }
        if (done) text(c, mism ? '?' : '✓', 1720, y, { size: 44, family: 'SHSans', weight: 900, color: mism ? C.red : '#18a058', align: 'right' });
        if (mism && done) {
          const q = smooth(p(scanRow, i + .6, i + 1.6));
          panel(c, 1480, y - 150, 330, 86, { fill: 'rgba(255,240,240,.97)', stroke: C.red, r: 10, alpha: q });
          text(c, 'Query：心率 67 ≠ 原始 76', 1500, y - 116, { size: 22, family: 'SHSans', weight: 700, color: C.red, alpha: q });
          text(c, '请研究者核实并更正', 1500, y - 84, { size: 20, family: 'SHSans', color: '#7a2a2a', alpha: q });
        }
      });
      // 已核对计数
      const cnt = Math.floor(lerp(1180, 9860, eIn(p(t, L23.s, L24.s + .4))));
      text(c, '本次访视已核对字段', W / 2, 108, { size: 26, family: 'SHSans', color: rgba('#fff', .7), align: 'center' });
      text(c, fmt(cnt), W / 2, 76, { size: 50, family: 'JB', weight: 700, color: C.amber, align: 'center' });
      c.restore();
    }
    // ---- SDV 100%
    const bA = smooth(p(t, L24.s - .2, L24.s + .6));
    if (bA > 0) {
      c.save(); c.globalAlpha = bA; c.fillStyle = '#06080d'; c.fillRect(0, 0, W, H);
      const k = eInOut(p(t, L24.s + 3.4, L24.e - .4));
      const cx = W / 2 + 430, cy = H / 2;
      c.lineWidth = 34; c.strokeStyle = 'rgba(255,179,71,.12)'; c.beginPath(); c.arc(cx, cy, 250, 0, TAU); c.stroke();
      c.strokeStyle = C.amber; c.lineCap = 'round'; c.beginPath(); c.arc(cx, cy, 250, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke();
      text(c, Math.round(100 * k) + '%', cx, cy + 40, { size: 130, family: 'JB', weight: 800, color: '#fff', align: 'center' });
      text(c, '默认核查比例', cx, cy + 110, { size: 28, family: 'SHSans', color: rgba('#fff', .7), align: 'center' });
      const r = rng(2); for (let i = 0; i < 60; i++) { const a = r() * TAU, rr = 300 + r() * 120; if (r() > k) continue; text(c, '✓', cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, { size: 20 + r() * 14, family: 'SHSans', weight: 700, color: rgba(C.amber, .5), align: 'center' }); }
      const ta = eOutExpo(p(t, L24.s + .3, L24.s + 1.6));
      text(c, 'SDV', 230, H / 2 + 40, { size: 300, family: 'SHSerif', weight: 900, color: '#fff', alpha: ta, ls: lerp(60, 10, ta) });
      text(c, 'SOURCE DATA VERIFICATION', 240, H / 2 + 110, { size: 30, family: 'JB', weight: 500, color: C.amber, ls: 6, alpha: smooth(p(t, L24.s + .9, L24.s + 1.8)) });
      text(c, '源 数 据 核 查', 240, H / 2 + 180, { size: 54, family: 'SHSerif', weight: 700, color: '#fff', ls: 8, alpha: smooth(p(t, L24.s + 1.2, L24.s + 2.1)) });
      c.restore();
    }
  },
});
transition('s07_edc', { type: 'cross', d: .8 });

// ============================================================ s07 装备栏 / EDC
function pixelIcon(c, x, y, s, kind, t) {
  c.save(); c.translate(x, y); c.imageSmoothingEnabled = false; const P = (px, py, w, h, col) => { c.fillStyle = col; c.fillRect(px * s, py * s, w * s, h * s); };
  if (kind === 'case') { P(-5, -6, 10, 13, '#3b5b8f'); P(-5, -6, 1, 13, '#5f86c4'); P(-2, -9, 1, 3, '#888'); P(1, -9, 1, 3, '#888'); P(-2, -9, 4, 1, '#888'); P(-4, 7, 2, 1, '#222'); P(2, 7, 2, 1, '#222'); P(2, -3, 2, 3, '#e8b33d'); }
  if (kind === 'crf') { P(-4, -6, 9, 12, '#ffffff'); P(-3, -5, 9, 12, '#ffe98a'); P(-2, -4, 9, 12, '#ffb3c8'); for (let i = 0; i < 4; i++) P(-1, -2 + i * 2, 6, 1, '#888'); }
  if (kind === 'pen') { P(-6, 3, 9, 3, '#f2e14a'); P(3, 3, 3, 3, '#222'); P(-8, 4, 2, 1, '#f2e14a'); }
  if (kind === 'note') { P(-5, -5, 10, 10, '#e8b33d'); P(-5, -5, 10, 2, '#c99420'); P(-3, -1, 6, 1, '#8a6a10'); P(-3, 1, 5, 1, '#8a6a10'); }
  if (kind === 'calc') { P(-4, -6, 8, 12, '#2c2f36'); P(-3, -5, 6, 3, '#9fd8a8'); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) P(-3 + i * 2, -1 + j * 2, 1, 1, '#ccc'); }
  if (kind === 'ticket') { P(-7, -3, 14, 7, '#7ad3ff'); P(-7, -3, 14, 2, '#3a8fc4'); P(-5, 1, 6, 1, '#1d4d6e'); P(3, 0, 2, 2, '#1d4d6e'); }
  if (kind === 'laptop') { P(-6, -5, 12, 8, '#cfd8e6'); P(-5, -4, 10, 6, '#2b5cab'); P(-8, 3, 16, 2, '#9aa6b8'); }
  c.restore();
}
function pixText(c, str, x, y, size, color, align = 'left', a = 1) { text(c, str, x, y, { size, family: 'Pixel', color, align, alpha: a }); }
const ITEMS = [['case', '拉杆箱', '×1'], ['crf', '复写纸CRF', '三联'], ['pen', '荧光笔', '×3'], ['note', '便利贴', '×200'], ['calc', '计算器', '×1'], ['ticket', '车票', '×∞']];
def('s07_edc', {
  post: { bloom: .5, thr: .75, ca: .0014, vig: .45, grain: .035 },
  draw(S) {
    const c = S.ctx, t = S.t; const L25 = S.L('L025'), L26 = S.L('L026');
    c.fillStyle = '#0a0d16'; c.fillRect(0, 0, W, H);
    // 像素网格背景
    c.fillStyle = 'rgba(120,160,255,.05)'; for (let x = 0; x < W; x += 24) c.fillRect(x, 0, 1, H); for (let y = 0; y < H; y += 24) c.fillRect(0, y, W, 1);
    const a = smooth(p(t, -.4, .4));
    const px = 300, py = 180, pw = 1320, ph = 640;
    panel(c, px, py, pw, ph, { fill: 'rgba(16,20,36,.95)', stroke: '#e8d07a', lw: 4, r: 4, alpha: a });
    c.fillStyle = `rgba(232,208,122,${a})`; c.fillRect(px, py, pw, 64);
    pixText(c, '装备栏  INVENTORY', px + 30, py + 46, 36, '#141826', 'left', a);
    pixText(c, '临床监查员 Lv.1  ·  1996', px + pw - 30, py + 46, 30, '#141826', 'right', a);
    const ver2 = p(t, L25.s + 2.4, L25.s + 3.0);
    const slots = ITEMS.concat(ver2 > 0 ? [['laptop', 'EDC 系统', 'NEW']] : []);
    slots.forEach((it, i) => {
      const col = i % 4, row = Math.floor(i / 4);
      const sx = px + 50 + col * 315, sy = py + 110 + row * 250;
      const isCrf = it[0] === 'crf'; const isCase = it[0] === 'case'; const isNew = it[0] === 'laptop';
      const dis = isCrf ? p(t, L25.s + 3.6, L25.s + 5.2) : 0;
      const pop = isNew ? eOutBack(ver2, 1.6) : 1;
      if (pop <= 0) return;
      c.save(); c.translate(sx + 140, sy + 105); c.scale(pop, pop); c.translate(-(sx + 140), -(sy + 105));
      panel(c, sx, sy, 280, 210, { fill: 'rgba(30,36,60,.9)', stroke: isNew ? C.green : (isCase && t > L26.s ? C.amber : 'rgba(232,208,122,.5)'), lw: 3, r: 4, alpha: a });
      if (dis < 1) {
        c.save();
        if (dis > 0) { // 像素溶解
          c.globalAlpha = a * (1 - dis);
        }
        pixelIcon(c, sx + 140, sy + 92, 7, it[0], t);
        c.restore();
        if (dis > 0) { const r = rng(5); for (let k = 0; k < 140; k++) { const kx = sx + 70 + r() * 140, ky = sy + 40 + r() * 110; if (r() < dis) { c.fillStyle = `rgba(255,${200 + r() * 55 | 0},150,${(1 - dis) * .9})`; c.fillRect(kx + (r() - .5) * 120 * dis, ky - 160 * dis * r(), 7, 7); } } }
      }
      pixText(c, it[1], sx + 18, sy + 190, 28, dis > .5 ? '#666b7a' : '#ffffff', 'left', a);
      pixText(c, it[2], sx + 262, sy + 190, 24, isNew ? C.green : '#e8d07a', 'right', a);
      if (isCrf && dis > .4) { c.save(); c.globalAlpha = smooth(p(dis, .4, .8)); c.strokeStyle = C.red; c.lineWidth = 5; c.beginPath(); c.moveTo(sx + 20, sy + 20); c.lineTo(sx + 260, sy + 190); c.stroke(); c.restore(); pixText(c, '已移除', sx + 140, sy + 116, 34, C.red, 'center', smooth(p(dis, .5, .9))); }
      if (isCase && t > L26.s) { const k = smooth(p(t, L26.s, L26.s + .5)); const pulse = .6 + .4 * Math.sin(t * 6); c.save(); c.globalAlpha = k * pulse; c.strokeStyle = C.amber; c.lineWidth = 4; c.strokeRect(sx - 6, sy - 6, 292, 222); c.restore(); pixText(c, '仍在使用', sx + 140, sy - 16, 28, C.amber, 'center', k); }
      c.restore();
    });
    // 版本更新提示
    const nt = env(t, L25.s + 1.8, L25.s + 6.4, .3, .4);
    if (nt > 0) {
      const x = W / 2, y = 110 + (1 - eOutBack(p(t, L25.s + 1.8, L25.s + 2.3))) * -60;
      panel(c, x - 380, y - 44, 760, 88, { fill: 'rgba(10,40,24,.96)', stroke: C.green, lw: 3, r: 6, alpha: nt });
      pixText(c, '版本更新 v2.0：新增「EDC 电子数据采集」', x, y + 12, 32, '#bfffd8', 'center', nt);
    }
    // 原因提示
    const why = smooth(p(t, L26.s + 1.4, L26.s + 2.2));
    if (why > 0) {
      panel(c, px + 50, py + ph + 40, pw - 100, 120, { fill: 'rgba(40,26,8,.95)', stroke: C.amber, lw: 3, r: 6, alpha: why });
      pixText(c, '原因：源数据仍躺在医院的纸上（病历 / 检验单 / 护理记录）', px + pw / 2, py + ph + 112, 32, '#ffd9a0', 'center', why);
    }
  },
});
transition('s08_onepointone', { type: 'black', d: .9 });

// ============================================================ s08 1.1%
const WALL = once('wall', () => {
  const cols = 400, rows = 225, cs = 5; const cv = mkCanvas(cols * cs, rows * cs), c = cv.getContext('2d');
  const red = mkCanvas(cols * cs, rows * cs), rc = red.getContext('2d');
  c.fillStyle = '#05070b'; c.fillRect(0, 0, cv.width, cv.height);
  let nred = 0;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const h = ihash(j * cols + i);
    const g = 120 + (h * 80 | 0); c.fillStyle = `rgb(${g * .78 | 0},${g * .86 | 0},${g})`; c.fillRect(i * cs, j * cs, cs - 1, cs - 1);
    if (ihash(j * cols + i + 999983) < .011) { rc.fillStyle = '#ff2d55'; rc.fillRect(i * cs - 1, j * cs - 1, cs + 1, cs + 1); nred++; }
  }
  return { cv, red, cols, rows, cs, nred };
});
def('s08_onepointone', {
  post: (S) => ({ bloom: .7, thr: .66, ca: .0018, vig: .55, grain: .04 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L27 = S.L('L027'), L28 = S.L('L028'), L29 = S.L('L029'), L30 = S.L('L030'), L31 = S.L('L031'), L32 = S.L('L032');
    c.fillStyle = '#04060b'; c.fillRect(0, 0, W, H);
    // ---- 危险的问题
    const qA = env(t, L27.s - .2, L28.s + .3, .5, .5);
    if (qA > 0) {
      const k = eOutExpo(p(t, L27.s + 2.4, L27.s + 3.2));
      text(c, '100%', W / 2, H / 2 + 20, { size: lerp(300, 240, k), family: 'JB', weight: 800, color: C.amber, align: 'center', alpha: qA });
      text(c, '真的值得吗？', W / 2, H / 2 + 150, { size: 64, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', alpha: qA * k, ls: 12 });
      S.post.glitch = Math.max(S.post.glitch, .4 * Math.max(0, 1 - p(t, L27.s + 2.4, L27.s + 2.8)) * (t > L27.s + 2.4 ? 1 : 0));
    }
    // ---- 1168 项试验汇入
    const aA = env(t, L28.s - .2, L29.s + .6, .5, .6);
    if (aA > 0) {
      c.save(); c.globalAlpha = aA;
      text(c, 'TransCelerate  ×  Medidata', W / 2, 170, { size: 54, family: 'SHSerif', weight: 700, color: '#fff', align: 'center', ls: 2 });
      text(c, '2014 · 回顾性分析 · PHASE I — IV', W / 2, 222, { size: 26, family: 'JB', color: rgba(C.cyan, .85), align: 'center', ls: 4 });
      const k = p(t, L28.s + .6, L28.e - .4);
      const r = rng(17);
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 1168; i++) {
        const st = r() * .75, ang = r() * TAU, rad = 700 + r() * 500; const u = eIn(clamp((k - st) / .25));
        if (k < st) { continue; }
        const x = W / 2 + Math.cos(ang) * rad * (1 - u), y = H / 2 + 80 + Math.sin(ang) * rad * .55 * (1 - u);
        c.fillStyle = `rgba(150,220,255,${.25 + .5 * (1 - u)})`; c.fillRect(x - 6, y - 8, 12, 16);
      }
      c.globalCompositeOperation = 'source-over';
      glowDot(c, W / 2, H / 2 + 80, 160, C.cyan, .5 + .3 * k);
      text(c, fmt(1168 * eOut(k)), W / 2, H / 2 + 110, { size: 110, family: 'JB', weight: 800, color: '#fff', align: 'center' });
      text(c, '项临床试验', W / 2, H / 2 + 170, { size: 34, family: 'SHSans', weight: 500, color: C.cyan, align: 'center' });
      c.restore();
    }
    // ---- 数据墙
    const wA = smooth(p(t, L29.s - .2, L29.s + .8)) * (1 - smooth(p(t, L31.s - .4, L31.s + .4)));
    if (wA > 0) {
      const Wl = WALL; const zoomK = eInOut(p(t, L29.s, L29.e + 1.2));
      const sc = lerp(9, .96, zoomK); // 像素块放大倍数
      const ww = Wl.cv.width * sc, hh = Wl.cv.height * sc;
      const ox = W / 2 - ww * lerp(.47, .5, zoomK), oy = H / 2 - hh * lerp(.52, .5, zoomK);
      c.save(); c.globalAlpha = wA; c.imageSmoothingEnabled = sc < 1.2;
      const lit = smooth(p(t, L30.s - .3, L30.s + .3));
      c.globalAlpha = wA * lerp(1, .22, lit);
      c.drawImage(Wl.cv, ox, oy, ww, hh);
      if (lit > 0) {
        c.globalAlpha = wA * lit; c.globalCompositeOperation = 'lighter';
        const pulse = .8 + .2 * Math.sin(t * 5);
        c.globalAlpha = wA * lit * pulse; c.drawImage(Wl.red, ox, oy, ww, hh);
        c.globalCompositeOperation = 'source-over';
      }
      c.restore();
      // 近景数字
      if (sc > 3) {
        const a = smooth(p(sc, 3, 6)) * wA; const cs = Wl.cs * sc;
        c.save(); c.globalAlpha = a;
        for (let y = oy % cs - cs; y < H; y += cs) for (let x = ox % cs - cs; x < W; x += cs) {
          const ci = Math.floor((x - ox) / cs), cj = Math.floor((y - oy) / cs); const h = ihash(cj * Wl.cols + ci + 7);
          const val = h < .3 ? String(60 + (h * 400 | 0)) : h < .6 ? (36 + h * 2).toFixed(1) : h < .8 ? String((h * 200 | 0)) : '✓';
          text(c, val, x + cs / 2, y + cs * .62, { size: cs * .3, family: 'JB', weight: 500, color: 'rgba(10,14,24,.75)', align: 'center' });
        }
        c.restore();
      }
      const lab = smooth(p(t, L29.s + 3, L29.s + 4)) * (1 - lit);
      text(c, '所有录入的数据', W / 2, 120, { size: 40, family: 'SHSerif', weight: 700, color: '#fff', align: 'center', alpha: lab * wA });
      if (lit > 0) {
        c.fillStyle = `rgba(4,6,11,${.55 * lit})`; c.fillRect(0, H / 2 - 200, W, 400);
        const sk = eOutExpo(p(t, L30.s - .1, L30.s + .6));
        text(c, '1.1%', W / 2, H / 2 + 100, { size: lerp(420, 300, sk), family: 'SHSerif', weight: 900, color: '#ff2d55', align: 'center', alpha: lit * wA });
        text(c, '因 SDV 而被修改的数据', W / 2, H / 2 + 175, { size: 40, family: 'SHSans', weight: 700, color: '#fff', align: 'center', alpha: smooth(p(t, L30.s + .8, L30.s + 1.6)) * wA, ls: 4 });
        text(c, `（示意：本墙 ${fmt(Wl.cols * Wl.rows)} 格中，红色 ${fmt(Wl.nred)} 格）`, W / 2, H / 2 + 225, { size: 24, family: 'SHSans', color: rgba('#fff', .55), align: 'center', alpha: smooth(p(t, L30.s + 1.4, L30.s + 2.2)) * wA });
        S.post.flash = Math.max(S.post.flash, .25 * Math.max(0, 1 - p(t, L30.s - .05, L30.s + .5)) * (t > L30.s - .05 ? 1 : 0));
      }
    }
    // ---- 成本条
    const cA = env(t, L31.s - .3, L32.s + .3, .5, .5);
    if (cA > 0) {
      c.save(); c.globalAlpha = cA;
      text(c, '一项临床试验的总成本', 220, 360, { size: 40, family: 'SHSerif', weight: 700, color: '#fff' });
      const bx = 220, by = 420, bw = 1480, bh = 110; const k = eOut(p(t, L31.s + .2, L31.s + 1.6));
      c.fillStyle = '#18202e'; c.fillRect(bx, by, bw * k, bh);
      const seg = eOut(p(t, L31.s + 2.2, L31.s + 3.6));
      c.fillStyle = rgba(C.amber, .95); c.fillRect(bx, by, bw * .15 * seg, bh);
      c.save(); c.beginPath(); c.rect(bx + bw * .15, by, bw * .15 * seg, bh); c.clip(); c.strokeStyle = rgba(C.amber, .7); c.lineWidth = 6; for (let x = -200; x < bw * .3 + 200; x += 22) { c.beginPath(); c.moveTo(bx + x, by + bh); c.lineTo(bx + x + 110, by); c.stroke(); } c.restore();
      if (seg > .3) {
        const a = smooth(p(seg, .3, .8));
        line(c, bx, by + bh + 26, bx + bw * .3, by + bh + 26, rgba(C.amber, a), 3);
        text(c, '现场监查 + 源数据核查：15% — 30%', bx, by + bh + 82, { size: 44, family: 'SHSans', weight: 700, color: C.amber, alpha: a });
        text(c, '来源：Lindblad et al., Clinical Trials, 2014', bx, by + bh + 128, { size: 22, family: 'SHSans', color: rgba('#fff', .5), alpha: a });
      }
      c.restore();
    }
    // ---- 一次只能看一页纸
    const eA = smooth(p(t, L32.s - .3, L32.s + .5));
    if (eA > 0) {
      c.save(); c.globalAlpha = eA;
      const r = rng(23);
      for (let i = 0; i < 260; i++) { const x = r() * W, y = r() * H, rot = (r() - .5) * .8; c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = `rgba(200,210,230,${.03 + .05 * r()})`; c.fillRect(-40, -55, 80, 110); c.restore(); }
      c.fillStyle = radial(c, W / 2, H / 2 + 20, 520, [[0, 'rgba(255,240,210,.16)'], [1, 'rgba(255,240,210,0)']]); c.fillRect(0, 0, W, H);
      c.fillStyle = '#cdc5b2'; c.fillRect(W / 2 - 170, H / 2 - 220, 340, 440);
      for (let i = 0; i < 14; i++) { c.fillStyle = 'rgba(60,60,80,.5)'; c.fillRect(W / 2 - 140, H / 2 - 180 + i * 28, 220 + (hash1(i) * 60), 6); }
      const sy = H / 2 - 186 + ((t - L32.s) * 60 % 400);
      c.fillStyle = 'rgba(255,220,80,.45)'; c.fillRect(W / 2 - 160, sy, 320, 20);
      text(c, '人的眼睛 · 一次只能看一页纸', W / 2, H / 2 + 300, { size: 40, family: 'SHSerif', weight: 700, color: '#fff', align: 'center', alpha: smooth(p(t, L32.s + 3.2, L32.s + 4.2)) });
      c.restore();
    }
    chapterCard(S, '第 三 章', '1.1%', { sub: '2013 — 2017', color: C.red });
  },
});
transition('s09_rbm', { type: 'cross', d: .8 });
