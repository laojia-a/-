// 后期预设：在场景里写 post: P.cyber 或 post: { ...P.paper, sat: .8 }
export const P = {
  cyber:   { bloom: .85, thr: .62, ca: .0022, vig: .5,  grain: .035, tint: [.96, 1.02, 1.06] },   // AI 视角 / 未来 / HUD
  archive: { bloom: .42, thr: .80, ca: .0024, vig: .55, grain: .06,  tint: [1.02, .98, 1.02], sat: .92, con: 1.05 }, // 归档影像 / 回忆
  paper:   { bloom: .12, thr: .93, ca: .0016, vig: .62, grain: .06,  tint: [1.06, 1, .88], sat: .95 },  // 文献 / 羊皮纸（亮底必须高阈值）
  bw:      { bloom: .16, thr: .93, ca: .0016, vig: .6,  grain: .10,  sat: 0, con: 1.08 },              // 黑白档案
  warm:    { bloom: .45, thr: .80, ca: .0016, vig: .66, grain: .055, tint: [1.08, 1, .86], sat: .9 },  // 人物 / 温情 / 结尾
  ui:      { bloom: .5,  thr: .76, ca: .0016, vig: .5,  grain: .036 },                                  // 卡片 / 时间轴 / 信息图
  climax:  { bloom: .95, thr: .58, ca: .0024, vig: .5,  grain: .035, tint: [.96, 1.02, 1.08] },        // 高潮
};
// 转场语义：black=时代/章节跳跃  cross=同一时空内连续  white=意识/视角切换  glitch=信息冲击、进入非真实
