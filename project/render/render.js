// 并行逐帧渲染器：本地静态服务 + 多个无头 Chromium（SwiftShader WebGL）
// 用法:
//   node render.js frames <start> <end> [workers]         渲染全片帧到 FRAMES_DIR（已存在的帧会跳过）
//   node render.js preview <out.jpg> <scene>:<t> ...      渲染若干预览帧（场景内时间 t 秒）
//   node render.js previewg <outdir> <globalSec> ...      按全局时间渲染
const path = require('path');
const fs = require('fs');
const http = require('http');
const NODE = (process.env.JCZ_NODE_MODULES || path.resolve(__dirname, 'node_modules')) + '/';
const req = require('module').createRequire(NODE);
const chromium = req('@sparticuz/chromium').default;
const puppeteer = req('puppeteer-core');

const ROOT = path.resolve(__dirname);
const PROJ = path.resolve(__dirname, '..');
const FRAMES_DIR = process.env.FRAMES_DIR || path.resolve(__dirname, '..', '.cache', 'frames');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  const routes = [['/three/', NODE + 'three/'], ['/fonts/', PROJ + '/assets/fonts/'], ['/build/', PROJ + '/build/'], ['/assets/', PROJ + '/render/assets/'], ['/', ROOT + '/']];
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u === '/') u = '/index.html';
    for (const [pre, dir] of routes) {
      if (u.startsWith(pre)) {
        const f = path.join(dir, u.slice(pre.length));
        fs.readFile(f, (err, data) => {
          if (err) { res.writeHead(404); res.end('nf'); return; }
          res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'max-age=3600' }); res.end(data);
        });
        return;
      }
    }
    res.writeHead(404); res.end();
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

let EXE = null;
async function openPage(port) {
  if (!EXE) EXE = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: [...chromium.args, '--disable-gpu-watchdog', '--disable-background-timer-throttling', '--js-flags=--max-old-space-size=4096'],
    defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 },
    executablePath: EXE, headless: 'shell', protocolTimeout: 600000,
  });
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (!/GPU stall|WebGL/.test(t)) console.log('[page]', t); });
  page.on('pageerror', e => console.log('[pageerror]', e.message));
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'load', timeout: 120000 });
  await page.waitForFunction('window.__ready === true || window.__err', { timeout: 300000 });
  const err = await page.evaluate('window.__err');
  if (err) throw new Error(err);
  return { browser, page };
}

async function shot(page, f, file) {
  await page.evaluate((f) => window.renderFrame(f), f);
  const buf = await page.screenshot({ type: 'jpeg', quality: 94, optimizeForSpeed: true });
  fs.writeFileSync(file, buf);
}

(async () => {
  const mode = process.argv[2];
  const srv = await serve(); const port = srv.address().port;
  if (mode === 'frames') {
    const start = +process.argv[3], end = +process.argv[4], nw = +(process.argv[5] || 4);
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    const todo = []; for (let f = start; f < end; f++) { const fn = path.join(FRAMES_DIR, String(f).padStart(6, '0') + '.jpg'); if (!fs.existsSync(fn)) todo.push(f); }
    console.log(`frames ${start}-${end}: ${todo.length} to render with ${nw} workers`);
    let idx = 0, done = 0; const t0 = Date.now();
    const deadline = process.env.DEADLINE ? Date.now() + (+process.env.DEADLINE) * 1000 : Infinity;
    EXE = await chromium.executablePath();
    await Promise.all(Array.from({ length: nw }, async (_, w) => {
      await new Promise(r => setTimeout(r, w * 1500));
      const { browser, page } = await openPage(port);
      while (idx < todo.length && Date.now() < deadline) {
        const f = todo[idx++];
        const fn = path.join(FRAMES_DIR, String(f).padStart(6, '0') + '.jpg');
        try { await shot(page, f, fn + '.tmp'); fs.renameSync(fn + '.tmp', fn); }
        catch (e) { console.log('ERR frame', f, e.message); }
        done++;
        if (done % 100 === 0) { const el = (Date.now() - t0) / 1000; console.log(`  ${done}/${todo.length}  ${(done / el).toFixed(2)} fps  eta ${((todo.length - done) / (done / el) / 60).toFixed(1)} min`); }
      }
      await browser.close();
    }));
    console.log(`done ${done} in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  } else if (mode === 'cover') {
    const out = process.argv[3]; const { browser, page } = await openPage(port);
    for (const v of [0, 1]) { await page.evaluate((v) => window.renderCover(v), v); fs.writeFileSync(out.replace('.png', `_${v}.png`), await page.screenshot({ type: 'png' })); }
    await browser.close();
  } else if (mode === 'preview' || mode === 'previewg') {
    const out = process.argv[3]; fs.mkdirSync(out, { recursive: true });
    const { browser, page } = await openPage(port);
    const items = process.argv.slice(4);
    let k = 0;
    for (const it of items) {
      let g;
      if (mode === 'preview') { const [sid, t] = it.split(':'); g = (await page.evaluate((id) => window.sceneStart(id), sid)) + parseFloat(t); }
      else g = parseFloat(it);
      const f = Math.round(g * 30);
      const t0 = Date.now();
      await shot(page, f, path.join(out, String(k).padStart(3, '0') + '_' + it.replace(/[:/]/g, '_') + '.jpg'));
      console.log(`preview ${it} (frame ${f}) ${Date.now() - t0}ms`);
      k++;
    }
    await browser.close();
  }
  srv.close();
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
