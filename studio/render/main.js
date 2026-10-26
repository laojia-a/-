// 入口：按 ?ep= 载入该集的场景文件
import { E, EP, init, renderFrame, renderStill } from './engine.js';

window.__err = null;
window.addEventListener('error', (e) => { window.__err = String(e.message || e); });
(async () => {
  const mod = await import(`/episodes/${EP}/scenes.js`);
  await init();
  window.renderFrame = (f) => renderFrame(f);
  window.renderCover = (v) => renderStill((S) => mod.drawCover ? mod.drawCover(S, v) : null, { bloom: .7, thr: .66, ca: .0012, vig: .45, grain: .03 });
  window.sceneStart = (id) => { const s = E.tl.scenes.find(x => x.id === id); return s ? s.start : 0; };
  window.__info = { duration: E.tl.duration, frames: E.tl.frames, fps: E.fps };
  window.__ready = true;
})().catch((e) => { window.__err = 'init: ' + (e && e.stack || e); });
