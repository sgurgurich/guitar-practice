import { useCallback, useEffect, useRef, useState } from 'react';
import { playSequence, strum } from '../../audio/guitar';
import type { ChordType } from '../../theory/chords';
import { chosenVoicing } from '../../theory/voicingChoice';

export interface PlayableChord {
  rootPc: number;
  type: ChordType;
}

/** Plays a chord progression with a simple strum pattern; tracks which chord is sounding. */
export function useProgressionPlayer() {
  const [state, setState] = useState<{ id: string; index: number } | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
    setState(null);
  }, []);

  const play = useCallback(
    (id: string, chords: PlayableChord[], opts: { bpm: number; beatsPerChord: number; loop: boolean }) => {
      cancel.current?.();
      const beats = chords.flatMap((c, ci) => {
        const midis = chosenVoicing(c.rootPc, c.type)?.midis ?? [];
        return Array.from({ length: opts.beatsPerChord }, (_, b) => ({ ci, b, midis }));
      });
      // Down on every beat, with a lighter up-strum between beats 2–3 and 3–4.
      const events = beats.flatMap((beat) => {
        const out = [{ ...beat, up: false }];
        if (opts.beatsPerChord >= 4 && (beat.b === 1 || beat.b === 2)) out.push({ ...beat, up: true });
        return out;
      });
      const spb = 60 / opts.bpm;
      cancel.current = playSequence(
        events,
        (e) => {
          const split = e.b === 1 || e.b === 2;
          return opts.beatsPerChord >= 4 && split ? spb / 2 : spb;
        },
        (e, when) =>
          strum(e.up ? e.midis.slice(-4) : e.midis, {
            when,
            up: e.up,
            spacing: e.up ? 0.014 : 0.024,
            velocity: e.up ? 0.5 : e.b === 0 ? 1 : 0.72,
            choke: !e.up,
          }),
        {
          loop: opts.loop,
          onStep: (i) => {
            const e = events[i];
            if (e.b === 0 && !e.up) setState({ id, index: e.ci });
          },
          onEnd: () => {
            cancel.current = null;
            setState(null);
          },
        },
      );
      setState({ id, index: 0 });
    },
    [],
  );

  useEffect(() => () => cancel.current?.(), []);

  return { state, play, stop };
}

export function playChord(rootPc: number, type: ChordType) {
  const v = chosenVoicing(rootPc, type);
  if (v) strum(v.midis, { choke: true });
}
