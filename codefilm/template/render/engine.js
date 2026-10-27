// 《监查者》渲染引擎：Canvas2D + three.js 合成 + 电影感后期（泛光/色差/颗粒/暗角/调色/故障）
// 所有动画均为时间 t 的纯函数 —— 任意帧可独立、确定地渲染（便于多进程并行）。
import * as THREE from 'three';

export const W = 1920, H = 1080;
export const E = { brand: '支线进行中', W, H, fps: 30, scenes: {}, order: [], trans: {}, tl: null, THREE };

// ---------------------------------------------------------------- 数学 / 缓动
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const p = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const smoother = (t) => { t = clamp(t); return t * t * t * (t * (t * 6 - 15) + 10); };
export const eIn = (t) => { t = clamp(t); return t * t * t; };
export const eOut = (t) => { t = clamp(t); return 1 - Math.pow(1 - t, 3); };
export const eInOut = (t) => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const eOutExpo = (t) => { t = clamp(t); return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); };
export const eInExpo = (t) => { t = clamp(t); return t === 0 ? 0 : Math.pow(2, 10 * t - 10); };
export const eInOutExpo = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return t < .5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2; };
export const eOutBack = (t, s = 1.7) => { t = clamp(t); const c3 = s + 1; return 1 + c3 * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const eOutElastic = (t) => { t = clamp(t); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1; };
// 包络：a 处淡入（fi 秒），b 处淡出（fo 秒）
export const env = (t, a, b, fi = .4, fo = .4) => Math.min(smooth(p(t, a, a + fi)), 1 - smooth(p(t, b - fo, b)));
export const TAU = Math.PI * 2;

export function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const ihash = (i) => { let x = (i | 0) ^ 0x9e3779b9; x = Math.imul(x ^ (x >>> 16), 0x85ebca6b); x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
export const hash1 = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const hash2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
export function noise1(x) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash1(i), hash1(i + 1), u) * 2 - 1; }
export function noise2(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy), b = hash2(ix + 1, iy), c = hash2(ix, iy + 1), d = hash2(ix + 1, iy + 1);
  return (lerp(lerp(a, b, ux), lerp(c, d, ux), uy)) * 2 - 1;
}
export function fbm(x, y, o = 4) { let v = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { v += a * noise2(x * f, y * f); f *= 2; a *= .5; } return v; }
export const fmt = (n) => Math.round(n).toLocaleString('en-US');

// 颜色
export const C = {
  bg: '#04070e', cyan: '#3ee6ff', cyanD: '#0a84ff', amber: '#ffb347', amberD: '#ff8a2a', red: '#ff3b5c',
  paper: '#ebe2cc', ink: '#231c15', white: '#ffffff', grey: '#8a96a8', green: '#46f2a0', gold: '#ffd66b',
};
export function rgba(hex, a = 1) {
  const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
export function mixHex(h1, h2, t) {
  const a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
  const r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t)), g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t)), bl = Math.round(lerp(a & 255, b & 255, t));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
}

// ---------------------------------------------------------------- 字体
const FONTS = [
  ['SHSerif', 'SourceHanSerifCN-ExtraLight.otf', '200'], ['SHSerif', 'SourceHanSerifCN-Light.otf', '300'],
  ['SHSerif', 'SourceHanSerifCN-Regular.otf', '400'], ['SHSerif', 'SourceHanSerifCN-Medium.otf', '500'],
  ['SHSerif', 'SourceHanSerifCN-SemiBold.otf', '600'], ['SHSerif', 'SourceHanSerifCN-Bold.otf', '700'],
  ['SHSerif', 'SourceHanSerifCN-Heavy.otf', '900'],
  ['SHSans', 'SourceHanSansCN-ExtraLight.otf', '200'], ['SHSans', 'SourceHanSansCN-Light.otf', '300'],
  ['SHSans', 'SourceHanSansCN-Regular.otf', '400'], ['SHSans', 'SourceHanSansCN-Medium.otf', '500'],
  ['SHSans', 'SourceHanSansCN-Bold.otf', '700'], ['SHSans', 'SourceHanSansCN-Heavy.otf', '900'],
  ['JB', 'JetBrainsMono-Light.ttf', '300'], ['JB', 'JetBrainsMono-Regular.ttf', '400'], ['JB', 'JetBrainsMono-Medium.ttf', '500'],
  ['JB', 'JetBrainsMono-Bold.ttf', '700'], ['JB', 'JetBrainsMono-ExtraBold.ttf', '800'],
  ['Pixel', 'FusionPixel-zh_hans.woff2', '400'], ['WenKai', 'LXGWWenKai-Regular.ttf', '400'], ['WenKai', 'LXGWWenKai-Medium.ttf', '500'],
  ['MaoCao', 'LiuJianMaoCao-Regular.ttf', '400'], ['MaShan', 'MaShanZheng-Regular.ttf', '400'],
  ['IMFell', 'IMFellEnglish-Regular.ttf', '400', 'normal'], ['IMFell', 'IMFellEnglish-Italic.ttf', '400', 'italic'],
  ['Elite', 'SpecialElite-Regular.ttf', '400'], ['Cinzel', 'Cinzel.ttf', '400 900'], ['Orbitron', 'Orbitron.ttf', '400 900'],
  ['ShareTech', 'ShareTechMono-Regular.ttf', '400'], ['Smiley', 'SmileySans-Oblique.ttf', '400'],
];
async function loadFonts() {
  await Promise.all(FONTS.map(async ([fam, file, weight, style]) => {
    const ff = new FontFace(fam, `url(/fonts/${file})`, { weight, style: style || 'normal' });
    await ff.load(); document.fonts.add(ff);
  }));
  // 预热：确保 canvas 能取到字形
  const c = document.createElement('canvas').getContext('2d');
  for (const [fam, , w, st] of FONTS) { c.font = `${st === 'italic' ? 'italic ' : ''}${w.split(' ')[0]} 40px ${fam}`; c.fillText('监查者ARGUS 2047', 0, 40); }
}

// ---------------------------------------------------------------- 画布
function mk(w = W, h = H) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; return cv; }
export const mkCanvas = mk;
const bgCv = mk(), fgCv = mk(), ovCv = mk();
const bg = bgCv.getContext('2d'), fg = fgCv.getContext('2d'), ov = ovCv.getContext('2d');

// ---------------------------------------------------------------- three.js 管线
let R, cam2, quad, sceneQ, rt3d, rtA, rtB, rtMix, rtH1, rtH2, rtQ1, rtQ2, rtS1, rtS2, texBg, texFg, texOv;
let matComp, matMix, matThresh, matBlur, matFinal;
const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function makeRT(w, h, opt = {}) {
  return new THREE.WebGLRenderTarget(w, h, Object.assign({ minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, type: THREE.UnsignedByteType }, opt));
}
function canvasTex(cv, premul = false) {
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = false;
  t.colorSpace = THREE.NoColorSpace; t.premultiplyAlpha = premul; return t;
}
function initGL() {
  THREE.ColorManagement.enabled = false;
  R = new THREE.WebGLRenderer({ canvas: document.getElementById('out'), antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  R.setPixelRatio(1); R.setSize(W, H, false); R.outputColorSpace = THREE.LinearSRGBColorSpace; R.autoClear = true;
  cam2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  sceneQ = new THREE.Scene(); quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); quad.frustumCulled = false; sceneQ.add(quad);
  rt3d = makeRT(W, H, { depthBuffer: true, samples: 4 });
  rtA = makeRT(W, H); rtB = makeRT(W, H); rtMix = makeRT(W, H);
  rtH1 = makeRT(480, 270); rtH2 = makeRT(480, 270); rtQ1 = makeRT(240, 135); rtQ2 = makeRT(240, 135); rtS1 = makeRT(480, 270); rtS2 = makeRT(480, 270);
  texBg = canvasTex(bgCv); texFg = canvasTex(fgCv, true); texOv = canvasTex(ovCv, true);
  matComp = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tBg: { value: texBg }, t3d: { value: rt3d.texture }, tFg: { value: texFg }, uHas3d: { value: 0 }, uHasFg: { value: 0 }, u3dMode: { value: 0 } },
    fragmentShader: `uniform sampler2D tBg,t3d,tFg; uniform float uHas3d,uHasFg,u3dMode; varying vec2 vUv;
    void main(){ vec3 col = texture2D(tBg, vUv).rgb;
      if(uHas3d>0.5){ vec4 c3 = texture2D(t3d, vUv); col = u3dMode>0.5 ? col + c3.rgb : mix(col, c3.rgb/max(c3.a,1e-4), clamp(c3.a,0.,1.)); }
      if(uHasFg>0.5){ vec4 f = texture2D(tFg, vUv); col = col*(1.0-f.a) + f.rgb; }
      gl_FragColor = vec4(col,1.0); }` });
  matMix = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tA: { value: rtA.texture }, tB: { value: rtB.texture }, uMix: { value: 0 } },
    fragmentShader: `uniform sampler2D tA,tB; uniform float uMix; varying vec2 vUv; void main(){ gl_FragColor = vec4(mix(texture2D(tA,vUv).rgb, texture2D(tB,vUv).rgb, uMix),1.0); }` });
  matThresh = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, uThr: { value: .7 }, uTexel: { value: new THREE.Vector2(1 / W, 1 / H) } },
    fragmentShader: `uniform sampler2D tSrc; uniform float uThr; uniform vec2 uTexel; varying vec2 vUv;
    vec3 f(vec2 o){ vec3 c = texture2D(tSrc, vUv + o*uTexel).rgb; float l = max(max(c.r,c.g),c.b); return c * smoothstep(uThr, uThr+0.25, l); }
    void main(){ vec3 c = f(vec2(-1.,-1.))+f(vec2(1.,-1.))+f(vec2(-1.,1.))+f(vec2(1.,1.)); gl_FragColor = vec4(c*0.25,1.0); }` });
  matBlur = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false, uniforms: { tSrc: { value: null }, uDir: { value: new THREE.Vector2(1 / 480, 0) } },
    fragmentShader: `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tSrc,vUv).rgb*0.2270270270;
      c += (texture2D(tSrc,vUv+uDir*1.3846153846).rgb + texture2D(tSrc,vUv-uDir*1.3846153846).rgb)*0.3162162162;
      c += (texture2D(tSrc,vUv+uDir*3.2307692308).rgb + texture2D(tSrc,vUv-uDir*3.2307692308).rgb)*0.0702702703;
      gl_FragColor = vec4(c,1.0); }` });
  matFinal = new THREE.ShaderMaterial({ vertexShader: VS, depthTest: false, depthWrite: false,
    uniforms: { tComp: { value: null }, tB1: { value: rtH2.texture }, tB2: { value: rtQ2.texture }, tOv: { value: texOv }, uHasOv: { value: 0 },
      uBloom: { value: .6 }, uCA: { value: .002 }, uVig: { value: .35 }, uGrain: { value: .04 }, uTime: { value: 0 }, uFade: { value: 0 }, uFlash: { value: 0 },
      uGlitch: { value: 0 }, uSat: { value: 1 }, uCon: { value: 1 }, uExp: { value: 1 }, uScan: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
      uLift: { value: new THREE.Vector3(0, 0, 0) }, uWarp: { value: 0 },
      tStreak: { value: rtS2.texture }, uStreak: { value: 0 }, uStreakTint: { value: new THREE.Vector3(.55, .8, 1.2) }, uFilmic: { value: 0 }, uSplit: { value: 0 }, uShadowTint: { value: new THREE.Vector3(-.02, .01, .04) }, uHighTint: { value: new THREE.Vector3(.05, .015, -.03) },
      uHalation: { value: 0 }, uBars: { value: 0 }, uWeave: { value: 0 }, uBlack: { value: 0 }, uGrainSize: { value: 1 },
      uFlicker: { value: 0 }, uLeak: { value: 0 }, uLeakTint: { value: new THREE.Vector3(1, .45, .15) }, uBleach: { value: 0 }, uSoft: { value: 0 }, uChromaVig: { value: 0 }, uDither: { value: 1 }, uGrainChroma: { value: 0 } },
    fragmentShader: `uniform sampler2D tComp,tB1,tB2,tOv,tStreak; uniform float uHasOv,uBloom,uCA,uVig,uGrain,uTime,uFade,uFlash,uGlitch,uSat,uCon,uExp,uScan,uWarp,uStreak,uFilmic,uSplit,uHalation,uBars,uWeave,uBlack,uGrainSize,uFlicker,uLeak,uBleach,uSoft,uChromaVig,uDither,uGrainChroma; uniform vec3 uTint,uLift,uStreakTint,uShadowTint,uHighTint,uLeakTint; varying vec2 vUv;
    vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); }
    float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
    void main(){
      vec2 uv = vUv; float fr = floor(uTime*24.0);
      if(uWeave>0.0){ uv += vec2(sin(fr*1.7)*0.6+sin(fr*0.37)*0.4, sin(fr*1.3+2.0)*0.5)*uWeave*0.0012; }
      if(uWarp>0.0){ vec2 d0 = uv-0.5; uv = 0.5 + d0*(1.0 - uWarp*dot(d0,d0)); }
      if(uGlitch>0.0){ float band = floor(uv.y*36.0); float r = h(vec2(band, fr));
        if(r < uGlitch*0.55){ uv.x += (h(vec2(band*1.7, fr+3.0))-0.5)*0.12*uGlitch; }
        float blk = h(vec2(floor(uv.y*9.0), fr*1.3)); if(blk < uGlitch*0.18) uv.y += (h(vec2(fr,blk))-0.5)*0.04; }
      vec2 d = uv-0.5; float ca = uCA*(1.0+uGlitch*8.0);
      vec3 col; col.r = texture2D(tComp, uv + d*ca).r; col.g = texture2D(tComp, uv).g; col.b = texture2D(tComp, uv - d*ca).b;
      vec3 bl = texture2D(tB1, uv).rgb*1.0 + texture2D(tB2, uv).rgb*1.2;
      col += bl * uBloom;
      if(uHalation>0.0) col += texture2D(tB2, uv).rgb * vec3(1.0,0.32,0.12) * uHalation;   // 胶片晕：高光边缘的红橙光
      if(uStreak>0.0) col += texture2D(tStreak, uv).rgb * uStreakTint * uStreak;          // 变形宽银幕横向光条
      if(uSoft>0.0){ float e = smoothstep(0.25, 0.75, length(d*vec2(1.0,0.75))); col = mix(col, (col + texture2D(tComp, uv + d*0.004).rgb + texture2D(tComp, uv - d*0.004).rgb)/3.0, e*uSoft); } // 镜头边缘柔化
      col *= uExp; col = col*uTint + uLift;
      if(uFlicker>0.0) col *= 1.0 + (h(vec2(fr, 3.1)) - 0.5) * 0.06 * uFlicker;              // 曝光闪烁（老胶片/放映机）
      if(uBleach>0.0){ float lb = dot(col, vec3(0.299,0.587,0.114)); vec3 ov = mix(2.0*col*lb, 1.0-2.0*(1.0-col)*(1.0-lb), step(0.5, lb)); col = mix(col, mix(vec3(lb), ov, 0.6), uBleach); } // 漂白（战争片/惊悚）
      if(uFilmic>0.0) col = mix(col, aces(col*1.35), uFilmic);                                 // 胶片影调：高光柔和滚降
      if(uSplit>0.0){ float lu = dot(col, vec3(0.299,0.587,0.114)); col += (uShadowTint*(1.0-smoothstep(0.0,0.55,lu)) + uHighTint*smoothstep(0.35,1.0,lu))*uSplit*2.0; } // 分离色调（青橙）
      if(uLeak>0.0){ vec2 lp = vec2(-0.15 + 0.25*sin(uTime*0.13), 0.75 + 0.2*sin(uTime*0.21)); float lk = exp(-3.0*length((vUv - lp)*vec2(1.4,1.0))); col += uLeakTint * lk * uLeak * (0.8 + 0.2*sin(uTime*0.7)); } // 漏光
      if(uChromaVig>0.0){ float cv = smoothstep(0.35, 1.0, length(d*vec2(1.0,0.86))*1.6); col.b += cv*0.04*uChromaVig; col.r -= cv*0.02*uChromaVig; } // 边缘偏冷
      col = max(col, vec3(uBlack));                                                            // 黑位抬升（HBO 式不死黑）
      float l = dot(col, vec3(0.299,0.587,0.114)); col = mix(vec3(l), col, uSat); col = (col-0.5)*uCon+0.5;
      float v = smoothstep(0.95, 0.15, length(d*vec2(1.0,0.86))); col *= mix(1.0-uVig, 1.0, v);
      if(uScan>0.0) col *= 1.0 - uScan*(0.5+0.5*sin(vUv.y*1080.0*3.14159265));
      float g = h(floor(vUv*vec2(1920.0,1080.0)/uGrainSize) + vec2(fract(uTime*7.31)*91.0, fract(uTime*3.17)*57.0)) - 0.5;
      vec3 gc = vec3(g); if(uGrainChroma>0.0){ gc += vec3(h(vUv*vec2(1913.0,1077.0)+fr*0.37)-0.5, 0.0, h(vUv*vec2(1931.0,1069.0)+fr*0.53)-0.5)*uGrainChroma; }
      col += gc*uGrain*(1.2 - l*0.6);
      col += (h(vUv*vec2(1920.0,1080.0) + fract(uTime*13.7)) - 0.5) * uDither / 255.0;      // 抖动：消除暗部渐变色带
      col = mix(col, vec3(1.0), uFlash); col *= (1.0-uFade);
      if(uBars>0.0){ float bh = 0.5 - 0.5*(16.0/9.0)/uBars; if(vUv.y < bh || vUv.y > 1.0-bh) col = vec3(0.0); }   // 遮幅（如 2.39:1）
      if(uHasOv>0.5){ vec4 o = texture2D(tOv, vUv); col = col*(1.0-o.a) + o.rgb; }
      gl_FragColor = vec4(clamp(col,0.0,1.0),1.0); }` });
}
function pass(mat, target) { quad.material = mat; R.setRenderTarget(target); R.render(sceneQ, cam2); }

// ---------------------------------------------------------------- 场景注册 / 时间轴
const DEFAULT_POST = () => ({ bloom: .45, thr: .78, ca: .0016, vig: .38, grain: .038, fade: 0, flash: 0, glitch: 0, sat: 1, con: 1, exp: 1, scan: 0, tint: [1, 1, 1], lift: [0, 0, 0], warp: 0, sub: true, mark: true,
  streak: 0, streakTint: [.55, .8, 1.2], filmic: 0, split: 0, shadowTint: [-.02, .01, .04], highTint: [.05, .015, -.03], halation: 0, bars: 0, weave: 0, black: 0, grainSize: 1,
  flicker: 0, leak: 0, leakTint: [1, .45, .15], bleach: 0, soft: 0, chromaVig: 0, dither: 1, grainChroma: 0 });
export function def(id, obj) { E.scenes[id] = obj; }
export function transition(id, spec) { E.trans[id] = spec; }

let LINES = {}, SC = [];
async function loadTimeline() {
  const tl = await (await fetch('/build/timeline.json')).json();
  E.tl = tl; E.fps = tl.fps; SC = tl.scenes;
  for (const ln of tl.lines) LINES[ln.id] = ln;
}

// 场景上下文：S
function makeS(sc, t) {
  const S = {
    id: sc.id, t, dur: sc.dur, g: sc.start + t, start: sc.start, ctx: bg, post: DEFAULT_POST(),
    W, H, THREE, used3d: false, usedFg: false, mode3d: 0,
    L(id) { const l = LINES[id]; return l ? { s: l.start - sc.start, e: l.end - sc.start, d: l.end - l.start } : { s: 0, e: 0, d: 0 }; },
    p(a, b) { return p(t, a, b); },
    get fg() { if (!this.usedFg) { fg.setTransform(1, 0, 0, 1, 0, 0); fg.clearRect(0, 0, W, H); this.usedFg = true; } return fg; },
    render3d(scene3, camera, mode = 'add', clear = [0, 0, 0, 0]) {
      R.setRenderTarget(rt3d); R.setClearColor(new THREE.Color(clear[0], clear[1], clear[2]), clear[3]); R.clear(true, true, true);
      R.render(scene3, camera); this.used3d = true; this.mode3d = mode === 'add' ? 1 : 0;
    },
    R: () => R,
  };
  return S;
}

const cache = {};
export function once(key, fn) { if (!(key in cache)) cache[key] = fn(); return cache[key]; }

function drawScene(sc, t, target) {
  const obj = E.scenes[sc.id];
  bg.setTransform(1, 0, 0, 1, 0, 0); bg.globalAlpha = 1; bg.globalCompositeOperation = 'source-over'; bg.filter = 'none';
  bg.fillStyle = (obj && obj.clear) || C.bg; bg.fillRect(0, 0, W, H);
  const S = makeS(sc, t);
  if (obj && obj.post) Object.assign(S.post, typeof obj.post === 'function' ? obj.post(S) : obj.post);
  if (obj) { bg.save(); obj.draw(S); bg.restore(); }
  else { text(bg, sc.id + '  t=' + t.toFixed(2), W / 2, H / 2, { size: 60, align: 'center', color: '#f55' }); }
  texBg.needsUpdate = true;
  if (S.usedFg) texFg.needsUpdate = true;
  matComp.uniforms.uHas3d.value = S.used3d ? 1 : 0; matComp.uniforms.u3dMode.value = S.mode3d; matComp.uniforms.uHasFg.value = S.usedFg ? 1 : 0;
  pass(matComp, target);
  return S.post;
}

function mixPost(a, b, m) {
  const o = {};
  for (const k in a) {
    if (Array.isArray(a[k])) o[k] = a[k].map((v, i) => lerp(v, b[k][i], m));
    else if (typeof a[k] === 'number') o[k] = lerp(a[k], b[k], m);
    else o[k] = m < .5 ? a[k] : b[k];
  }
  return o;
}

// ---------------------------------------------------------------- 字幕 / 角标
function drawOverlay(g, post, extra) {
  ov.setTransform(1, 0, 0, 1, 0, 0); ov.clearRect(0, 0, W, H);
  let any = false;
  if (post.mark && post.markA !== 0) {
    any = true;
    const a = .42 * (post.markA ?? 1);
    ov.save(); ov.globalAlpha = a;
    ov.fillStyle = '#fff'; ov.font = '500 25px SHSans'; ov.textBaseline = 'middle';
    // 小菱形 + 文字
    ov.translate(66, 58); ov.beginPath(); ov.moveTo(0, -9); ov.lineTo(9, 0); ov.lineTo(0, 9); ov.lineTo(-9, 0); ov.closePath();
    ov.strokeStyle = '#fff'; ov.lineWidth = 2; ov.stroke();
    ov.beginPath(); ov.arc(0, 0, 2.6, 0, TAU); ov.fill();
    ov.fillText(E.brand, 20, 1);
    ov.restore();
  }
  if (post.sub) {
    for (const ln of E.tl.lines) {
      if (g < ln.start - .15 || g > ln.end + .25) continue;
      const segs = ln.segs || [{ text: ln.sub, start: ln.start, end: ln.end }];
      for (const sg of segs) {
        if (g < sg.start - .12 || g > sg.end + .22) continue;
        const a = Math.min(smooth(p(g, sg.start - .12, sg.start + .05)), 1 - smooth(p(g, sg.end + .02, sg.end + .22)));
        if (a <= 0) continue;
        any = true;
        drawSub(sg.text, ln.spk, a, ln.sub_en);
      }
    }
  }
  texOv.needsUpdate = true;
  return any;
}
function drawSub(str, spk, a, en) {
  const lines = str.split('\n');
  const warm = spk === 'lin' || spk === 'lin2';
  const quote = spk === 'lind' || spk === 'nuremberg';
  let size = 44;
  ov.save(); ov.globalAlpha = a; ov.textAlign = 'center'; ov.textBaseline = 'alphabetic'; ov.lineJoin = 'round';
  ov.font = `500 ${size}px SHSans`;
  const maxw = Math.max(...lines.map(l => ov.measureText(l).width));
  if (maxw > 1720) { size = Math.floor(size * 1720 / maxw); ov.font = `500 ${size}px SHSans`; }
  const lh = size * 1.38; let y = subBaseline() - (lines.length - 1) * lh;
  if (en) {
    ov.font = `italic 400 33px IMFell`; const ey = y - lh * .95;
    ov.strokeStyle = 'rgba(0,0,0,.7)'; ov.lineWidth = 6; ov.strokeText(en, W / 2, ey); ov.fillStyle = '#eadfc4'; ov.fillText(en, W / 2, ey);
    ov.font = `500 ${size}px SHSans`;
  }
  for (const l of lines) {
    ov.strokeStyle = 'rgba(0,0,0,.78)'; ov.lineWidth = 7; ov.strokeText(l, W / 2, y);
    ov.fillStyle = warm ? '#ffe2b0' : quote ? '#f6ebd2' : '#ffffff'; ov.fillText(l, W / 2, y);
    y += lh;
  }
  ov.restore();
}

// ---------------------------------------------------------------- 渲染一帧
function boundaryAt(i) { // 第 i 个场景开始处的转场
  return Object.assign({ type: 'black', d: .8 }, E.trans[SC[i].id] || {});
}
export function renderFrame(f, target = null) {
  const g = f / E.fps;
  let i = SC.findIndex(s => g >= s.start && g < s.end); if (i < 0) i = SC.length - 1;
  const sc = SC[i];
  let post;
  // 判断是否处在转场窗口
  const inB = i > 0 ? boundaryAt(i) : null, outB = i < SC.length - 1 ? boundaryAt(i + 1) : null;
  const nearIn = inB && g - sc.start < inB.d / 2, nearOut = outB && sc.end - g < outB.d / 2;
  if (nearIn && inB.type === 'cross') {
    const A = SC[i - 1], m = smooth(p(g, sc.start - inB.d / 2, sc.start + inB.d / 2));
    const pa = drawScene(A, g - A.start, rtA); const pb = drawScene(sc, g - sc.start, rtB);
    matMix.uniforms.tA.value = rtA.texture; matMix.uniforms.tB.value = rtB.texture; matMix.uniforms.uMix.value = m; pass(matMix, rtMix); post = mixPost(pa, pb, m); post._src = rtMix;
  } else if (nearOut && outB.type === 'cross') {
    const B = SC[i + 1], m = smooth(p(g, sc.end - outB.d / 2, sc.end + outB.d / 2));
    const pa = drawScene(sc, g - sc.start, rtA); const pb = drawScene(B, g - B.start, rtB);
    matMix.uniforms.tA.value = rtA.texture; matMix.uniforms.tB.value = rtB.texture; matMix.uniforms.uMix.value = m; pass(matMix, rtMix); post = mixPost(pa, pb, m); post._src = rtMix;
  } else {
    post = drawScene(sc, g - sc.start, rtA); post._src = rtA;
    const fadeT = (b, k) => (b.type === 'black' || b.type === 'white') ? k : 0;
    if (nearIn) { const k = 1 - smooth(p(g, sc.start, sc.start + inB.d / 2)); if (inB.type === 'white') post.flash = Math.max(post.flash, k); else post.fade = Math.max(post.fade, fadeT(inB, k)); if (inB.type === 'glitch') post.glitch = Math.max(post.glitch, k); if (inB.type === 'flash') post.flash = Math.max(post.flash, k * .9); }
    if (nearOut) { const k = smooth(p(g, sc.end - outB.d / 2, sc.end)); if (outB.type === 'white') post.flash = Math.max(post.flash, k); else post.fade = Math.max(post.fade, fadeT(outB, k)); if (outB.type === 'glitch') post.glitch = Math.max(post.glitch, k); if (outB.type === 'flash') post.flash = Math.max(post.flash, k * .9); }
  }
  // 泛光
  matThresh.uniforms.tSrc.value = post._src.texture; matThresh.uniforms.uThr.value = post.thr; pass(matThresh, rtH1);
  matBlur.uniforms.tSrc.value = rtH1.texture; matBlur.uniforms.uDir.value.set(1 / 480, 0); pass(matBlur, rtH2);
  matBlur.uniforms.tSrc.value = rtH2.texture; matBlur.uniforms.uDir.value.set(0, 1 / 270); pass(matBlur, rtH1);
  matBlur.uniforms.tSrc.value = rtH1.texture; matBlur.uniforms.uDir.value.set(2 / 480, 0); pass(matBlur, rtH2);
  matBlur.uniforms.tSrc.value = rtH2.texture; matBlur.uniforms.uDir.value.set(0, 2 / 270); pass(matBlur, rtH1);
  // 1/8 宽光晕
  matBlur.uniforms.tSrc.value = rtH1.texture; matBlur.uniforms.uDir.value.set(1 / 240, 0); pass(matBlur, rtQ1);
  matBlur.uniforms.tSrc.value = rtQ1.texture; matBlur.uniforms.uDir.value.set(0, 1 / 135); pass(matBlur, rtQ2);
  matBlur.uniforms.tSrc.value = rtQ2.texture; matBlur.uniforms.uDir.value.set(2 / 240, 0); pass(matBlur, rtQ1);
  matBlur.uniforms.tSrc.value = rtQ1.texture; matBlur.uniforms.uDir.value.set(0, 2 / 135); pass(matBlur, rtQ2);
  // 1/4 结果拷贝回 rtH2 供最终合成
  matBlur.uniforms.tSrc.value = rtH1.texture; matBlur.uniforms.uDir.value.set(0, 0); pass(matBlur, rtH2);
  if (post.streak > 0) { // 横向超长模糊 = 变形镜头光条
    let src = rtH1;
    for (const st of [2, 6, 18, 40]) { matBlur.uniforms.tSrc.value = src.texture; matBlur.uniforms.uDir.value.set(st / 480, 0); const dst = src === rtS1 ? rtS2 : rtS1; pass(matBlur, dst); src = dst; }
    if (src !== rtS2) { matBlur.uniforms.tSrc.value = src.texture; matBlur.uniforms.uDir.value.set(0, 0); pass(matBlur, rtS2); }
  }
  E._bars = post.bars || 0;
  const hasOv = drawOverlay(g, post);
  const u = matFinal.uniforms;
  u.tComp.value = post._src.texture; u.uHasOv.value = hasOv ? 1 : 0;
  u.uBloom.value = post.bloom; u.uCA.value = post.ca; u.uVig.value = post.vig; u.uGrain.value = post.grain; u.uTime.value = g;
  u.uFade.value = clamp(post.fade); u.uFlash.value = clamp(post.flash); u.uGlitch.value = post.glitch; u.uSat.value = post.sat; u.uCon.value = post.con;
  u.uExp.value = post.exp; u.uScan.value = post.scan; u.uTint.value.set(...post.tint); u.uLift.value.set(...post.lift); u.uWarp.value = post.warp;
  setCine(u, post);
  pass(matFinal, target);
  return true;
}

// 运动模糊：在快门开启时间内渲染 n 个子帧并平均（shutter=0.5 即 180° 快门）。耗时 ×n
let rtAccA, rtAccB, rtSub;
export function renderFrameMB(f, n = 4, shutter = .5) {
  if (!rtAccA) { rtAccA = makeRT(W, H); rtAccB = makeRT(W, H); rtSub = makeRT(W, H); }
  let acc = rtAccA, other = rtAccB;
  for (let k = 0; k < n; k++) {
    renderFrame(f + (k / n - .5) * shutter, rtSub);
    matMix.uniforms.tA.value = acc.texture; matMix.uniforms.tB.value = rtSub.texture; matMix.uniforms.uMix.value = 1 / (k + 1);
    pass(matMix, other); [acc, other] = [other, acc];
  }
  matMix.uniforms.tA.value = acc.texture; matMix.uniforms.tB.value = acc.texture; matMix.uniforms.uMix.value = 0; pass(matMix, null);
  matMix.uniforms.tA.value = rtA.texture; matMix.uniforms.tB.value = rtB.texture;
  return true;
}

// 渲染单张静帧（封面等）：fn(S) 自行绘制
export function renderStill(fn, post = {}) {
  const sc = { id: '__still', start: 0, end: 10, dur: 10 };
  E.scenes['__still'] = { draw: fn, post };
  const pp = drawScene(sc, 3.0, rtA); pp._src = rtA; pp.sub = false; pp.mark = false;
  matThresh.uniforms.tSrc.value = rtA.texture; matThresh.uniforms.uThr.value = pp.thr; pass(matThresh, rtH1);
  for (const [src, dst, dx, dy] of [[rtH1, rtH2, 1 / 480, 0], [rtH2, rtH1, 0, 1 / 270], [rtH1, rtH2, 2 / 480, 0], [rtH2, rtH1, 0, 2 / 270]]) { matBlur.uniforms.tSrc.value = src.texture; matBlur.uniforms.uDir.value.set(dx, dy); pass(matBlur, dst); }
  for (const [src, dst, dx, dy] of [[rtH1, rtQ1, 1 / 240, 0], [rtQ1, rtQ2, 0, 1 / 135], [rtQ2, rtQ1, 2 / 240, 0], [rtQ1, rtQ2, 0, 2 / 135]]) { matBlur.uniforms.tSrc.value = src.texture; matBlur.uniforms.uDir.value.set(dx, dy); pass(matBlur, dst); }
  matBlur.uniforms.tSrc.value = rtH1.texture; matBlur.uniforms.uDir.value.set(0, 0); pass(matBlur, rtH2);
  const u = matFinal.uniforms; u.tComp.value = rtA.texture; u.uHasOv.value = 0;
  u.uBloom.value = pp.bloom; u.uCA.value = pp.ca; u.uVig.value = pp.vig; u.uGrain.value = pp.grain * .5; u.uTime.value = 3; u.uFade.value = 0; u.uFlash.value = 0; u.uGlitch.value = 0;
  u.uSat.value = pp.sat; u.uCon.value = pp.con; u.uExp.value = pp.exp; u.uScan.value = 0; u.uTint.value.set(...pp.tint); u.uLift.value.set(...pp.lift); u.uWarp.value = 0;
  setCine(u, pp); pass(matFinal, null); return true;
}

function setCine(u, q) {
  u.uStreak.value = q.streak; u.uStreakTint.value.set(...q.streakTint); u.uFilmic.value = q.filmic; u.uSplit.value = q.split;
  u.uShadowTint.value.set(...q.shadowTint); u.uHighTint.value.set(...q.highTint); u.uHalation.value = q.halation; u.uBars.value = q.bars;
  u.uWeave.value = q.weave; u.uBlack.value = q.black; u.uGrainSize.value = q.grainSize;
  u.uFlicker.value = q.flicker; u.uLeak.value = q.leak; u.uLeakTint.value.set(...q.leakTint); u.uBleach.value = q.bleach; u.uSoft.value = q.soft;
  u.uChromaVig.value = q.chromaVig; u.uDither.value = q.dither; u.uGrainChroma.value = q.grainChroma;
}
// 字幕位置随遮幅上移
export function subBaseline() { return E._bars ? Math.min(H - 66, H / 2 + (W / E._bars) / 2 - 40) : H - 66; }

export async function init() {
  initGL();
  await loadFonts();
  await loadTimeline();
  for (const id in E.scenes) if (E.scenes[id].init) await E.scenes[id].init();
  // 计算字幕分段
  for (const ln of E.tl.lines) if (ln.segs) for (const s of ln.segs) { s.start = +s.start; s.end = +s.end; }
}

// ================================================================ 绘图工具
export function text(c, str, x, y, o = {}) {
  const { size = 40, family = 'SHSans', weight = 400, color = '#fff', align = 'left', base = 'alphabetic', alpha = 1, ls = 0, italic = false, stroke = null, strokeW = 0, shadow = null, shadowBlur = 0 } = o;
  if (alpha <= 0) return 0;
  c.save(); c.globalAlpha *= alpha;
  c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}${family === 'SHSans' ? '' : ', SHSans'}`;
  c.textAlign = align; c.textBaseline = base; c.letterSpacing = ls + 'px';
  if (shadow) { c.shadowColor = shadow; c.shadowBlur = shadowBlur; }
  if (stroke) { c.lineJoin = 'round'; c.strokeStyle = stroke; c.lineWidth = strokeW; c.strokeText(str, x, y); }
  c.fillStyle = color; c.fillText(str, x, y);
  const w = c.measureText(str).width; c.restore(); return w;
}
export function measure(c, str, o = {}) {
  const { size = 40, family = 'SHSans', weight = 400, ls = 0, italic = false } = o;
  c.save(); c.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${family}${family === 'SHSans' ? '' : ', SHSans'}`; c.letterSpacing = ls + 'px'; const w = c.measureText(str).width; c.restore(); return w;
}
// 打字机：prog 0..1
export function typeText(c, str, x, y, prog, o = {}) {
  const n = Math.floor(clamp(prog) * str.length + 1e-6);
  const s = str.slice(0, n);
  const w = text(c, s, x, y, o);
  if (o.cursor && prog < 1.02) {
    const blink = (Math.floor((o.t ?? 0) * 2.2) % 2 === 0) || prog < 1;
    if (blink) { c.save(); c.globalAlpha *= (o.alpha ?? 1); c.fillStyle = o.cursorColor || o.color || '#fff'; const sz = o.size || 40; c.fillRect(x + (o.align === 'center' ? w / 2 : w) + 4, y - sz * .82, sz * .5, sz * .95); c.restore(); }
  }
  return w;
}
// 乱码解码效果
const GLY = '01ABCDEFGHJKLMNPQRSTUVWXYZ#$%&*+=<>/\\|{}[]';
export function scrambleText(c, str, x, y, prog, seed, o = {}) {
  const n = str.length; let out = '';
  for (let i = 0; i < n; i++) {
    const th = i / n; const ch = str[i];
    if (prog >= th + .15 || ch === ' ') out += ch;
    else if (prog > th) out += GLY[Math.floor(hash2(i + seed, Math.floor(prog * 60)) * GLY.length)];
    else out += o.hidden ? ' ' : '';
  }
  return text(c, out, x, y, o);
}
export function rrect(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
export function panel(c, x, y, w, h, o = {}) {
  const { r = 14, fill = 'rgba(8,16,28,.78)', stroke = 'rgba(62,230,255,.55)', lw = 2, alpha = 1 } = o;
  if (alpha <= 0) return; c.save(); c.globalAlpha *= alpha; rrect(c, x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } c.restore();
}
// HUD 角框
export function brackets(c, x, y, w, h, o = {}) {
  const { len = 26, color = C.cyan, lw = 3, alpha = 1 } = o; if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = lw; c.lineCap = 'square'; c.beginPath();
  c.moveTo(x, y + len); c.lineTo(x, y); c.lineTo(x + len, y);
  c.moveTo(x + w - len, y); c.lineTo(x + w, y); c.lineTo(x + w, y + len);
  c.moveTo(x + w, y + h - len); c.lineTo(x + w, y + h); c.lineTo(x + w - len, y + h);
  c.moveTo(x + len, y + h); c.lineTo(x, y + h); c.lineTo(x, y + h - len); c.stroke(); c.restore();
}
// 带引线的 HUD 标签
export function tag(c, x, y, tx, ty, lines, o = {}) {
  const { color = C.cyan, alpha = 1, prog = 1, size = 24, w: bw } = o; if (alpha <= 0) return;
  c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.fillStyle = color; c.lineWidth = 2;
  const k = eOut(p(prog, 0, .35)); c.beginPath(); c.arc(x, y, 6, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 2.5, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(x, y); c.lineTo(lerp(x, tx, k), lerp(y, ty, k)); c.stroke();
  const kp = eOut(p(prog, .3, .8));
  if (kp > 0) {
    const ww = bw || Math.max(...lines.map((l, i) => measure(c, l, { size: i === 0 ? size : size * .78, family: i === 0 ? 'SHSans' : 'JB', weight: i === 0 ? 700 : 400 }))) + 36;
    const hh = lines.length * size * 1.25 + 22;
    c.save(); c.beginPath(); c.rect(tx, ty - hh / 2, ww * kp, hh); c.clip();
    c.fillStyle = 'rgba(4,14,26,.82)'; c.fillRect(tx, ty - hh / 2, ww, hh); c.strokeStyle = color; c.strokeRect(tx, ty - hh / 2, ww, hh);
    c.fillStyle = color; c.fillRect(tx, ty - hh / 2, 5, hh);
    lines.forEach((l, i) => text(c, l, tx + 20, ty - hh / 2 + 14 + (i + .82) * size * 1.2, { size: i === 0 ? size : size * .78, family: i === 0 ? 'SHSans' : 'JB', weight: i === 0 ? 700 : 400, color: i === 0 ? '#fff' : color }));
    c.restore();
  }
  c.restore();
}
export function line(c, x1, y1, x2, y2, color, lw = 2, alpha = 1) { c.save(); c.globalAlpha *= alpha; c.strokeStyle = color; c.lineWidth = lw; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); c.restore(); }
export function circle(c, x, y, r, o = {}) { const { fill, stroke, lw = 2, alpha = 1 } = o; c.save(); c.globalAlpha *= alpha; c.beginPath(); c.arc(x, y, Math.max(0, r), 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw; c.stroke(); } c.restore(); }
export function glowDot(c, x, y, r, color, a = 1) {
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(color, a)); g.addColorStop(.25, rgba(color, a * .45)); g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
}
export function vgrad(c, x, y, w, h, stops) { const g = c.createLinearGradient(x, y, x, y + h); stops.forEach(([o, col]) => g.addColorStop(o, col)); c.fillStyle = g; c.fillRect(x, y, w, h); }
export function radial(c, x, y, r, stops) { const g = c.createRadialGradient(x, y, 0, x, y, r); stops.forEach(([o, col]) => g.addColorStop(o, col)); return g; }

// 章节卡（场景前 2.8 秒）
export function chapterCard(S, num, title, o = {}) {
  const c = S.fg, t = S.t; const T = o.T ?? 2.8;
  if (t > T + .1) return;
  const a = Math.min(smooth(p(t, 0, .5)), 1 - smooth(p(t, T - .55, T)));
  if (a <= 0) return;
  const col = o.color || C.cyan;
  c.save(); c.globalAlpha = a;
  c.fillStyle = 'rgba(2,4,9,.86)'; c.fillRect(0, 0, W, H);
  const k = eOutExpo(p(t, .15, 1.3));
  // 细线
  c.strokeStyle = rgba(col, .8); c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 260 * k, H / 2 + 48); c.lineTo(W / 2 + 260 * k, H / 2 + 48); c.stroke();
  text(c, num, W / 2, H / 2 - 92, { size: 34, family: 'SHSerif', weight: 600, color: col, align: 'center', ls: 18 * k + 4, alpha: k });
  text(c, title, W / 2, H / 2 + 14, { size: 104, family: 'SHSerif', weight: 900, color: '#fff', align: 'center', ls: lerp(30, 8, k), alpha: smooth(p(t, .35, 1.2)) });
  if (o.sub) text(c, o.sub, W / 2, H / 2 + 116, { size: 28, family: 'JB', weight: 400, color: rgba('#ffffff', .65), align: 'center', ls: 10, alpha: smooth(p(t, .7, 1.5)) });
  c.restore();
}

// 简单 3D 投影（2D 画布上用）
export function proj(x, y, z, cam) {
  // cam: {x,y,z, yaw, pitch, f}
  let dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
  const cy = Math.cos(cam.yaw || 0), sy = Math.sin(cam.yaw || 0);
  let x1 = dx * cy - dz * sy, z1 = dx * sy + dz * cy;
  const cp = Math.cos(cam.pitch || 0), sp = Math.sin(cam.pitch || 0);
  let y1 = dy * cp - z1 * sp, z2 = dy * sp + z1 * cp;
  if (z2 <= 1) return null;
  const f = cam.f || 900;
  return { x: W / 2 + x1 * f / z2, y: H / 2 - y1 * f / z2, s: f / z2, z: z2 };
}

// 人物剪影（侧面行走，带拉杆箱）
export function walker(c, x, y, s, phase, o = {}) {
  const { color = '#0b0f16', suitcase = true, alpha = 1 } = o;
  c.save(); c.globalAlpha *= alpha; c.translate(x, y); c.scale(s, s); c.fillStyle = color; c.strokeStyle = color; c.lineCap = 'round'; c.lineJoin = 'round';
  const sw = Math.sin(phase), bob = Math.abs(Math.cos(phase)) * 3;
  // 腿
  c.lineWidth = 15;
  c.beginPath(); c.moveTo(0, -95 - bob); c.lineTo(sw * 22, -48 - bob * .5); c.lineTo(sw * 30, 0); c.stroke();
  c.beginPath(); c.moveTo(0, -95 - bob); c.lineTo(-sw * 22, -48 - bob * .5); c.lineTo(-sw * 30, 0); c.stroke();
  // 躯干
  c.lineWidth = 30; c.beginPath(); c.moveTo(0, -100 - bob); c.lineTo(2, -165 - bob); c.stroke();
  // 头 + 马尾
  c.beginPath(); c.arc(4, -192 - bob, 17, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-10, -198 - bob); c.quadraticCurveTo(-30, -190 - bob + sw * 2, -26, -170 - bob); c.lineWidth = 7; c.stroke();
  // 背包带 / 手臂（后摆的手拉箱）
  c.lineWidth = 11;
  c.beginPath(); c.moveTo(0, -158 - bob); c.lineTo(-sw * 16 + 12, -118 - bob); c.lineTo(-sw * 10 + 22, -92 - bob); c.stroke();
  if (suitcase) {
    c.beginPath(); c.moveTo(0, -158 - bob); c.lineTo(-24, -122 - bob); c.lineTo(-44, -98 - bob); c.stroke();
    c.lineWidth = 4; c.beginPath(); c.moveTo(-44, -98 - bob); c.lineTo(-70, -62); c.stroke();
    c.save(); c.translate(-92, -64); c.rotate(-.12); rrect(c, -10, 0, 52, 72, 7); c.fill(); c.restore();
    c.beginPath(); c.arc(-98, 10, 5, 0, TAU); c.arc(-50, 4, 5, 0, TAU); c.fill();
  }
  c.restore();
}
