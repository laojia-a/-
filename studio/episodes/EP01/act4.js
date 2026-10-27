// EP01 第四章 四分之一：88% 的漩涡与“冲进马桶” → 72 名患者随机分组 → PSA 非劣效 → 从论文到说明书的一整条路
import { E, W, H, C, def, transition, clamp, lerp, p, smooth, smoother, eOut, eIn, eInOut, eOutExpo, eOutBack, env, TAU, rng, hash1, hash2,
  noise1, rgba, text, measure, typeText, rrect, line, circle, glowDot, radial, once, brackets, panel, tag, proj } from '/engine.js';
import { cue, srcTag, schemTag, dust, flare, shock, chap, crystal, tablet, paperCard, plate, glowText, seal, gauge } from './lib.js';
import { whiteTablet } from './act3.js';

function journal(c, x, y, w, h, o = {}) {
  const { a = 1, year = '', title = '', zh = '', who = '', k = 1, t = 0, hi = '' } = o;
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  paperCard(c, x, y, w, h, { head: 'JOURNAL OF CLINICAL ONCOLOGY · ' + year, sub: '', kind: 'journal', seed: year.length * 7 + 3, t });
  c.translate(x - w / 2 + 28, y - h / 2);
  typeText(c, title, 0, 110, k, { size: 30, family: 'IMFell', italic: true, color: '#1b1a18', cursor: k < 1, t, cursorColor: '#7a1f1a' });
  text(c, zh, 0, 158, { size: 30, family: 'SHSerif', weight: 900, color: '#7a1f1a', alpha: smooth(p(k, .8, 1)) });
  text(c, who, 0, 198, { size: 20, family: 'SHSans', weight: 500, color: 'rgba(40,32,22,.75)', alpha: smooth(p(k, .9, 1)) });
  if (hi) { c.fillStyle = 'rgba(232,163,61,.35)'; c.fillRect(-6, 222, measure(c, hi, { size: 26, family: 'SHSans', weight: 700 }) + 12, 38); text(c, hi, 0, 250, { size: 26, family: 'SHSans', weight: 700, color: '#2a1f16', alpha: smooth(p(k, .9, 1)) }); }
  c.restore();
}

// ------------------------------------------------------------------ s12 漩涡：88% 去了哪里
const VORT = once('vort', () => { const r = rng(131), a = []; for (let i = 0; i < 260; i++) a.push({ ph: r(), th: r() * TAU, s: 4 + r() * 9, sp: .08 + r() * .07, seed: i }); return a; });
function vortex(c, cx, cy, R, t, a = 1, speed = 1) {
  if (a <= 0) return;
  c.save(); c.globalAlpha *= a;
  c.fillStyle = radial(c, cx, cy, R * 1.2, [[0, '#000'], [.25, '#03070a'], [.7, 'rgba(10,30,40,.85)'], [1, 'rgba(0,0,0,0)']]); c.beginPath(); c.ellipse(cx, cy, R * 1.25, R * .5, 0, 0, TAU); c.fill();
  c.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 7; k++) {   // 螺旋水纹
    c.strokeStyle = `rgba(120,190,215,${.12 - k * .012})`; c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= 160; i++) { const u = i / 160, r0 = R * (1 - u) * 1.15, th = k / 7 * TAU + u * 9 - t * 1.6 * speed; const x = cx + Math.cos(th) * r0, y = cy + Math.sin(th) * r0 * .42; i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  for (const q of VORT) {
    const u = (t * q.sp * speed + q.ph) % 1, r0 = R * (1 - u) * 1.1, th = q.th + u * 10 + t * .4;
    const x = cx + Math.cos(th) * r0, y = cy + Math.sin(th) * r0 * .42 + u * 40;
    crystal(c, x, y, q.s * (1 - u * .7), th * 2, (1 - u) * .95, { seed: q.seed, metal: 1 });
  }
  c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = rgba(C.dose, .35); c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy, R * 1.12, R * .47, 0, 0, TAU); c.stroke(); c.restore();
  c.restore();
}
def('s12_toilet', {
  clear: '#040506',
  post: { bloom: .6, thr: .76, ca: .002, vig: .6, grain: .045, tint: [.98, 1.0, 1.04], con: 1.06 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L46 = S.L('D046'), L47 = S.L('D047'), L48 = S.L('D048'), L49 = S.L('D049');
    dust(c, t, 100, '#cfe6ff', .14, 91);
    const t88 = cue(S, 'D046', '88');
    const vA = smooth(p(t, t88 - .6, t88 + .6)) * (1 - smooth(p(t, L49.s - .2, L49.s + .6)));
    // 第三张卡先飞进来，再让位
    const kC = eOutExpo(p(t, L46.s - .1, L46.s + .7)), aw = eInOut(p(t, t88 - .7, t88 + .4));
    if (kC > 0 && aw < 1) {
      const x = W / 2, y = lerp(-300, 540, kC);
      c.save(); c.globalAlpha = 1 - aw; c.translate(lerp(0, 600, aw), lerp(0, -240, aw)); c.scale(lerp(1, .45, aw), lerp(1, .45, aw));
      paperCard(c, x, y, 560, 420, { head: 'JOURNAL OF CLINICAL ONCOLOGY · 2018', sub: '随机 II 期 · 低剂量随餐 vs 标准剂量空腹', kind: 'journal', seed: 7, t });
      text(c, '¼', x - 150, y + 110, { size: 230, family: 'SHSerif', weight: 900, color: '#7a1f1a', align: 'center' });
      text(c, '250 mg', x + 30, y + 20, { size: 50, family: 'JB', weight: 700, color: '#2a1f16' });
      text(c, '+ 低脂早餐', x + 30, y + 72, { size: 32, family: 'SHSans', weight: 700, color: '#7a1f1a' });
      c.restore();
    }
    vortex(c, W / 2, 700, 520, t, vA, 1 + .6 * smooth(p(t, L47.s, L47.e)));
    if (vA > 0) {
      // 88% 先在画面上方亮出；论文卡进来时沉入漩涡中心，成为“下水道口”的标签
      const mv = eInOut(p(t, L47.s - .3, L47.s + .9));
      const gx = W / 2, gy = lerp(330, 690, mv), gs = lerp(1, .6, mv);
      c.save(); c.translate(gx, gy); c.scale(gs, gs);
      gauge(c, 0, 0, 110, [{ f: .88, col: C.dose, w: 16 }], vA);
      text(c, '88%', 0, 22, { size: 56, family: 'JB', weight: 800, color: '#fff', align: 'center', alpha: vA });
      text(c, '放射性从粪便回收', 0, 165, { size: 26, family: 'SHSans', weight: 700, color: C.dose, align: 'center', alpha: vA });
      c.restore();
      srcTag(c, 'ZYTIGA 标签 §12.3', vA * (1 - smooth(p(t, L47.s - .3, L47.s))));
      schemTag(c, '示意', vA);
    }
    // 2011 论文
    const kJ = p(t, cue(S, 'D047', '标题') - .2, cue(S, 'D047', '冲进马桶') + .1);
    const jA = smooth(p(t, L47.s, L47.s + .6)) * (1 - smooth(p(t, L49.s - .2, L49.s + .5)));
    if (jA > 0) {
      const jx = lerp(560, 520, smooth(p(t, L48.s, L48.s + .8)));
      journal(c, jx, 300, 860, 300, { a: jA, year: '2011', title: 'Flushing oral oncology drugs down the toilet', zh: '把口服抗癌药冲进马桶', who: 'Ratain MJ · 芝加哥大学', k: kJ, t });
      srcTag(c, 'PMID 21931020', jA * (1 - smooth(p(t, L48.s, L48.s + .4))));
    }
    const kJ2 = p(t, L48.s + .1, L48.s + 1.2), j2A = smooth(p(t, L48.s, L48.s + .6)) * (1 - smooth(p(t, L49.s - .2, L49.s + .5)));
    if (j2A > 0) {
      journal(c, 1400, 300, 800, 300, { a: j2A, year: '2018', title: 'Despite a large food effect…', zh: '关键试验：一直空腹给药', who: 'Szmulewitz 等 · 摘要', k: kJ2, t, hi: '尽管食物效应很大' });
      srcTag(c, 'PMID 29590007', j2A);
    }
    // 反过来：用一顿饭，换掉四分之三的药
    const eA = smooth(p(t, L49.s - .1, L49.s + .5));
    if (eA > 0) {
      const y = 500; const melt = eInOut(p(t, cue(S, 'D049', '换掉') - .2, cue(S, 'D049', '换掉') + 1.4));
      c.save(); c.globalAlpha = eA;
      text(c, '1000 mg · 空腹', 560, 330, { size: 40, family: 'SHSans', weight: 800, color: '#fff', align: 'center', alpha: 1 - melt * .5 });
      for (let i = 0; i < 4; i++) {
        const gone = i > 0 ? melt : 0; const x = 410 + i * 100;
        if (gone < 1) whiteTablet(c, x, y, 90, 44, 'AA250', 1 - gone);
        if (gone > 0 && gone < 1) { c.save(); c.globalCompositeOperation = 'lighter'; const r = rng(i * 17); for (let k = 0; k < 40; k++) { const u = clamp(gone * 1.3 - r() * .3); const px = lerp(x + (r() - .5) * 60, 1360 + (r() - .5) * 140, eInOut(u)), py = lerp(y, 600, u) - Math.sin(u * Math.PI) * (120 + r() * 160); c.fillStyle = `rgba(255,214,140,${.9 * (1 - u * .5)})`; c.fillRect(px, py, 3, 3); } c.restore(); }
      }
      plate(c, 1360, 610, smooth(p(melt, .4, 1)), t, 'low');
      text(c, '250 mg + 一顿早餐', 1360, 330, { size: 40, family: 'SHSans', weight: 800, color: C.doseL, align: 'center', alpha: smooth(p(melt, .5, 1)) });
      whiteTablet(c, 1360, 470, 90, 44, 'AA250', smooth(p(melt, .3, .7)));
      glowText(c, '?', W / 2, 560, { size: 200, alpha: smooth(p(t, cue(S, 'D049', '换掉') + .8, cue(S, 'D049', '换掉') + 1.4)), color: '#fff6e2' });
      text(c, '药片按 ZYTIGA 250 mg（白色椭圆片 AA250）规格示意', W / 2, 860, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .5), align: 'center' });
      c.restore();
    }
    chap(S, '第 四 章', '四分之一');
  },
});
transition('s13_trial', { type: 'cross', d: .7 });

// ------------------------------------------------------------------ s13 72 名患者 → PSA 非劣效
const PTS = once('pts72', () => { const r = rng(141), a = []; for (let i = 0; i < 72; i++) a.push({ gx: i % 12, gy: Math.floor(i / 12), side: r() < .5 ? 0 : 1, r: Math.sqrt(r()) * 150, th: r() * TAU, w: (.25 + r() * .3) * (r() < .5 ? -1 : 1) }); return a; });
export function psaChart(c, t, a, k1, k2, band, o = {}) {
  if (a <= 0) return;
  const { x0 = 520, x1 = 1400, y0 = 420, y1 = 800 } = o;
  c.save(); c.globalAlpha *= a;
  line(c, x0, y0 - 20, x0, y1, 'rgba(255,255,255,.35)', 2); line(c, x0, y1, x1 + 30, y1, 'rgba(255,255,255,.35)', 2);
  text(c, 'PSA', x0 - 12, y0 - 34, { size: 24, family: 'JB', weight: 700, color: rgba('#ffffff', .6) });
  for (let w = 0; w <= 12; w++) { const x = lerp(x0, x1, w / 12); line(c, x, y1, x, y1 + (w % 4 === 0 ? 14 : 7), 'rgba(255,255,255,.35)', 1.5); if (w % 4 === 0) text(c, w + ' 周', x, y1 + 42, { size: 22, family: 'SHSans', weight: 500, color: rgba('#ffffff', .6), align: 'center' }); }
  const f = (u, off) => y0 + 10 + (y1 - y0 - 80) * (1 - Math.exp(-u * 3.2)) * (1 + off);
  if (band > 0) { c.fillStyle = rgba(C.dose, .10 * band); c.beginPath(); for (let i = 0; i <= 100; i++) { const u = i / 100; c.lineTo(lerp(x0, x1, u), f(u, -.07 * u)); } for (let i = 100; i >= 0; i--) { const u = i / 100; c.lineTo(lerp(x0, x1, u), f(u, .07 * u)); } c.closePath(); c.fill(); }
  c.globalCompositeOperation = 'lighter';
  for (const [k, off, col, dash] of [[k1, 0, '#ffffff', true], [k2, .025, C.dose, false]]) {
    const n = Math.floor(100 * k); if (n < 2) continue;
    c.strokeStyle = col; c.lineWidth = dash ? 3 : 4.5; c.setLineDash(dash ? [14, 10] : []); c.beginPath();
    for (let i = 0; i <= n; i++) { const u = i / 100; const x = lerp(x0, x1, u), y = f(u, off * u); i ? c.lineTo(x, y) : c.moveTo(x, y); }
    c.stroke(); c.setLineDash([]);
    if (k < 1) { const u = n / 100; glowDot(c, lerp(x0, x1, u), f(u, off * u), 40, col, .9); }
  }
  c.restore();
}
def('s13_trial', {
  clear: '#050608',
  post: { bloom: .55, thr: .78, ca: .0018, vig: .55, grain: .04, tint: [1.03, 1.0, .96], con: 1.05 },
  draw(S) {
    const c = S.ctx, t = S.t;
    const L50 = S.L('D050'), L51 = S.L('D051'), L52 = S.L('D052');
    dust(c, t, 90, '#ffd9a0', .14, 97);
    const ts = L51.s - .1;                                   // 随机分组扫描线
    const up = eInOut(p(t, L52.s - .2, L52.s + 1.0));        // 第三句：两组退到上方
    const scanX = lerp(-100, W + 100, p(t, ts, ts + 1.4));
    PTS.forEach((q, i) => {
      const k = smooth(p(t, L50.s + i * .02, L50.s + .5 + i * .02)); if (k <= 0) return;
      const gx = W / 2 + (q.gx - 5.5) * 64, gy = 470 + (q.gy - 2.5) * 64;
      const assigned = scanX > gx;
      const ta = assigned ? clamp((scanX - gx) / 600) : 0;
      const sx = q.side ? 1360 : 560, th = q.th + q.w * t;
      const fx = sx + Math.cos(th) * q.r, fy = 500 + Math.sin(th) * q.r * .55;
      let x = lerp(gx, fx, eInOut(ta)), y = lerp(gy, fy, eInOut(ta));
      x = lerp(x, lerp(x, sx, .6), up); y = lerp(y, 190 + (y - 500) * .35, up);
      const col = assigned ? (q.side ? C.dose : '#ffffff') : '#cfd6de';
      c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, x, y, 26, col, .45 * k * (1 - .5 * up)); c.restore();
      circle(c, x, y, 7, { fill: col, alpha: k * (1 - .4 * up) });
    });
    if (scanX > -50 && scanX < W + 50) { c.save(); c.globalCompositeOperation = 'lighter'; const g = c.createLinearGradient(scanX - 60, 0, scanX + 6, 0); g.addColorStop(0, rgba(C.dose, 0)); g.addColorStop(1, rgba(C.dose, .5)); c.fillStyle = g; c.fillRect(scanX - 60, 180, 66, 600); line(c, scanX, 180, scanX, 780, 'rgba(255,240,210,.9)', 2); c.restore(); text(c, '随 机', scanX, 165, { size: 26, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center', ls: 8 }); }
    const hA = env(t, L50.s, L51.s + .6, .4, .6);
    text(c, '72', W / 2 - 40, 210, { size: 96, family: 'JB', weight: 800, color: '#fff', align: 'right', alpha: hA });
    text(c, '名患者 · 随机 II 期', W / 2 - 20, 206, { size: 40, family: 'SHSerif', weight: 900, color: '#f3e6cc', alpha: hA });
    srcTag(c, 'Szmulewitz 等 · J Clin Oncol 2018 · PMID 29590007', smooth(p(t, L50.s, L50.s + .6)));
    // 两组
    const gA = smooth(p(t, ts + .6, ts + 1.4)) * (1 - up);
    if (gA > 0) {
      c.save(); c.globalAlpha = gA;
      for (let i = 0; i < 4; i++) whiteTablet(c, 410 + i * 100, 730, 86, 42, 'AA250', 1);
      plate(c, 560, 836, 0, t);
      text(c, '1000 mg · 空腹', 560, 660, { size: 40, family: 'SHSans', weight: 800, color: '#fff', align: 'center' });
      const bA = smooth(p(t, cue(S, 'D051', '另一组') - .1, cue(S, 'D051', '另一组') + .5));
      c.globalAlpha = gA * bA;
      whiteTablet(c, 1360, 730, 86, 42, 'AA250', 1);
      plate(c, 1360, 836, 1, t, 'low');
      text(c, '250 mg + 低脂早餐', 1360, 660, { size: 40, family: 'SHSans', weight: 800, color: C.doseL, align: 'center' });
      c.restore();
      text(c, '药片按 ZYTIGA 250 mg 规格示意', W / 2, 935, { size: 20, family: 'SHSans', weight: 500, color: rgba('#ffffff', .45), align: 'center', alpha: gA });
    }
    // 两组退到上方后，成为曲线的图例
    if (up > 0) {
      text(c, '1000 mg 空腹', 560, 132, { size: 26, family: 'SHSans', weight: 700, color: '#fff', align: 'center', alpha: smooth(p(up, .6, 1)) });
      text(c, '250 mg + 低脂早餐', 1360, 132, { size: 26, family: 'SHSans', weight: 700, color: C.doseL, align: 'center', alpha: smooth(p(up, .6, 1)) });
    }
    // PSA
    const cA = smooth(p(t, L52.s + .2, L52.s + .9));
    const k1 = eInOut(p(t, L52.s + .5, L52.s + 3.0)), k2 = eInOut(p(t, L52.s + .7, L52.s + 3.2));
    const nb = smooth(p(t, cue(S, 'D052', '不劣于') - .1, cue(S, 'D052', '不劣于') + .5));
    psaChart(c, t, cA, k1, k2, nb, { y0: 330, y1: 760 });
    if (cA > 0) {
      text(c, '1000 mg 空腹', 1430, 700, { size: 24, family: 'SHSans', weight: 700, color: '#fff', alpha: smooth(p(k1, .9, 1)) });
      text(c, '250 mg + 低脂早餐', 1430, 736, { size: 24, family: 'SHSans', weight: 700, color: C.doseL, alpha: smooth(p(k2, .9, 1)) });
      glowText(c, 'PSA 下降 · 非劣效', W / 2, 880, { size: 60, alpha: nb, color: '#fff6e2' });
      schemTag(c, '示意 · 曲线形状非真实数据', cA);
    }
  },
});
transition('s14_road', { type: 'cross', d: .8 });

// ------------------------------------------------------------------ s14 从论文到说明书：一整条路（三维飞行）
const GATES = ['更多的患者', '更长的时间', '生存', '安全', '监管审评'];
const GZ = GATES.map((_, i) => 1500 + i * 1150), MZ = 9600;
const MTN = once('mtn', () => { const r = rng(151), a = []; for (let i = 0; i <= 120; i++) a.push(.3 + .7 * Math.abs(Math.sin(i * .21 + r() * .4)) * (.4 + .6 * r())); return a; });
const STARS = once('stars', () => { const r = rng(153), a = []; for (let i = 0; i < 260; i++) a.push([r() * W, r() * 500, r()]); return a; });
function camZ(S, t) {
  const L54 = S.L('D054'), L56 = S.L('D056');
  const T = [-9, L54.s + .4, L54.e + .2, ...GATES.map((g) => cue(S, 'D055', g)), L56.s + 1.6, 999];
  // 终点停在说明书巨碑前约 3300：整座碑留在画面里（碑顶约 y=120）
  // 每念到一道门，门在前方约 1000 处（门牌完整可读）；念下一道时刚好穿过上一道
  const Z = [0, 0, 250, ...GZ.map((z) => z - 1000), MZ - 3300, MZ - 3300];
  const zf = (tt) => { for (let i = 0; i < T.length - 1; i++) if (tt <= T[i + 1]) return lerp(Z[i], Z[i + 1], clamp((tt - T[i]) / (T[i + 1] - T[i]))); return Z[Z.length - 1]; };
  return (zf(t - .25) + zf(t) + zf(t + .25)) / 3;
}
def('s14_road', {
  clear: '#030305',
  post: (S) => ({ bloom: .8, thr: .66, ca: .002, vig: .55, grain: .04, tint: [1.06, 1.0, .9], con: 1.08 }),
  draw(S) {
    const c = S.ctx, t = S.t;
    const L53 = S.L('D053'), L54 = S.L('D054'), L55 = S.L('D055'), L56 = S.L('D056');
    const zc = camZ(S, t), spd = Math.abs(camZ(S, t + .05) - camZ(S, t - .05)) / .1;
    const cam = { x: 0, y: 170, z: zc, yaw: 0, pitch: 0, f: 900 };
    const reveal = eInOut(p(t, L54.s - .1, L54.s + 2.4));     // 路从脚下伸向远方
    const world = smooth(p(t, L54.s - .3, L54.s + 1.5));
    // 天空、星、远山、地平线光
    c.fillStyle = radial(c, W / 2, 560, 1300, [[0, rgba('#5a2d10', .55 * world)], [.4, rgba('#1a0d06', .5 * world)], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, H);
    for (const [x, y, k] of STARS) { const tw = .5 + .5 * Math.sin(t * 2 + k * 30); c.fillStyle = `rgba(255,240,220,${(.15 + .5 * k) * tw * world})`; c.fillRect(x, y, 1.6, 1.6); }
    c.fillStyle = rgba('#0b0806', world); c.beginPath(); c.moveTo(0, 545);
    MTN.forEach((h, i) => c.lineTo(i / 120 * W, 545 - h * 46)); c.lineTo(W, 560); c.lineTo(0, 560); c.closePath(); c.fill();
    c.save(); c.globalCompositeOperation = 'lighter'; const hg = c.createLinearGradient(0, 470, 0, 620); hg.addColorStop(0, rgba(C.dose, 0)); hg.addColorStop(.5, rgba(C.dose, .45 * world)); hg.addColorStop(1, rgba(C.dose, 0)); c.fillStyle = hg; c.fillRect(0, 470, W, 150); c.restore();
    c.fillStyle = '#040404'; c.fillRect(0, 548, W, H - 548);
    // 地面网格
    if (world > 0) {
      c.save(); c.globalAlpha = world; c.lineWidth = 1.2;
      const z0 = Math.ceil((zc + 60) / 500) * 500;
      for (let z = z0; z < zc + 12000; z += 500) { const a = proj(-8000, 0, z, cam), b = proj(8000, 0, z, cam); if (!a || !b) continue; const fa = 1 - (z - zc) / 12000; c.strokeStyle = rgba(C.dose, .16 * fa); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      for (let x = -6000; x <= 6000; x += 500) { const a = proj(x, 0, zc + 80, cam), b = proj(x, 0, zc + 12000, cam); if (!a || !b) continue; c.strokeStyle = rgba(C.dose, .10); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      c.restore();
    }
    // 路
    const zEnd = lerp(420, MZ, reveal);
    if (reveal > 0) {
      const pa = proj(-200, 0, Math.max(zc + 40, 420), cam), pb = proj(200, 0, Math.max(zc + 40, 420), cam), pc = proj(200, 0, zEnd, cam), pd = proj(-200, 0, zEnd, cam);
      if (pa && pb && pc && pd) {
        const g = c.createLinearGradient(0, pc.y, 0, Math.min(H, pa.y)); g.addColorStop(0, rgba(C.dose, .08)); g.addColorStop(1, rgba(C.dose, .32));
        c.fillStyle = g; c.beginPath(); c.moveTo(pa.x, pa.y); c.lineTo(pb.x, pb.y); c.lineTo(pc.x, pc.y); c.lineTo(pd.x, pd.y); c.closePath(); c.fill();
        c.save(); c.globalCompositeOperation = 'lighter';
        for (const sx of [-200, 200]) { const a = proj(sx, 0, Math.max(zc + 40, 420), cam), b = proj(sx, 0, zEnd, cam); line(c, a.x, a.y, b.x, b.y, rgba(C.doseL, .7), 2.5); }
        for (let z = Math.ceil(Math.max(zc + 40, 420) / 300) * 300; z < zEnd; z += 300) { const a = proj(0, 0, z, cam), b = proj(0, 0, Math.min(zEnd, z + 140), cam); if (a && b) line(c, a.x, a.y, b.x, b.y, rgba('#fff2d6', .55), Math.max(1, 6 * a.s)); }
        c.restore();
      }
    }
    // 尽头的说明书（巨碑）
    if (world > 0) {
      const mw = 760, mh = 1700;
      const q = [proj(-mw / 2, 0, MZ, cam), proj(mw / 2, 0, MZ, cam), proj(mw / 2, mh, MZ, cam), proj(-mw / 2, mh, MZ, cam)];
      if (q.every(Boolean)) {
        const ma = world * smooth(p(t, L54.s + .8, L54.s + 2.4));
        c.save(); c.globalAlpha = ma;
        c.globalCompositeOperation = 'lighter'; glowDot(c, (q[0].x + q[1].x) / 2, (q[0].y + q[2].y) / 2, (q[1].x - q[0].x) * 2.2, C.dose, .35); c.globalCompositeOperation = 'source-over';
        const g = c.createLinearGradient(q[0].x, 0, q[1].x, 0); g.addColorStop(0, '#2a2016'); g.addColorStop(.5, '#e9dcc0'); g.addColorStop(1, '#3a2a1a');
        c.fillStyle = g; c.beginPath(); q.forEach((v, i) => i ? c.lineTo(v.x, v.y) : c.moveTo(v.x, v.y)); c.closePath(); c.fill();
        const s = q[0].s, cx = (q[0].x + q[1].x) / 2, top = q[2].y;
        for (let i = 0; i < 9; i++) c.fillRect(q[0].x + mw * s * .14, top + mh * s * (.32 + i * .065), mw * s * (.72 - (i % 3) * .1), Math.max(1, 14 * s)), c.fillStyle = 'rgba(60,44,28,.35)';
        text(c, '说明书', cx, top + mh * s * .2, { size: 150 * s, family: 'SHSerif', weight: 900, color: '#2a1f16', align: 'center' });
        text(c, 'PRESCRIBING INFORMATION', cx, top + mh * s * .26, { size: 44 * s, family: 'Cinzel', weight: 700, color: 'rgba(42,31,22,.8)', align: 'center' });
        c.restore();
      }
    }
    // 五道门
    GATES.forEach((g, i) => {
      const z = GZ[i]; if (z < zc + 30 || z > zEnd + 1) return;
      const lit = smooth(p(t, cue(S, 'D055', g) - .25, cue(S, 'D055', g) + .2));
      const a = smooth(p(z - zc, 30, 260)) * world;
      const pl = [proj(-360, 0, z, cam), proj(-360, 560, z, cam), proj(360, 560, z, cam), proj(360, 0, z, cam)]; if (!pl.every(Boolean)) return;
      c.save(); c.globalAlpha = a; c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      c.strokeStyle = rgba(C.doseL, .35 + .6 * lit); c.lineWidth = Math.max(1.5, 26 * pl[0].s);
      c.beginPath(); c.moveTo(pl[0].x, pl[0].y); c.lineTo(pl[1].x, pl[1].y); c.lineTo(pl[2].x, pl[2].y); c.lineTo(pl[3].x, pl[3].y); c.stroke();
      glowDot(c, (pl[1].x + pl[2].x) / 2, pl[1].y, 900 * pl[0].s, C.dose, .25 + .5 * lit);
      c.restore();
      const s = pl[0].s, bx = (pl[1].x + pl[2].x) / 2, by = pl[1].y + 140 * s;
      c.save(); c.globalAlpha = a;
      panel(c, bx - 300 * s, by - 80 * s, 600 * s, 120 * s, { fill: `rgba(24,14,6,${.85})`, stroke: rgba(C.doseL, .5 + .5 * lit), lw: Math.max(1, 4 * s), r: 14 * s });
      text(c, g, bx, by + 2 * s, { size: 64 * s, family: 'SHSerif', weight: 900, color: lit > .5 ? '#fff6e2' : '#cbb79a', align: 'center' });
      c.restore();
    });
    // 速度线
    if (spd > 300) {
      const k = clamp((spd - 300) / 1200); c.save(); c.globalCompositeOperation = 'lighter'; const r = rng(Math.floor(t * 24));
      for (let i = 0; i < 70; i++) { const ang = r() * TAU, r0 = 200 + r() * 900, len = 60 + 260 * k * r(); c.strokeStyle = `rgba(255,220,170,${.18 * k})`; c.lineWidth = 1.5; c.beginPath(); c.moveTo(W / 2 + Math.cos(ang) * r0, 545 + Math.sin(ang) * r0 * .6); c.lineTo(W / 2 + Math.cos(ang) * (r0 + len), 545 + Math.sin(ang) * (r0 + len) * .6); c.stroke(); }
      c.restore(); S.post.ca = .002 + .004 * k;
    }
    // 开头：两条曲线收成一个点
    const col = 1 - smooth(p(t, .2, 1.2));
    if (col > 0) { c.save(); c.globalAlpha = col; c.translate(W / 2, 760); c.scale(col, col); c.translate(-W / 2, -760); psaChart(c, t, 1, 1, 1, 1, { y0: 330, y1: 760 }); c.restore(); }
    const pA = smooth(p(t, .7, 1.2)) * (1 - smooth(p(t, L54.s + .4, L54.s + 1.4)));
    if (pA > 0) { const q = proj(0, 0, 420, cam); if (q) { c.save(); c.globalCompositeOperation = 'lighter'; glowDot(c, q.x, q.y, 90, C.doseL, pA); c.restore(); } }
    const tA = env(t, L53.s, L54.s + .6, .4, .6);
    text(c, '作 者 的 结 论', W / 2, 160, { size: 30, family: 'SHSerif', weight: 900, color: C.dose, align: 'center', ls: 12, alpha: smooth(p(t, L53.s - .1, L53.s + .5)) * tA });
    glowText(c, '一个指标 · 十二周', W / 2, 260, { size: 72, alpha: smooth(p(t, cue(S, 'D053', '一个指标') - .1, cue(S, 'D053', '一个指标') + .5)) * tA, color: '#fff6e2' });
    text(c, '长期疗效：还需要研究', W / 2, 340, { size: 40, family: 'SHSerif', weight: 600, color: rgba('#ffffff', .7), align: 'center', ls: 6, alpha: smooth(p(t, cue(S, 'D053', '长期疗效') - .1, cue(S, 'D053', '长期疗效') + .5)) * tA });
    srcTag(c, 'Szmulewitz 等 · J Clin Oncol 2018', smooth(p(t, L53.s, L53.s + .5)) * tA);
    // 字幕区压暗：路中线、网格不和字幕抢
    c.save(); const sb = c.createLinearGradient(0, 880, 0, H); sb.addColorStop(0, 'rgba(0,0,0,0)'); sb.addColorStop(1, 'rgba(0,0,0,.75)'); c.fillStyle = sb; c.fillRect(0, 880, W, H - 880); c.restore();
    // 结尾：论文在起点，说明书在尽头
    const eA = smooth(p(t, L56.s + .6, L56.s + 1.4));
    if (eA > 0) {
      c.save(); c.globalAlpha = eA;
      paperCard(c, 300, 780, 320, 240, { head: 'JCO · 2018', sub: '一项研究的结论', kind: 'journal', seed: 7, t });
      text(c, '¼', 230, 860, { size: 110, family: 'SHSerif', weight: 900, color: '#7a1f1a', align: 'center' });
      c.restore();
      seal(c, 420, 680, t - (L56.s + 1.3), { r: 38 });
      // 右侧与论文卡对称：研究的结论 ≠ 说明书的写法
      const nq = smooth(p(t, cue(S, 'D056', '不是') - .2, cue(S, 'D056', '不是') + .4));
      if (nq > 0) {
        const bx = 1610;
        text(c, '研究的结论', bx, 700, { size: 44, family: 'SHSerif', weight: 900, color: '#f3e6cc', align: 'center', ls: 4, alpha: nq });
        glowText(c, '≠', bx, 800, { size: 96, alpha: nq, color: '#ffd2c8', glow: C.risk });
        text(c, '说明书的写法', bx, 880, { size: 44, family: 'SHSerif', weight: 900, color: C.doseL, align: 'center', ls: 4, alpha: nq });
      }
    }
  },
});
transition('s15_finale', { type: 'white', d: .6 });
