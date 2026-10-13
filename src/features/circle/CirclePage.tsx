import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { ArrowUpRight, Play, Plus, Repeat, Square, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useChordPeek } from '../../components/ChordPeek';
import { Range, Segmented, Switch, TempoBumps } from '../../components/controls';
import { ToneToggle } from '../../components/ToneToggle';
import { useApp, useStored } from '../../state';
import { PROGRESSIONS, getKey, resolveStep, type KeyMode, type ProgStep, type ResolvedStep, type Ring } from '../../theory/keys';
import { mod, noteName, notePc } from '../../theory/notes';
import { CircleWheel } from './CircleWheel';
import { playChord, useProgressionPlayer } from './useProgressionPlayer';
import './circle.css';

interface CircleSettings {
  index: number;
  mode: KeyMode;
  sevenths: boolean;
  rotate: boolean;
  bpm: number;
  loop: boolean;
  builder: ProgStep[];
}

export default function CirclePage() {
  const [s, setS] = useStored<CircleSettings>('circle', {
    index: 0,
    mode: 'major',
    sevenths: false,
    rotate: true,
    bpm: 96,
    loop: true,
    builder: [],
  });
  const patch = (p: Partial<CircleSettings>) => setS((prev) => ({ ...prev, ...p }));
  const key = useMemo(() => getKey(s.index, s.mode), [s.index, s.mode]);
  const player = useProgressionPlayer();
  const { setChord, setScale, go } = useApp();
  const [flash, setFlash] = useState<string | null>(null);
  const peek = useChordPeek();

  const chords = s.sevenths ? key.sevenths : key.triads;
  const progressions = PROGRESSIONS.filter((p) => p.mode === s.mode);

  const resolve = (steps: ProgStep[], sevenths: boolean) => steps.map((st) => resolveStep(key, st, sevenths));
  const builderChords = resolve(s.builder, s.sevenths);

  let playingPos: { ring: Ring; index: number } | null = null;
  if (player.state) {
    const list =
      player.state.id === 'builder'
        ? builderChords
        : (() => {
            const p = PROGRESSIONS.find((x) => x.id === player.state!.id);
            return p ? resolve(p.steps, s.sevenths || !!p.sevenths) : [];
          })();
    const c = list[player.state.index];
    if (c) playingPos = { ring: c.ring, index: c.index };
  } else if (flash) {
    const [ring, index] = flash.split('-');
    playingPos = { ring: ring as Ring, index: Number(index) };
  }

  const select = (index: number, ring: Ring) => {
    player.stop();
    patch({ index, mode: ring === 'outer' ? 'major' : 'minor' });
  };

  const audition = (c: { rootPc: number; type: ResolvedStep['type']; ring: Ring; index: number }) => {
    playChord(c.rootPc, c.type);
    const id = `${c.ring}-${c.index}`;
    setFlash(id);
    window.setTimeout(() => setFlash((f) => (f === id ? null : f)), 380);
  };

  const playProg = (id: string, list: ResolvedStep[]) => {
    if (player.state?.id === id) return player.stop();
    player.play(id, list, { bpm: s.bpm, beatsPerChord: 4, loop: s.loop });
  };

  const relative = () => select(s.index, s.mode === 'major' ? 'inner' : 'outer');
  const parallel = () =>
    s.mode === 'major' ? select(mod(s.index + 3), 'inner') : select(mod(s.index - 3), 'outer');

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Circle of Fifths</h1>
          <p>Pick a key to see its chords, then audition progressions or build your own.</p>
        </div>
        <div className="row">
          <Switch checked={s.rotate} onChange={(rotate) => patch({ rotate })}>
            Rotate to key
          </Switch>
        </div>
      </header>

      <div className="circle-grid">
        <section className="card wheel-card">
          <CircleWheel keyInfo={key} sevenths={s.sevenths} rotate={s.rotate} playing={playingPos} onSelect={select} />
          <div className="wheel-legend">
            <span><i className="lg tonic" /> Tonic</span>
            <span><i className="lg in" /> Diatonic</span>
            <span><i className="lg dim" /> Diminished</span>
            <span className="faint">Outer: major · Inner: relative minor</span>
          </div>
        </section>

        <div className="stack">
          <section className="card">
            <div className="key-head">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.h2
                  key={key.name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="key-title"
                >
                  {key.name}
                </motion.h2>
              </AnimatePresence>
              <Segmented
                label="Mode"
                value={s.mode}
                options={[
                  { value: 'major', label: 'Major' },
                  { value: 'minor', label: 'Minor' },
                ]}
                onChange={(mode) => select(s.index, mode === 'major' ? 'outer' : 'inner')}
              />
            </div>
            <div className="key-meta">
              <span className="chip">
                {key.signature.count === 0 ? 'No sharps or flats' : `${key.signature.count} ${key.signature.type === 'sharp' ? 'sharp' : 'flat'}${key.signature.count > 1 ? 's' : ''}`}
              </span>
              {key.signature.notes.map((n) => (
                <span key={n} className="chip faint">
                  {n}
                </span>
              ))}
            </div>
            <div className="scale-row">
              {key.scale.map((n, i) => (
                <motion.div
                  key={`${key.name}-${i}`}
                  className={`note-pill ${i === 0 ? 'tonic' : ''}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                >
                  {noteName(n)}
                  <small className="faint">{i + 1}</small>
                </motion.div>
              ))}
            </div>
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn btn-sm" onClick={relative}>
                Relative {s.mode === 'major' ? 'minor' : 'major'}
              </button>
              <button className="btn btn-sm" onClick={parallel}>
                Parallel {s.mode === 'major' ? 'minor' : 'major'}
              </button>
              <button
                className="btn btn-sm"
                onClick={() => {
                  setScale({ rootPc: notePc(key.tonic), scaleId: key.scaleId });
                  go('scales');
                }}
              >
                Scale on fretboard <ArrowUpRight size={14} />
              </button>
            </div>
          </section>

          <section className="card">
            <h3 className="card-title">
              Chords in key
              <Segmented
                label="Chord size"
                value={s.sevenths ? 'sev' : 'tri'}
                options={[
                  { value: 'tri', label: 'Triads' },
                  { value: 'sev', label: '7ths' },
                ]}
                onChange={(v) => patch({ sevenths: v === 'sev' })}
              />
            </h3>
            <LayoutGroup>
              <div className="chord-tiles">
                {chords.map((c, i) => {
                  const active = playingPos?.ring === c.ring && playingPos.index === c.index;
                  return (
                    <motion.div
                      layout
                      key={`${i}`}
                      className={`chord-tile ${active ? 'active' : ''} ${i === 0 ? 'tonic' : ''}`}
                      whileHover={{ y: -2 }}
                    >
                      <button className="chord-tile-main" onClick={() => audition(c)} title="Play">
                        <span className="roman">{c.roman}</span>
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={c.name}
                            className="cname"
                            initial={{ opacity: 0, scale: 0.7 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.7 }}
                          >
                            {c.name}
                          </motion.span>
                        </AnimatePresence>
                      </button>
                      <div className="chord-tile-actions">
                        <button
                          className="mini"
                          title="Add to my progression"
                          onClick={() =>
                            s.builder.length < 16 && patch({ builder: [...s.builder, { deg: i, quality: c.type.id }] })
                          }
                        >
                          <Plus size={13} />
                        </button>
                        <button
                          className="mini"
                          title="Open in chord library"
                          onClick={() => {
                            setChord({ rootPc: c.rootPc, typeId: c.type.id });
                            go('chords');
                          }}
                        >
                          <ArrowUpRight size={13} />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </LayoutGroup>
          </section>
        </div>
      </div>

      <div className="prog-grid">
        <section className="card">
          <h3 className="card-title">
            Common progressions in {noteName(key.tonic)} {s.mode}
            <div className="row prog-settings">
              <ToneToggle compact />
              <span className="faint">{s.bpm} bpm</span>
              <div style={{ width: 110 }}>
                <Range label="Playback tempo" value={s.bpm} min={50} max={180} onChange={(bpm) => patch({ bpm })} />
              </div>
              <TempoBumps value={s.bpm} max={180} onChange={(bpm) => patch({ bpm })} />
              <button
                className={`btn btn-sm btn-icon ${s.loop ? 'on' : ''}`}
                title="Loop"
                aria-pressed={s.loop}
                onClick={() => patch({ loop: !s.loop })}
              >
                <Repeat size={14} />
              </button>
            </div>
          </h3>
          <div className="prog-list">
            {progressions.map((p) => {
              const list = resolve(p.steps, s.sevenths || !!p.sevenths);
              const isPlaying = player.state?.id === p.id;
              return (
                <motion.div key={p.id} layout className={`prog ${isPlaying ? 'playing' : ''}`}>
                  <button className="prog-play" onClick={() => playProg(p.id, list)} aria-label={isPlaying ? 'Stop' : `Play ${p.name}`}>
                    {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={15} fill="currentColor" />}
                  </button>
                  <div className="prog-body">
                    <div className="prog-name">
                      {p.name} <span className="faint">— {p.description}</span>
                    </div>
                    <div className="prog-steps">
                      {list.map((c, i) => (
                        <span
                          key={i}
                          tabIndex={0}
                          className={`step ${isPlaying && player.state?.index === i ? 'on' : ''}`}
                          {...peek.bind(c)}
                        >
                          <b>{c.roman}</b>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="card builder">
          <h3 className="card-title">
            My progression
            <div className="row" style={{ gap: 6 }}>
              <button
                className="btn btn-sm"
                disabled={!s.builder.length}
                onClick={() => playProg('builder', builderChords)}
              >
                {player.state?.id === 'builder' ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
                {player.state?.id === 'builder' ? 'Stop' : 'Play'}
              </button>
              <button
                className="btn btn-sm btn-icon"
                title="Clear"
                disabled={!s.builder.length}
                onClick={() => {
                  if (player.state?.id === 'builder') player.stop();
                  patch({ builder: [] });
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </h3>
          {s.builder.length === 0 ? (
            <p className="faint builder-empty">
              Tap <Plus size={12} /> on any chord above to add it here. Your progression follows the key — change keys and it transposes.
            </p>
          ) : (
            <div className="builder-steps">
              <AnimatePresence initial={false}>
                {builderChords.map((c, i) => (
                  <motion.button
                    layout
                    key={`${i}-${s.builder[i].deg}-${s.builder[i].quality}`}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    className={`step big ${player.state?.id === 'builder' && player.state.index === i ? 'on' : ''}`}
                    aria-label={`Remove ${c.name}`}
                    onClick={() => patch({ builder: s.builder.filter((_, j) => j !== i) })}
                    {...peek.bind(c)}
                  >
                    <b>{c.roman}</b>
                    {c.name}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>
      </div>
      {peek.node}
    </div>
  );
}
