import { useSyncExternalStore } from 'react';

export interface Session {
  id: string;
  date: string; // YYYY-MM-DD, local time
  minutes: number;
  focus: string[];
  riffId?: string;
  bpm?: number;
  notes?: string;
  createdAt: number;
}

/** Prefill for the log form; `fromTimer` resets the session timer once saved. */
export type Draft = Partial<Session> & { fromTimer?: boolean };

export interface LogState {
  sessions: Session[];
  /** Daily goal in minutes. */
  goal: number;
  timer: { startedAt: number | null; accumulated: number };
  /** Set by "Log this" buttons elsewhere in the app. */
  draft: Draft | null;
}

export const FOCUS_AREAS = [
  'Technique',
  'Scales',
  'Chords',
  'Rhythm',
  'Riffs',
  'Songs',
  'Improvisation',
  'Ear training',
  'Theory',
];

const KEY = 'woodshed:log';

export const today = () => toISODate(new Date());
export const toISODate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISODate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

function load(): LogState {
  const base: LogState = { sessions: [], goal: 30, timer: { startedAt: null, accumulated: 0 }, draft: null };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { ...base, sessions: Array.isArray(p.sessions) ? p.sessions : [], goal: p.goal ?? 30, timer: p.timer ?? base.timer };
    }
  } catch {
    /* ignore */
  }
  return base;
}

class LogStore {
  private state = load();
  private listeners = new Set<() => void>();

  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };
  get = () => this.state;

  private set(patch: Partial<LogState>) {
    this.state = { ...this.state, ...patch };
    const { sessions, goal, timer } = this.state;
    try {
      localStorage.setItem(KEY, JSON.stringify({ sessions, goal, timer }));
    } catch {
      /* ignore */
    }
    this.listeners.forEach((l) => l());
  }

  add(s: Omit<Session, 'id' | 'createdAt'>) {
    const session: Session = { ...s, id: crypto.randomUUID(), createdAt: Date.now() };
    this.set({ sessions: [...this.state.sessions, session] });
    return session;
  }

  remove(id: string) {
    this.set({ sessions: this.state.sessions.filter((s) => s.id !== id) });
  }

  restore(session: Session) {
    this.set({ sessions: [...this.state.sessions, session] });
  }

  setGoal(goal: number) {
    this.set({ goal: Math.max(5, Math.min(240, goal)) });
  }

  setDraft(draft: Draft | null) {
    this.set({ draft });
  }

  // ── Session timer ──
  timerMs(now = Date.now()) {
    const { startedAt, accumulated } = this.state.timer;
    return accumulated + (startedAt ? now - startedAt : 0);
  }
  startTimer() {
    if (!this.state.timer.startedAt) this.set({ timer: { ...this.state.timer, startedAt: Date.now() } });
  }
  pauseTimer() {
    if (this.state.timer.startedAt) this.set({ timer: { startedAt: null, accumulated: this.timerMs() } });
  }
  resetTimer() {
    this.set({ timer: { startedAt: null, accumulated: 0 } });
  }

  // ── Backup ──
  exportJSON() {
    return JSON.stringify({ app: 'woodshed', version: 1, goal: this.state.goal, sessions: this.state.sessions }, null, 2);
  }
  /** Merge sessions from a backup, skipping ones already present. Returns how many were added. */
  importJSON(text: string) {
    const data = JSON.parse(text);
    if (!Array.isArray(data.sessions)) throw new Error('Not a Woodshed practice log backup.');
    const have = new Set(this.state.sessions.map((s) => s.id));
    const fresh = (data.sessions as Session[]).filter(
      (s) => s && typeof s.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date) && s.minutes > 0 && !have.has(s.id),
    );
    this.set({ sessions: [...this.state.sessions, ...fresh] });
    return fresh.length;
  }
}

export const practiceLog = new LogStore();

export function usePracticeLog() {
  return useSyncExternalStore(practiceLog.subscribe, practiceLog.get);
}

// ── Stats ──

export function minutesByDate(sessions: Session[]) {
  const map = new Map<string, number>();
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + s.minutes);
  return map;
}

export function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

/** Consecutive days with practice, ending today (or yesterday, so the streak survives until you play today). */
export function currentStreak(byDate: Map<string, number>, now = new Date()) {
  let day = byDate.get(toISODate(now)) ? now : addDays(now, -1);
  let n = 0;
  while (byDate.get(toISODate(day))) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

export function longestStreak(byDate: Map<string, number>) {
  const days = [...byDate.keys()].filter((d) => byDate.get(d)! > 0).sort();
  let best = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = fromISODate(d);
    run = prev && toISODate(addDays(prev, 1)) === d ? run + 1 : 1;
    best = Math.max(best, run);
    prev = cur;
  }
  return best;
}

export function formatMinutes(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}
