// Build driver.
//   node src/render.js                    full build -> video/be-csr-review-promo.mp4 (+ .srt, poster)
//   node src/render.js --preview 3,21,46  write PNG stills to build/preview/
//   node src/render.js --workers 8        parallel segment rendering
const fs = require('fs');
const path = require('path');
const { spawn, fork } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const T = require('./timeline');

const ROOT = path.join(__dirname, '..');
const BUILD = path.join(ROOT, 'build');
const VIDEO = path.join(ROOT, 'video');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };

function run(cmd, args) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });
}

async function worker(start, end, out) {
  const { Renderer } = require('./frame');
  const r = new Renderer();
  const ff = spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${T.W}x${T.H}`, '-r', String(T.FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-tune', 'film', '-x264-params', 'keyint=60', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = start; f < end; f++) {
    const cv = r.render(f / T.FPS, f);
    const buf = cv.data();
    if (!ff.stdin.write(Buffer.from(buf))) await new Promise((res) => ff.stdin.once('drain', res));
    if (process.send && (f - start) % 30 === 0) process.send({ done: f - start });
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
  const body = T.SUBS.map(([a, b, zh, en], i) => `${i + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${zh}\n${en}\n`).join('\n');
  fs.writeFileSync(file, body);
}

async function preview(times) {
  const { Renderer } = require('./frame');
  const r = new Renderer();
  const dir = path.join(BUILD, 'preview');
  fs.mkdirSync(dir, { recursive: true });
  for (const t of times) {
    const f = Math.round(t * T.FPS);
    const t0 = Date.now();
    const cv = r.render(f / T.FPS, f);
    const file = path.join(dir, `t${String(t).padStart(5, '0')}.png`);
    fs.writeFileSync(file, cv.toBuffer('image/png'));
    console.log(`preview ${t}s -> ${file} (${Date.now() - t0} ms)`);
  }
}

async function main() {
  if (process.argv.includes('--worker')) {
    const i = process.argv.indexOf('--worker');
    await worker(+process.argv[i + 1], +process.argv[i + 2], process.argv[i + 3]);
    process.exit(0);
  }
  if (process.argv.includes('--preview')) {
    await preview(arg('--preview', '1').split(',').map(Number));
    return;
  }
  fs.mkdirSync(BUILD, { recursive: true });
  fs.mkdirSync(VIDEO, { recursive: true });
  const total = Math.round(T.DURATION * T.FPS);
  const N = +arg('--workers', require('os').cpus().length);
  const chunk = Math.ceil(total / N);
  const t0 = Date.now();
  let done = 0; const per = new Array(N).fill(0);
  const segs = [];
  await Promise.all(Array.from({ length: N }, (_, k) => {
    const s = k * chunk, e = Math.min(total, s + chunk);
    const out = path.join(BUILD, `seg${String(k).padStart(2, '0')}.mp4`);
    segs.push(out);
    return new Promise((res, rej) => {
      const c = fork(__filename, ['--worker', s, e, out]);
      c.on('message', (m) => { per[k] = m.done; const d = per.reduce((a, b) => a + b, 0); if (d - done >= 150) { done = d; console.log(`frames ${d}/${total}  ${((Date.now() - t0) / 1000).toFixed(0)}s`); } });
      c.on('exit', (code) => (code === 0 ? res() : rej(new Error('worker ' + k + ' failed'))));
    });
  }));
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  const list = path.join(BUILD, 'segments.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s}'`).join('\n'));
  const silent = path.join(BUILD, 'picture.mp4');
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', silent]);
  const wav = path.join(BUILD, 'soundtrack.wav');
  await require('./audio').build(wav);
  const final = path.join(VIDEO, 'be-csr-review-promo.mp4');
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-i', silent, '-i', wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', '-shortest', final]);
  writeSrt(path.join(VIDEO, 'be-csr-review-promo.zh-en.srt'));
  await run(ffmpeg, ['-y', '-loglevel', 'error', '-ss', '24.5', '-i', final, '-frames:v', '1', path.join(VIDEO, 'poster.jpg')]);
  console.log('done ->', final);
}

main().catch((e) => { console.error(e); process.exit(1); });
