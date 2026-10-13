// A small amp simulator: drive → tightening high-pass → pre-EQ → waveshaper
// (the distortion) → post-EQ → cabinet roll-off.

export type Tone = 'clean' | 'rock' | 'metal';
export const TONES: Tone[] = ['clean', 'rock', 'metal'];

export interface AmpPreset {
  /** Gain into the clipper — how hard it's driven. */
  drive: number;
  /** High-pass before clipping; higher = tighter, less flubby low end. */
  tight: number;
  mid: { freq: number; q: number; gain: number };
  /** Clipping curve hardness, and even-harmonic asymmetry. */
  hardness: number;
  asym: number;
  scoop: { freq: number; gain: number };
  low: number;
  presence: number;
  /** Speaker cabinet roll-off. */
  cab: number;
  /** Output level, matched so switching tones doesn't jump in loudness. */
  level: number;
}

export const AMP_PRESETS: Record<Exclude<Tone, 'clean'>, AmpPreset> = {
  // Classic-rock crunch: moderate gain, pushed mids.
  rock: {
    drive: 7,
    tight: 90,
    mid: { freq: 850, q: 0.8, gain: 5 },
    hardness: 2.6,
    asym: 0.18,
    scoop: { freq: 400, gain: -1 },
    low: 2,
    presence: 3,
    cab: 4200,
    level: 0.12,
  },
  // Modern high gain: boosted and tightened into heavy clipping, scooped mids.
  metal: {
    drive: 34,
    tight: 140,
    mid: { freq: 1250, q: 0.9, gain: 8 },
    hardness: 5,
    asym: 0.06,
    scoop: { freq: 520, gain: -7 },
    low: 5,
    presence: 4,
    cab: 4600,
    level: 0.095,
  },
};

function shapeCurve(hardness: number, asym: number) {
  const n = 4096;
  const curve = new Float32Array(n);
  let peak = 0;
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    curve[i] = Math.tanh(hardness * (x + asym * x * x));
    peak = Math.max(peak, Math.abs(curve[i]));
  }
  for (let i = 0; i < n; i++) curve[i] /= peak;
  return curve;
}

export function makeAmp(ctx: BaseAudioContext, p: AmpPreset) {
  const filter = (type: BiquadFilterType, freq: number, q = 0.7, gain = 0) => {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    f.gain.value = gain;
    return f;
  };
  const input = ctx.createGain();
  input.gain.value = p.drive;
  const shaper = ctx.createWaveShaper();
  shaper.curve = shapeCurve(p.hardness, p.asym);
  shaper.oversample = '4x';
  const output = ctx.createGain();
  output.gain.value = p.level;

  input
    .connect(filter('highpass', p.tight))
    .connect(filter('peaking', p.mid.freq, p.mid.q, p.mid.gain))
    .connect(shaper)
    .connect(filter('peaking', p.scoop.freq, 0.9, p.scoop.gain))
    .connect(filter('lowshelf', 120, 0.7, p.low))
    .connect(filter('peaking', 2700, 1, p.presence))
    .connect(filter('lowpass', p.cab, 0.8))
    .connect(filter('lowpass', p.cab * 1.3, 0.6))
    .connect(output);
  return { input, output };
}
