import { AnimatePresence, motion, useSpring, useTransform } from 'motion/react';
import { Mic, MicOff, Minus, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Segmented } from '../../components/controls';
import { pluck } from '../../audio/guitar';
import { PitchListener } from '../../audio/pitch';
import { useStored } from '../../state';
import { midiName, midiOctave } from '../../theory/notes';
import './tuner.css';

const TUNINGS: { id: string; name: string; notes: number[] }[] = [
  { id: 'standard', name: 'Standard', notes: [40, 45, 50, 55, 59, 64] },
  { id: 'dropd', name: 'Drop D', notes: [38, 45, 50, 55, 59, 64] },
  { id: 'eb', name: 'E♭ Standard', notes: [39, 44, 49, 54, 58, 63] },
  { id: 'dadgad', name: 'DADGAD', notes: [38, 45, 50, 55, 57, 62] },
  { id: 'openg', name: 'Open G', notes: [38, 43, 50, 55, 59, 62] },
  { id: 'opend', name: 'Open D', notes: [38, 45, 50, 54, 57, 62] },
];

interface Reading {
  midi: number; // nearest semitone
  cents: number;
  freq: number;
}

export default function TunerPage() {
  const [tuningId, setTuningId] = useStored('tuner-tuning', 'standard');
  const [a4, setA4] = useStored('tuner-a4', 440);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<Reading | null>(null);
  const [level, setLevel] = useState(0);
  const listener = useRef<PitchListener | null>(null);
  const tuning = TUNINGS.find((t) => t.id === tuningId) ?? TUNINGS[0];

  const cents = useSpring(0, { stiffness: 140, damping: 16 });
  const needle = useTransform(cents, (c) => Math.max(-50, Math.min(50, c)) * 1.2);

  useEffect(() => {
    if (!listening) return;
    let raf = 0;
    let frame = 0;
    let lastHeard = 0;
    const history: number[] = [];
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (++frame % 2) return;
      const l = listener.current;
      if (!l) return;
      const p = l.read();
      setLevel(l.level());
      const now = performance.now();
      if (p && p.clarity > 0.85 && p.freq > 30 && p.freq < 1500) {
        history.push(p.freq);
        if (history.length > 5) history.shift();
        const sorted = [...history].sort((a, b) => a - b);
        const freq = sorted[Math.floor(sorted.length / 2)];
        const exact = 69 + 12 * Math.log2(freq / a4);
        const midi = Math.round(exact);
        const c = (exact - midi) * 100;
        cents.set(c);
        setReading({ midi, cents: c, freq });
        lastHeard = now;
      } else if (now - lastHeard > 900) {
        history.length = 0;
        setReading(null);
        cents.set(0);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [listening, a4, cents]);

  useEffect(() => () => listener.current?.stop(), []);

  const toggle = async () => {
    if (listening) {
      listener.current?.stop();
      listener.current = null;
      setListening(false);
      setReading(null);
      setLevel(0);
      cents.set(0);
      return;
    }
    setError(null);
    try {
      const l = new PitchListener();
      await l.start();
      listener.current = l;
      setListening(true);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access was blocked. Allow it in your browser’s site settings and try again.'
          : 'Couldn’t access a microphone. Check that one is connected.',
      );
    }
  };

  const absC = reading ? Math.abs(reading.cents) : 99;
  const status = !reading ? 'idle' : absC < 4 ? 'good' : absC < 15 ? 'close' : 'off';
  const nearestString = reading
    ? tuning.notes.reduce((best, n, i) => (Math.abs(n - reading.midi) < Math.abs(tuning.notes[best] - reading.midi) ? i : best), 0)
    : -1;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Tuner</h1>
          <p>Chromatic tuner using your microphone. Tap a string below to hear its reference pitch.</p>
        </div>
        <Segmented label="Tuning" value={tuning.id} options={TUNINGS.map((t) => ({ value: t.id, label: t.name }))} onChange={setTuningId} />
      </header>

      <section className={`card tuner-card ${status}`}>
        <div className="gauge">
          <svg viewBox="-172 -168 344 184" className="gauge-svg">
            <defs>
              <linearGradient id="gauge-grad" x1="0" x2="1">
                <stop offset="0" stopColor="var(--bad)" />
                <stop offset="0.4" stopColor="var(--warn)" />
                <stop offset="0.5" stopColor="var(--good)" />
                <stop offset="0.6" stopColor="var(--warn)" />
                <stop offset="1" stopColor="var(--bad)" />
              </linearGradient>
            </defs>
            <path d={arcPath(130, -60, 60)} className="gauge-track" />
            <path d={arcPath(130, -60, 60)} className="gauge-color" stroke="url(#gauge-grad)" />
            {Array.from({ length: 21 }, (_, i) => {
              const c = -50 + i * 5;
              const a = (c * 1.2 * Math.PI) / 180;
              const major = c % 25 === 0;
              const r0 = major ? 104 : 110;
              return (
                <line
                  key={i}
                  x1={Math.sin(a) * r0}
                  y1={-Math.cos(a) * r0}
                  x2={Math.sin(a) * 117}
                  y2={-Math.cos(a) * 117}
                  className={`gauge-tick ${major ? 'major' : ''}`}
                />
              );
            })}
            {[-50, -25, 0, 25, 50].map((c) => {
              const a = (c * 1.2 * Math.PI) / 180;
              return (
                <text key={c} x={Math.sin(a) * 152} y={-Math.cos(a) * 152} dy="0.35em" className="gauge-num">
                  {c > 0 ? `+${c}` : c}
                </text>
              );
            })}
            {/* The invisible half makes the group's box symmetric so it pivots on the hub. */}
            <motion.g style={{ rotate: needle, transformBox: 'fill-box', transformOrigin: 'center' }}>
              <line x1={0} y1={124} x2={0} y2={-124} stroke="transparent" />
              <line x1={0} y1={8} x2={0} y2={-124} className="needle" />
            </motion.g>
            <circle r={8} className="needle-hub" />
          </svg>

          <div className="tuner-readout">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={reading ? reading.midi : 'none'}
                className="tuner-note"
                initial={{ opacity: 0, scale: 0.8, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -8 }}
                transition={{ type: 'spring', stiffness: 400, damping: 26 }}
              >
                {reading ? (
                  <>
                    {midiName(reading.midi)}
                    <sub>{midiOctave(reading.midi)}</sub>
                  </>
                ) : (
                  '–'
                )}
              </motion.div>
            </AnimatePresence>
            <div className="tuner-sub">
              {reading ? (
                <>
                  <span className="cents">
                    {reading.cents > 0 ? '+' : ''}
                    {reading.cents.toFixed(0)}¢
                  </span>
                  <span className="faint">{reading.freq.toFixed(1)} Hz</span>
                </>
              ) : (
                <span className="faint">{listening ? 'Play a string…' : 'Microphone off'}</span>
              )}
            </div>
            <div className="tuner-hint">
              {status === 'good' ? 'In tune' : status === 'close' || status === 'off' ? (reading!.cents < 0 ? 'Tune up ↑' : 'Tune down ↓') : ' '}
            </div>
          </div>
        </div>

        <div className="tuner-actions">
          <motion.button whileTap={{ scale: 0.94 }} className={`btn ${listening ? '' : 'btn-primary'} mic-btn`} onClick={toggle}>
            {listening ? <MicOff size={16} /> : <Mic size={16} />}
            {listening ? 'Stop listening' : 'Start tuner'}
          </motion.button>
          <div className="level" aria-hidden>
            <motion.span animate={{ width: `${Math.round(level * 100)}%` }} transition={{ duration: 0.08 }} />
          </div>
        </div>
        {error && <p className="tuner-error">{error}</p>}
      </section>

      <section className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title">
          {tuning.name} — reference tones
          <span className="row a4" style={{ gap: 6 }}>
            A4 =
            <button className="btn btn-sm btn-icon" onClick={() => setA4(Math.max(415, a4 - 1))} aria-label="Lower reference">
              <Minus size={13} />
            </button>
            <b>{a4} Hz</b>
            <button className="btn btn-sm btn-icon" onClick={() => setA4(Math.min(466, a4 + 1))} aria-label="Raise reference">
              <Plus size={13} />
            </button>
          </span>
        </h3>
        <div className="strings">
          {tuning.notes.map((n, i) => (
            <motion.button
              key={`${tuning.id}-${i}`}
              className={`string-btn ${nearestString === i ? 'near' : ''} ${nearestString === i && status === 'good' ? 'good' : ''}`}
              onClick={() => pluck(n + 12 * Math.log2(a4 / 440), { gain: 0.6 })}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileTap={{ scale: 0.92 }}
            >
              <span className="string-num">{6 - i}</span>
              <span className="string-note">
                {midiName(n)}
                <sub>{midiOctave(n)}</sub>
              </span>
              <span className="string-line" style={{ height: 1 + (5 - i) * 0.5 }} />
            </motion.button>
          ))}
        </div>
      </section>
    </div>
  );
}

function arcPath(r: number, a0: number, a1: number) {
  const p = (a: number) => [Math.sin((a * Math.PI) / 180) * r, -Math.cos((a * Math.PI) / 180) * r];
  const [x0, y0] = p(a0);
  const [x1, y1] = p(a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1}`;
}
