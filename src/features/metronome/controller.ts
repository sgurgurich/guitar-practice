import { motionValue } from 'motion/react';
import { useSyncExternalStore } from 'react';
import { audio } from '../../audio/context';
import { Metronome, type Accent, type ClickSound, type MetronomeSettings } from '../../audio/metronome';

export interface Trainer {
  enabled: boolean;
  step: number;
  every: number;
  target: number;
}

export interface MetronomeState {
  settings: MetronomeSettings & { den: number };
  trainer: Trainer;
  running: boolean;
  startedAt: number | null;
  /** The most recent finished run, so it can be logged after stopping. */
  lastRun: { seconds: number; bpm: number } | null;
  /** Latest tick that has become audible. */
  tick: { beat: number; sub: number; bar: number; n: number } | null;
}

const KEY = 'woodshed:metronome';

const DEFAULT: Pick<MetronomeState, 'settings' | 'trainer'> = {
  settings: { bpm: 90, beats: 4, den: 4, subdivision: 1, accents: [2, 1, 1, 1], sound: 'wood', volume: 0.8 },
  trainer: { enabled: false, step: 2, every: 4, target: 140 },
};

function load(): Pick<MetronomeState, 'settings' | 'trainer'> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { settings: { ...DEFAULT.settings, ...p.settings }, trainer: { ...DEFAULT.trainer, ...p.trainer } };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT;
}

export const BPM_MIN = 20;
export const BPM_MAX = 300;
export const clampBpm = (b: number) => Math.round(Math.min(BPM_MAX, Math.max(BPM_MIN, b)));

/** 0 → 1 → 0 swing position of the beat ball, updated every frame without React renders. */
export const ballPosition = motionValue(0);

class Controller {
  private state: MetronomeState = { ...load(), running: false, startedAt: null, lastRun: null, tick: null };
  private engine: Metronome | null = null;
  private listeners = new Set<() => void>();
  private raf = 0;
  private lastBeat = { time: 0, count: 0 };

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  get = () => this.state;

  private set(patch: Partial<MetronomeState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ settings: this.state.settings, trainer: this.state.trainer }));
    } catch {
      /* ignore */
    }
  }

  private getEngine() {
    if (!this.engine) {
      this.engine = new Metronome(this.state.settings);
      this.engine.onBar = (bar) => {
        const t = this.state.trainer;
        if (t.enabled && bar % t.every === 0 && this.state.settings.bpm < t.target) {
          this.update({ bpm: Math.min(t.target, this.state.settings.bpm + t.step) });
        }
      };
    }
    return this.engine;
  }

  update(patch: Partial<MetronomeState['settings']>) {
    const settings = { ...this.state.settings, ...patch };
    if (patch.bpm !== undefined) settings.bpm = clampBpm(patch.bpm);
    if (patch.beats !== undefined && !patch.accents) {
      settings.accents = Array.from({ length: settings.beats }, (_, i) => this.state.settings.accents[i] ?? (i === 0 ? 2 : 1)) as Accent[];
    }
    this.set({ settings });
    this.engine?.update(settings);
    this.persist();
  }

  updateTrainer(patch: Partial<Trainer>) {
    this.set({ trainer: { ...this.state.trainer, ...patch } });
    this.persist();
  }

  cycleAccent(beat: number) {
    const accents = [...this.state.settings.accents];
    accents[beat] = (((accents[beat] ?? 1) + 2) % 3) as Accent; // 2 → 1 → 0 → 2
    this.update({ accents });
  }

  setSound(sound: ClickSound) {
    this.update({ sound });
  }

  start() {
    if (this.state.running) return;
    const engine = this.getEngine();
    engine.update(this.state.settings);
    engine.start();
    this.lastBeat = { time: 0, count: 0 };
    this.set({ running: true, startedAt: Date.now(), tick: null });
    this.loop();
  }

  stop() {
    this.engine?.stop();
    cancelAnimationFrame(this.raf);
    ballPosition.set(0);
    const { startedAt, settings } = this.state;
    const seconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
    this.set({
      running: false,
      startedAt: null,
      tick: null,
      lastRun: seconds >= 30 ? { seconds, bpm: settings.bpm } : this.state.lastRun,
    });
  }

  toggle = () => (this.state.running ? this.stop() : this.start());

  private loop = () => {
    const engine = this.engine;
    if (!engine || !this.state.running) return;
    const ctx = audio();
    const now = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
    let latest = null;
    while (engine.queue.length && engine.queue[0].time <= now) latest = engine.queue.shift()!;
    if (latest) {
      if (latest.sub === 0) this.lastBeat = { time: latest.time, count: this.lastBeat.count + 1 };
      this.set({ tick: { ...latest, n: (this.state.tick?.n ?? 0) + 1 } });
    }
    if (this.lastBeat.count > 0) {
      const spb = 60 / this.state.settings.bpm;
      const p = Math.min(1, Math.max(0, (now - this.lastBeat.time) / spb));
      const eased = (1 - Math.cos(Math.PI * p)) / 2;
      ballPosition.set(this.lastBeat.count % 2 ? eased : 1 - eased);
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}

export const metronome = new Controller();

export function useMetronome() {
  return useSyncExternalStore(metronome.subscribe, metronome.get);
}

export function tempoName(bpm: number) {
  if (bpm < 40) return 'Grave';
  if (bpm < 60) return 'Largo';
  if (bpm < 66) return 'Larghetto';
  if (bpm < 76) return 'Adagio';
  if (bpm < 108) return 'Andante';
  if (bpm < 120) return 'Moderato';
  if (bpm < 156) return 'Allegro';
  if (bpm < 176) return 'Vivace';
  if (bpm < 200) return 'Presto';
  return 'Prestissimo';
}
