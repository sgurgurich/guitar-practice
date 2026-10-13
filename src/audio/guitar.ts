import { audio, masterOut } from './context';
import { AMP_PRESETS, TONES, makeAmp, type Tone } from './amp';
import { midiToFreq } from '../theory/notes';

// Karplus–Strong plucked string. Each note is rendered once into a buffer and cached.

interface Rendered {
  buffer: AudioBuffer;
  rate: number;
}

const DURATION = 3;
const buffers = new Map<number, Rendered>();

export function render(ctx: BaseAudioContext, midi: number): Rendered {
  const sr = ctx.sampleRate;
  const freq = midiToFreq(midi);
  // The two-point averaging filter adds half a sample of delay.
  const N = Math.max(2, Math.floor(sr / freq - 0.5));
  const actual = sr / (N + 0.5);
  const len = Math.floor(sr * DURATION);
  const buffer = ctx.createBuffer(1, len, sr);
  const d = buffer.getChannelData(0);

  // Excitation: softened noise, comb-filtered to mimic picking near the bridge.
  const exc = new Float32Array(N);
  let prev = 0;
  for (let i = 0; i < N; i++) {
    prev += 0.55 * (Math.random() * 2 - 1 - prev);
    exc[i] = prev;
  }
  const pickPos = Math.max(1, Math.round(N * 0.14));
  let mean = 0;
  for (let i = 0; i < N; i++) {
    d[i] = exc[i] - (i >= pickPos ? exc[i - pickPos] : 0);
    mean += d[i];
  }
  mean /= N;
  for (let i = 0; i < N; i++) d[i] -= mean;

  // Loop gain chosen so every note decays by ~-36 dB over ~2.4 s.
  const rho = Math.min(0.9995, Math.pow(0.016, 1 / (freq * 2.4)));
  d[N] = rho * 0.5 * d[0];
  for (let i = N + 1; i < len; i++) d[i] = rho * 0.5 * (d[i - N] + d[i - N - 1]);

  // Short fade at the tail to avoid a click.
  const fade = Math.floor(sr * 0.05);
  for (let i = 0; i < fade; i++) d[len - 1 - i] *= i / fade;

  return { buffer, rate: freq / actual };
}

// ── Tone (clean / rock / metal), shared by everything that plays guitar ──

const TONE_KEY = 'woodshed:tone';
let tone: Tone = (() => {
  try {
    const t = JSON.parse(localStorage.getItem(TONE_KEY) ?? '"clean"');
    return TONES.includes(t) ? t : 'clean';
  } catch {
    return 'clean';
  }
})();
const toneListeners = new Set<() => void>();
let toneGains: Record<Tone, GainNode> | null = null;

export const getTone = () => tone;
export const subscribeTone = (fn: () => void) => {
  toneListeners.add(fn);
  return () => toneListeners.delete(fn);
};

export function setTone(next: Tone) {
  tone = next;
  try {
    localStorage.setItem(TONE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  if (toneGains) {
    const t = audio().currentTime;
    for (const k of TONES) toneGains[k].gain.setTargetAtTime(k === next ? 1 : 0, t, 0.015);
  }
  toneListeners.forEach((l) => l());
}

let bus: AudioNode | null = null;
function guitarBus(ctx: AudioContext): AudioNode {
  if (!bus) {
    const body = ctx.createBiquadFilter();
    body.type = 'peaking';
    body.frequency.value = 190;
    body.Q.value = 1.1;
    body.gain.value = 4;
    const presence = ctx.createBiquadFilter();
    presence.type = 'peaking';
    presence.frequency.value = 2600;
    presence.Q.value = 0.9;
    presence.gain.value = 2;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 6000;
    body.connect(presence).connect(lp);

    // Every tone path stays connected; switching just crossfades their gains.
    const out = masterOut();
    const gains = {} as Record<Tone, GainNode>;
    for (const k of TONES) {
      const g = ctx.createGain();
      g.gain.value = k === tone ? 1 : 0;
      gains[k] = g;
      if (k === 'clean') lp.connect(g);
      else {
        const amp = makeAmp(ctx, AMP_PRESETS[k]);
        lp.connect(amp.input);
        amp.output.connect(g);
      }
      g.connect(out);
    }
    toneGains = gains;
    bus = body;
  }
  return bus;
}

const active = new Set<{ src: AudioBufferSourceNode; gain: GainNode }>();

export interface PluckHandle {
  /** Damp the note at `when` (e.g. the next note on the same string). */
  stop: (when: number) => void;
}

export function pluck(
  midi: number,
  opts: { when?: number; gain?: number; length?: number; bend?: number; vibrato?: boolean } = {},
): PluckHandle {
  const ctx = audio();
  let r = buffers.get(midi);
  if (!r) {
    r = render(ctx, midi);
    buffers.set(midi, r);
  }
  const when = Math.max(opts.when ?? ctx.currentTime, ctx.currentTime);
  const src = ctx.createBufferSource();
  src.buffer = r.buffer;
  src.playbackRate.value = r.rate;
  const gain = ctx.createGain();
  const level = opts.gain ?? 0.55;
  gain.gain.setValueAtTime(level, when);
  if (opts.length) {
    gain.gain.setValueAtTime(level, when + opts.length);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + opts.length + 0.12);
  }
  if (opts.bend) {
    // Pick, then push the string up to pitch.
    src.playbackRate.setValueAtTime(r.rate, when + 0.04);
    src.playbackRate.linearRampToValueAtTime(r.rate * Math.pow(2, opts.bend / 12), when + 0.22);
  }
  if (opts.vibrato) {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.setValueAtTime(0, when);
    depth.gain.linearRampToValueAtTime(r.rate * 0.012, when + 0.45);
    lfo.connect(depth).connect(src.playbackRate);
    lfo.start(when);
    lfo.stop(when + DURATION);
  }
  src.connect(gain).connect(guitarBus(ctx));
  src.start(when);
  const handle = { src, gain };
  active.add(handle);
  src.onended = () => active.delete(handle);
  return {
    stop: (t: number) => {
      if (!active.has(handle)) return;
      gain.gain.setTargetAtTime(0, t, 0.02);
      src.stop(t + 0.2);
      active.delete(handle);
    },
  };
}

/** Damp everything still ringing at `when`, like a new strum muting the last one. */
export function choke(when: number) {
  for (const h of active) {
    h.gain.gain.setTargetAtTime(0, when, 0.025);
    h.src.stop(when + 0.25);
  }
  active.clear();
}

/** Strum a set of notes (low → high for a downstroke). */
export function strum(
  midis: number[],
  opts: { when?: number; spacing?: number; up?: boolean; length?: number; velocity?: number; choke?: boolean } = {},
) {
  const ctx = audio();
  const when = opts.when ?? ctx.currentTime + 0.01;
  if (opts.choke) choke(when);
  const order = opts.up ? [...midis].sort((a, b) => b - a) : [...midis].sort((a, b) => a - b);
  const spacing = opts.spacing ?? 0.028;
  const gain = Math.min(0.5, 1.6 / Math.max(1, order.length)) * (opts.velocity ?? 1);
  order.forEach((m, i) => pluck(m, { when: when + i * spacing, gain, length: opts.length }));
}

/** Fade out everything currently ringing. */
export function silence() {
  const ctx = audio();
  const t = ctx.currentTime;
  for (const { src, gain } of active) {
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    src.stop(t + 0.1);
  }
  active.clear();
}

/**
 * Play a sequence with sample-accurate audio and UI callbacks that land on the beat.
 * Returns a cancel function.
 */
export function playSequence<T>(
  items: T[],
  stepSec: number | ((item: T) => number),
  onAudio: (item: T, when: number, index: number) => void,
  opts: { loop?: boolean; onStep?: (index: number) => void; onEnd?: () => void } = {},
): () => void {
  const ctx = audio();
  const dur = typeof stepSec === 'function' ? stepSec : () => stepSec;
  const timers: number[] = [];
  let cancelled = false;
  let i = 0;
  let t = ctx.currentTime + 0.08;

  const next = () => {
    if (cancelled) return;
    if (i >= items.length) {
      if (opts.loop && items.length) i = 0;
      else {
        timers.push(window.setTimeout(() => !cancelled && opts.onEnd?.(), (t - ctx.currentTime) * 1000));
        return;
      }
    }
    const idx = i;
    const item = items[idx];
    onAudio(item, t, idx);
    timers.push(window.setTimeout(() => !cancelled && opts.onStep?.(idx), Math.max(0, (t - ctx.currentTime) * 1000)));
    t += dur(item);
    i++;
    timers.push(window.setTimeout(next, Math.max(0, (t - ctx.currentTime - 0.2) * 1000)));
  };
  next();

  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
    silence();
  };
}

/** A short metronome-style tick, for count-ins and click tracks. */
export function tick(when: number, accent = false) {
  const ctx = audio();
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.value = accent ? 1800 : 1250;
  const env = ctx.createGain();
  env.gain.setValueAtTime(0, when);
  env.gain.linearRampToValueAtTime(accent ? 0.5 : 0.3, when + 0.001);
  env.gain.exponentialRampToValueAtTime(0.0001, when + 0.04);
  osc.connect(env).connect(masterOut());
  osc.start(when);
  osc.stop(when + 0.05);
}
