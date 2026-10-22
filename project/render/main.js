import { E, init, renderFrame, renderStill } from './engine.js';
import { drawCover } from './scenes/cover.js';
import './scenes/act0.js';
import './scenes/act1.js';
import './scenes/act2.js';
import './scenes/act3.js';
import './scenes/act4.js';
import './scenes/act5.js';

window.__err = null;
window.addEventListener('error', (e) => { window.__err = String(e.message || e); });
init().then(() => {
  window.renderFrame = (f) => renderFrame(f);
  window.renderCover = (v) => renderStill((S) => drawCover(S, v), { bloom: .7, thr: .66, ca: .0012, vig: .45, grain: .03 });
  window.sceneStart = (id) => { const s = E.tl.scenes.find(x => x.id === id); return s ? s.start : 0; };
  window.__info = { duration: E.tl.duration, frames: E.tl.frames, fps: E.fps };
  window.__ready = true;
}).catch((e) => { window.__err = 'init: ' + (e && e.stack || e); });
