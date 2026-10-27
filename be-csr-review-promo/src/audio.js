'use strict';
// Procedural soundtrack: every sound is synthesized here, so there are no sample assets or licensing concerns.
// Output: 48 kHz stereo 16-bit WAV, DURATION seconds long, with SFX driven by timeline.SFX
// and a 120 BPM score that follows the scenes.
const fs = require('fs');
const path = require('path');
const { DURATION, SFX } = require('./timeline');

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// deterministic noise
let seed = 1337;
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 * 2 - 1; };

// ---------- buses ----------
const music = [new Float32Array(N), new Float32Array(N)];
const sfx = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)]; // reverb send

function put(bus, i, v, pan, rev = 0) {
  if (i < 0 || i >= N) return;
  const l = Math.cos((pan + 1) * Math.PI / 4), r = Math.sin((pan + 1) * Math.PI / 4);
  bus[0][i] += v * l; bus[1][i] += v * r;
  if (rev) { send[0][i] += v * l * rev; send[1][i] += v * r * rev; }
}

// simple state-variable style filters
function lp1() { let z = 0; return (x, fc) => { const a = 1 - Math.exp(-TAU * fc / SR); z += a * (x - z); return z; }; }
function svf() { let lo = 0, bp = 0; return (x, fc, q = 0.7) => { const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR); const hp = x - lo - bp / q; bp += f * hp; lo += f * bp; return { lo, bp, hp }; }; }

// ---------- SFX synth ----------
// each returns nothing; writes into sfx bus
const S = {
  boom(t0, g) { // deep sub impact with long decay
    const len = 3.5 * SR, f = lp1();
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const fr = 32 + 90 * Math.exp(-t * 9);
      const ph = TAU * (32 * t + (90 / 9) * (1 - Math.exp(-t * 9)));
      const env = Math.exp(-t * 1.4) * clamp(t * 400);
      const v = Math.sin(ph) * env * 0.9 + f(rnd(), 180) * Math.exp(-t * 3) * 1.4;
      void fr;
      put(sfx, Math.round(t0 * SR) + n, v * g, 0, 0.25);
    }
  },
  hit(t0, g) { // cinematic punch: sub + noise crack + metallic
    const len = 1.8 * SR, f = svf();
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const sub = Math.sin(TAU * (45 * t + 6 * (1 - Math.exp(-t * 20)))) * Math.exp(-t * 3.2);
      const cr = f(rnd(), 2400, 1.2).bp * Math.exp(-t * 18) * 1.6;
      const met = (Math.sin(TAU * 311 * t) + Math.sin(TAU * 467 * t) * 0.6) * Math.exp(-t * 4) * 0.18;
      put(sfx, Math.round(t0 * SR) + n, (sub + cr + met) * g * clamp(t * 1000), 0, 0.35);
    }
  },
  braam(t0, g) { // brass-like low cluster, Inception style
    const len = 5 * SR, fl = lp1(), fr = lp1();
    const notes = [26, 33, 38, 41].map(mtof);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      let v = 0;
      for (let k = 0; k < notes.length; k++) for (const d of [-0.12, 0, 0.13]) {
        const ph = (notes[k] * (1 + d / 100 * 3) * t) % 1;
        v += (2 * ph - 1) * (k === 0 ? 0.5 : 0.3);
      }
      const env = clamp(t * 12) * Math.exp(-t * 0.55);
      const cut = 200 + 1600 * Math.exp(-t * 1.2);
      const a = fl(v, cut), b = fr(v, cut * 0.92);
      const i = Math.round(t0 * SR) + n;
      put(sfx, i, a * env * g * 0.16, -0.35, 0.4); put(sfx, i, b * env * g * 0.16, 0.35, 0.4);
    }
  },
  whoosh(t0, g, dur = 0.8) { // filtered noise sweep, panned across
    const len = (dur + 0.4) * SR, f = svf();
    for (let n = 0; n < len; n++) {
      const t = n / SR, p = clamp(t / dur);
      const env = Math.pow(Math.sin(Math.PI * clamp(t / (dur + 0.3))), 2);
      const v = f(rnd(), 300 + 5000 * p * p, 2.2).bp;
      put(sfx, Math.round(t0 * SR) + n, v * env * g * 1.2, -0.8 + 1.6 * p, 0.3);
    }
  },
  riser(t0, g, dur = 4) { // noise + detuned saws rising, ends at t0+dur
    const len = dur * SR, f = svf();
    for (let n = 0; n < len; n++) {
      const t = n / SR, p = t / dur;
      const env = Math.pow(p, 2.2);
      const fr = 110 * Math.pow(2, p * 3);
      const saw = ((fr * t) % 1) * 2 - 1 + (((fr * 1.007 * t) % 1) * 2 - 1);
      const nz = f(rnd(), 400 + 9000 * p * p, 1.6).bp;
      const i = Math.round(t0 * SR) + n;
      put(sfx, i, (saw * 0.12 + nz * 0.9) * env * g, Math.sin(t * 3) * 0.4, 0.3);
    }
  },
  suck(t0, g, dur = 2) { // reverse-swell into impact
    const len = dur * SR, f = svf();
    for (let n = 0; n < len; n++) {
      const t = n / SR, p = t / dur;
      const env = Math.pow(p, 4);
      const v = f(rnd(), 200 + 3000 * p, 3).bp + Math.sin(TAU * (60 + 300 * p * p) * t) * 0.3;
      put(sfx, Math.round(t0 * SR) + n, v * env * g, 0, 0.5);
    }
  },
  tick(t0, g) { // clock tick
    const len = 0.08 * SR, f = svf();
    const pan = rnd() * 0.5;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      put(sfx, Math.round(t0 * SR) + n, (f(rnd(), 3800, 6).bp * 2 + Math.sin(TAU * 1800 * t) * 0.4) * Math.exp(-t * 90) * g, pan, 0.15);
    }
  },
  glitch(t0, g) { // bit-crushed stutter
    const len = 0.45 * SR;
    let hold = 0, hv = 0;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      if (hold-- <= 0) { hold = 20 + Math.floor((rnd() + 1) * 200); hv = rnd(); }
      const gate = (Math.floor(t * 40) % 3) !== 1 ? 1 : 0;
      const tone = Math.sign(Math.sin(TAU * (200 + 1200 * ((Math.floor(t * 25) * 7) % 5) / 5) * t));
      put(sfx, Math.round(t0 * SR) + n, (hv * 0.6 + tone * 0.25) * gate * Math.exp(-t * 5) * g * 0.7, rnd() * 0.7, 0.1);
    }
  },
  slam(t0, g) { // short mechanical slam
    const len = 0.35 * SR, f = svf();
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const v = Math.sin(TAU * (90 * t + 3 * (1 - Math.exp(-t * 40)))) * Math.exp(-t * 14) + f(rnd(), 1500, 1).bp * Math.exp(-t * 35);
      put(sfx, Math.round(t0 * SR) + n, v * g, rnd() * 0.6, 0.25);
    }
  },
  shimmer(t0, g) { // glassy upper harmonics
    const len = 3 * SR, fr = [74, 81, 86, 88, 93].map(mtof);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      let v = 0;
      fr.forEach((f, k) => { v += Math.sin(TAU * f * t + k) * clamp((t - k * 0.08) * 20) * Math.exp(-(t - k * 0.08) * 1.6); });
      put(sfx, Math.round(t0 * SR) + n, v * 0.12 * g, Math.sin(t * 4) * 0.6, 0.7);
    }
  },
  gate(t0, g) { // gate pass: impact + rising confirmation tone
    S.slam(t0, g * 0.9);
    const len = 0.9 * SR;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const v = (Math.sin(TAU * 880 * t) + Math.sin(TAU * 1320 * t) * 0.5) * Math.exp(-t * 5) * clamp(t * 300);
      put(sfx, Math.round(t0 * SR) + n, v * 0.18 * g, 0, 0.5);
    }
  },
  confirm(t0, g) { // two-note UI chime
    for (const [d, m] of [[0, 84], [0.08, 91]]) {
      const len = 0.6 * SR, f = mtof(m);
      for (let n = 0; n < len; n++) {
        const t = n / SR;
        put(sfx, Math.round((t0 + d) * SR) + n, Math.sin(TAU * f * t) * Math.exp(-t * 7) * clamp(t * 500) * 0.3 * g, 0.2, 0.4);
      }
    }
  },
  alarm(t0, g) { // two-tone alert
    const len = 1.6 * SR;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const f = Math.floor(t * 6) % 2 ? 740 : 988;
      const v = Math.sign(Math.sin(TAU * f * t)) * 0.5 + Math.sin(TAU * f * 2 * t) * 0.2;
      put(sfx, Math.round(t0 * SR) + n, v * Math.exp(-t * 1.6) * clamp(t * 200) * 0.22 * g, 0, 0.3);
    }
  },
  warn(t0, g) { // soft single warning blip
    const len = 0.5 * SR;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      put(sfx, Math.round(t0 * SR) + n, Math.sin(TAU * 620 * t) * (Math.floor(t * 12) % 2 ? 0 : 1) * Math.exp(-t * 5) * 0.3 * g, -0.2, 0.3);
    }
  },
  orb(t0, g) { // warm swelling bell
    const len = 2.5 * SR, f0 = mtof(62);
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const v = Math.sin(TAU * f0 * t + 2 * Math.sin(TAU * f0 * 2 * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.5) + Math.sin(TAU * f0 * 0.5 * t) * 0.5 * Math.exp(-t * 2);
      put(sfx, Math.round(t0 * SR) + n, v * clamp(t * 60) * 0.3 * g, 0, 0.6);
    }
  },
  pop(t0, g) { // bubbly UI pop
    const len = 0.25 * SR;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      put(sfx, Math.round(t0 * SR) + n, Math.sin(TAU * (400 * t + 900 * (1 - Math.exp(-t * 30)) / 30)) * Math.exp(-t * 22) * 0.6 * g, rnd() * 0.5, 0.3);
    }
  },
  type(t0, g, dur = 0.5) { // keyboard burst
    let t = 0;
    while (t < dur) { S.tick(t0 + t, g * (0.6 + 0.4 * Math.abs(rnd()))); t += 0.045 + Math.abs(rnd()) * 0.05; }
  },
  powerdown(t0, g) { // falling pitch + filter close
    const len = 1.2 * SR, f = lp1();
    let ph = 0;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      ph += (220 * Math.exp(-t * 3)) / SR;
      const v = f((ph % 1) * 2 - 1, 3000 * Math.exp(-t * 3) + 60);
      put(sfx, Math.round(t0 * SR) + n, v * (1 - t / 1.2) * 0.5 * g, 0, 0.3);
    }
  },
  powerup(t0, g) {
    const len = 0.9 * SR, f = lp1();
    let ph = 0;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      ph += (60 + 700 * Math.pow(t / 0.9, 2)) / SR;
      const v = f((ph % 1) * 2 - 1, 200 + 5000 * t);
      put(sfx, Math.round(t0 * SR) + n, v * clamp(t * 4) * Math.exp(-Math.max(0, t - 0.75) * 20) * 0.4 * g, 0, 0.3);
    }
  },
  lock(t0, g) { // heavy latch: two metallic clacks + sub
    S.slam(t0, g); S.slam(t0 + 0.07, g * 0.8);
    const len = 1.5 * SR;
    for (let n = 0; n < len; n++) {
      const t = n / SR;
      const v = (Math.sin(TAU * 523 * t) * 0.5 + Math.sin(TAU * 1567 * t) * 0.3 + Math.sin(TAU * 2349 * t) * 0.2) * Math.exp(-t * 4);
      put(sfx, Math.round(t0 * SR) + n, v * 0.3 * g, 0, 0.6);
    }
  },
  tail(t0, g) { // final reverberant low hit
    S.boom(t0, g * 0.6);
    S.shimmer(t0 + 0.05, g * 0.6);
  },
};

// ---------- Score ----------
// D minor, 120 BPM (beat 0.5 s, bar 2 s). Chord roots as MIDI.
const PROG = [[38, [50, 53, 57, 64]], [34, [50, 53, 58, 62]], [41, [48, 53, 57, 60]], [36, [48, 52, 55, 62]]];
const chordAt = (t) => PROG[Math.floor(Math.max(0, t - 28) / 4) % 4];
// energy envelope per section (0..1) and flags
function energy(t) {
  if (t < 7.5) return 0.15;
  if (t < 19) return 0.25 + 0.5 * (t - 7.5) / 11.5;
  if (t < 28) return 0.55;
  if (t < 44) return 0.9;
  if (t < 58) return 0.7;
  if (t < 68) return 0.5;
  if (t < 77.2) return 0.8;
  if (t < 78.4) return 0;
  if (t < 88) return 0.75 + 0.2 * (t - 78.4) / 9.6;
  return 1.0 * Math.exp(-Math.max(0, t - 92) * 0.5);
}

function kick(t0, g) {
  const len = 0.45 * SR;
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const v = Math.sin(TAU * (48 * t + 5 * (1 - Math.exp(-t * 35)))) * Math.exp(-t * 7);
    put(music, Math.round(t0 * SR) + n, Math.tanh(v * 1.6) * g, 0, 0.05);
  }
}
function hat(t0, g) {
  const len = 0.06 * SR, f = svf();
  for (let n = 0; n < len; n++) { const t = n / SR; put(music, Math.round(t0 * SR) + n, f(rnd(), 9000, 1).hp * Math.exp(-t * 60) * g, 0.3, 0.1); }
}
function pluck(t0, m, g, pan) {
  const len = 0.6 * SR, f = mtof(m), fl = lp1();
  for (let n = 0; n < len; n++) {
    const t = n / SR;
    const v = fl(((f * t) % 1) * 2 - 1, 400 + 4000 * Math.exp(-t * 10));
    put(music, Math.round(t0 * SR) + n, v * Math.exp(-t * 5) * clamp(t * 800) * g, pan, 0.45);
  }
}

function buildScore() {
  // 1) Pad + drone, continuous
  const fL = lp1(), fR = lp1(), fs = lp1();
  const phases = new Float64Array(16);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    const e = energy(t);
    let notes;
    if (t < 28) notes = t < 19 ? [26, 38, 45, 51] : [38, 45, 50, 57, 64];   // drone / dissonant b9 / big Dm add9
    else if (t >= 88) notes = [38, 45, 50, 57, 62, 69];
    else { const [r, c] = chordAt(t); notes = [r, ...c]; }
    let l = 0, r = 0;
    notes.forEach((m, k) => {
      for (let d = 0; d < 2; d++) {
        const idx = k * 2 + d;
        phases[idx] += mtof(m) * (1 + (d ? 0.004 : -0.004)) / SR;
        const s = (phases[idx] % 1) * 2 - 1;
        if (d) r += s; else l += s;
      }
    });
    const cut = 250 + 2200 * e + 400 * Math.sin(t * 0.4);
    const padGain = (t < 7.5 ? 0.05 : 0.07) * (0.35 + 0.65 * e) * (t >= 77.2 && t < 78.4 ? 0 : 1) * clamp(t / 1.5) * clamp((DURATION - t) / 2.5);
    put(music, i, fL(l, cut) * padGain, -0.5, 0.5);
    put(music, i, fR(r, cut) * padGain, 0.5, 0.5);
    // sub drone
    const sub = Math.sin(TAU * mtof(26) * t) * 0.18 * (t < 19 ? 0.6 + 0.4 * e : 0.3) * clamp(t / 2) * (t >= 77.2 && t < 78.4 ? 0 : 1);
    put(music, i, fs(sub, 200) * clamp((DURATION - t) / 3), 0, 0);
  }
  // 2) Rhythm: beats on 0.5 s grid
  for (let b = 0; b * 0.5 < DURATION; b++) {
    const t = b * 0.5;
    const e = energy(t);
    const drive = (t >= 28 && t < 44) || (t >= 68 && t < 77.2) || (t >= 80 && t < 88);
    const half = (t >= 44 && t < 58);
    const storm = t >= 9.5 && t < 19;
    if (drive || (half && b % 2 === 0) || (storm && t > 14 && b % 2 === 0)) kick(t, 0.55 * e + 0.15);
    if (drive) { hat(t + 0.25, 0.25); hat(t + 0.125, 0.1); hat(t + 0.375, 0.1); }
    if (half) hat(t + 0.25, 0.15);
    // offbeat bass
    if (drive || half) {
      const [root] = chordAt(t);
      for (const o of [0.25]) {
        const len = 0.22 * SR, f = mtof(root + 12), fl = lp1();
        for (let n = 0; n < len; n++) {
          const tt = n / SR;
          put(music, Math.round((t + o) * SR) + n, fl(((f * tt) % 1) * 2 - 1, 300 + 900 * Math.exp(-tt * 12)) * Math.exp(-tt * 8) * 0.22 * e, 0, 0);
        }
      }
    }
    // storm pulse: 16th low ostinato that tightens
    if (storm) for (let s = 0; s < 4; s++) {
      const tt0 = t + s * 0.125, len = 0.1 * SR, f = mtof(s % 2 ? 39 : 38);
      for (let n = 0; n < len; n++) { const tt = n / SR; put(music, Math.round(tt0 * SR) + n, Math.sin(TAU * f * tt) * Math.exp(-tt * 25) * 0.2 * e, 0, 0); }
    }
    // arpeggio in table / roles / delivery / package
    if ((t >= 44 && t < 77.2) || (t >= 80 && t < 88)) {
      const [, c] = chordAt(t);
      for (let s = 0; s < 2; s++) pluck(t + s * 0.25, c[(b * 2 + s) % 4] + 12, 0.05 * (0.5 + e), ((b * 2 + s) % 4 - 1.5) * 0.4);
    }
  }
}

// ---------- Reverb (Freeverb-style) ----------
function reverb(inp, out, spread) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((d) => Math.round((d + spread) * SR / 44100) * 2);
  const aps = [556, 441, 341, 225].map((d) => Math.round((d + spread) * SR / 44100));
  const cb = combs.map((d) => ({ b: new Float32Array(d), i: 0, z: 0 }));
  const ab = aps.map((d) => ({ b: new Float32Array(d), i: 0 }));
  const fb = 0.86, damp = 0.3;
  for (let n = 0; n < N; n++) {
    const x = inp[n] * 0.015;
    let y = 0;
    for (const c of cb) {
      const o = c.b[c.i];
      c.z = o * (1 - damp) + c.z * damp;
      c.b[c.i] = x + c.z * fb;
      c.i = (c.i + 1) % c.b.length;
      y += o;
    }
    for (const a of ab) {
      const o = a.b[a.i];
      a.b[a.i] = y + o * 0.5;
      a.i = (a.i + 1) % a.b.length;
      y = o - y;
    }
    out[n] += y;
  }
}

function writeWav(file, L, R) {
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(clamp(L[i], -1, 1) * 32767), i * 4);
    data.writeInt16LE(Math.round(clamp(R[i], -1, 1) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.concat([h, data]));
}

async function build(file) {
  const t0 = Date.now();
  seed = 1337;
  for (const b of [music, sfx, send]) { b[0].fill(0); b[1].fill(0); }
  buildScore();
  for (const c of SFX) {
    const fn = S[c.type];
    if (!fn) throw new Error(`audio: unknown SFX type "${c.type}"`);
    fn(c.t, c.gain ?? 1, c.dur);
  }
  // sidechain: duck music under SFX
  const env = new Float32Array(N);
  let e = 0;
  for (let i = 0; i < N; i++) {
    const a = Math.abs(sfx[0][i]) + Math.abs(sfx[1][i]);
    e = a > e ? e + (a - e) * 0.01 : e * 0.99995;
    env[i] = e;
  }
  const L = new Float32Array(N), R = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const duck = 1 - 0.55 * clamp(env[i] * 1.5);
    L[i] = music[0][i] * duck + sfx[0][i];
    R[i] = music[1][i] * duck + sfx[1][i];
  }
  reverb(send[0], L, 0); reverb(send[1], R, 23);
  // limiter: peak envelope with instant attack / slow release, then soft clip
  const thr = 0.8;
  let g = 1;
  let peak = 0;
  for (let i = 0; i < N; i++) {
    const p = Math.max(Math.abs(L[i]), Math.abs(R[i]));
    const want = p * g > thr ? thr / p : 1;
    g = want < g ? want : g + (1 - g) * 0.00005;
    L[i] = Math.tanh(L[i] * g * 1.1) / Math.tanh(1.1);
    R[i] = Math.tanh(R[i] * g * 1.1) / Math.tanh(1.1);
    peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  }
  const norm = 0.63 / (peak || 1); // ~ -4 dBFS sample peak: true peak stays below -1 dBTP after AAC encoding
  for (let i = 0; i < N; i++) { L[i] *= norm; R[i] *= norm; }
  // fade in/out guards
  for (let i = 0; i < SR * 0.02; i++) { L[i] *= i / (SR * 0.02); R[i] *= i / (SR * 0.02); }
  for (let i = 0; i < SR * 1.5; i++) { const k = N - 1 - i, f = i / (SR * 1.5); L[k] *= f; R[k] *= f; }
  writeWav(file, L, R);
  console.log(`audio -> ${file} (${DURATION}s, ${SFX.length} cues, ${Date.now() - t0} ms)`);
  return file;
}

module.exports = { build };

if (require.main === module) {
  build(process.argv[2] || path.join(__dirname, '..', 'build', 'audio.wav')).catch((e) => { console.error(e); process.exit(1); });
}
