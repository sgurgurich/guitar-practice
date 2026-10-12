import { AnimatePresence, motion } from 'motion/react';
import { Check, Download, Flame, Minus, Pause, Play, Plus, RotateCcw, Trash2, Upload } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { RIFFS } from '../riffs/riffs';
import {
  FOCUS_AREAS,
  addDays,
  currentStreak,
  formatMinutes,
  fromISODate,
  longestStreak,
  minutesByDate,
  practiceLog,
  toISODate,
  today,
  usePracticeLog,
  type Session,
} from './store';
import { DailyChart, Heatmap } from './charts';
import './log.css';

const riffTitle = (id?: string) => RIFFS.find((r) => r.id === id)?.title;

export default function LogPage() {
  const log = usePracticeLog();
  const [toast, setToast] = useState<{ text: string; undo?: () => void; n: number } | null>(null);
  const byDate = useMemo(() => minutesByDate(log.sessions), [log.sessions]);

  const notify = (text: string, undo?: () => void) => setToast({ text, undo, n: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Practice Log</h1>
          <p>Time your sessions, log what you worked on, and keep the streak alive.</p>
        </div>
        <BackupButtons notify={notify} />
      </header>

      <div className="log-top">
        <TimerCard />
        <GoalCard minutesToday={byDate.get(today()) ?? 0} goal={log.goal} />
        <StatTiles byDate={byDate} sessions={log.sessions} />
      </div>

      <div className="log-grid">
        <LogForm notify={notify} />
        <div className="stack">
          <section className="card">
            <h3 className="card-title">Minutes per day · last 14 days</h3>
            <DailyChart byDate={byDate} sessions={log.sessions} goal={log.goal} />
          </section>
          <section className="card">
            <h3 className="card-title">Activity · last 20 weeks</h3>
            <Heatmap byDate={byDate} />
          </section>
        </div>
      </div>

      <History sessions={log.sessions} notify={notify} />

      <AnimatePresence>
        {toast && (
          <motion.div
            key={toast.n}
            className="toast"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            role="status"
          >
            <Check size={16} className="toast-icon" />
            {toast.text}
            {toast.undo && (
              <button
                className="toast-undo"
                onClick={() => {
                  toast.undo!();
                  setToast(null);
                }}
              >
                Undo
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Timer ──

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
}

export function useTimerMs() {
  const { timer } = usePracticeLog();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!timer.startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [timer.startedAt]);
  return { ms: practiceLog.timerMs(now), running: !!timer.startedAt };
}

function TimerCard() {
  const { ms, running } = useTimerMs();
  const minutes = Math.max(1, Math.round(ms / 60000));
  return (
    <section className={`card timer-card ${running ? 'running' : ''}`}>
      <h3 className="card-title">Session timer</h3>
      <div className="timer-value">{formatClock(ms)}</div>
      <div className="row" style={{ gap: 8 }}>
        <motion.button
          whileTap={{ scale: 0.92 }}
          className={`btn ${running ? '' : 'btn-primary'}`}
          onClick={() => (running ? practiceLog.pauseTimer() : practiceLog.startTimer())}
        >
          {running ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          {running ? 'Pause' : ms ? 'Resume' : 'Start'}
        </motion.button>
        <button
          className="btn"
          disabled={ms < 30000}
          onClick={() => {
            practiceLog.pauseTimer();
            practiceLog.setDraft({ minutes, fromTimer: true });
          }}
        >
          <Check size={15} /> Log {ms >= 30000 ? `${minutes} min` : ''}
        </button>
        <button className="btn btn-icon" aria-label="Reset timer" disabled={!ms} onClick={() => practiceLog.resetTimer()}>
          <RotateCcw size={15} />
        </button>
      </div>
    </section>
  );
}

// ── Daily goal ──

function GoalCard({ minutesToday, goal }: { minutesToday: number; goal: number }) {
  const pct = Math.min(1, minutesToday / goal);
  const r = 42;
  const c = 2 * Math.PI * r;
  const done = minutesToday >= goal;
  return (
    <section className={`card goal-card ${done ? 'done' : ''}`}>
      <svg viewBox="0 0 100 100" className="goal-ring" role="img" aria-label={`${minutesToday} of ${goal} minutes today`}>
        <circle cx="50" cy="50" r={r} className="goal-track" />
        <motion.circle
          cx="50"
          cy="50"
          r={r}
          className="goal-fill"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - pct) }}
          transition={{ type: 'spring', stiffness: 60, damping: 16 }}
        />
      </svg>
      <div className="goal-text">
        <div className="goal-value">
          {minutesToday}
          <span>/{goal}</span>
        </div>
        <div className="faint">{done ? 'Goal reached today' : 'minutes today'}</div>
        <div className="row goal-adjust">
          <button className="btn btn-sm btn-icon" aria-label="Lower daily goal" onClick={() => practiceLog.setGoal(goal - 5)}>
            <Minus size={13} />
          </button>
          <span className="faint">Daily goal</span>
          <button className="btn btn-sm btn-icon" aria-label="Raise daily goal" onClick={() => practiceLog.setGoal(goal + 5)}>
            <Plus size={13} />
          </button>
        </div>
      </div>
    </section>
  );
}

// ── Stats ──

function StatTiles({ byDate, sessions }: { byDate: Map<string, number>; sessions: Session[] }) {
  const streak = currentStreak(byDate);
  const best = longestStreak(byDate);
  let week = 0;
  for (let i = 0; i < 7; i++) week += byDate.get(toISODate(addDays(new Date(), -i))) ?? 0;
  const total = sessions.reduce((a, s) => a + s.minutes, 0);
  const tiles = [
    { label: 'Current streak', value: `${streak} day${streak === 1 ? '' : 's'}`, icon: streak > 0 },
    { label: 'Longest streak', value: `${best} day${best === 1 ? '' : 's'}` },
    { label: 'Last 7 days', value: formatMinutes(week) },
    { label: 'All time', value: formatMinutes(total), sub: `${sessions.length} session${sessions.length === 1 ? '' : 's'}` },
  ];
  return (
    <div className="stat-tiles">
      {tiles.map((t) => (
        <section key={t.label} className="card stat">
          <div className="stat-label">{t.label}</div>
          <div className="stat-value">
            {t.icon && (
              <motion.span
                className="flame"
                animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Flame size={20} />
              </motion.span>
            )}
            {t.value}
          </div>
          {t.sub && <div className="faint stat-sub">{t.sub}</div>}
        </section>
      ))}
    </div>
  );
}

// ── Form ──

const QUICK_MINUTES = [10, 15, 20, 30, 45, 60];

function LogForm({ notify }: { notify: (t: string, undo?: () => void) => void }) {
  const { draft } = usePracticeLog();
  const [date, setDate] = useState(today());
  const [minutes, setMinutes] = useState(20);
  const [focus, setFocus] = useState<string[]>([]);
  const [riffId, setRiffId] = useState('');
  const [bpm, setBpm] = useState('');
  const [notes, setNotes] = useState('');
  const [fromTimer, setFromTimer] = useState(false);
  const [flash, setFlash] = useState(0);
  const ref = useRef<HTMLElement>(null);

  // Prefill from "Log this" buttons elsewhere in the app.
  useEffect(() => {
    if (!draft) return;
    if (draft.minutes) setMinutes(draft.minutes);
    if (draft.focus) setFocus(draft.focus);
    setRiffId(draft.riffId ?? '');
    setBpm(draft.bpm ? String(draft.bpm) : '');
    if (draft.notes) setNotes(draft.notes);
    setFromTimer(!!draft.fromTimer);
    setDate(today());
    setFlash(Date.now());
    practiceLog.setDraft(null);
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [draft]);

  const save = () => {
    const session = practiceLog.add({
      date,
      minutes,
      focus,
      riffId: riffId || undefined,
      bpm: bpm ? Number(bpm) : undefined,
      notes: notes.trim() || undefined,
    });
    if (fromTimer) practiceLog.resetTimer();
    notify(`Logged ${formatMinutes(minutes)}`, () => practiceLog.remove(session.id));
    setNotes('');
    setRiffId('');
    setBpm('');
    setFromTimer(false);
  };

  return (
    <motion.section
      ref={ref}
      key={flash}
      className="card log-form"
      initial={flash ? { boxShadow: '0 0 0 4px var(--accent-soft)' } : false}
      animate={{ boxShadow: '0 0 0 0px rgba(0,0,0,0)' }}
      transition={{ duration: 1.4 }}
    >
      <h3 className="card-title">Log a session</h3>
      <div className="form-row">
        <label className="field">
          <span>Date</span>
          <input className="input" type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value || today())} />
        </label>
        <label className="field">
          <span>Minutes</span>
          <input
            className="input"
            type="number"
            min={1}
            max={600}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
          />
        </label>
      </div>
      <div className="quick-min">
        {QUICK_MINUTES.map((m) => (
          <button key={m} className={`chip-btn ${minutes === m ? 'on' : ''}`} onClick={() => setMinutes(m)}>
            {m}m
          </button>
        ))}
      </div>

      <div className="field">
        <span>What did you work on?</span>
        <div className="focus-chips">
          {FOCUS_AREAS.map((f) => {
            const on = focus.includes(f);
            return (
              <motion.button
                key={f}
                whileTap={{ scale: 0.92 }}
                className={`chip-btn ${on ? 'on' : ''}`}
                aria-pressed={on}
                onClick={() => setFocus(on ? focus.filter((x) => x !== f) : [...focus, f])}
              >
                {on && <Check size={12} />}
                {f}
              </motion.button>
            );
          })}
        </div>
      </div>

      <div className="form-row">
        <label className="field">
          <span>Riff (optional)</span>
          <select className="select" value={riffId} onChange={(e) => setRiffId(e.target.value)}>
            <option value="">—</option>
            {[...RIFFS]
              .sort((a, b) => a.difficulty - b.difficulty || a.title.localeCompare(b.title))
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Top clean BPM (optional)</span>
          <input className="input" type="number" min={20} max={400} value={bpm} onChange={(e) => setBpm(e.target.value)} placeholder="e.g. 120" />
        </label>
      </div>

      <label className="field">
        <span>Notes</span>
        <textarea className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What clicked, what to fix next time…" />
      </label>

      <button className="btn btn-primary save-btn" onClick={save}>
        <Check size={16} /> Save session
      </button>
    </motion.section>
  );
}

// ── History ──

function dayLabel(date: string) {
  const t = today();
  if (date === t) return 'Today';
  if (date === toISODate(addDays(new Date(), -1))) return 'Yesterday';
  return fromISODate(date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: date.slice(0, 4) === t.slice(0, 4) ? undefined : 'numeric' });
}

function History({ sessions, notify }: { sessions: Session[]; notify: (t: string, undo?: () => void) => void }) {
  const [limit, setLimit] = useState(20);
  const sorted = useMemo(() => [...sessions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt), [sessions]);
  const shown = sorted.slice(0, limit);
  const groups: [string, Session[]][] = [];
  for (const s of shown) {
    const last = groups[groups.length - 1];
    if (last && last[0] === s.date) last[1].push(s);
    else groups.push([s.date, [s]]);
  }

  return (
    <section className="card history">
      <h3 className="card-title">History</h3>
      {sessions.length === 0 ? (
        <p className="faint empty-history">No sessions yet. Start the timer, or log one above — every minute counts.</p>
      ) : (
        <div className="history-list">
          <AnimatePresence initial={false}>
            {groups.map(([date, list]) => (
              <motion.div key={date} layout="position" className="history-day" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="history-date">
                  <b>{dayLabel(date)}</b>
                  <span className="faint">{formatMinutes(list.reduce((a, s) => a + s.minutes, 0))}</span>
                </div>
                <AnimatePresence initial={false}>
                  {list.map((s) => (
                    <motion.div
                      key={s.id}
                      layout="position"
                      className="history-row"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.15 } }}
                    >
                      <span className="history-min">{formatMinutes(s.minutes)}</span>
                      <div className="history-body">
                        <div className="row" style={{ gap: 5 }}>
                          {s.focus.map((f) => (
                            <span key={f} className="chip small">
                              {f}
                            </span>
                          ))}
                          {riffTitle(s.riffId) && <span className="history-riff">{riffTitle(s.riffId)}</span>}
                          {s.bpm && <span className="faint history-bpm">{s.bpm} bpm</span>}
                        </div>
                        {s.notes && <p className="history-notes">{s.notes}</p>}
                      </div>
                      <button
                        className="mini history-del"
                        aria-label="Delete session"
                        onClick={() => {
                          practiceLog.remove(s.id);
                          notify('Session deleted', () => practiceLog.restore(s));
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
          {sorted.length > limit && (
            <button className="btn btn-sm show-more" onClick={() => setLimit((l) => l + 20)}>
              Show more
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ── Backup ──

function BackupButtons({ notify }: { notify: (t: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="row" style={{ gap: 8 }}>
      <button
        className="btn"
        onClick={() => {
          const blob = new Blob([practiceLog.exportJSON()], { type: 'application/json' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `woodshed-practice-log-${today()}.json`;
          a.click();
          URL.revokeObjectURL(a.href);
        }}
      >
        <Download size={15} /> Export
      </button>
      <button className="btn" onClick={() => input.current?.click()}>
        <Upload size={15} /> Import
      </button>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            const n = practiceLog.importJSON(await file.text());
            notify(n ? `Imported ${n} session${n === 1 ? '' : 's'}` : 'Nothing new to import');
          } catch {
            notify('That file isn’t a Woodshed backup');
          }
        }}
      />
    </div>
  );
}
