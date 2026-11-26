// Intro audio. Everything here is optional: failures are swallowed so the app works silently.
let ctx: AudioContext | null = null;
let noiseSrc: AudioBufferSourceNode | null = null;
let voice: HTMLAudioElement | null = null;
let muted = false;

export const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function startCrackle(): void {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      // sparse pops over a faint hiss
      d[i] = (Math.random() * 2 - 1) * 0.015 + (Math.random() < 0.0009 ? (Math.random() * 2 - 1) * 0.6 : 0);
    }
    noiseSrc = ctx.createBufferSource();
    noiseSrc.buffer = buf;
    noiseSrc.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + 0.6);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 6);
    noiseSrc.connect(filter).connect(gain).connect(ctx.destination);
    noiseSrc.start();
    noiseSrc.stop(ctx.currentTime + 6.2);
  } catch {
    /* silent */
  }
}

/** One typewriter strike: a short noise burst plus a low thud. Timing is scheduled on the audio clock. */
function strike(c: AudioContext, at: number, heavy = false): void {
  const len = Math.floor(c.sampleRate * 0.04);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.18));
  const src = c.createBufferSource();
  src.buffer = buf;
  const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 1400;
  const g = c.createGain(); g.gain.value = heavy ? 0.5 : 0.32;
  src.connect(hp).connect(g).connect(c.destination);
  src.start(at);
  const o = c.createOscillator(); o.frequency.setValueAtTime(heavy ? 150 : 110, at); o.frequency.exponentialRampToValueAtTime(50, at + 0.05);
  const og = c.createGain(); og.gain.setValueAtTime(0.18, at); og.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
  o.connect(og).connect(c.destination); o.start(at); o.stop(at + 0.08);
}

/** Carriage bell, then a paper rustle (filtered noise swell). */
function bellAndRustle(c: AudioContext, at: number): void {
  const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = 2480;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.14, at + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
  o.connect(g).connect(c.destination); o.start(at); o.stop(at + 0.95);
  const len = Math.floor(c.sampleRate * 0.7);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) { const t = i / len; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * t) * (0.5 + 0.5 * Math.sin(t * 90)); }
  const s = c.createBufferSource(); s.buffer = buf;
  const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 0.6;
  const rg = c.createGain(); rg.gain.value = 0.16;
  s.connect(bp).connect(rg).connect(c.destination); s.start(at + 0.25);
}

/** The sound-on moment: n keystrokes spread over `ms`, ending on the bell. Returns the strike offsets in ms. */
export function typewriterPlan(n: number, ms: number): number[] {
  const out: number[] = [];
  let t = 0;
  const step = ms / Math.max(1, n);
  for (let i = 0; i < n; i++) { out.push(Math.round(t)); t += step * (0.7 + ((i * 7) % 5) * 0.15); }
  const k = out[out.length - 1] ? ms / out[out.length - 1] : 1;
  return out.map((v) => Math.round(v * Math.min(1, k)));
}

export function playTypewriter(n: number, ms: number): void {
  if (muted) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = ctx || new AC();
    ctx = c;
    if (c.state === 'suspended') void c.resume();
    const t0 = c.currentTime + 0.05;
    typewriterPlan(n, ms).forEach((o, i) => strike(c, t0 + o / 1000, i % 9 === 8));
    bellAndRustle(c, t0 + ms / 1000 + 0.05);
  } catch {
    /* silent */
  }
}

export function startIntro(): void {
  if (muted) return;
  startCrackle();
  /* The voice file is optional. Only request it when a build ships it (VITE_JOAN_INTRO_AUDIO=1),
     otherwise a static host would log a 404 console error. */
  if (import.meta.env.VITE_JOAN_INTRO_AUDIO !== '1') return;
  try {
    voice = new Audio(`${import.meta.env.BASE_URL}audio/joan-intro.mp3`);
    voice.preload = 'auto';
    voice.addEventListener('error', () => { voice = null; });
    const p = voice.play();
    if (p && typeof p.catch === 'function') p.catch(() => { voice = null; });
  } catch {
    voice = null;
  }
}

export function toggleMute(): boolean {
  muted = !muted;
  if (voice) voice.muted = muted;
  if (ctx) { muted ? ctx.suspend() : ctx.resume(); }
  return muted;
}
export const isMuted = () => muted;
