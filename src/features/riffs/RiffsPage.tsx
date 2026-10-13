import { AnimatePresence, motion } from 'motion/react';
import { ChevronRight, NotebookPen, Play, Plus, Repeat, Search, Square, Timer, Trash2, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Range, Segmented, TempoBumps } from '../../components/controls';
import { ToneToggle } from '../../components/ToneToggle';
import { useApp, useStored } from '../../state';
import { parseTab } from '../../theory/tab';
import { practiceLog } from '../log/store';
import { DIFFICULTY_LABELS, GENRES, RIFFS, type Difficulty, type Riff } from './riffs';
import { TabLegend, TabView } from './TabView';
import { useRiffPlayer } from './useRiffPlayer';
import './riffs.css';

export interface CustomTab {
  id: string;
  title: string;
  difficulty: Difficulty;
  techniques: string[];
  tab: string;
  notes?: string;
  createdAt: number;
}

type Entry = { kind: 'riff'; riff: Riff } | { kind: 'custom'; tab: CustomTab };
type Sort = 'easy' | 'hard' | 'az';

const entryTitle = (e: Entry) => (e.kind === 'riff' ? e.riff.title : e.tab.title);
const entryDifficulty = (e: Entry) => (e.kind === 'riff' ? e.riff.difficulty : e.tab.difficulty);
const entryTechniques = (e: Entry) => (e.kind === 'riff' ? e.riff.techniques : e.tab.techniques);
const entryId = (e: Entry) => (e.kind === 'riff' ? e.riff.id : e.tab.id);

const ALL_TECHNIQUES = [...new Set(RIFFS.flatMap((r) => r.techniques))].sort();

export default function RiffsPage() {
  const [sort, setSort] = useStored<Sort>('riffs-sort', 'easy');
  const [level, setLevel] = useStored<number>('riffs-level', 0);
  const [technique, setTechnique] = useStored<string>('riffs-technique', '');
  const [genre, setGenre] = useStored<string>('riffs-genre', '');
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useStored<CustomTab[]>('custom-tabs', []);
  const [adding, setAdding] = useState(false);
  const player = useRiffPlayer();
  // Shared across cards so one card's save never clobbers another's.
  const [tempos, setTempos] = useStored<Record<string, number>>('riff-tempos', {});
  const [opts, setOpts] = useStored('riff-player', { loop: true, click: true });

  const entries = useMemo(() => {
    const all: Entry[] = [
      ...RIFFS.map((riff) => ({ kind: 'riff' as const, riff })),
      ...custom.map((tab) => ({ kind: 'custom' as const, tab })),
    ];
    const q = query.trim().toLowerCase();
    return all
      .filter((e) => !level || entryDifficulty(e) === level)
      .filter((e) => !technique || entryTechniques(e).includes(technique))
      .filter((e) => !genre || (e.kind === 'riff' && e.riff.genre === genre))
      .filter(
        (e) =>
          !q ||
          entryTitle(e).toLowerCase().includes(q) ||
          entryTechniques(e).some((t) => t.toLowerCase().includes(q)) ||
          (e.kind === 'riff' && e.riff.genre.toLowerCase().includes(q)),
      )
      .sort((a, b) => {
        if (sort === 'az') return entryTitle(a).localeCompare(entryTitle(b));
        const d = entryDifficulty(a) - entryDifficulty(b);
        return (sort === 'easy' ? d : -d) || entryTitle(a).localeCompare(entryTitle(b));
      });
  }, [custom, level, technique, genre, query, sort]);

  const techniques = useMemo(() => [...new Set([...ALL_TECHNIQUES, ...custom.flatMap((c) => c.techniques)])].sort(), [custom]);

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Riffs &amp; Tabs</h1>
          <p>Original riffs and exercises for every technique — play along at your own tempo, then log it.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAdding((a) => !a)}>
          {adding ? <X size={15} /> : <Plus size={15} />} {adding ? 'Cancel' : 'Add your own tab'}
        </button>
      </header>

      <AnimatePresence initial={false}>
        {adding && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden' }}
          >
            <AddTabForm
              onSave={(t) => {
                setCustom((list) => [...list, t]);
                setAdding(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <section className="card riff-toolbar">
        <label className="search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search riffs or techniques" aria-label="Search" />
        </label>
        <select className="select" value={genre} onChange={(e) => setGenre(e.target.value)} aria-label="Genre">
          <option value="">All genres</option>
          {GENRES.filter((g) => RIFFS.some((r) => r.genre === g)).map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select className="select" value={technique} onChange={(e) => setTechnique(e.target.value)} aria-label="Technique">
          <option value="">All techniques</option>
          {techniques.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <Segmented
          label="Difficulty filter"
          value={level}
          options={[{ value: 0, label: 'All levels' }, ...([1, 2, 3, 4, 5] as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))]}
          onChange={setLevel}
        />
        <Segmented
          label="Sort"
          value={sort}
          options={[
            { value: 'easy', label: 'Easiest first' },
            { value: 'hard', label: 'Hardest first' },
            { value: 'az', label: 'A–Z' },
          ]}
          onChange={setSort}
        />
        <ToneToggle />
      </section>

      <p className="faint riff-count">
        {entries.length} of {RIFFS.length + custom.length} · <TabLegend />
      </p>

      <div className="riff-list">
        <AnimatePresence mode="popLayout" initial={false}>
          {entries.map((e) => (
            <motion.div
              key={entryId(e)}
              layout="position"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 380, damping: 34 }}
            >
              {e.kind === 'riff' ? (
                <RiffCard
                  riff={e.riff}
                  player={player}
                  bpm={tempos[e.riff.id] ?? e.riff.bpm}
                  setBpm={(b) => setTempos((t) => ({ ...t, [e.riff.id]: b }))}
                  opts={opts}
                  setOpts={setOpts}
                />
              ) : (
                <CustomCard tab={e.tab} onDelete={() => setCustom((list) => list.filter((c) => c.id !== e.tab.id))} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {entries.length === 0 && <p className="card faint empty">No riffs match those filters.</p>}
      </div>
    </div>
  );
}

export function DifficultyMeter({ level }: { level: Difficulty }) {
  return (
    <span className="difficulty" title={`Difficulty ${level} of 5`}>
      <span className="pips" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <i key={i} className={i <= level ? 'on' : ''} />
        ))}
      </span>
      {DIFFICULTY_LABELS[level]}
    </span>
  );
}

interface PlayerOpts {
  loop: boolean;
  click: boolean;
}

function RiffCard({
  riff,
  player,
  bpm,
  setBpm: saveBpm,
  opts,
  setOpts,
}: {
  riff: Riff;
  player: ReturnType<typeof useRiffPlayer>;
  bpm: number;
  setBpm: (b: number) => void;
  opts: PlayerOpts;
  setOpts: (o: PlayerOpts) => void;
}) {
  const items = useMemo(() => parseTab(riff.tab, riff.chords), [riff]);
  const [showTips, setShowTips] = useState(false);
  const { go } = useApp();
  const playing = player.state?.id === riff.id;

  const start = (o = opts, b = bpm) => player.play(riff, items, { bpm: b, ...o });
  const setBpm = (b: number) => {
    saveBpm(b);
    if (playing) start(opts, b);
  };
  const toggleOpt = (k: 'loop' | 'click') => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    if (playing) start(next);
  };

  return (
    <article className={`card riff ${playing ? 'playing' : ''}`}>
      <div className="riff-head">
        <div>
          <h2>{riff.title}</h2>
          <div className="row riff-meta">
            <DifficultyMeter level={riff.difficulty} />
            <span className="chip genre">{riff.genre}</span>
            {riff.tuning && <span className="chip tuning">{riff.tuning.name} tuning</span>}
            {riff.techniques.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
        <motion.button
          className={`riff-play ${playing ? 'on' : ''}`}
          whileTap={{ scale: 0.9 }}
          onClick={() => (playing ? player.stop() : start())}
          aria-label={playing ? 'Stop' : `Play ${riff.title}`}
        >
          {playing ? <Square size={16} fill="currentColor" /> : <Play size={18} fill="currentColor" style={{ marginLeft: 2 }} />}
        </motion.button>
      </div>
      <p className="muted riff-desc">{riff.description}</p>

      <TabView id={riff.id} items={items} active={playing ? player.state!.item : null} palmMute={riff.palmMute} tuning={riff.tuning?.notes} />

      <div className="riff-controls">
        <div className="tempo-line">
          <div className="riff-tempo">
            <Timer size={15} className="faint" />
            <span className="riff-bpm">{bpm} bpm</span>
            <Range label="Tempo" value={bpm} min={30} max={riff.targetBpm + 30} onChange={setBpm} />
            <span className={`riff-goal ${bpm >= riff.targetBpm ? 'met' : ''}`}>goal {riff.targetBpm}</span>
          </div>
          <TempoBumps value={bpm} max={riff.targetBpm + 30} goal={riff.targetBpm} onChange={setBpm} />
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className={`btn btn-sm ${opts.loop ? 'on' : ''}`} aria-pressed={opts.loop} onClick={() => toggleOpt('loop')}>
            <Repeat size={13} /> Loop
          </button>
          <button className={`btn btn-sm ${opts.click ? 'on' : ''}`} aria-pressed={opts.click} onClick={() => toggleOpt('click')}>
            Click
          </button>
          <button className="btn btn-sm" onClick={() => setShowTips((s) => !s)} aria-expanded={showTips}>
            <motion.span animate={{ rotate: showTips ? 90 : 0 }} style={{ display: 'inline-flex' }}>
              <ChevronRight size={14} />
            </motion.span>
            Tips
          </button>
          <button
            className="btn btn-sm"
            onClick={() => {
              player.stop();
              practiceLog.setDraft({ focus: ['Riffs', 'Technique'], riffId: riff.id, bpm });
              go('log');
            }}
          >
            <NotebookPen size={13} /> Log practice
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {showTips && (
          <motion.ul
            className="riff-tips"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {riff.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </article>
  );
}

function CustomCard({ tab, onDelete }: { tab: CustomTab; onDelete: () => void }) {
  const [confirm, setConfirm] = useState(false);
  const { go } = useApp();
  return (
    <article className="card riff">
      <div className="riff-head">
        <div>
          <h2>
            {tab.title} <span className="chip yours">Yours</span>
          </h2>
          <div className="row riff-meta">
            <DifficultyMeter level={tab.difficulty} />
            {tab.techniques.map((t) => (
              <span key={t} className="chip">
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
      {tab.notes && <p className="muted riff-desc">{tab.notes}</p>}
      <pre className="tab-raw scroll-x">{tab.tab}</pre>
      <div className="riff-controls">
        <span />
        <div className="row" style={{ gap: 6 }}>
          <button
            className="btn btn-sm"
            onClick={() => {
              practiceLog.setDraft({ focus: ['Riffs', 'Songs'], notes: tab.title });
              go('log');
            }}
          >
            <NotebookPen size={13} /> Log practice
          </button>
          {confirm ? (
            <>
              <button className="btn btn-sm danger" onClick={onDelete}>
                Delete
              </button>
              <button className="btn btn-sm" onClick={() => setConfirm(false)}>
                Keep
              </button>
            </>
          ) : (
            <button className="btn btn-sm btn-icon" aria-label="Delete tab" onClick={() => setConfirm(true)}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

const TAB_PLACEHOLDER = `e|-----------------|
B|-----------------|
G|-----5-7-5-------|
D|---7-------7-5---|
A|-5-------------7-|
E|-----------------|`;

function AddTabForm({ onSave }: { onSave: (t: CustomTab) => void }) {
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>(2);
  const [techniques, setTechniques] = useState('');
  const [tab, setTab] = useState('');
  const [notes, setNotes] = useState('');
  const valid = title.trim() && tab.trim();

  return (
    <section className="card add-tab">
      <h3 className="card-title">Add your own tab</h3>
      <div className="add-grid">
        <label className="field">
          <span>Title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song or riff name" />
        </label>
        <label className="field">
          <span>Techniques (comma separated)</span>
          <input className="input" value={techniques} onChange={(e) => setTechniques(e.target.value)} placeholder="Bending, Vibrato" />
        </label>
        <div className="field">
          <span>Difficulty</span>
          <Segmented
            label="Difficulty"
            wrap
            value={difficulty}
            options={([1, 2, 3, 4, 5] as Difficulty[]).map((d) => ({ value: d, label: DIFFICULTY_LABELS[d] }))}
            onChange={setDifficulty}
          />
        </div>
        <label className="field full">
          <span>Tab</span>
          <textarea className="input mono" rows={7} value={tab} onChange={(e) => setTab(e.target.value)} placeholder={TAB_PLACEHOLDER} spellCheck={false} />
        </label>
        <label className="field full">
          <span>Notes (optional)</span>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Where it's from, tempo, what to watch for" />
        </label>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end', marginTop: 14 }}>
        <span className="faint" style={{ fontSize: 13, marginRight: 'auto' }}>
          Saved in this browser only.
        </span>
        <button
          className="btn btn-primary"
          disabled={!valid}
          onClick={() =>
            onSave({
              id: crypto.randomUUID(),
              title: title.trim(),
              difficulty,
              techniques: techniques
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
              tab: tab.replace(/\s+$/, ''),
              notes: notes.trim() || undefined,
              createdAt: Date.now(),
            })
          }
        >
          Save tab
        </button>
      </div>
    </section>
  );
}
