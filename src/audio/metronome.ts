import { audio, masterOut, noiseBuffer } from './context';

/** 2 = accent, 1 = normal, 0 = silent */
export type Accent = 0 | 1 | 2;
export type ClickSound = 'click' | 'wood' | 'beep';

export interface MetronomeSettings {
  bpm: number;
  beats: number;
  subdivision: 1 | 2 | 3 | 4;
  accents: Accent[];
  sound: ClickSound;
  volume: number;
}

export interface Tick {
  time: number;
  beat: number;
  sub: number;
  bar: number;
}

const LOOKAHEAD = 0.12;

export class Metronome {
  settings: MetronomeSettings;
  running = false;
  /** Scheduled ticks not yet shown on screen. */
  queue: Tick[] = [];
  onBar?: (bar: number) => void;

  private worker: Worker;
  private out: GainNode | null = null;
  private nextTime = 0;
  private beat = 0;
  private sub = 0;
  private bar = 0;

  constructor(settings: MetronomeSettings) {
    this.settings = settings;
    this.worker = new Worker(new URL('./timerWorker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = () => this.schedule();
  }

  update(settings: MetronomeSettings) {
    this.settings = settings;
    if (this.out) this.out.gain.value = settings.volume;
  }

  start() {
    const ctx = audio();
    if (!this.out) {
      this.out = ctx.createGain();
      this.out.connect(masterOut());
    }
    this.out.gain.value = this.settings.volume;
    this.nextTime = ctx.currentTime + 0.06;
    this.beat = this.sub = this.bar = 0;
    this.queue = [];
    this.running = true;
    this.schedule();
    this.worker.postMessage('start');
  }

  stop() {
    this.running = false;
    this.queue = [];
    this.worker.postMessage('stop');
  }

  dispose() {
    this.stop();
    this.worker.terminate();
  }

  private schedule() {
    if (!this.running) return;
    const ctx = audio();
    // If the context stalled (e.g. device change), don't fire a burst of catch-up clicks.
    if (this.nextTime < ctx.currentTime - 0.2) this.nextTime = ctx.currentTime + 0.05;
    while (this.nextTime < ctx.currentTime + LOOKAHEAD) {
      const { beat, sub, bar } = this;
      const accent = this.settings.accents[beat] ?? 1;
      if (sub === 0 && accent > 0) this.click(this.nextTime, accent === 2 ? 'accent' : 'beat');
      else if (sub > 0 && accent > 0) this.click(this.nextTime, 'sub');
      this.queue.push({ time: this.nextTime, beat, sub, bar });
      this.advance();
    }
  }

  private advance() {
    const { bpm, subdivision, beats } = this.settings;
    this.nextTime += 60 / bpm / subdivision;
    this.sub++;
    if (this.sub >= subdivision) {
      this.sub = 0;
      this.beat++;
      if (this.beat >= beats) {
        this.beat = 0;
        this.bar++;
        this.onBar?.(this.bar);
      }
    }
  }

  private click(time: number, level: 'accent' | 'beat' | 'sub') {
    const ctx = audio();
    const out = this.out!;
    const peak = level === 'accent' ? 1 : level === 'beat' ? 0.65 : 0.3;
    const env = ctx.createGain();
    env.connect(out);

    switch (this.settings.sound) {
      case 'click': {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = level === 'accent' ? 2000 : level === 'beat' ? 1500 : 1100;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(peak, time + 0.001);
        env.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
        osc.connect(env);
        osc.start(time);
        osc.stop(time + 0.05);
        break;
      }
      case 'wood': {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer();
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = level === 'accent' ? 2200 : level === 'beat' ? 1600 : 1200;
        bp.Q.value = 9;
        const osc = ctx.createOscillator();
        osc.frequency.setValueAtTime(bp.frequency.value * 0.55, time);
        osc.frequency.exponentialRampToValueAtTime(bp.frequency.value * 0.45, time + 0.04);
        const og = ctx.createGain();
        og.gain.value = 0.35;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(peak * 2.2, time + 0.0015);
        env.gain.exponentialRampToValueAtTime(0.0001, time + 0.06);
        src.connect(bp).connect(env);
        osc.connect(og).connect(env);
        src.start(time, Math.random() * 0.5, 0.08);
        osc.start(time);
        osc.stop(time + 0.08);
        break;
      }
      case 'beep': {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = level === 'accent' ? 880 : level === 'beat' ? 660 : 523.25;
        env.gain.setValueAtTime(0, time);
        env.gain.linearRampToValueAtTime(peak * 0.9, time + 0.003);
        env.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
        osc.connect(env);
        osc.start(time);
        osc.stop(time + 0.1);
        break;
      }
    }
  }
}
