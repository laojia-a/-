import { E, init, renderFrame, renderFrameMB } from './engine.js';
// 在这里导入你的场景文件（每个文件里用 def('场景id', {...}) 注册场景）
import './scenes/example.js';
E.brand = '支线进行中';   // 左上角水印/署名

window.__err = null;
window.addEventListener('error', (e) => { window.__err = String(e.message || e); });
init().then(() => {
  window.renderFrame = (f) => renderFrame(f);
  window.renderFrameMB = (f, n, sh) => renderFrameMB(f, n, sh);
  window.sceneStart = (id) => { const s = E.tl.scenes.find(x => x.id === id); return s ? s.start : 0; };
  window.__ready = true;
}).catch((e) => { window.__err = 'init: ' + (e && e.stack || e); });
