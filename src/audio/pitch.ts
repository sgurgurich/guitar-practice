import { audio } from './context';

/**
 * YIN pitch detection. Returns frequency in Hz and a 0–1 clarity, or null when
 * there is no clear periodic signal.
 */
export function detectPitch(buf: Float32Array, sampleRate: number): { freq: number; clarity: number } | null {
  let rms = 0;
  for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / buf.length);
  if (rms < 0.008) return null;

  const W = Math.floor(buf.length / 2);
  const tauMin = Math.max(2, Math.floor(sampleRate / 1400));
  const tauMax = Math.min(W - 1, Math.floor(sampleRate / 55));

  const d = new Float32Array(tauMax + 2);
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    let sum = 0;
    for (let j = 0; j < W; j++) {
      const delta = buf[j] - buf[j + tau];
      sum += delta * delta;
    }
    d[tau] = sum;
  }

  // Cumulative mean normalised difference
  d[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax + 1; tau++) {
    running += d[tau];
    d[tau] = running === 0 ? 1 : (d[tau] * tau) / running;
  }

  const threshold = 0.15;
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (d[t] < threshold) {
      while (t + 1 <= tauMax && d[t + 1] < d[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau < 0) return null;

  // Parabolic interpolation for sub-sample accuracy
  const x0 = d[tau - 1];
  const x1 = d[tau];
  const x2 = d[tau + 1];
  const denom = x0 + x2 - 2 * x1;
  const better = denom !== 0 ? tau + (x0 - x2) / (2 * denom) : tau;

  return { freq: sampleRate / better, clarity: 1 - x1 };
}

export class PitchListener {
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(4096);

  async start() {
    const ctx = audio();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.source = ctx.createMediaStreamSource(this.stream);
    this.analyser = ctx.createAnalyser();
    this.analyser.fftSize = 4096;
    this.source.connect(this.analyser);
  }

  read() {
    if (!this.analyser) return null;
    this.analyser.getFloatTimeDomainData(this.buf);
    return detectPitch(this.buf, this.analyser.context.sampleRate);
  }

  /** Current input level, 0–1. */
  level() {
    let peak = 0;
    for (let i = 0; i < this.buf.length; i++) peak = Math.max(peak, Math.abs(this.buf[i]));
    return Math.min(1, peak * 2);
  }

  stop() {
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = this.source = this.analyser = null;
  }
}
