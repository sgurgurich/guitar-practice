import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { spellChord, type ChordType } from '../theory/chords';
import { degreeMap, noteName, notePc, type Note } from '../theory/notes';
import { chooseVoicing, chosenVoicing } from '../theory/voicingChoice';
import { findVoicings } from '../theory/voicings';
import { ChordDiagram } from './ChordDiagram';

export interface PeekChord {
  rootPc: number;
  type: ChordType;
  /** Key-correct spelling of the root (e.g. D♯ rather than E♭ in F♯ major). */
  root?: Note;
  name: string;
}

interface Open {
  chord: PeekChord;
  rect: DOMRect;
  el: HTMLElement;
}

const WIDTH = 168;
const HEIGHT = 262;
/** Pixels of wheel travel per voicing step, so trackpads don't race through shapes. */
const WHEEL_STEP = 60;

/**
 * Hover/focus tooltip showing a chord diagram. Scroll (or use ←/→) over the trigger
 * to cycle through voicings; the pick is remembered for playback.
 * One tooltip per page: spread `bind(chord)` onto each trigger and render `node` once.
 */
export function useChordPeek() {
  const [open, setOpen] = useState<Open | null>(null);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const openRef = useRef(open);
  openRef.current = open;

  const step = useCallback((delta: number) => {
    const o = openRef.current;
    if (!o) return;
    const all = findVoicings(o.chord.rootPc, o.chord.type);
    if (all.length < 2) return;
    setDir(delta);
    setIndex((i) => {
      const next = (i + delta + all.length) % all.length;
      chooseVoicing(o.chord.rootPc, o.chord.type, all[next]);
      return next;
    });
  }, []);

  // A fixed-position tooltip would drift away from its chip on page scroll, so close it.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  // Wheel over the chip cycles voicings. React's onWheel is passive, so listen natively to stop the page scrolling.
  useEffect(() => {
    if (!open) return;
    let acc = 0;
    const onWheel = (e: WheelEvent) => {
      if (!open.el.contains(e.target as Node)) return;
      e.preventDefault();
      const dy = e.deltaMode === 1 ? e.deltaY * 20 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
      acc += dy || e.deltaX;
      while (Math.abs(acc) >= WHEEL_STEP) {
        step(Math.sign(acc));
        acc -= Math.sign(acc) * WHEEL_STEP;
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel);
  }, [open, step]);

  const bind = useCallback(
    (chord: PeekChord) => {
      const show = (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        if ('pointerType' in e && e.pointerType === 'touch') return;
        const all = findVoicings(chord.rootPc, chord.type);
        const current = chosenVoicing(chord.rootPc, chord.type);
        setIndex(Math.max(0, all.findIndex((v) => v.key === current?.key)));
        setOpen({ chord, rect: e.currentTarget.getBoundingClientRect(), el: e.currentTarget });
      };
      const hide = () => setOpen(null);
      const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
        const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
        if (!delta || !openRef.current) return;
        e.preventDefault();
        step(delta);
      };
      return { onPointerEnter: show, onPointerLeave: hide, onFocus: show, onBlur: hide, onKeyDown };
    },
    [step],
  );

  return { bind, node: createPortal(<Peek open={open} index={index} dir={dir} />, document.body) };
}

function Peek({ open, index, dir }: { open: Open | null; index: number; dir: number }) {
  let pos: { left: number; top: number; below: boolean } | null = null;
  if (open) {
    const { rect } = open;
    const below = rect.top < HEIGHT + 16;
    const left = Math.min(window.innerWidth - WIDTH / 2 - 8, Math.max(WIDTH / 2 + 8, rect.left + rect.width / 2));
    pos = { left, top: below ? rect.bottom + 10 : rect.top - 10, below };
  }

  return (
    <AnimatePresence>
      {open && pos && (
        <div
          key={`${open.chord.rootPc}-${open.chord.type.id}`}
          className="chord-peek-anchor"
          style={{ left: pos.left, top: pos.top, transform: `translate(-50%, ${pos.below ? '0' : '-100%'})` }}
        >
          <motion.div
            className="chord-peek"
            initial={{ opacity: 0, scale: 0.92, y: pos.below ? -6 : 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            transition={{ type: 'spring', stiffness: 520, damping: 32 }}
            style={{ transformOrigin: pos.below ? 'top center' : 'bottom center' }}
          >
            <PeekBody chord={open.chord} index={index} dir={dir} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PeekBody({ chord, index, dir }: { chord: PeekChord; index: number; dir: number }) {
  const all = findVoicings(chord.rootPc, chord.type);
  const voicing = all[Math.min(index, all.length - 1)];
  const spelled = spellChord(chord.rootPc, chord.type, chord.root);
  const degrees = degreeMap(chord.rootPc, spelled.degrees);
  const names = new Map(spelled.notes.map((n) => [notePc(n), noteName(n)]));
  if (!voicing) return <p className="faint">No diagram</p>;
  return (
    <>
      <div className="chord-peek-head">
        <b>{chord.name}</b>
        <span>{voicing.frets.map((f) => (f === null ? '×' : f)).join(' ')}</span>
      </div>
      <div className="chord-peek-diagram">
        <AnimatePresence mode="popLayout" initial={false} custom={dir}>
          <motion.div
            key={voicing.key}
            custom={dir}
            variants={{
              enter: (d: number) => ({ opacity: 0, x: d * 18 }),
              center: { opacity: 1, x: 0 },
              exit: (d: number) => ({ opacity: 0, x: d * -18 }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: 'spring', stiffness: 600, damping: 38 }}
          >
            <ChordDiagram voicing={voicing} degrees={degrees} names={names} label="finger" />
          </motion.div>
        </AnimatePresence>
      </div>
      {all.length > 1 && (
        <div className="chord-peek-foot">
          <ChevronLeft size={12} />
          <span>
            <b>
              {index + 1} / {all.length}
            </b>{' '}
            · {voicing.position === 0 ? 'Open' : `Fret ${voicing.position}`}
          </span>
          <ChevronRight size={12} />
          <small>Scroll for more shapes</small>
        </div>
      )}
    </>
  );
}
