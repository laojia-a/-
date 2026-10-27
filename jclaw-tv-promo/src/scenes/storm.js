// 10–24 s · Storm: static becomes a tunnel of windows (sheets, contracts, slides, PK curves, schedules, PDFs…),
// accelerating into a vortex; everything slams into the lens at 22 s; black silence; a knob glint at 23 s.
const L = require('../lib');
const { canvas, cached, clamp, inv, lerp, E, rng, makeCam, project, texPlane, text, font, rrect, noise1, W, H } = L;
const { drawStatic } = require('../post');
const T = require('../timeline');

const TWW = 560, TWH = 380;
const KINDS = [
  ['sheet', '合同付款_v3_最终版.xlsx'], ['doc', '临床试验合同_第二稿.docx'], ['calc', '例数估算_计算器'], ['sheet', '物资估算_采血管.xlsx'],
  ['slide', 'SOP-ADM-020_培训.pptx'], ['chart', 'PK浓度_随机表.xlsx'], ['gantt', '项目排期_2026.xlsx'], ['todo', 'To-do.txt'],
  ['pdf', '模块5_临床报告.pdf'], ['mail', '收件箱 (128)'], ['sheet', '高脂餐_热量核对.xlsx'], ['doc', 'CTCAE v6 术语.pdf'],
  ['chat', '项目群 · 99+'], ['tabs', '浏览器 · 37 个标签页'], ['sheet', 'NCA结果_导出.csv'], ['slide', '数据现场核查要点.pptx'],
  ['gantt', 'Issue 跟踪表.xlsx'], ['pdf', 'MedDRA 层级.pdf'], ['calc', '合同金额大写'], ['todo', '培训签到表'],
];

function winTex(i) {
  const [kind, title] = KINDS[i % KINDS.length];
  const dark = i % 3 === 0;
  return cached('win' + i, TWW, TWH, (c, w, h) => {
    const r = rng(100 + i);
    const bg = dark ? '#1b2128' : '#f4f5f2', fg = dark ? '#d9e1e8' : '#2b3138', mute = dark ? '#6c7a86' : '#9aa1a8';
    rrect(c, 0, 0, w, h, 14); c.fillStyle = bg; c.fill();
    c.save(); rrect(c, 0, 0, w, h, 14); c.clip();
    // title bar
    const bar = { sheet: '#1f7a4a', doc: '#2b5797', calc: '#444b55', slide: '#c4502b', chart: '#1f7a4a', gantt: '#1f7a4a', todo: '#6b6f3a', pdf: '#a8322d', mail: '#2462b0', chat: '#3a8f5c', tabs: '#3c4048' }[kind];
    c.fillStyle = bar; c.fillRect(0, 0, w, 42);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((col, k) => { c.beginPath(); c.arc(20 + k * 20, 21, 6, 0, Math.PI * 2); c.fillStyle = col; c.fill(); });
    text(c, title, 84, 22, { font: font(600, 17), color: '#fff', align: 'left' });
    const y0 = 56;
    if (kind === 'sheet') {
      c.fillStyle = dark ? '#242c34' : '#e8ebe6'; c.fillRect(0, y0, w, 26);
      'ABCDEFG'.split('').forEach((ch, k) => text(c, ch, 60 + k * 74, y0 + 13, { font: font(500, 13, 'inter'), color: mute }));
      for (let rr = 0; rr < 10; rr++) {
        const y = y0 + 30 + rr * 28;
        c.fillStyle = dark ? '#2a333c' : '#e3e6e1'; c.fillRect(0, y + 26, w, 1);
        text(c, String(rr + 1), 14, y + 13, { font: font(500, 12, 'inter'), color: mute, align: 'left' });
        for (let k = 0; k < 7; k++) {
          const v = (r() * 9000 + 100).toFixed(k % 2 ? 2 : 0);
          text(c, v, 92 + k * 74, y + 13, { font: font(400, 14, 'mono'), color: fg, align: 'right' });
        }
        if (r() < 0.12) { c.fillStyle = 'rgba(255,200,40,0.35)'; c.fillRect(30 + Math.floor(r() * 6) * 74, y, 74, 26); }
      }
    } else if (kind === 'doc' || kind === 'pdf') {
      if (kind === 'pdf') { c.fillStyle = dark ? '#2a2f35' : '#d9dcdf'; c.fillRect(0, 42, w, h); }
      const px = kind === 'pdf' ? 110 : 30, pw = kind === 'pdf' ? w - 220 : w - 60;
      c.fillStyle = '#fbfbf8'; c.fillRect(px, y0 + 6, pw, h - y0 - 6);
      text(c, kind === 'pdf' ? '5.3.1.2  临床研究报告' : '临床试验合同', px + pw / 2, y0 + 40, { font: font(700, 22), color: '#222' });
      for (let k = 0; k < 9; k++) { c.fillStyle = '#c9ccd0'; c.fillRect(px + 24, y0 + 72 + k * 24, (pw - 48) * (0.6 + r() * 0.4), 6); }
      if (kind === 'doc') { c.beginPath(); c.arc(px + pw - 70, h - 60, 34, 0, Math.PI * 2); c.lineWidth = 3; c.strokeStyle = 'rgba(200,50,40,0.7)'; c.stroke(); text(c, '待签', px + pw - 70, h - 60, { font: font(700, 18), color: 'rgba(200,50,40,0.8)' }); }
    } else if (kind === 'calc') {
      c.fillStyle = '#0f1216'; c.fillRect(20, y0 + 6, w - 40, 86);
      text(c, i % 2 ? '¥ 1,280,000.00' : 'N = 24', w - 40, y0 + 50, { font: font(600, 44, 'mono'), color: '#e8f0f8', align: 'right' });
      for (let k = 0; k < 12; k++) { const x = 20 + (k % 4) * ((w - 40) / 4), y = y0 + 106 + Math.floor(k / 4) * 70; rrect(c, x + 4, y, (w - 40) / 4 - 8, 60, 10); c.fillStyle = k % 4 === 3 ? '#e58a2e' : '#353b44'; c.fill(); text(c, '789÷456×123−'[k], x + (w - 40) / 8, y + 30, { font: font(500, 26, 'inter'), color: '#fff' }); }
    } else if (kind === 'slide') {
      c.fillStyle = '#fff8ef'; c.fillRect(20, y0, w - 40, h - y0 - 16);
      c.fillStyle = '#c4502b'; c.fillRect(20, y0, 12, h - y0 - 16);
      text(c, i % 2 ? '数据现场核查要点' : '供应商管理 SOP', 60, y0 + 50, { font: font(800, 30), color: '#3a2a20', align: 'left' });
      for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(70, y0 + 108 + k * 40, 5, 0, Math.PI * 2); c.fillStyle = '#c4502b'; c.fill(); c.fillStyle = '#b8aa9a'; c.fillRect(88, y0 + 104 + k * 40, 200 + r() * 180, 9); }
    } else if (kind === 'chart') {
      c.strokeStyle = mute; c.lineWidth = 1; c.beginPath(); c.moveTo(50, y0 + 10); c.lineTo(50, h - 40); c.lineTo(w - 20, h - 40); c.stroke();
      for (let s = 0; s < 6; s++) {
        c.beginPath();
        for (let k = 0; k <= 40; k++) { const tt = k / 40 * 24, cc = (Math.exp(-0.18 * tt) - Math.exp(-1.6 * tt)) * (0.8 + s * 0.08); c.lineTo(50 + k / 40 * (w - 80), h - 40 - cc * (h - 120)); }
        c.strokeStyle = s % 2 ? '#e8835f' : '#3fb6c8'; c.lineWidth = 2; c.stroke();
      }
    } else if (kind === 'gantt') {
      for (let k = 0; k < 9; k++) {
        const y = y0 + 12 + k * 32;
        c.fillStyle = dark ? '#2a333c' : '#e3e6e1'; c.fillRect(0, y + 30, w, 1);
        text(c, ['方案定稿', '伦理递交', '启动会', '首例入组', '采血', '数据清理', '统计分析', 'CSR', '归档'][k], 16, y + 15, { font: font(500, 15), color: fg, align: 'left' });
        const a = 120 + r() * 260, b = 40 + r() * 140;
        rrect(c, a, y + 6, b, 18, 6); c.fillStyle = ['#3d8bfd', '#f2a33a', '#36b37e', '#e5534b'][k % 4]; c.fill();
      }
    } else if (kind === 'todo') {
      for (let k = 0; k < 8; k++) {
        const y = y0 + 14 + k * 38;
        rrect(c, 22, y, 20, 20, 4); c.lineWidth = 2; c.strokeStyle = mute; c.stroke();
        if (r() < 0.35) { c.strokeStyle = '#36b37e'; c.beginPath(); c.moveTo(26, y + 10); c.lineTo(31, y + 16); c.lineTo(39, y + 4); c.stroke(); }
        c.fillStyle = dark ? '#3b4650' : '#cfd3d7'; c.fillRect(56, y + 6, 140 + r() * 260, 9);
      }
    } else if (kind === 'mail') {
      for (let k = 0; k < 8; k++) {
        const y = y0 + 6 + k * 40;
        c.beginPath(); c.arc(30, y + 18, 13, 0, Math.PI * 2); c.fillStyle = ['#3d8bfd', '#f2a33a', '#36b37e', '#e5534b'][k % 4]; c.fill();
        c.fillStyle = fg; c.fillRect(54, y + 8, 120 + r() * 80, 9); c.fillStyle = mute; c.fillRect(54, y + 24, 220 + r() * 200, 7);
        if (k < 4) { c.beginPath(); c.arc(w - 26, y + 18, 5, 0, Math.PI * 2); c.fillStyle = '#3d8bfd'; c.fill(); }
      }
    } else if (kind === 'chat') {
      for (let k = 0; k < 6; k++) {
        const me = k % 2 === 1, y = y0 + 10 + k * 52, bw = 140 + r() * 180;
        rrect(c, me ? w - 24 - bw : 24, y, bw, 40, 14); c.fillStyle = me ? '#3a8f5c' : (dark ? '#2a333c' : '#e3e6e1'); c.fill();
      }
    } else if (kind === 'tabs') {
      for (let k = 0; k < 14; k++) { rrect(c, 6 + k * 39, 48, 37, 26, 6); c.fillStyle = k === 5 ? bg : (dark ? '#2a333c' : '#dfe2dd'); c.fill(); }
      c.fillStyle = dark ? '#2a333c' : '#e9ece7'; rrect(c, 20, 90, w - 40, 30, 15); c.fill();
      for (let k = 0; k < 6; k++) { c.fillStyle = dark ? '#3b4650' : '#cfd3d7'; c.fillRect(30, 140 + k * 34, 200 + r() * 300, 12); }
    }
    c.restore();
    rrect(c, 0.5, 0.5, w - 1, h - 1, 14); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,0.3)'; c.stroke();
  });
}

const N = 170;
const ITEMS = (() => {
  const r = rng(2026);
  return Array.from({ length: N }, (_, i) => {
    const a = r() * Math.PI * 2, rad = 1.3 + r() * 3.2;
    return { i, a, rad, z: 3 + (i / N) * 175 + r() * 2, rx: (r() - 0.5) * 0.7, ry: (r() - 0.5) * 1.2, rz: (r() - 0.5) * 0.5, spin: (r() - 0.5) * 0.6, s: 0.8 + r() * 0.7 };
  });
})();
const STARS = (() => { const r = rng(9); return Array.from({ length: 260 }, () => ({ a: r() * Math.PI * 2, rad: 0.8 + r() * 7, z: r() * 200, w: 0.5 + r() * 1.5 })); })();
const WORDS = ['合同', '物资', '例数', '餐谱', '培训', '课件', 'PK 数据', 'NCA', '排期', 'Issue', 'To-do', 'PDF', '报告'];

function camZ(u) { return 3.0 * u + 1.05 * u * u; }

module.exports = function storm(ctx, lt, t) {
  const u = lt; // 0..14
  ctx.fillStyle = '#04060a'; ctx.fillRect(0, 0, W, H);
  if (u < 12) {
    // vanishing glow
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.6);
    g.addColorStop(0, `rgba(255,170,90,${0.14 + 0.2 * inv(6, 12, u)})`); g.addColorStop(0.3, 'rgba(40,90,140,0.10)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const cz = camZ(u);
    const speed = 3.0 + 2.1 * u;
    const vort = E.inCubic(inv(8.6, 12, u));
    const crash = E.inExpo(inv(11.2, 12, u));
    const cam = makeCam({ x: 0, y: 0, z: cz, fov: 1.15, roll: noise1(u * 0.25) * 0.08 + vort * u * 0.25 });
    // warp streaks
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const s of STARS) {
      let z = ((s.z - cz) % 200 + 200) % 200;
      if (z < 0.5) continue;
      const a = s.a + vort * u * 0.9;
      const p0 = project(cam, [Math.cos(a) * s.rad, Math.sin(a) * s.rad, cz + z]);
      const p1 = project(cam, [Math.cos(a) * s.rad, Math.sin(a) * s.rad, cz + z + speed * 0.08]);
      if (!p0 || !p1) continue;
      ctx.strokeStyle = `rgba(170,210,255,${clamp(0.5 - z / 260) * 0.9})`; ctx.lineWidth = s.w;
      ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
    }
    ctx.restore();
    // windows, far to near
    const vis = [];
    for (const it of ITEMS) {
      let z = it.z;
      const a = it.a + vort * (u - 8.6) * 1.6 * (1 + it.rad * 0.15);
      let rad = it.rad * (1 - vort * 0.55);
      if (crash > 0) { z = lerp(z, cz + 1.2 + (it.i % 7) * 0.4, crash); rad *= 1 - crash * 0.5; }
      const dz = z - cz;
      if (dz < 0.35 || dz > 80) continue;
      vis.push({ it, z, a, rad, dz });
    }
    vis.sort((p, q) => q.dz - p.dz);
    for (const v of vis) {
      const { it } = v;
      const pl = { c: [Math.cos(v.a) * v.rad, Math.sin(v.a) * v.rad, v.z], rx: it.rx + noise1(u * 0.3 + it.i) * 0.2, ry: it.ry + it.spin * u, rz: it.rz + v.a * 0.2 };
      const fog = clamp(1 - v.dz / 70) * clamp((v.dz - 0.35) / 0.8);
      texPlane(ctx, cam, pl, 1.6 * it.s, 1.086 * it.s, winTex(it.i), { alpha: fog, backface: true, nx: 3, ny: 2, shade: 0.55 * (v.dz / 70) });
    }
    // centre words on beats
    if (u > 5.0 && u < 9.5) {
      const k = Math.floor((u - 5.0) / 0.35), q = ((u - 5.0) % 0.35) / 0.35;
      const w = WORDS[k % WORDS.length];
      const sc = 1 + q * 0.35;
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc);
      text(ctx, w, 0, 0, { font: font(900, 150, 'serif'), color: '#fff6e8', alpha: (1 - q) * 0.9, glow: 'rgba(255,190,120,0.8)', blur: 40, spacing: 8 });
      ctx.restore();
    }
    if (crash > 0.85) { ctx.fillStyle = `rgba(255,250,240,${(crash - 0.85) / 0.15})`; ctx.fillRect(0, 0, W, H); }
    // static dissolves into the tunnel
    const sa = 1 - E.outCubic(clamp(u / 1.1));
    if (sa > 0) drawStatic(ctx, 0, 0, W, H, Math.floor(t * 30), sa);
    return { grade: 'storm', streakTint: 'rgb(255,170,110)' };
  }
  // 22–24 · silence; the knob catches a sliver of light at 23 s
  const q = clamp((u - 13.0) / 1.0);
  if (q > 0) {
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.4 + q * 0.25);
    const R = 150 + q * 30;
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      const lit = Math.pow(Math.max(0, Math.cos(a + 2.2)), 8) * E.outCubic(q);
      if (lit < 0.01) continue;
      ctx.strokeStyle = `rgba(255,214,140,${lit * 0.85})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * R, Math.sin(a) * R); ctx.lineTo(Math.cos(a) * (R + 14), Math.sin(a) * (R + 14)); ctx.stroke();
    }
    ctx.restore();
  }
  return { grade: 'night' };
};
