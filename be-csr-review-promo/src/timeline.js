// Single source of truth for picture/sound sync. All times in seconds.
// Musical grid: 120 BPM -> every scene boundary and major hit lands on a beat (0.5 s).

const FPS = 30;
const DURATION = 98;
const W = 1920;
const H = 1080;

const SCENES = [
  { id: 'cold',     start: 0,  end: 7.5 },
  { id: 'storm',    start: 7.5, end: 19 },
  { id: 'title',    start: 19, end: 28 },
  { id: 'gates',    start: 28, end: 44 },
  { id: 'table',    start: 44, end: 58 },
  { id: 'roles',    start: 58, end: 68 },
  { id: 'delivery', start: 68, end: 80 },
  { id: 'package',  start: 80, end: 88 },
  { id: 'finale',   start: 88, end: 98 },
];

// Gate passes inside the "gates" scene (global time)
const GATE_PASS = [0, 1, 2, 3, 4, 5].map((i) => 29.5 + 2.5 * i);

// Burned-in subtitles (zh main line + en secondary line)
const SUBS = [
  [0.8, 4.2, '这是一份BE临床总结报告', 'This is a bioequivalence Clinical Study Report'],
  [4.3, 7.4, '正文、表格、嵌套表、脚注、图——一样都不能漏读', 'Body text, tables, nested tables, footnotes, figures — none may be skipped'],
  [7.8, 11.4, '密密麻麻的数字、单位、脚注与显示精度', 'Dense grids of numbers, units, footnotes and display precisions'],
  [11.6, 15.6, '漏掉一处矛盾，就是又一轮返工', 'Miss one contradiction, and it is another round of rework'],
  [21.2, 25.0, '把报告审清楚，把意见交明白', 'Review the report thoroughly. Deliver comments clearly.'],
  [25.2, 27.8, '为空腹 / 餐后 BE 报告打造的审核 Skill', 'A review Skill built for fasting / fed BE reports'],
  [28.4, 31.6, '一条主线，六道关口', 'One main line. Six gates.'],
  [31.8, 37.8, '明确任务 → 固定文件 → 顺读全文 → 核来源与主张', 'Scope the task → pin the files → read in order → verify sources & claims'],
  [38.0, 43.8, '反查意见与漏项 → 交付。关口是工作证据，不是六次签字', 'Re-check comments & gaps → deliver. Gates are work evidence, not six sign-offs.'],
  [44.5, 49.6, '直接复制的表：题、表头、标签、单位、脚注、精度，逐格核对', 'Copied tables: title, header, labels, units, footnotes, precision — checked cell by cell'],
  [49.8, 53.8, '原值保留，矛盾当场定位到行、列和位置', 'Original values kept; contradictions pinned to row, column and location'],
  [54.0, 57.8, '数值相同≠专业结论：还要核用途、人群、方法和反证', 'Same number ≠ professional verdict: purpose, population, method, counter-evidence'],
  [58.4, 62.4, '人做判断，模型做专业阅读，工具做确定性计算', 'People decide. The model reads like an expert. Tools compute deterministically.'],
  [62.6, 67.8, '三方分工，共享同一份任务、证据和结果', 'Three roles, one shared task, evidence trail and result'],
  [68.4, 72.0, '交付作者能定位、能处理的意见', 'Comments the author can locate and act on'],
  [72.2, 75.9, '七列意见表：编号·位置·原文·意见·依据·处理性质·当前状态', 'Seven-column table: ID · location · original · comment · basis · nature · state'],
  [76.1, 79.8, '原件默认不改，批注进副本；中断了，也能从断点接续', 'Originals untouched, comments go to a copy; interrupted work resumes at the breakpoint'],
  [80.4, 84.0, '一个包，带走方法、固定运行代码和依赖', 'One package: method, pinned runtime code and dependencies'],
  [84.2, 87.8, '离线安装，哈希校验，无需完整仓库或API密钥', 'Offline install, hash-verified, no full repo or API key needed'],
  [88.6, 91.6, '读完整 · 核来源 · 核全表 · 发现矛盾', 'Read it all · verify sources · verify every table · find contradictions'],
  [91.8, 95.6, '辅助审核，不替代专业判断与监管结论', 'It assists review — it does not replace professional or regulatory judgement'],
];

// Camera / post-processing impulses: shake (px), flash (0..1), chroma (px), decay (s)
const IMPULSES = [
  { t: 0.3, shake: 6, flash: 0, chroma: 0, decay: 1.2 },
  { t: 9.5, shake: 6, chroma: 4, decay: 0.4 },
  { t: 11.0, shake: 6, chroma: 4, decay: 0.4 },
  { t: 12.5, shake: 7, chroma: 5, decay: 0.4 },
  { t: 14.0, shake: 8, chroma: 5, decay: 0.4 },
  { t: 15.0, shake: 9, chroma: 6, decay: 0.4 },
  { t: 16.0, shake: 10, chroma: 7, decay: 0.4 },
  { t: 19.0, shake: 30, flash: 1, chroma: 14, decay: 1.4 },
  { t: 28.0, shake: 10, flash: 0.35, chroma: 6, decay: 0.6 },
  ...GATE_PASS.map((t) => ({ t, shake: 14, flash: 0.45, chroma: 8, decay: 0.55 })),
  { t: 45.8, shake: 18, flash: 0.25, chroma: 12, decay: 0.7 },
  { t: 58.0, shake: 8, flash: 0.3, chroma: 4, decay: 0.6 },
  { t: 68.0, shake: 8, flash: 0.3, chroma: 4, decay: 0.6 },
  { t: 77.2, shake: 12, flash: 0.0, chroma: 16, decay: 0.5 },
  { t: 80.0, shake: 8, flash: 0.3, chroma: 4, decay: 0.6 },
  { t: 84.0, shake: 16, flash: 0.6, chroma: 8, decay: 0.8 },
  { t: 88.0, shake: 26, flash: 1, chroma: 12, decay: 1.6 },
];

// Sound design cue sheet (rendered by audio.js)
const SFX = [
  { t: 0.3, type: 'boom', gain: 0.9 },
  ...[4.6, 5.1, 5.6, 6.1, 6.6].map((t) => ({ t, type: 'tick', gain: 0.5 })),
  { t: 7.0, type: 'whoosh', dur: 1.0, gain: 0.6 },
  { t: 7.5, type: 'hit', gain: 0.7 },
  ...[9.5, 11.0, 12.5, 14.0, 15.0, 16.0].map((t, i) => ({ t, type: 'glitch', gain: 0.55 + i * 0.05 })),
  { t: 13.0, type: 'riser', dur: 6.0, gain: 0.8 },
  { t: 16.8, type: 'suck', dur: 2.2, gain: 0.8 },
  { t: 19.0, type: 'braam', gain: 1.0 },
  { t: 19.0, type: 'boom', gain: 1.0 },
  ...[19.2, 19.28, 19.36, 19.44, 19.52, 19.6, 19.68, 19.76, 19.84, 19.92, 20.0].map((t) => ({ t, type: 'slam', gain: 0.35 })),
  { t: 21.0, type: 'shimmer', gain: 0.5 },
  { t: 27.0, type: 'whoosh', dur: 1.0, gain: 0.8 },
  { t: 28.0, type: 'hit', gain: 0.9 },
  ...GATE_PASS.map((t) => ({ t: t - 0.45, type: 'whoosh', dur: 0.6, gain: 0.7 })),
  ...GATE_PASS.map((t) => ({ t, type: 'gate', gain: 0.85 })),
  { t: 42.5, type: 'riser', dur: 1.5, gain: 0.5 },
  { t: 44.0, type: 'hit', gain: 0.8 },
  ...[45.3, 48.4, 48.9, 49.4, 49.9].map((t) => ({ t, type: 'confirm', gain: 0.5 })),
  { t: 45.8, type: 'alarm', gain: 0.8 },
  { t: 45.8, type: 'boom', gain: 0.7 },
  { t: 49.4, type: 'warn', gain: 0.5 },
  ...[50.3, 50.7, 51.1, 51.5, 51.9, 52.3, 52.7, 53.1].map((t) => ({ t, type: 'tick', gain: 0.55 })),
  { t: 53.5, type: 'whoosh', dur: 0.8, gain: 0.5 },
  { t: 54.0, type: 'hit', gain: 0.6 },
  ...[55.0, 55.4, 55.8, 56.2, 56.6, 57.0].map((t) => ({ t, type: 'tick', gain: 0.45 })),
  { t: 57.4, type: 'whoosh', dur: 0.6, gain: 0.7 },
  { t: 58.0, type: 'hit', gain: 0.8 },
  ...[58.5, 60.5, 62.5].map((t) => ({ t, type: 'orb', gain: 0.7 })),
  { t: 64.5, type: 'shimmer', gain: 0.6 },
  { t: 67.4, type: 'whoosh', dur: 0.6, gain: 0.7 },
  { t: 68.0, type: 'hit', gain: 0.8 },
  ...[69.2, 70.0, 70.8].map((t) => ({ t, type: 'pop', gain: 0.6 })),
  { t: 72.0, type: 'whoosh', dur: 0.6, gain: 0.6 },
  ...[73.0, 73.6, 74.2].map((t) => ({ t, type: 'type', dur: 0.5, gain: 0.4 })),
  { t: 76.4, type: 'confirm', gain: 0.6 },
  { t: 77.2, type: 'powerdown', gain: 0.8 },
  { t: 78.4, type: 'powerup', gain: 0.7 },
  { t: 79.4, type: 'whoosh', dur: 0.6, gain: 0.7 },
  { t: 80.0, type: 'hit', gain: 0.8 },
  ...[80.4, 80.6, 80.8, 81.0, 81.2, 81.4].map((t) => ({ t, type: 'slam', gain: 0.4 })),
  { t: 82.0, type: 'riser', dur: 2.0, gain: 0.6 },
  { t: 84.0, type: 'lock', gain: 0.9 },
  { t: 84.0, type: 'boom', gain: 0.7 },
  ...[84.6, 85.2, 85.8, 86.4].map((t) => ({ t, type: 'pop', gain: 0.45 })),
  { t: 86.5, type: 'riser', dur: 1.5, gain: 0.8 },
  { t: 88.0, type: 'braam', gain: 1.0 },
  { t: 88.0, type: 'boom', gain: 1.0 },
  { t: 91.8, type: 'shimmer', gain: 0.5 },
  { t: 93.5, type: 'hit', gain: 0.5 },
  { t: 95.5, type: 'tail', gain: 0.6 },
];

module.exports = { FPS, DURATION, W, H, SCENES, GATE_PASS, SUBS, IMPULSES, SFX };
