import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Disc3, Gauge, Grid3x3, Guitar, Moon, Music, NotebookPen, Square, Sun, Timer } from 'lucide-react';
import type { ComponentType } from 'react';
import { ToneToggle } from './components/ToneToggle';
import CirclePage from './features/circle/CirclePage';
import ChordsPage from './features/chords/ChordsPage';
import LogPage, { formatClock, useTimerMs } from './features/log/LogPage';
import RiffsPage from './features/riffs/RiffsPage';
import { metronome, useMetronome } from './features/metronome/controller';
import MetronomePage from './features/metronome/MetronomePage';
import ScalesPage from './features/scales/ScalesPage';
import TunerPage from './features/tuner/TunerPage';
import { AppProvider, useApp, type Page } from './state';

const NAV: { id: Page; label: string; short: string; icon: ComponentType<{ size?: number }>; page: ComponentType }[] = [
  { id: 'metronome', label: 'Metronome', short: 'Tempo', icon: Timer, page: MetronomePage },
  { id: 'circle', label: 'Circle of Fifths', short: 'Keys', icon: Disc3, page: CirclePage },
  { id: 'chords', label: 'Chords', short: 'Chords', icon: Grid3x3, page: ChordsPage },
  { id: 'scales', label: 'Scales & Modes', short: 'Scales', icon: Music, page: ScalesPage },
  { id: 'riffs', label: 'Riffs & Tabs', short: 'Riffs', icon: Guitar, page: RiffsPage },
  { id: 'tuner', label: 'Tuner', short: 'Tuner', icon: Gauge, page: TunerPage },
  { id: 'log', label: 'Practice Log', short: 'Log', icon: NotebookPen, page: LogPage },
];

export default function App() {
  return (
    <AppProvider>
      <MotionConfig reducedMotion="user">
        <Shell />
      </MotionConfig>
    </AppProvider>
  );
}

function Shell() {
  const { page, go, theme, setTheme } = useApp();
  const Current = NAV.find((n) => n.id === page)!.page;

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Logo />
          </div>
          <div>
            <div className="brand-name">Woodshed</div>
            <div className="brand-sub">Guitar practice kit</div>
          </div>
        </div>

        <nav className="nav">
          {NAV.map(({ id, label, short, icon: Icon }) => (
            <button key={id} className="nav-item" aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
              {page === id && <motion.div layoutId="nav-pill" className="nav-pill" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
              <Icon size={18} />
              <span className="nav-long">{label}</span>
              <span className="nav-short">{short}</span>
            </button>
          ))}
        </nav>

        <div className="mini-stack">
          <MiniTimer visible={page !== 'log'} onOpen={() => go('log')} />
          <MiniMetronome visible={page !== 'metronome'} onOpen={() => go('metronome')} />
        </div>

        <div className="sidebar-tone">
          <span>Guitar tone</span>
          <ToneToggle />
        </div>

        <div className="sidebar-foot">
          <span>Practice daily ✦</span>
          <motion.button
            className="btn btn-sm btn-icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
            whileTap={{ rotate: 90, scale: 0.9 }}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </motion.button>
        </div>
      </aside>

      <main className="main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Current />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

function MiniMetronome({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const { running, settings, tick } = useMetronome();
  return (
    <AnimatePresence>
      {running && visible && (
        <motion.div
          className="mini-metro"
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
        >
          <button className="mini-metro-main" onClick={onOpen}>
            <span className="mini-beats">
              {Array.from({ length: Math.min(settings.beats, 8) }, (_, i) => (
                <span key={i} className={tick?.beat === i ? (i === 0 ? 'on accent' : 'on') : ''} />
              ))}
            </span>
            <span className="mini-bpm">
              {settings.bpm} <small>bpm</small>
            </span>
          </button>
          <button className="btn btn-sm btn-icon" onClick={() => metronome.stop()} aria-label="Stop metronome">
            <Square size={12} fill="currentColor" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MiniTimer({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  const { ms, running } = useTimerMs();
  return (
    <AnimatePresence>
      {running && visible && (
        <motion.button
          className="mini-timer"
          onClick={onOpen}
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.95 }}
        >
          <span className="mini-dot" />
          <span className="mini-bpm">{formatClock(ms)}</span>
          <small className="faint">practising</small>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function Logo() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1d1206" strokeWidth="2.2" strokeLinecap="round">
      <path d="M5 4v16M10 4v16M15 4v16M20 4v16" opacity="0.35" />
      <path d="M3 9h18M3 15h18" />
      <circle cx="10" cy="12" r="2.2" fill="#1d1206" stroke="none" />
      <circle cx="20" cy="6.5" r="2.2" fill="#1d1206" stroke="none" />
    </svg>
  );
}
