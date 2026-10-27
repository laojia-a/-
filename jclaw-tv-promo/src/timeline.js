// Single source of truth: format, scene boundaries, subtitles, camera impulses, motion-blur ranges and key moments.
// Everything sits on a 120 BPM grid (1 beat = 0.5 s, 1 bar = 2 s).
const W = 1920, H = 1080, FPS = 30;
const BPM = 120, BEAT = 60 / BPM, BAR = BEAT * 4;
const DURATION = 160;

const SCENES = [
  { id: 'cold', start: 0, end: 10 },
  { id: 'storm', start: 10, end: 24 },
  { id: 'title', start: 24, end: 36 },
  { id: 'ch1', start: 36, end: 52 },
  { id: 'ch2', start: 52, end: 66 },
  { id: 'ch3', start: 66, end: 88 },
  { id: 'ch4', start: 88, end: 104 },
  { id: 'ch5', start: 104, end: 120 },
  { id: 'special', start: 120, end: 134 },
  { id: 'finale', start: 134, end: 160 },
];

// Key moments shared by picture and sound.
const K = {
  ledOn: 1.0,
  powerOn: 3.0,
  stormStart: 10.0,
  crash: 22.0,
  knob: 23.0,
  hero: 24.0,
  titleSlam: 28.0,
  dive: 35.0,
  ch1: 36.0,
  ch2: 52.0,
  ch3: 66.0,
  ciLock: 82.0,
  ch4: 88.0,
  ch4Lock: 89.5,
  ch5: 104.0,
  accept: 116.0,
  special: 120.0,
  flip: 134.0,
  pullOut: 137.0,
  beams: 142.0,
  finalTitle: 149.0,
  powerOff: 156.5,
};

// [start, end, zh, en]
const SUBS = [
  [1.8, 5.4, '每一项临床研究，都从无数件小事开始。', 'Every clinical study starts with countless small tasks.'],
  [5.8, 9.6, '算合同、估物资、排培训、跑数据、盯节点。', 'Contracts, supplies, training, data runs, milestones.'],
  [11.0, 14.6, '工具散落在几十个标签页、表格和文件夹里。', 'Scattered across dozens of tabs, sheets and folders.'],
  [15.2, 19.4, '每切换一次，就丢掉一点注意力。', 'Every switch costs a little more focus.'],
  [22.4, 25.4, '如果，只要转一下旋钮？', 'What if you only had to turn a dial?'],
  [31.0, 35.0, '每个频道，都是一件真实的工具。', 'Every channel is a real working tool.'],
  [37.4, 41.2, 'CH01 临床工具集：日常计算，一站完成。', 'CH01 Clinical Toolkit: everyday calculations in one place.'],
  [41.6, 45.4, '合同分期与中文大写、物资用量、BE 例数估算。', 'Instalments in Chinese capitals, supply counts, BE sample sizes.'],
  [45.8, 49.4, '高脂餐按 ICH M13A 核对，CTCAE 与 MedDRA 随手可查。', 'High-fat meals checked against ICH M13A; CTCAE and MedDRA at hand.'],
  [49.6, 51.8, '本地计算，云端同步。', 'Computed locally, synced through Cloudflare.'],
  [53.2, 56.8, 'CH02 临研知视：把法规与 SOP 做成可学的课程。', 'CH02 Clinical Vision: regulations and SOPs become courses.'],
  [57.0, 60.6, '课程编排、学习顺序、参与人员，一次发布。', 'Courses, learning order and learners, published in one step.'],
  [60.8, 65.6, '课程版本固定，学习进度逐条保存、只增不减。', 'Versions are pinned; progress is saved event by event and never goes back.'],
  [66.9, 69.8, 'CH03 BE Workbench：本地优先的 PK/BE 工作台。', 'CH03 BE Workbench: a local-first PK/BE workbench.'],
  [70.0, 72.9, '随机表与浓度数据：识别、确认、匹配、QC。', 'Randomisation and concentrations: detect, confirm, match, QC.'],
  [73.4, 77.2, '未修约数值参与计算，NCA 一步到位。', 'Unrounded values drive the maths, straight through NCA.'],
  [77.8, 81.6, 'ABE / RSABE 逐终点计算，给出 90% 置信区间。', 'ABE / RSABE per endpoint, with 90% confidence intervals.'],
  [82.4, 85.0, '每一步，都能追溯到来源。', 'Every step traces back to its source.'],
  [85.2, 87.8, 'Observed、Simulated、Combined，身份始终分开。', 'Observed, Simulated and Combined are never mixed.'],
  [90.0, 93.8, 'CH04 EZCTD：临床 CRO 的本机 PDF 工作台。', 'CH04 EZCTD: a local PDF workbench for clinical CROs.'],
  [94.2, 98.0, '模块 5、2.5、2.7：阅读、检索、定位、批量扫描。', 'Modules 5, 2.5 and 2.7: read, search, locate, batch-scan.'],
  [98.2, 103.6, '修改只进独立副本，原文件不动，留下复验证据。', 'Changes go to separate copies; originals stay untouched, with re-check evidence.'],
  [105.0, 108.8, 'CH05 BE Solo：个人临床项目台。', 'CH05 BE Solo: a personal clinical project desk.'],
  [109.2, 112.8, '项目节点、Issue、To-do、排期，一屏掌握。', 'Milestones, issues, to-dos and schedules on one screen.'],
  [113.2, 119.0, 'BE 助手只起草，不落库。接受与否，由你决定。', 'The assistant only drafts. Accepting it is your call.'],
  [121.4, 125.2, '特别节目 BE CSR Review：BE 报告审核 Skill。', 'Special: BE CSR Review, a review Skill for BE reports.'],
  [125.6, 129.6, '六道关口，表格逐格核对，矛盾定位到行和列。', 'Six gates; tables checked cell by cell; conflicts pinned to row and column.'],
  [129.8, 133.6, '辅助审核，不替代专业判断。', 'It assists review; it does not replace professional judgement.'],
  [137.6, 141.4, '一台电视，一个入口。', 'One TV. One entrance.'],
  [142.2, 147.6, '点一下屏幕，直接进入真实工具。', 'Click the screen and you are in the real tool.'],
];

// Camera impulses: t, decay (s), shake (px), flash (0..1), chroma (px)
const IMPULSES = [
  { t: K.powerOn, decay: 0.5, flash: 0.35 },
  { t: K.crash, decay: 0.9, shake: 26, flash: 0.9, chroma: 7 },
  { t: K.hero, decay: 1.2, shake: 10, flash: 0.5, chroma: 3 },
  { t: K.titleSlam, decay: 0.8, shake: 12, flash: 0.45, chroma: 4 },
  { t: K.ch1, decay: 0.4, chroma: 5 },
  { t: K.ch2, decay: 0.4, chroma: 5 },
  { t: K.ch3, decay: 0.5, shake: 6, chroma: 6 },
  { t: 73.0, decay: 0.5, shake: 5, flash: 0.15 },
  { t: K.ciLock, decay: 1.2, shake: 18, flash: 0.6, chroma: 5 },
  { t: K.ch4, decay: 0.4, chroma: 6 },
  { t: K.ch4Lock, decay: 0.6, shake: 6, flash: 0.35, chroma: 4 },
  { t: K.ch5, decay: 0.4, chroma: 5 },
  { t: K.accept, decay: 0.5, flash: 0.12 },
  { t: K.special, decay: 0.7, shake: 10, flash: 0.4, chroma: 6 },
  { t: K.pullOut, decay: 0.8, shake: 6, flash: 0.2 },
  { t: K.finalTitle, decay: 1.3, shake: 14, flash: 0.55, chroma: 3 },
];

// Motion blur (sub-frames per frame) for fast camera moves.
const MOTION_BLUR = [
  [12.0, 22.2, 3],
  [24.0, 25.0, 3],
  [26.3, 28.0, 3],
  [66.0, 67.2, 3],
  [73.0, 77.0, 3],
  [134.0, 142.0, 3],
];

module.exports = { W, H, FPS, BPM, BEAT, BAR, DURATION, SCENES, K, SUBS, IMPULSES, MOTION_BLUR };

if (require.main === module) process.stdout.write(JSON.stringify(module.exports, null, 1));
