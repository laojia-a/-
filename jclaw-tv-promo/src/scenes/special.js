// 120–134 s · 特别节目 BE CSR Review — an interruption bumper, then a homage to the previous film's cyan HUD:
// title, G0–G5 gates, cell-by-cell table check with a pinned conflict, the seven-column comment table, the boundary line.
// Content follows the public wording of the previous promo (pharmaxi/be-csr-review could not be read from this environment).
const L = require('../lib');
const { canvas, clamp, inv, lerp, E, rng, makeCam, lookAt, texPlane, text, font, rrect, reveal, noise1, W, H } = L;
const C = require('./common');

const CY = '#3fe6ff', ICE = '#d8f3ff', GOLD = '#ffbf4d', RED = '#ff4d5e', NAVY = '#06101e';
const GATES = [['G0', '明确任务'], ['G1', '固定文件'], ['G2', '顺读全文'], ['G3', '核来源与主张'], ['G4', '反查意见与漏项'], ['G5', '交付']];

function hex(ctx, x, y, r, col, lw, fill) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const a = Math.PI / 6 + i * Math.PI / 3; ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
}
function hudBg(ctx, lt) {
  const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.7);
  g.addColorStop(0, '#0b2238'); g.addColorStop(1, '#02060c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.save(); ctx.strokeStyle = 'rgba(63,230,255,0.06)'; ctx.lineWidth = 1;
  const off = (lt * 30) % 60;
  for (let x = -60 + off; x < W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 0; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.restore();
}

module.exports = function special(ctx, lt, t) {
  hudBg(ctx, lt);
  // ---- bumper 0–1.4 ----
  if (lt < 1.5) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 7; i++) {
      const q = E.outExpo(clamp((lt - i * 0.05) / 0.5)), out = E.inExpo(clamp((lt - 1.15) / 0.35));
      const y = C.BAR + 40 + i * 116;
      ctx.fillStyle = i % 2 ? 'rgba(63,230,255,0.85)' : 'rgba(255,191,77,0.85)';
      ctx.fillRect(lerp(-W, 0, q) + out * W * (i % 2 ? 1 : -1), y, W, 10);
    }
    const a = clamp((lt - 0.25) / 0.2) * (1 - clamp((lt - 1.2) / 0.25));
    text(ctx, '特别节目', W / 2, H / 2 - 30, { font: font(900, 150, 'serif'), color: '#fff', alpha: a, spacing: 30, glow: 'rgba(63,230,255,0.8)', blur: 40 });
    text(ctx, 'SPECIAL PROGRAMME · 插播', W / 2, H / 2 + 90, { font: font(600, 30, 'mono'), color: CY, alpha: a, spacing: 8 });
    return { grade: 'storm', streakTint: 'rgb(90,200,255)' };
  }
  const u = lt - 1.5; // 0..12.5
  let seg = '审核 Skill';
  // ---- title 0–4.1 ----
  if (u < 4.1) {
    const sc = 1 + u * 0.015;
    ctx.save(); ctx.translate(W / 2, H / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -H / 2);
    const tr = lerp(60, 14, E.outExpo(clamp(u / 1.6)));
    text(ctx, 'BE CSR REVIEW', W / 2, H / 2 - 70, { font: font(400, 170, 'display'), color: ICE, spacing: tr, glow: 'rgba(63,230,255,0.9)', blur: 30, alpha: clamp(u / 0.3) });
    reveal(ctx, '把报告审清楚，把意见交明白', W / 2, H / 2 + 80, u - 0.6, { font: font(800, 52), color: '#fff', spacing: 10, glow: 'rgba(63,230,255,0.5)' });
    text(ctx, 'BE 报告审核 Agent Skill  ·  空腹 / 餐后  ·  不在电视频道表里，单独插播', W / 2, H / 2 + 170, { font: font(500, 26), color: GOLD, alpha: clamp((u - 1.2) / 0.5), spacing: 2 });
    ctx.restore();
  }
  // ---- gates 4.1–6.8 + table 6.8–8.3 ----
  else if (u < 8.3) {
    seg = 'G0–G5';
    const v = u - 4.1;
    const y = H / 2 - 90;
    const x0 = 290, dx = 268;
    ctx.save(); ctx.strokeStyle = 'rgba(63,230,255,0.35)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(140, y); ctx.lineTo(W - 140, y); ctx.stroke(); ctx.restore();
    const head = lerp(140, W - 140, E.inOutCubic(clamp(v / 2.6)));
    const g = ctx.createRadialGradient(head, y, 0, head, y, 120); g.addColorStop(0, 'rgba(160,250,255,0.9)'); g.addColorStop(1, 'rgba(63,230,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(head - 120, y - 120, 240, 240); ctx.restore();
    GATES.forEach(([gname, label], i) => {
      const x = x0 + i * dx;
      const lit = head > x;
      hex(ctx, x, y, 78, lit ? CY : 'rgba(63,230,255,0.35)', lit ? 5 : 2, lit ? 'rgba(63,230,255,0.12)' : 'rgba(6,16,30,0.8)');
      text(ctx, gname, x, y, { font: font(400, 64, 'display'), color: lit ? ICE : 'rgba(216,243,255,0.4)', glow: lit ? 'rgba(63,230,255,0.9)' : null, blur: 20 });
      text(ctx, label, x, y + 128, { font: font(700, 30), color: lit ? '#fff' : 'rgba(255,255,255,0.35)' });
    });
    // table check
    const ta = clamp((v - 2.6) / 0.3);
    if (ta > 0) {
      ctx.save(); ctx.globalAlpha = ta;
      const tx = W / 2 - 520, ty = y + 200;
      const rows = [['Cmax', 'ng/mL', '1,036.2', '1,036.2'], ['AUC0-t', 'h·ng/mL', '1,284.6', '1,248.6'], ['t1/2', 'h', '6.8', '6.84']];
      ['参数', '单位', 'CSR 显示值', '来源原值'].forEach((h, k) => text(ctx, h, tx + 40 + k * 260, ty, { font: font(700, 24), color: CY, align: 'left' }));
      rows.forEach((r, i) => {
        const yy = ty + 50 + i * 46;
        const scan = clamp((v - 2.8 - i * 0.25) / 0.25);
        const bad = i === 1 && scan >= 1, warn = i === 2 && scan >= 1;
        if (bad || warn) { ctx.fillStyle = bad ? 'rgba(255,77,94,0.22)' : 'rgba(255,191,77,0.18)'; ctx.fillRect(tx + 20, yy - 20, 1040, 40); }
        r.forEach((c, k) => text(ctx, c, tx + 40 + k * 260, yy, { font: font(500, 26, 'mono'), color: bad && k >= 2 ? RED : warn && k >= 2 ? GOLD : ICE, align: 'left', alpha: clamp(scan * 2) }));
      });
      const pa = clamp((v - 3.6) / 0.3);
      text(ctx, '1,284.6 ≠ 1,248.6  ·  表 14.2.1 第 2 行 · 第 3 列', tx + 40, ty + 210, { font: font(700, 28), color: RED, align: 'left', alpha: pa });
      C.demoTag(ctx, tx + 1060, ty + 186, pa);
      ctx.restore();
    }
  }
  // ---- comment table + boundary 8.3–12.5 ----
  else {
    seg = '七列意见';
    const v = u - 8.3;
    const cols = ['编号', '位置', '原文', '意见', '依据', '处理性质', '当前状态'];
    const tx = 170, ty = C.SAFE_T + 190, cw = (W - 340) / 7;
    text(ctx, '审核意见 · 七列', tx, ty - 60, { font: font(900, 40), color: ICE, align: 'left' });
    cols.forEach((c, k) => {
      const a = clamp((v - k * 0.07) / 0.25);
      rrect(ctx, tx + k * cw + 4, ty - 22, cw - 8, 48, 8); ctx.fillStyle = `rgba(63,230,255,${0.16 * a})`; ctx.fill();
      text(ctx, c, tx + k * cw + cw / 2, ty + 2, { font: font(700, 26), color: CY, alpha: a });
    });
    const rows = [['R-01', '表14.2.1 第2行', '1,284.6', '与来源值不一致，请核对', 'PK 输出 1,248.6', '必须修改', '待处理'], ['R-02', '表14.2.1 第5行', '6.8', '显示精度与来源不一致', '来源 6.84', '必须修改', '待处理'], ['R-03', '第11.4节 第3段', '……', '与处置表人数不一致', '处置表 入组24', '请说明', '待处理']];
    rows.forEach((r, i) => {
      const a = E.outCubic(clamp((v - 0.6 - i * 0.3) / 0.4));
      r.forEach((c, k) => text(ctx, c, tx + k * cw + 14, ty + 76 + i * 64, { font: font(500, k === 0 ? 24 : 22, k === 0 || k === 2 ? 'mono' : 'sans'), color: k === 5 ? (i < 2 ? RED : GOLD) : ICE, align: 'left', alpha: a }));
      ctx.fillStyle = `rgba(63,230,255,${0.15 * a})`; ctx.fillRect(tx, ty + 106 + i * 64, W - 340, 1);
    });
    const ba = clamp((v - 1.8) / 0.4);
    text(ctx, '原件默认不改 · 批注进副本 · 中断后可从断点接续', W / 2, ty + 330, { font: font(600, 30), color: '#fff', alpha: ba * 0.9 });
    const ea = clamp((v - 2.6) / 0.5);
    text(ctx, '人做判断  ·  Agent + Skill 做专业阅读  ·  工具做确定性计算', W / 2, ty + 410, { font: font(700, 34), color: GOLD, alpha: ea, spacing: 2 });
  }
  // channel-like bug for the special
  ctx.save(); ctx.globalAlpha = clamp(u / 0.4);
  rrect(ctx, 96, C.SAFE_T + 6, 360, 52, 12); ctx.fillStyle = 'rgba(6,16,30,0.6)'; ctx.fill(); ctx.strokeStyle = 'rgba(63,230,255,0.5)'; ctx.lineWidth = 1.5; ctx.stroke();
  rrect(ctx, 104, C.SAFE_T + 14, 92, 36, 8); ctx.fillStyle = CY; ctx.fill();
  text(ctx, 'SPECIAL', 150, C.SAFE_T + 33, { font: font(800, 16, 'inter'), color: NAVY });
  text(ctx, 'BE CSR Review', 210, C.SAFE_T + 33, { font: font(700, 22, 'inter'), color: ICE, align: 'left' });
  text(ctx, seg, 440, C.SAFE_T + 34, { font: font(500, 17), color: ICE, align: 'right', alpha: 0.7 });
  ctx.restore();
  C.switchOut(ctx, lt, 14, 602);
  return { grade: 'storm', streakTint: 'rgb(90,200,255)', gradeOverride: { split: 0.35 } };
};
