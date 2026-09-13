let audio: AudioContext | 0 = 0;
let tickN = 0;
let gSoft: GainNode | 0 = 0;
let gRage: GainNode | 0 = 0;
let onRage = 0;

export const unlockAudio = () => {
  if (audio) return;
  audio = new AudioContext();
  bootMus();
};

const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

const mixInto = (d: Float32Array, R: number, t0: number, dur: number, fn: (t: number, u: number) => number) => {
  const i0 = (t0 * R) | 0;
  const n = (dur * R) | 0;
  const N = d.length;
  for (let i = 0; i < n && i0 + i < N; i++) d[i0 + i] += fn(i / R, i / n);
};

const loopSrc = (ac: AudioContext, buf: AudioBuffer, vol: number) => {
  const src = ac.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const g = ac.createGain();
  g.gain.value = vol;
  src.connect(g);
  g.connect(ac.destination);
  src.start();
  return g;
};

const fade = (g: GainNode, to: number, t: number) => {
  const ac = audio as AudioContext;
  const now = ac.currentTime;
  g.gain.cancelScheduledValues(now);
  g.gain.setValueAtTime(g.gain.value, now);
  g.gain.linearRampToValueAtTime(to, now + t);
};

const mkSoft = (ac: AudioContext) => {
  const R = ac.sampleRate;
  const N = (R * 10) | 0;
  const buf = ac.createBuffer(1, N, R);
  const d = buf.getChannelData(0);
  const chords = [
    [57, 60, 64, 67],
    [53, 57, 60, 64],
    [48, 52, 55, 59],
    [55, 59, 62, 67],
  ];
  for (let c = 0; c < 4; c++) {
    const t0 = c * 2.5;
    for (const n of chords[c]) {
      mixInto(d, R, t0, 3.2, (x, u) => {
        const env = (u < 0.22 ? u / 0.22 : u > 0.7 ? (1 - u) / 0.3 : 1);
        return Math.sin(x * hz(n) * 6.283) * env * 0.09;
      });
    }
  }
  const bells = [72, 0, 76, 0, 67, 0, 69, 0, 64, 0, 72, 0, 71, 0, 67, 0, 76, 0, 74, 0];
  for (let i = 0; i < bells.length; i++) {
    if (!bells[i]) continue;
    mixInto(d, R, i * 0.5, 1.6, (x, u) => {
      const env = (1 - u) ** 2.2;
      return (Math.sin(x * hz(bells[i]) * 6.283) + Math.sin(x * hz(bells[i]) * 2 * 6.283) * 0.12) * env * 0.07;
    });
  }
  const df = Math.round((N / R) * 110) * R / N;
  for (let i = 0; i < N; i++) {
    const t = i / R;
    d[i] = Math.tanh(d[i] + Math.sin(t * df * 6.283) * 0.035 * (0.8 + 0.2 * Math.sin(t * Math.PI * 2 / 10)));
  }
  return buf;
};

const mkRage = (ac: AudioContext) => {
  const R = ac.sampleRate;
  const bpm = 148;
  const st = 60 / bpm / 4;
  const steps = 64;
  const N = (steps * st * R) | 0;
  const buf = ac.createBuffer(1, N, R);
  const d = buf.getChannelData(0);
  const mix = (t0: number, dur: number, fn: (t: number, u: number) => number) => mixInto(d, R, t0, dur, fn);

  const bass = [
    40, 40, 0, 40, 40, 0, 43, 0, 40, 40, 0, 38, 0, 40, 0, 0,
    40, 0, 40, 43, 0, 45, 0, 43, 40, 0, 38, 0, 40, 40, 0, 0,
    40, 40, 40, 0, 43, 0, 40, 0, 45, 0, 43, 0, 40, 0, 38, 40,
    41, 0, 40, 0, 38, 0, 40, 40, 43, 0, 41, 0, 40, 0, 0, 0,
  ];
  const lead = [
    0, 0, 0, 0, 0, 0, 0, 0, 64, 0, 0, 67, 0, 0, 64, 0,
    67, 0, 69, 0, 0, 71, 0, 69, 67, 0, 64, 0, 0, 0, 0, 0,
    64, 0, 67, 69, 0, 71, 0, 72, 0, 71, 69, 0, 67, 0, 64, 0,
    76, 0, 0, 74, 72, 0, 71, 0, 69, 0, 67, 64, 0, 0, 0, 0,
  ];

  for (let s = 0; s < steps; s++) {
    const t = s * st;
    const bar = s & 15;
    if (bar % 4 === 0 || bar === 6 || bar === 14) {
      mix(t, 0.13, (x, u) => Math.sin(x * (150 - u * 120) * 6.283) * (1 - u) ** 2 * 0.85);
    }
    if (bar === 4 || bar === 12) {
      mix(t, 0.09, (x, u) => {
        const nse = Math.random() * 2 - 1;
        return (nse * 0.75 + Math.sin(x * 180 * 6.283) * 0.25) * (1 - u) ** 2 * 0.42;
      });
    }
    if (s % 2 === 0) {
      mix(t, 0.028, (_x, u) => (Math.random() * 2 - 1) * (1 - u) * (bar % 4 === 0 ? 0.14 : 0.08));
    }
    if (s === 60) {
      mix(t, 0.35, (x, u) => (Math.random() * 2 - 1) * (1 - u) ** 1.6 * 0.28 + Math.sin(x * 80 * 6.283) * (1 - u) * 0.12);
    }
    const b = bass[s];
    if (b) {
      const f = hz(b);
      mix(t, 0.155, (x, u) => {
        const env = u < 0.07 ? u / 0.07 : (1 - u) ** 1.15;
        const ph = x * f * 6.283;
        return Math.tanh((Math.sign(Math.sin(ph)) + Math.sin(ph * 2) * 0.35 + Math.sin(x * hz(b + 7) * 6.283) * 0.22) * 1.6) * env * 0.36;
      });
    }
    const l = lead[s];
    if (l) {
      const f = hz(l);
      mix(t, 0.24, (x, u) => {
        const env = u < 0.04 ? u / 0.04 : (1 - u) ** 1.35;
        const ph = x * f * 6.283;
        const saw = (ph % 6.283) / 3.1416 - 1;
        return (saw * 0.55 + Math.sin(ph * 1.01) * 0.3) * env * 0.2;
      });
    }
  }

  const df = Math.round((N / R) * 82.41) * R / N;
  for (let i = 0; i < N; i++) {
    const t = i / R;
    const drone = Math.sin(t * df * 6.283) * 0.045 * (0.72 + 0.28 * Math.sin(t * Math.PI * 4 / (N / R)));
    d[i] = Math.tanh(d[i] + drone);
  }
  return buf;
};

const bootMus = () => {
  const ac = audio as AudioContext;
  gSoft = loopSrc(ac, mkSoft(ac), 0.2);
  gRage = loopSrc(ac, mkRage(ac), 0);
};

export const playRageTheme = () => {
  if (!gSoft || !gRage || onRage) return;
  onRage = 1;
  fade(gSoft, 0, 1.15);
  fade(gRage, 0.22, 0.7);
};

export const playSoftTheme = () => {
  if (!gSoft || !gRage || !onRage) return;
  onRage = 0;
  fade(gRage, 0, 0.9);
  fade(gSoft, 0.2, 1.3);
};

export const zzfx = (
  p = 1, k = 0.05, b = 220, e = 0, r = 0, t = 0.1, q = 0, D = 1, u = 0, n = 0,
) => {
  if (!audio) return;
  const R = audio.sampleRate;
  const A = (e * R) | 0, S = (r * R) | 0, Rel = (t * R) | 0;
  const N = Math.max(A + S + Rel, 1);
  const buf = audio.createBuffer(1, N, R);
  const d = buf.getChannelData(0);
  b *= (Math.PI * 2) / R * (1 + k * (Math.random() * 2 - 1));
  const sl = (u * Math.PI * 2) / R / R;
  let f = 0;
  for (let i = 0; i < N; i++) {
    let env = i < A ? i / A : i < A + S ? 1 : 1 - (i - A - S) / Rel;
    if (env < 0) env = 0;
    f += b + sl * i;
    let s = q < 1 ? Math.sin(f) : q < 2 ? Math.sign(Math.sin(f)) : q < 3 ? (Math.random() * 2 - 1) : (f % (Math.PI * 2) / Math.PI - 1);
    if (n) s = s * (1 - n) + (Math.random() * 2 - 1) * n;
    d[i] = Math.sign(s) * Math.abs(s) ** D * env * p * 0.3;
  }
  const o = audio.createBufferSource();
  o.buffer = buf;
  o.connect(audio.destination);
  o.start();
};

export const soundShoot = () => zzfx(0.4, 0, 780, 0.01, 0, 0.04, 1, 2, -8);
export const soundHit = () => zzfx(0.5, 0.1, 220, 0, 0.02, 0.07, 3);
export const soundUnicornDie = () => zzfx(0.8, 0.1, 140, 0.02, 0.04, 0.18, 3, 0.6);
export const soundBlood = () => {
  if ((tickN++ % 6) === 0) zzfx(0.2, 0, 880, 0, 0, 0.03, 1);
};
export const soundHurt = () => zzfx(0.8, 0.15, 110, 0.01, 0.04, 0.14, 3);
export const soundPickup = () => zzfx(0.4, 0, 660, 0.01, 0, 0.07, 1, 1.4);
export const soundRevive = () => zzfx(0.55, 0, 480, 0.05, 0.1, 0.22, 0, 1, 2);
export const soundSting = () => zzfx(1, 0.1, 70, 0.02, 0.12, 0.28, 3, 1.4, -2);
export const soundAlarm = () => zzfx(0.7, 0, 280, 0.02, 0.14, 0.2, 1, 2, 4);
export const soundDie = () => zzfx(1, 0.2, 55, 0.02, 0.18, 0.35, 3);
