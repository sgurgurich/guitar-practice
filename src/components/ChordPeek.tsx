import { AnimatePresence, motion } from 'motion/react';
import { useCallback, useEffect, useState, type FocusEvent, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { spellChord, type ChordType } from '../theory/chords';
import { degreeMap, noteName, notePc, type Note } from '../theory/notes';
import { defaultVoicing } from '../theory/voicings';
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
}

const WIDTH = 168;
const HEIGHT = 230;

/**
 * Hover/focus tooltip showing a chord diagram. One tooltip per page:
 * spread `bind(chord)` onto each trigger and render `node` once.
 */
export function useChordPeek() {
  const [open, setOpen] = useState<Open | null>(null);

  // A fixed-position tooltip would drift away from its chip on scroll, so just close it.
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(null);
    window.addEventListener('scroll', close, { passive: true, capture: true });
    return () => window.removeEventListener('scroll', close, { capture: true });
  }, [open]);

  const bind = useCallback(
    (chord: PeekChord) => {
      const show = (e: PointerEvent<HTMLElement> | FocusEvent<HTMLElement>) => {
        if ('pointerType' in e && e.pointerType === 'touch') return;
        setOpen({ chord, rect: e.currentTarget.getBoundingClientRect() });
      };
      const hide = () => setOpen(null);
      return { onPointerEnter: show, onPointerLeave: hide, onFocus: show, onBlur: hide };
    },
    [],
  );

  return { bind, node: createPortal(<Peek open={open} />, document.body) };
}

function Peek({ open }: { open: Open | null }) {
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
            <PeekBody chord={open.chord} />
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function PeekBody({ chord }: { chord: PeekChord }) {
  const voicing = defaultVoicing(chord.rootPc, chord.type);
  const spelled = spellChord(chord.rootPc, chord.type, chord.root);
  const degrees = degreeMap(chord.rootPc, spelled.degrees);
  const names = new Map(spelled.notes.map((n) => [notePc(n), noteName(n)]));
  return (
    <>
      <div className="chord-peek-head">
        <b>{chord.name}</b>
        {voicing && <span>{voicing.frets.map((f) => (f === null ? '×' : f)).join(' ')}</span>}
      </div>
      {voicing ? (
        <ChordDiagram voicing={voicing} degrees={degrees} names={names} label="finger" />
      ) : (
        <p className="faint">No diagram</p>
      )}
    </>
  );
}
