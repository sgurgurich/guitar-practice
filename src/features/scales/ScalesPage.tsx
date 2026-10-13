import { AnimatePresence, motion } from 'motion/react';
import { ArrowUpRight, Play, Square } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Fretboard, type FretMark } from '../../components/Fretboard';
import { IntervalLegend, RootPicker, Segmented, degColor } from '../../components/controls';
import { ToneToggle } from '../../components/ToneToggle';
import { pluck, playSequence } from '../../audio/guitar';
import { useApp, useStored } from '../../state';
import { harmonize } from '../../theory/harmonize';
import { STANDARD_TUNING, bestRoot, degreeLabel, degreeMap, degreeSemis, mod, noteName, notePc, spell } from '../../theory/notes';
import { MODE_BRIGHTNESS, SCALES, SCALE_GROUPS, getScale, scaleDegrees } from '../../theory/scales';
import { playChord } from '../circle/useProgressionPlayer';
import './scales.css';

interface ScaleView {
  label: 'note' | 'interval';
  frets: 12 | 15 | 22;
  position: number; // 0 = whole neck
}

const MAJOR_MODES = ['ionian', 'dorian', 'phrygian', 'lydian', 'mixolydian', 'aeolian', 'locrian'];
const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];

export default function ScalesPage() {
  const { scale, setScale, setChord, go } = useApp();
  const [view, setView] = useStored<ScaleView>('scale-view', { label: 'interval', frets: 15, position: 0 });
  const [active, setActive] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const cancel = useRef<(() => void) | null>(null);
  const groupId = useId();

  const def = getScale(scale.scaleId);
  const degrees = useMemo(() => scaleDegrees(def), [def]);
  const root = useMemo(() => bestRoot(scale.rootPc, degrees), [scale.rootPc, degrees]);
  const notes = useMemo(() => spell(root, degrees), [root, degrees]);
  const degMap = useMemo(() => degreeMap(scale.rootPc, degrees), [scale.rootPc, degrees]);
  const names = useMemo(() => new Map(notes.map((n) => [notePc(n), noteName(n)])), [notes]);
  const chords = useMemo(() => harmonize(scale.rootPc, degrees, notes), [scale.rootPc, degrees, notes]);
  const rootNames = useMemo(() => {
    const out: Record<number, string> = {};
    for (let pc = 0; pc < 12; pc++) out[pc] = noteName(bestRoot(pc, degrees));
    return out;
  }, [degrees]);

  // Positions: one per scale tone on the low E string, starting from the root.
  const positions = useMemo(() => {
    const rootFret = mod(scale.rootPc - STANDARD_TUNING[0]);
    return degrees.map((d) => {
      let f = rootFret + mod(degreeSemis(d));
      if (f > 12) f -= 12;
      const lo = Math.max(0, f - 1);
      return [lo, lo + 4] as [number, number];
    });
  }, [degrees, scale.rootPc]);

  const position = Math.min(view.position, positions.length);
  const win = position > 0 ? positions[position - 1] : null;
  const signature = useMemo(() => new Set(def.signature ?? []), [def]);

  const marks = useMemo<FretMark[]>(() => {
    const out: FretMark[] = [];
    for (let s = 0; s < 6; s++)
      for (let f = 0; f <= view.frets; f++) {
        const pc = mod(STANDARD_TUNING[s] + f);
        const deg = degMap.get(pc);
        if (!deg) continue;
        out.push({
          string: s,
          fret: f,
          label: view.label === 'note' ? names.get(pc)! : degreeLabel(deg),
          color: degColor(deg),
          root: deg === '1',
          ring: signature.has(deg),
          dim: !!win && (f < win[0] || f > win[1]),
          active: active === `${s}-${f}`,
        });
      }
    return out;
  }, [degMap, names, view.label, view.frets, win, active, signature]);

  const stop = () => {
    cancel.current?.();
    cancel.current = null;
    setPlaying(false);
    setActive(null);
  };

  // Changing the scale mid-playback would leave highlights pointing at stale notes.
  useEffect(() => stop, [scale.rootPc, scale.scaleId]);

  const playScale = () => {
    if (playing) return stop();
    const [lo, hi] = win ?? positions[0];
    const cells = marks
      .filter((m) => m.fret >= lo && m.fret <= hi)
      .map((m) => ({ s: m.string, f: m.fret, midi: STANDARD_TUNING[m.string] + m.fret }))
      .sort((a, b) => a.midi - b.midi || b.s - a.s);
    const seen = new Set<number>();
    const up = cells.filter((c) => !seen.has(c.midi) && seen.add(c.midi));
    // Start from the lowest root in the window
    const firstRoot = up.findIndex((c) => mod(c.midi) === scale.rootPc);
    const run = firstRoot > 0 ? up.slice(firstRoot) : up;
    const seq = [...run, ...run.slice(0, -1).reverse()];
    setPlaying(true);
    cancel.current = playSequence(seq, 0.24, (c, when) => pluck(c.midi, { when, gain: 0.5, length: 0.4 }), {
      onStep: (i) => setActive(`${seq[i].s}-${seq[i].f}`),
      onEnd: () => {
        cancel.current = null;
        setPlaying(false);
        setActive(null);
      },
    });
  };

  const modeIndex = MAJOR_MODES.indexOf(def.id);
  const parentPc = modeIndex >= 0 ? mod(scale.rootPc - MAJOR_SEMIS[modeIndex]) : null;
  const parentName = parentPc !== null ? noteName(bestRoot(parentPc, scaleDegrees(getScale('ionian')))) : null;

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Scales &amp; Modes</h1>
          <p>See any scale across the neck, hear it, and learn what makes each mode sound the way it does.</p>
        </div>
      </header>

      <section className="card">
        <h3 className="card-title">Root</h3>
        <RootPicker value={scale.rootPc} names={rootNames} onChange={(rootPc) => setScale({ ...scale, rootPc })} />
        <h3 className="card-title" style={{ marginTop: 20 }}>
          Scale
        </h3>
        <div className="type-groups">
          {SCALE_GROUPS.map((g) => (
            <div key={g} className="type-group scale-group">
              <span className="type-group-label">{g}</span>
              <div className="type-chips">
                {SCALES.filter((s) => s.group === g).map((s) => (
                  <button
                    key={s.id}
                    className="type-chip"
                    aria-pressed={s.id === def.id}
                    onClick={() => setScale({ ...scale, scaleId: s.id })}
                  >
                    {s.id === def.id && (
                      <motion.span layoutId={`scale-${groupId}`} className="type-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                    )}
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="scale-grid">
        <section className="card scale-info">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={`${scale.rootPc}-${def.id}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="scale-title">
                <h2>
                  {noteName(root)} {def.name}
                </h2>
                {def.alias && <span className="chip">{def.alias}</span>}
              </div>
              <p className="scale-char">{def.character}</p>
              <p className="faint scale-usage">{def.usage}</p>
              {def.parent && (
                <p className="scale-parent">
                  {def.parent}
                  {parentName && (
                    <>
                      {' '}
                      — same notes as{' '}
                      <button className="link" onClick={() => setScale({ rootPc: parentPc!, scaleId: 'ionian' })}>
                        {parentName} major
                      </button>
                    </>
                  )}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="formula" style={{ marginTop: 18 }}>
            {degrees.map((d, i) => (
              <motion.div
                key={`${scale.rootPc}-${def.id}-${i}`}
                className={`formula-note ${signature.has(d.id) ? 'sig' : ''}`}
                initial={{ opacity: 0, y: 10, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.035, type: 'spring', stiffness: 400, damping: 26 }}
                style={{ '--c': degColor(d.id) } as React.CSSProperties}
                title={signature.has(d.id) ? 'Characteristic note' : undefined}
              >
                <span className="fn-name">{noteName(notes[i])}</span>
                <span className="fn-deg">{degreeLabel(d.id)}</span>
              </motion.div>
            ))}
          </div>
          {signature.size > 0 && (
            <p className="faint sig-hint">
              <span className="sig-swatch" /> Characteristic notes — lean on these to bring out the scale's flavour.
            </p>
          )}
        </section>

        <ModeLadder current={def.id} onPick={(scaleId) => setScale({ ...scale, scaleId })} />
      </div>

      <section className="card fret-card">
        <div className="fret-toolbar">
          <div className="row">
            <button className={`btn ${playing ? '' : 'btn-primary'}`} onClick={playScale}>
              {playing ? <Square size={14} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
              {playing ? 'Stop' : win ? `Play position ${position}` : 'Play scale'}
            </button>
            <Segmented
              label="Labels"
              value={view.label}
              options={[
                { value: 'interval', label: 'Intervals' },
                { value: 'note', label: 'Notes' },
              ]}
              onChange={(label) => setView({ ...view, label })}
            />
            <Segmented
              label="Frets"
              value={view.frets}
              options={[
                { value: 12, label: '12' },
                { value: 15, label: '15' },
                { value: 22, label: '22' },
              ]}
              onChange={(frets) => setView({ ...view, frets })}
            />
            <ToneToggle compact />
          </div>
          <Segmented
            label="Position"
            value={position}
            options={[
              { value: 0, label: 'Whole neck' },
              ...positions.map((p, i) => ({ value: i + 1, label: `${i + 1}`, title: `Frets ${p[0]}–${p[1]}` })),
            ]}
            onChange={(p) => setView({ ...view, position: p })}
          />
        </div>
        <Fretboard marks={marks} frets={view.frets} window={win} onPlay={(s, f) => pluck(STANDARD_TUNING[s] + f)} />
        <div style={{ marginTop: 12 }}>
          <IntervalLegend degrees={def.degrees} />
        </div>
      </section>

      {chords.length > 0 && (
        <section className="card" style={{ marginTop: 20 }}>
          <h3 className="card-title">
            Chords in this scale
            <span className="faint" style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }}>
              Click to hear · ↗ to open in the chord library
            </span>
          </h3>
          <div className="chord-tiles">
            {chords.map((c, i) => (
              <motion.div
                key={`${scale.rootPc}-${def.id}-${i}`}
                className={`chord-tile ${i === 0 ? 'tonic' : ''}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                whileHover={{ y: -2 }}
              >
                <button className="chord-tile-main" onClick={() => c.triad && playChord(c.rootPc, c.triad)}>
                  <span className="roman">{c.roman}</span>
                  <span className="cname">{c.name}</span>
                  {c.seventhName && <span className="faint sev-name">{c.seventhName}</span>}
                </button>
                {c.triad && (
                  <div className="chord-tile-actions">
                    <button
                      className="mini"
                      title="Open in chord library"
                      onClick={() => {
                        setChord({ rootPc: c.rootPc, typeId: (c.seventh ?? c.triad!).id });
                        go('chords');
                      }}
                    >
                      <ArrowUpRight size={13} />
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ModeLadder({ current, onPick }: { current: string; onPick: (id: string) => void }) {
  const ionian = getScale('ionian').degrees;
  const id = useId();
  return (
    <section className="card ladder">
      <h3 className="card-title">Modes · bright → dark</h3>
      <div className="ladder-list">
        {MODE_BRIGHTNESS.map((mid, i) => {
          const m = getScale(mid);
          const isCurrent = mid === current;
          return (
            <button key={mid} className={`ladder-row ${isCurrent ? 'current' : ''}`} onClick={() => onPick(mid)}>
              {isCurrent && <motion.span layoutId={`ladder-${id}`} className="ladder-pill" transition={{ type: 'spring', stiffness: 450, damping: 36 }} />}
              <span className="ladder-bar">
                <motion.span
                  className="ladder-fill"
                  initial={false}
                  animate={{ width: `${100 - i * 13}%` }}
                />
              </span>
              <span className="ladder-name">{m.name}</span>
              <span className="ladder-formula">
                {m.degrees.map((d, j) => (
                  <span key={j} className={d !== ionian[j] ? 'alt' : ''}>
                    {degreeLabel(d)}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
      <p className="faint ladder-hint">Highlighted degrees differ from the major scale. Each step down flattens one more note.</p>
    </section>
  );
}
