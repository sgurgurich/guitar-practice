import { AnimatePresence, motion } from 'motion/react';
import { Music2, Play } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { ChordDiagram, type DiagramLabel } from '../../components/ChordDiagram';
import { Fretboard, type FretMark } from '../../components/Fretboard';
import { IntervalLegend, RootPicker, Segmented, degColor } from '../../components/controls';
import { ToneToggle } from '../../components/ToneToggle';
import { audio } from '../../audio/context';
import { pluck, strum } from '../../audio/guitar';
import { useApp, useStored } from '../../state';
import { CHORD_GROUPS, CHORD_TYPES, INVERSION_NAMES, getChordType, inversions, spellChord } from '../../theory/chords';
import { STANDARD_TUNING, bestRoot, degreeLabel, degreeMap, mod, noteName, notePc } from '../../theory/notes';
import { findVoicings } from '../../theory/voicings';
import './chords.css';

export default function ChordsPage() {
  const { chord, setChord } = useApp();
  const [label, setLabel] = useStored<DiagramLabel>('chord-label', 'finger');
  const [selected, setSelected] = useState(0);
  const [pulse, setPulse] = useState<{ i: number; n: number } | null>(null);
  const groupId = useId();

  const type = getChordType(chord.typeId);
  const spelled = useMemo(() => spellChord(chord.rootPc, type), [chord.rootPc, type]);
  const bassOptions = inversions(type);
  const inversion = Math.min(chord.inversion ?? 0, bassOptions.length - 1);
  const bass = bassOptions[inversion];
  const bassIndex = spelled.degrees.findIndex((d) => d.id === bass);
  const bassName = noteName(spelled.notes[bassIndex]);
  const chordName = inversion > 0 ? `${spelled.name}/${bassName}` : spelled.name;
  const voicings = useMemo(() => findVoicings(chord.rootPc, type, bass), [chord.rootPc, type, bass]);
  const degrees = useMemo(() => degreeMap(chord.rootPc, spelled.degrees), [chord.rootPc, spelled]);
  const names = useMemo(() => new Map(spelled.notes.map((n) => [notePc(n), noteName(n)])), [spelled]);

  // Root picker shows the spelling this chord type would actually use.
  const rootNames = useMemo(() => {
    const out: Record<number, string> = {};
    for (let pc = 0; pc < 12; pc++) out[pc] = noteName(bestRoot(pc, spelled.degrees));
    return out;
  }, [spelled.degrees]);

  useEffect(() => setSelected(0), [chord.rootPc, chord.typeId, bass]);

  const v = voicings[Math.min(selected, voicings.length - 1)];

  const marks = useMemo<FretMark[]>(() => {
    const out: FretMark[] = [];
    for (let s = 0; s < 6; s++)
      for (let f = 0; f <= 15; f++) {
        const pc = mod(STANDARD_TUNING[s] + f);
        const deg = degrees.get(pc);
        if (!deg) continue;
        const inVoicing = v?.frets[s] === f;
        out.push({
          string: s,
          fret: f,
          label: label === 'note' ? names.get(pc)! : degreeLabel(deg),
          color: degColor(deg),
          root: deg === '1',
          dim: !!v && !inVoicing,
        });
      }
    return out;
  }, [degrees, names, v, label]);

  const playVoicing = (i: number) => {
    const voicing = voicings[i];
    if (!voicing) return;
    setSelected(i);
    setPulse({ i, n: Date.now() });
    strum(voicing.midis, { choke: true });
  };

  const arpeggiate = () => {
    if (!v) return;
    const t = audio().currentTime + 0.02;
    v.midis.forEach((m, i) => pluck(m, { when: t + i * 0.14, gain: 0.45 }));
  };

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Chords</h1>
          <p>Every chord, every root — with playable voicings generated across the whole neck.</p>
        </div>
        <Segmented
          label="Diagram labels"
          value={label}
          options={[
            { value: 'finger', label: 'Fingers' },
            { value: 'interval', label: 'Intervals' },
            { value: 'note', label: 'Notes' },
          ]}
          onChange={setLabel}
        />
      </header>

      <section className="card">
        <h3 className="card-title">Root</h3>
        <RootPicker value={chord.rootPc} names={rootNames} onChange={(rootPc) => setChord({ ...chord, rootPc })} />
        <h3 className="card-title" style={{ marginTop: 20 }}>
          Type
        </h3>
        <div className="type-groups">
          {CHORD_GROUPS.map((g) => (
            <div key={g} className="type-group">
              <span className="type-group-label">{g}</span>
              <div className="type-chips">
                {CHORD_TYPES.filter((t) => t.group === g).map((t) => (
                  <button
                    key={t.id}
                    className="type-chip"
                    aria-pressed={t.id === chord.typeId}
                    title={t.name}
                    onClick={() => setChord({ ...chord, typeId: t.id })}
                  >
                    {t.id === chord.typeId && (
                      <motion.span layoutId={`type-${groupId}`} className="type-pill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
                    )}
                    <span>{t.symbol || 'maj'}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <h3 className="card-title" style={{ marginTop: 20 }}>
          Inversion
        </h3>
        <Segmented
          wrap
          label="Inversion"
          value={inversion}
          options={bassOptions.map((b, i) => {
            const note = noteName(spelled.notes[spelled.degrees.findIndex((d) => d.id === b)]);
            return {
              value: i,
              label: i === 0 ? `Root · ${note}` : `${INVERSION_NAMES[i].replace(' inversion', '')} · ${note}`,
              title: `${INVERSION_NAMES[i]} — ${degreeLabel(b)} (${note}) in the bass`,
            };
          })}
          onChange={(i) => setChord({ ...chord, inversion: i })}
        />
      </section>

      <section className="chord-hero">
        <div className="chord-hero-name">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h2
              key={chordName}
              initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {chordName}
            </motion.h2>
          </AnimatePresence>
          <p className="muted">
            {noteName(spelled.root)} {type.name.toLowerCase()}
            {inversion > 0 && ` · ${INVERSION_NAMES[inversion].toLowerCase()}, ${bassName} in the bass`} · {voicings.length} voicings
          </p>
        </div>
        <div className="formula">
          {spelled.degrees.map((d, i) => (
            <motion.div
              key={`${spelled.name}-${d.id}`}
              className="formula-note"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04, type: 'spring', stiffness: 400, damping: 26 }}
              style={{ '--c': degColor(d.id) } as React.CSSProperties}
            >
              <span className="fn-name">{noteName(spelled.notes[i])}</span>
              <span className="fn-deg">{degreeLabel(d.id)}</span>
              {d.id === bass && inversion > 0 ? (
                <span className="fn-opt fn-bass">bass</span>
              ) : (
                type.optional?.includes(d.id) && d.id !== bass && <span className="fn-opt">opt</span>
              )}
            </motion.div>
          ))}
        </div>
        <div className="row">
          <button className="btn btn-primary" onClick={() => playVoicing(selected)}>
            <Play size={15} fill="currentColor" /> Strum
          </button>
          <button className="btn" onClick={arpeggiate} title="Play the notes one at a time">
            <Music2 size={15} /> Arpeggio
          </button>
          <ToneToggle compact />
        </div>
      </section>

      <div className="voicing-grid">
        <AnimatePresence mode="popLayout">
          {voicings.map((vo, i) => (
            <motion.button
              layout
              key={`${chordName}-${vo.key}`}
              className={`voicing ${i === selected ? 'selected' : ''}`}
              onClick={() => playVoicing(i)}
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: pulse?.i === i ? [1, 1.04, 1] : 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
              transition={{ delay: Math.min(i * 0.025, 0.3), type: 'spring', stiffness: 380, damping: 28 }}
              whileHover={{ y: -3 }}
            >
              <div className="voicing-head">
                <span>{vo.position === 0 ? 'Open' : `Fret ${vo.position}`}</span>
                <span className="faint">{vo.frets.map((f) => (f === null ? '×' : f)).join(' ')}</span>
              </div>
              <ChordDiagram voicing={vo} degrees={degrees} names={names} label={label} />
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
      {voicings.length === 0 && (
        <p className="card faint empty-voicings">
          No comfortable shape for {chordName} within a four-fret stretch — try another inversion.
        </p>
      )}

      <section className="card" style={{ marginTop: 20 }}>
        <h3 className="card-title">
          Chord tones on the neck
          <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500 }} className="faint">
            Selected voicing highlighted · click any fret to hear it
          </span>
        </h3>
        <Fretboard marks={marks} onPlay={(s, f) => pluck(STANDARD_TUNING[s] + f)} />
        <div style={{ marginTop: 12 }}>
          <IntervalLegend degrees={type.degrees} />
        </div>
      </section>
    </div>
  );
}
