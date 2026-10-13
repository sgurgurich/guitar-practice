import { useCallback, useEffect, useRef, useState } from 'react';
import { pluck, playSequence, tick, type PluckHandle } from '../../audio/guitar';
import { STANDARD_TUNING } from '../../theory/notes';
import { noteMidi, type TabItem } from '../../theory/tab';
import type { Riff } from './riffs';

interface StepEvent {
  item: number; // index into the parsed items, for highlighting
  inBar: number;
  dur: number;
  step: Extract<TabItem, { kind: 'step' }>;
}

/** Plays one riff at a time; reports the tab column currently sounding. */
export function useRiffPlayer() {
  const [state, setState] = useState<{ id: string; item: number } | null>(null);
  const cancel = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    cancel.current?.();
    cancel.current = null;
    setState(null);
  }, []);

  const play = useCallback((riff: Riff, items: TabItem[], opts: { bpm: number; loop: boolean; click: boolean }) => {
    cancel.current?.();
    const base = 60 / opts.bpm / riff.perBeat;
    const events: StepEvent[] = [];
    let inBar = 0;
    items.forEach((it, item) => {
      if (it.kind === 'bar') {
        inBar = 0;
        return;
      }
      // Swung eighths: long-short in a 2:1 ratio.
      const dur = riff.swing && riff.perBeat === 2 ? (inBar % 2 === 0 ? base * (4 / 3) : base * (2 / 3)) : base;
      events.push({ item, inBar, dur, step: it });
      inBar++;
    });

    const tuning = riff.tuning?.notes ?? STANDARD_TUNING;
    const ringing: (PluckHandle | undefined)[] = [];
    cancel.current = playSequence(
      events,
      (e) => e.dur,
      (e, when) => {
        if (opts.click && e.inBar % riff.perBeat === 0) tick(when, e.inBar === 0);
        const isChord = !!e.step.chord;
        const notes = [...e.step.notes].sort((a, b) => (e.step.up ? b.string - a.string : a.string - b.string));
        notes.forEach((n, i) => {
          const t = when + (isChord ? i * 0.011 : 0);
          ringing[n.string]?.stop(t);
          const midi = noteMidi(n, tuning);
          if (midi === null) {
            // Dead note: a short percussive "chk".
            ringing[n.string] = pluck(tuning[n.string] + 5, { when: t, gain: 0.22, length: 0.015 });
            return;
          }
          const legato = n.hammer || n.pull || n.slide;
          const muted = n.palmMute || riff.palmMute;
          ringing[n.string] = pluck(midi, {
            when: t,
            gain: (legato ? 0.32 : n.harmonic ? 0.42 : 0.5) * (e.step.up ? 0.65 : 1) * (isChord ? 0.7 : 1),
            length: muted ? 0.11 : undefined,
            bend: n.bendTo !== undefined && n.fret !== null ? n.bendTo - n.fret : undefined,
            vibrato: n.vibrato,
          });
        });
      },
      {
        loop: opts.loop,
        onStep: (i) => setState({ id: riff.id, item: events[i].item }),
        onEnd: () => {
          cancel.current = null;
          setState(null);
        },
      },
    );
    setState({ id: riff.id, item: events[0]?.item ?? 0 });
  }, []);

  useEffect(() => () => cancel.current?.(), []);

  return { state, play, stop };
}
