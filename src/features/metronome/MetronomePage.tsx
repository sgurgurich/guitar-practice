import { AnimatePresence, motion, useTransform } from 'motion/react';
import { Minus, Pause, Play, Plus, TrendingUp, Volume2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Range, Segmented, Switch } from '../../components/controls';
import type { Accent } from '../../audio/metronome';
import { BPM_MAX, BPM_MIN, ballPosition, metronome, tempoName, useMetronome } from './controller';
import './metronome.css';

const PRESETS: { label: string; beats: number; den: number; accents: Accent[] }[] = [
  { label: '2/4', beats: 2, den: 4, accents: [2, 1] },
  { label: '3/4', beats: 3, den: 4, accents: [2, 1, 1] },
  { label: '4/4', beats: 4, den: 4, accents: [2, 1, 1, 1] },
  { label: '5/4', beats: 5, den: 4, accents: [2, 1, 1, 1, 1] },
  { label: '6/8', beats: 6, den: 8, accents: [2, 1, 1, 2, 1, 1] },
  { label: '7/8', beats: 7, den: 8, accents: [2, 1, 1, 2, 1, 2, 1] },
  { label: '12/8', beats: 12, den: 8, accents: [2, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1] },
];

export default function MetronomePage() {
  const m = useMetronome();
  const { settings } = m;

  useKeyboard();

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Metronome</h1>
          <p>Lock in your time. Keeps running while you explore the other tools.</p>
        </div>
        <div className="row faint" style={{ fontSize: 13 }}>
          <span className="kbd">Space</span> start/stop <span className="kbd">← →</span> ±1 <span className="kbd">↑ ↓</span> ±5{' '}
          <span className="kbd">T</span> tap
        </div>
      </header>

      <div className="metro-grid">
        <section className="card metro-main">
          <Dial />
          <BeatBall />
          <div className="metro-controls">
            <motion.button whileTap={{ scale: 0.88 }} className="btn btn-icon" aria-label="Slower" onClick={() => metronome.update({ bpm: settings.bpm - 1 })}>
              <Minus size={18} />
            </motion.button>
            <Range label="Tempo" value={settings.bpm} min={BPM_MIN} max={BPM_MAX} onChange={(bpm) => metronome.update({ bpm })} />
            <motion.button whileTap={{ scale: 0.88 }} className="btn btn-icon" aria-label="Faster" onClick={() => metronome.update({ bpm: settings.bpm + 1 })}>
              <Plus size={18} />
            </motion.button>
          </div>
          <div className="metro-actions">
            <TapButton />
            <PlayButton running={m.running} />
            <div className="bpm-jumps">
              {[-10, +10].map((d) => (
                <button key={d} className="btn btn-sm" onClick={() => metronome.update({ bpm: settings.bpm + d })}>
                  {d > 0 ? `+${d}` : d}
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <h3 className="card-title">Time signature</h3>
            <Segmented
              wrap
              label="Time signature"
              value={PRESETS.find((p) => p.beats === settings.beats && p.den === settings.den)?.label ?? ''}
              options={PRESETS.map((p) => ({ value: p.label, label: p.label }))}
              onChange={(label) => {
                const p = PRESETS.find((x) => x.label === label)!;
                metronome.update({ beats: p.beats, den: p.den, accents: p.accents });
              }}
            />
            <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
              <span className="muted">Beats per bar</span>
              <Stepper value={settings.beats} min={1} max={16} onChange={(beats) => metronome.update({ beats })} />
            </div>
          </section>

          <section className="card">
            <h3 className="card-title">Subdivision</h3>
            <Segmented
              label="Subdivision"
              value={settings.subdivision}
              options={[
                { value: 1, label: 'Quarter' },
                { value: 2, label: 'Eighths' },
                { value: 3, label: 'Triplets' },
                { value: 4, label: '16ths' },
              ]}
              onChange={(subdivision) => metronome.update({ subdivision })}
            />
          </section>

          <section className="card">
            <h3 className="card-title">Sound</h3>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <Segmented
                label="Click sound"
                value={settings.sound}
                options={[
                  { value: 'wood', label: 'Woodblock' },
                  { value: 'click', label: 'Click' },
                  { value: 'beep', label: 'Beep' },
                ]}
                onChange={(sound) => metronome.setSound(sound)}
              />
            </div>
            <div className="row volume-row">
              <Volume2 size={16} className="faint" />
              <Range label="Volume" value={Math.round(settings.volume * 100)} min={0} max={100} onChange={(v) => metronome.update({ volume: v / 100 })} />
            </div>
          </section>

          <TrainerCard />
          <SessionCard />
        </div>
      </div>
    </div>
  );
}

function Dial() {
  const { settings, tick, running } = useMetronome();
  const { beats, accents, bpm, subdivision } = settings;
  const size = 340;
  const c = size / 2;
  const r = 148;
  const gap = beats === 1 ? 0 : Math.min(10, 120 / beats);
  const seg = 360 / beats;

  return (
    <div className="dial">
      <svg viewBox={`0 0 ${size} ${size}`} className="dial-svg">
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={c} cy={c} r={r - 26} className="dial-inner" />
        {Array.from({ length: beats }, (_, i) => {
          const a0 = i * seg + gap / 2;
          const a1 = (i + 1) * seg - gap / 2;
          const on = running && tick?.beat === i;
          const accent = accents[i] ?? 1;
          return (
            <g key={i} className="beat-seg" onClick={() => metronome.cycleAccent(i)}>
              <path
                d={beats === 1 ? circlePath(c, r) : arc(c, c, r, a0, a1)}
                className={`beat-arc a${accent} ${on ? 'on' : ''}`}
                filter={on ? 'url(#glow)' : undefined}
              />
              <path d={beats === 1 ? circlePath(c, r) : arc(c, c, r, a0, a1)} className="beat-hit" />
              {accent === 2 && (
                <circle
                  cx={c + (r + 18) * Math.sin(rad((a0 + a1) / 2))}
                  cy={c - (r + 18) * Math.cos(rad((a0 + a1) / 2))}
                  r={3}
                  className="accent-dot"
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="dial-center">
        <AnimatePresence>
          {running && tick && tick.sub === 0 && (accents[tick.beat] ?? 1) > 0 && (
            <motion.div
              key={tick.n}
              className={`ripple ${accents[tick.beat] === 2 ? 'accent' : ''}`}
              initial={{ scale: 0.55, opacity: 0.55 }}
              animate={{ scale: 1.25, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          )}
        </AnimatePresence>
        <div className="bpm-value">{bpm}</div>
        <div className="bpm-label">
          BPM · <span>{tempoName(bpm)}</span>
        </div>
        <div className="sub-dots" aria-hidden>
          {subdivision > 1 &&
            Array.from({ length: subdivision }, (_, i) => (
              <span key={i} className={running && tick?.sub === i ? 'on' : ''} />
            ))}
        </div>
        <div className="sig">
          {settings.beats}/{settings.den}
        </div>
      </div>
    </div>
  );
}

/** A ball that swings end to end, landing on each beat — easier to follow than a flash. */
function BeatBall() {
  const left = useTransform(ballPosition, [0, 1], ['0%', '100%']);
  const { running } = useMetronome();
  return (
    <div className={`ball-track ${running ? 'running' : ''}`} aria-hidden>
      <span className="ball-end" />
      <span className="ball-end right" />
      <motion.span className="ball" style={{ left }} />
    </div>
  );
}

function PlayButton({ running }: { running: boolean }) {
  return (
    <motion.button
      className={`play-btn ${running ? 'running' : ''}`}
      onClick={metronome.toggle}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.04 }}
      aria-label={running ? 'Stop' : 'Start'}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={running ? 'pause' : 'play'}
          initial={{ scale: 0.3, opacity: 0, rotate: -90 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          exit={{ scale: 0.3, opacity: 0, rotate: 90 }}
          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
          style={{ display: 'grid' }}
        >
          {running ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" style={{ marginLeft: 4 }} />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

const taps: number[] = [];
function tap() {
  const now = performance.now();
  if (taps.length && now - taps[taps.length - 1] > 2000) taps.length = 0;
  taps.push(now);
  if (taps.length > 6) taps.shift();
  if (taps.length >= 2) {
    const intervals = taps.slice(1).map((t, i) => t - taps[i]);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    metronome.update({ bpm: 60000 / avg });
  }
}

function TapButton() {
  const [n, setN] = useState(0);
  return (
    <motion.button
      className="btn tap-btn"
      whileTap={{ scale: 0.9 }}
      onPointerDown={() => {
        tap();
        setN((x) => x + 1);
      }}
    >
      <AnimatePresence>
        <motion.span
          key={n}
          className="tap-flash"
          initial={{ opacity: n ? 0.5 : 0, scale: 0.8 }}
          animate={{ opacity: 0, scale: 1.4 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>
      Tap
    </motion.button>
  );
}

function Stepper({ value, min, max, step = 1, onChange, suffix }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <div className="stepper">
      <button className="btn btn-sm btn-icon" onClick={() => onChange(Math.max(min, value - step))} aria-label="Decrease">
        <Minus size={14} />
      </button>
      <span className="stepper-val">
        {value}
        {suffix}
      </span>
      <button className="btn btn-sm btn-icon" onClick={() => onChange(Math.min(max, value + step))} aria-label="Increase">
        <Plus size={14} />
      </button>
    </div>
  );
}

function TrainerCard() {
  const { trainer, running, tick, settings } = useMetronome();
  const barsLeft = trainer.every - ((tick?.bar ?? 0) % trainer.every);
  return (
    <section className="card">
      <h3 className="card-title">
        <span className="row" style={{ gap: 6 }}>
          <TrendingUp size={14} /> Speed trainer
        </span>
        <Switch checked={trainer.enabled} onChange={(enabled) => metronome.updateTrainer({ enabled })} />
      </h3>
      <motion.div
        initial={false}
        animate={{ opacity: trainer.enabled ? 1 : 0.45 }}
        className="trainer-grid"
      >
        <span className="muted">Add</span>
        <Stepper value={trainer.step} min={1} max={20} suffix=" bpm" onChange={(step) => metronome.updateTrainer({ step })} />
        <span className="muted">Every</span>
        <Stepper value={trainer.every} min={1} max={32} suffix=" bars" onChange={(every) => metronome.updateTrainer({ every })} />
        <span className="muted">Up to</span>
        <Stepper value={trainer.target} min={BPM_MIN} max={BPM_MAX} step={5} suffix=" bpm" onChange={(target) => metronome.updateTrainer({ target })} />
      </motion.div>
      <AnimatePresence>
        {trainer.enabled && running && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="trainer-status"
          >
            {settings.bpm >= trainer.target ? 'Target reached — nice work!' : `Next bump in ${barsLeft} bar${barsLeft === 1 ? '' : 's'}`}
          </motion.p>
        )}
      </AnimatePresence>
    </section>
  );
}

function SessionCard() {
  const { running, startedAt, tick } = useMetronome();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [running]);
  const secs = running && startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  return (
    <section className="card session">
      <div>
        <div className="session-val">
          {Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}
        </div>
        <div className="faint">Elapsed</div>
      </div>
      <div>
        <div className="session-val">{running && tick ? tick.bar + 1 : 0}</div>
        <div className="faint">Bar</div>
      </div>
    </section>
  );
}

function useKeyboard() {
  const ref = useRef(metronome);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.matches('input, select, textarea') || e.metaKey || e.ctrlKey || e.altKey) return;
      const m = ref.current;
      const bpm = m.get().settings.bpm;
      if (e.code === 'Space') {
        e.preventDefault();
        m.toggle();
      } else if (e.key === 'ArrowRight') m.update({ bpm: bpm + 1 });
      else if (e.key === 'ArrowLeft') m.update({ bpm: bpm - 1 });
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        m.update({ bpm: bpm + 5 });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        m.update({ bpm: bpm - 5 });
      } else if (e.key.toLowerCase() === 't') tap();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

const rad = (deg: number) => (deg * Math.PI) / 180;

function arc(cx: number, cy: number, r: number, a0: number, a1: number) {
  const p = (a: number) => [cx + r * Math.sin(rad(a)), cy - r * Math.cos(rad(a))];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
}

const circlePath = (c: number, r: number) => `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r}`;
