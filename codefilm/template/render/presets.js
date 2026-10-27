// 后期预设。用法：post: P.hollywood  或  post: { ...P.hbo, sat: .7 }  或  post: (S) => mixP(P.hbo, P.climax, k)
// 参数含义见 references/CINEMATIC.md
export const P = {
  // ---- 电影级 ----
  hollywood: { // 大片：青橙分离、胶片影调、变形宽银幕光条、2.39 遮幅、轻微胶片晕
    bloom: .55, thr: .7, ca: .0012, vig: .42, grain: .03, grainSize: 1.6, sat: 1.05, con: 1.08,
    filmic: .85, split: .55, shadowTint: [-.03, .015, .05], highTint: [.06, .02, -.035],
    streak: .55, streakTint: [.5, .78, 1.25], halation: .18, bars: 2.39, weave: .5, black: .012,
    soft: .5, chromaVig: .6, grainChroma: .25, flicker: .2,
  },
  hbo: { // 高端剧集：低调光、去饱和、偏冷暗部、抬升黑位、克制泛光、细颗粒、2.0 遮幅
    bloom: .22, thr: .85, ca: .0008, vig: .55, grain: .045, grainSize: 1.4, sat: .78, con: 1.02,
    filmic: .9, split: .35, shadowTint: [-.015, .01, .03], highTint: [.03, .02, -.01],
    streak: 0, halation: .1, bars: 2.0, weave: .3, black: .028, tint: [1, .99, .97],
    soft: .6, chromaVig: .8, grainChroma: .35, flicker: .15,
  },
  bleach: { // 漂白：战争片 / 惊悚（《拯救大兵瑞恩》式）——低饱和、高反差、金属感高光
    bloom: .3, thr: .8, ca: .001, vig: .58, grain: .06, grainSize: 1.7, sat: .55, con: 1.12, filmic: .85, bleach: .7,
    split: .25, halation: .08, bars: 2.39, weave: .5, black: .02, soft: .5, chromaVig: .5, grainChroma: .2, flicker: .25,
  },
  dream: { // 回忆 / 梦境：漏光、柔光、偏暖、低对比
    bloom: .7, thr: .6, ca: .0016, vig: .5, grain: .05, grainSize: 1.8, sat: .9, con: .94, filmic: .85, leak: .35,
    split: .3, highTint: [.06, .03, -.02], halation: .3, bars: 2.0, weave: .7, black: .035, soft: .8, flicker: .35, grainChroma: .4,
  },
  noir: { // 冷峻黑白剧集 / 回忆
    bloom: .2, thr: .86, ca: .0008, vig: .62, grain: .07, grainSize: 1.8, sat: 0, con: 1.12, filmic: .9, halation: .12, bars: 2.0, weave: .6, black: .03,
  },
  trailer: { // 预告片高潮：更强光条与泛光
    bloom: .9, thr: .58, ca: .0018, vig: .45, grain: .03, grainSize: 1.6, sat: 1.08, con: 1.1,
    filmic: .8, split: .6, streak: .9, streakTint: [.45, .75, 1.3], halation: .25, bars: 2.39, weave: .4, black: .01,
  },
  // ---- 风格化（《监查者》原有）----
  cyber:   { bloom: .85, thr: .62, ca: .0022, vig: .5,  grain: .035, tint: [.96, 1.02, 1.06] },
  archive: { bloom: .42, thr: .80, ca: .0024, vig: .55, grain: .06,  tint: [1.02, .98, 1.02], sat: .92, con: 1.05 },
  paper:   { bloom: .12, thr: .93, ca: .0016, vig: .62, grain: .06,  tint: [1.06, 1, .88], sat: .95 },
  bw:      { bloom: .16, thr: .93, ca: .0016, vig: .6,  grain: .10,  sat: 0, con: 1.08 },
  warm:    { bloom: .45, thr: .80, ca: .0016, vig: .66, grain: .055, tint: [1.08, 1, .86], sat: .9 },
  ui:      { bloom: .5,  thr: .76, ca: .0016, vig: .5,  grain: .036 },
  climax:  { bloom: .95, thr: .58, ca: .0024, vig: .5,  grain: .035, tint: [.96, 1.02, 1.08] },
};
// 质感参数速查：soft 镜头边缘柔化 · chromaVig 边缘偏冷 · grainChroma 彩色颗粒 · flicker 曝光闪烁 · leak/leakTint 漏光 · bleach 漂白
// dither 默认 1（消除暗部色带，勿关）。运动模糊在渲染时开：CODEFILM_MOTION_BLUR=4（耗时 ×4）
// 两个预设之间插值（用于同一场景内情绪渐变）
export function mixP(a, b, k) {
  const o = {}; const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const x = a[key], y = b[key];
    if (x === undefined) o[key] = y; else if (y === undefined) o[key] = x;
    else if (Array.isArray(x)) o[key] = x.map((v, i) => v + (y[i] - v) * k);
    else o[key] = x + (y - x) * k;
  }
  return o;
}
// 转场语义：black=时代/章节跳跃  cross=同一时空连续  white=视角/意识切换  glitch=信息冲击、进入非真实
