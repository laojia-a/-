// 并行逐帧渲染器：本地静态服务 + 多个无头 Chromium（SwiftShader WebGL）
// 用法:
//   node render.js frames <start> <end> [workers]         渲染全片帧到 FRAMES_DIR（已存在的帧会跳过）
//   node render.js preview <out.jpg> <scene>:<t> ...      渲染若干预览帧（场景内时间 t 秒）
//   node render.js previewg <outdir> <globalSec> ...      按全局时间渲染
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const NODE = (process.env.CODEFILM_NODE_MODULES || path.resolve(__dirname, 'node_modules')) + path.sep;
const req = require('module').createRequire(NODE);
const puppeteer = req('puppeteer-core');
const CACHE = process.env.CODEFILM_CACHE || path.join(os.homedir(), '.cache', 'codefilm');
// 浏览器选择顺序：CHROME_PATH → puppeteer 自带 Chrome → Linux 用 @sparticuz/chromium → 本机 Chrome/Edge
const COMMON = ['--no-sandbox', '--hide-scrollbars', '--force-device-scale-factor=1', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--disable-gpu-watchdog', '--js-flags=--max-old-space-size=4096'];
const LOCAL = {
  win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'), 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'],
  darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge', '/Applications/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'],
};
let LAUNCH = null;
async function launchOpts() {
  if (LAUNCH) return LAUNCH;
  if (process.env.CHROME_PATH) return (LAUNCH = { executablePath: process.env.CHROME_PATH, args: COMMON, headless: true });
  try { const pp = req('puppeteer'); const ep = pp.executablePath(); if (ep && fs.existsSync(ep)) return (LAUNCH = { executablePath: ep, args: COMMON, headless: true }); } catch (e) {}
  if (process.platform === 'linux') { try { const chromium = req('@sparticuz/chromium').default; return (LAUNCH = { executablePath: await chromium.executablePath(), args: [...chromium.args, ...COMMON], headless: 'shell' }); } catch (e) {} }
  for (const p of LOCAL[process.platform] || []) if (p && fs.existsSync(p)) return (LAUNCH = { executablePath: p, args: COMMON, headless: true });
  throw new Error('找不到 Chrome/Edge：请安装 Chrome，或设置环境变量 CHROME_PATH 指向浏览器可执行文件');
}

const ROOT = path.resolve(__dirname);
const PROJ = path.resolve(__dirname, '..');
const FRAMES_DIR = process.env.FRAMES_DIR || path.resolve(__dirname, '..', '.cache', 'frames');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.otf': 'font/otf', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve() {
  const routes = [['/three/', NODE + 'three/'], ['/fonts/', fs.existsSync(PROJ + '/assets/fonts') ? PROJ + '/assets/fonts/' : path.join(CACHE, 'fonts') + path.sep], ['/build/', PROJ + '/build/'], ['/assets/', PROJ + '/render/assets/'], ['/', ROOT + '/']];
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

async function openPage(port) {
  const o = await launchOpts();
  const browser = await puppeteer.launch({ ...o, defaultViewport: { width: 1920, height: 1080, deviceScaleFactor: 1 }, protocolTimeout: 600000 });
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
  const MB = +(process.env.CODEFILM_MOTION_BLUR || 0);
  await page.evaluate((f, mb) => mb > 1 ? window.renderFrameMB(f, mb, .5) : window.renderFrame(f), f, MB);
  const buf = await page.screenshot({ type: 'jpeg', quality: 94, optimizeForSpeed: true });
  fs.writeFileSync(file, buf);
}

if (process.env.CODEFILM_PROBE) { launchOpts().then(o => { console.log('BROWSER', o.executablePath); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); }); }
else (async () => {
  const mode = process.argv[2];
  const srv = await serve(); const port = srv.address().port;
  if (mode === 'frames') {
    const TLF = JSON.parse(fs.readFileSync(PROJ + '/build/timeline.json', 'utf8')).frames;
    const start = +(process.argv[3] || 0), end = Math.min(+(process.argv[4] || TLF), TLF), nw = +(process.argv[5] || 4);
    fs.mkdirSync(FRAMES_DIR, { recursive: true });
    const todo = []; for (let f = start; f < end; f++) { const fn = path.join(FRAMES_DIR, String(f).padStart(6, '0') + '.jpg'); if (!fs.existsSync(fn)) todo.push(f); }
    console.log(`frames ${start}-${end}: ${todo.length} to render with ${nw} workers`);
    let idx = 0, done = 0; const t0 = Date.now();
    const deadline = process.env.DEADLINE ? Date.now() + (+process.env.DEADLINE) * 1000 : Infinity;
    await launchOpts();
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
