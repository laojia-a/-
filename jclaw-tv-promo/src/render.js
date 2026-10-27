// Build driver.
//   node src/render.js                       full build -> video/jclaw-tv-promo.mp4 (+ .srt, poster)
//   node src/render.js --preview 3,21,46     PNG stills -> build/preview/
//   node src/render.js --sheet 3,21,46,...   contact sheet -> build/preview/sheet.jpg
//   node src/render.js --range 70,94         render only a time range -> build/range.mp4 (with soundtrack if present)
//   node src/render.js --audio-only          soundtrack only -> build/soundtrack.wav
//   node src/render.js --workers 8           parallel segment rendering (default: one per CPU)
// ffmpeg: $FFMPEG, else `ffmpeg` on PATH. Audio: $PYTHON (default python3) with numpy + scipy.
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, fork, spawnSync } = require('child_process');
const T = require('./timeline');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const VIDEO = path.join(ROOT, 'video');
const NAME = 'jclaw-tv-promo';
const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const PY = process.env.PYTHON || 'python3';
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

function run(cmd, args, opts = {}) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'], ...opts });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });
}

async function worker(start, end, out) {
  const { Renderer } = require('./frame');
  const r = new Renderer();
  const ff = spawn(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${T.W}x${T.H}`, '-r', String(T.FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-tune', 'film', '-x264-params', 'keyint=60:aq-mode=3:rc-lookahead=20', '-threads', '2', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = start; f < end; f++) {
    const cv = r.render(f / T.FPS, f);
    const buf = Buffer.from(cv.data());
    if (!ff.stdin.write(buf)) await new Promise((res) => ff.stdin.once('drain', res));
    if (process.send && (f - start) % 15 === 0) process.send({ done: f - start });
    if (global.gc && (f - start) % 20 === 19) global.gc();
  }
  ff.stdin.end();
  await new Promise((res) => ff.on('close', res));
}

function srtTime(s) {
  const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), sec = Math.floor((ms % 60000) / 1000), r = ms % 1000;
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(h)}:${p(m)}:${p(sec)},${p(r, 3)}`;
}
function writeSrt(file) {
  fs.writeFileSync(file, T.SUBS.map(([a, b, zh, en], i) => `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${zh}\n${en}\n`).join('\n'));
}

async function stills(times, sheet) {
  const { Renderer } = require('./frame');
  const { canvas } = require('./lib');
  const r = new Renderer();
  const dir = path.join(BUILD, 'preview');
  fs.mkdirSync(dir, { recursive: true });
  const cols = 4, tw = 640, th = 360;
  const sh = sheet ? canvas(tw * cols, th * Math.ceil(times.length / cols)) : null;
  const sx = sh && sh.getContext('2d');
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const f = Math.round(t * T.FPS);
    const t0 = Date.now();
    const cv = r.render(f / T.FPS, f);
    if (sheet) {
      sx.drawImage(cv, (i % cols) * tw, Math.floor(i / cols) * th, tw, th);
      sx.fillStyle = 'rgba(0,0,0,0.6)'; sx.fillRect((i % cols) * tw, Math.floor(i / cols) * th, 70, 24);
      sx.fillStyle = '#ff0'; sx.font = '16px sans-serif'; sx.fillText(t.toFixed(1), (i % cols) * tw + 6, Math.floor(i / cols) * th + 18);
    } else {
      const file = path.join(dir, `t${t.toFixed(2).padStart(6, '0')}.png`);
      fs.writeFileSync(file, cv.toBuffer('image/png'));
    }
    console.log(`still ${t}s (${Date.now() - t0} ms)`);
  }
  if (sheet) { const file = path.join(dir, arg('--name', 'sheet') + '.jpg'); fs.writeFileSync(file, sh.toBuffer('image/jpeg', 88)); console.log('->', file); }
}

async function audio() {
  fs.mkdirSync(BUILD, { recursive: true });
  const wav = path.join(BUILD, 'soundtrack.wav');
  await run(PY, [path.join(ROOT, 'audio', 'score.py'), wav]);
  return wav;
}

async function renderFrames(f0, f1, tag) {
  fs.mkdirSync(BUILD, { recursive: true });
  const total = f1 - f0;
  const N = Math.max(1, Math.min(+arg('--workers', os.cpus().length), total));
  const chunk = Math.ceil(total / N);
  const t0 = Date.now();
  let shown = 0; const per = new Array(N).fill(0);
  const segs = [];
  await Promise.all(Array.from({ length: N }, (_, k) => {
    const s = f0 + k * chunk, e = Math.min(f1, s + chunk);
    const out = path.join(BUILD, `${tag}-seg${String(k).padStart(2, '0')}.mp4`);
    segs.push(out);
    return new Promise((res, rej) => {
      const c = fork(__filename, ['--worker', s, e, out], { execArgv: ['--expose-gc'] });
      c.on('message', (m) => {
        per[k] = m.done; const d = per.reduce((a, b) => a + b, 0);
        if (d - shown >= 150) { shown = d; const el = (Date.now() - t0) / 1000; console.log(`frames ${d}/${total}  ${el.toFixed(0)}s  eta ${((total - d) * el / d).toFixed(0)}s`); }
      });
      c.on('exit', (code) => (code === 0 ? res() : rej(new Error('worker ' + k + ' failed'))));
    });
  }));
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const list = path.join(BUILD, `${tag}-segments.txt`);
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  const pic = path.join(BUILD, `${tag}-picture.mp4`);
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', pic]);
  segs.forEach((s) => fs.unlinkSync(s));
  return pic;
}

async function main() {
  if (process.argv.includes('--worker')) {
    const i = process.argv.indexOf('--worker');
    await worker(+process.argv[i + 1], +process.argv[i + 2], process.argv[i + 3]);
    process.exit(0);
  }
  if (process.argv.includes('--preview')) return stills(arg('--preview', '1').split(',').map(Number), false);
  if (process.argv.includes('--sheet')) return stills(arg('--sheet', '1').split(',').map(Number), true);
  if (process.argv.includes('--audio-only')) { console.log('->', await audio()); return; }
  if (process.argv.includes('--range')) {
    const [a, b] = arg('--range').split(',').map(Number);
    const pic = await renderFrames(Math.round(a * T.FPS), Math.round(b * T.FPS), 'range');
    const wav = path.join(BUILD, 'soundtrack.wav');
    const out = path.join(BUILD, 'range.mp4');
    if (fs.existsSync(wav)) await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', pic, '-ss', String(a), '-t', String(b - a), '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', out]);
    else fs.renameSync(pic, out);
    console.log('->', out);
    return;
  }
  fs.mkdirSync(VIDEO, { recursive: true });
  const wav = await audio();
  const pic = await renderFrames(0, Math.round(T.DURATION * T.FPS), 'full');
  const final = path.join(VIDEO, `${NAME}.mp4`);
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-i', pic, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-movflags', '+faststart', '-shortest', final]);
  writeSrt(path.join(VIDEO, `${NAME}.zh-en.srt`));
  await run(FFMPEG, ['-y', '-loglevel', 'error', '-ss', String(T.K.finalTitle + 3.2), '-i', final, '-frames:v', '1', '-q:v', '2', path.join(VIDEO, 'poster.jpg')]);
  console.log('done ->', final);
}

main().catch((e) => { console.error(e); process.exit(1); });
