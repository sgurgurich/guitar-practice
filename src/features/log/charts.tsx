import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { addDays, formatMinutes, toISODate, today, type Session } from './store';

const niceMax = (v: number) => [30, 60, 90, 120, 180, 240, 300, 360, 480, 600].find((s) => s >= v) ?? Math.ceil(v / 60) * 60;
const longDate = (d: Date) => d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

/** Single-series column chart: one hue, hairline grid, value label on the tallest bar only. */
export function DailyChart({ byDate, sessions, goal }: { byDate: Map<string, number>; sessions: Session[]; goal: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const t = today();
  const data = Array.from({ length: 14 }, (_, i) => {
    const d = addDays(new Date(), i - 13);
    const key = toISODate(d);
    return { d, key, min: byDate.get(key) ?? 0, count: sessions.filter((s) => s.date === key).length };
  });
  const peak = Math.max(...data.map((x) => x.min));
  const max = niceMax(Math.max(goal, peak, 1));
  const peakIndex = peak > 0 ? data.findIndex((x) => x.min === peak) : -1;
  const pct = (v: number) => (v / max) * 100;

  return (
    <div className="daily-chart">
      <div className="dc-axis" aria-hidden>
        {[max, max / 2, 0].map((v) => (
          <span key={v} style={{ bottom: `${pct(v)}%` }}>
            {v}
          </span>
        ))}
      </div>
      <div className="dc-plot" onPointerLeave={() => setHover(null)}>
        {[max, max / 2, 0].map((v) => (
          <div key={v} className="dc-grid" style={{ bottom: `${pct(v)}%` }} />
        ))}
        <div className="dc-goal" style={{ bottom: `${pct(goal)}%` }}>
          <span>goal</span>
        </div>
        {data.map((x, i) => (
          <div
            key={x.key}
            className={`dc-slot ${hover === i ? 'hover' : ''}`}
            onPointerEnter={() => setHover(i)}
            role="img"
            aria-label={`${longDate(x.d)}: ${x.min} minutes`}
          >
            {x.min > 0 && (
              <motion.div
                className="dc-bar"
                initial={{ height: 0 }}
                animate={{ height: `${pct(x.min)}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 20, delay: i * 0.025 }}
              >
                {i === peakIndex && <span className="dc-peak">{x.min}</span>}
              </motion.div>
            )}
            <span className={`dc-x ${x.key === t ? 'today' : ''}`}>{x.d.getDate()}</span>
          </div>
        ))}
        <AnimatePresence>
          {hover !== null && (
            <motion.div
              className="chart-tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ left: `${((hover + 0.5) / data.length) * 100}%`, bottom: `${Math.min(100, pct(data[hover].min)) + 6}%` }}
            >
              <b>{longDate(data[hover].d)}</b>
              <span>
                {data[hover].min ? formatMinutes(data[hover].min) : 'No practice'}
                {data[hover].count > 1 ? ` · ${data[hover].count} sessions` : ''}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

const WEEKS = 20;
const level = (m: number) => (m <= 0 ? 0 : m < 15 ? 1 : m < 30 ? 2 : m < 60 ? 3 : 4);

/** Calendar heatmap: one sequential hue, light → strong with minutes practised. */
export function Heatmap({ byDate }: { byDate: Map<string, number> }) {
  const [hover, setHover] = useState<{ key: string; d: Date; col: number; row: number } | null>(null);
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const start = addDays(now, -mondayOffset - (WEEKS - 1) * 7);
  const t = today();

  const weeks = Array.from({ length: WEEKS }, (_, w) =>
    Array.from({ length: 7 }, (_, r) => {
      const d = addDays(start, w * 7 + r);
      const key = toISODate(d);
      return { d, key, future: key > t, min: byDate.get(key) ?? 0 };
    }),
  );

  return (
    <div className="heatmap">
      <div className="hm-body" onPointerLeave={() => setHover(null)}>
        <div className="hm-days" aria-hidden>
          <span />
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <div className="hm-grid">
          {weeks.map((week, w) => {
            const firstOfMonth = week.find((c) => c.d.getDate() === 1);
            const label = w === 0 ? week[0].d : firstOfMonth?.d;
            return (
              <div key={w} className="hm-week">
                <span className="hm-month">{label ? label.toLocaleDateString(undefined, { month: 'short' }) : ''}</span>
                {week.map((c, r) => (
                  <motion.span
                    key={c.key}
                    className={`hm-cell lv${level(c.min)} ${c.future ? 'future' : ''} ${c.key === t ? 'today' : ''}`}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={{ opacity: c.future ? 0 : 1, scale: 1 }}
                    transition={{ delay: (w * 7 + r) * 0.0025 }}
                    onPointerEnter={() => !c.future && setHover({ key: c.key, d: c.d, col: w, row: r })}
                  />
                ))}
              </div>
            );
          })}
        </div>
        <AnimatePresence>
          {hover && (
            <motion.div
              className="chart-tip"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
              style={{ left: `calc(30px + ${hover.col} * 16px + 6px)`, top: `calc(${hover.row} * 16px + 14px)` }}
            >
              <b>{longDate(hover.d)}</b>
              <span>{byDate.get(hover.key) ? formatMinutes(byDate.get(hover.key)!) : 'No practice'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="hm-legend" aria-hidden>
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <i key={l} className={`hm-cell lv${l}`} />
        ))}
        <span>More</span>
        <span className="faint hm-scale">0 · &lt;15 · &lt;30 · &lt;60 · 60+ min</span>
      </div>
    </div>
  );
}
