import { describe, expect, it } from 'vitest';
import { STANDARD_TUNING, mod } from '../../theory/notes';
import { barLengths, noteMidi, parseNote, parseTab } from '../../theory/tab';
import { RIFFS } from './riffs';

describe('tab notation', () => {
  it('parses techniques', () => {
    expect(parseNote('G7b9')).toMatchObject({ string: 3, fret: 7, bendTo: 9, label: '7b9' });
    expect(parseNote('eh8')).toMatchObject({ string: 5, fret: 8, hammer: true, label: 'h8' });
    expect(parseNote('B\\8')).toMatchObject({ slide: 'down', label: '\\8' });
    expect(parseNote('E12*')).toMatchObject({ harmonic: true, label: '<12>' });
    expect(parseNote('mE0')).toMatchObject({ palmMute: true, label: '0' });
    expect(parseNote('Ax')).toMatchObject({ fret: null, label: 'x' });
    expect(parseNote('D7~')).toMatchObject({ vibrato: true, label: '7~' });
    expect(noteMidi(parseNote('E12*'), STANDARD_TUNING)).toBe(52);
    expect(noteMidi(parseNote('G7*'), STANDARD_TUNING)).toBe(74);
  });
});

describe('riff library', () => {
  it('has unique ids and a good spread of difficulty', () => {
    expect(new Set(RIFFS.map((r) => r.id)).size).toBe(RIFFS.length);
    for (const d of [1, 2, 3, 4, 5]) expect(RIFFS.filter((r) => r.difficulty === d).length).toBeGreaterThanOrEqual(4);
  });

  it.each(RIFFS.map((r) => [r.id, r] as const))('%s is well-formed', (_, r) => {
    const items = parseTab(r.tab, r.chords);
    for (const len of barLengths(items)) expect(len).toBe(4 * r.perBeat);
    for (const it of items) if (it.kind === 'step') for (const n of it.notes) expect(n.fret ?? 0).toBeLessThanOrEqual(22);
    expect(r.targetBpm).toBeGreaterThan(r.bpm);
    expect(r.tips.length).toBeGreaterThan(0);
  });

  const inScale = (id: string, pcs: number[]) => {
    const r = RIFFS.find((x) => x.id === id)!;
    const notes = parseTab(r.tab, r.chords).flatMap((it) => (it.kind === 'step' ? it.notes : []));
    for (const n of notes) {
      // A bend is judged by the pitch it reaches.
      const tuning = r.tuning?.notes ?? STANDARD_TUNING;
      if (n.fret === null) continue; // dead notes have no pitch
      const midi = n.bendTo !== undefined ? tuning[n.string] + n.bendTo : noteMidi(n, tuning)!;
      expect(pcs, `${id} ${n.label}`).toContain(mod(midi));
    }
  };
  const A_MINOR_PENT = [9, 0, 2, 4, 7];

  it('keeps scale exercises in key', () => {
    inScale('legato-pentatonic', A_MINOR_PENT);
    inScale('slide-shifts', A_MINOR_PENT);
    inScale('pentatonic-threes', A_MINOR_PENT);
    inScale('pentatonic-cascade', A_MINOR_PENT);
    inScale('bend-to-pitch', [9, 11, 0, 2, 4, 5, 7]); // A natural minor: the half-step bend is E→F
    inScale('blues-phrases', [...A_MINOR_PENT, 3]);
    inScale('three-nps-major', [7, 9, 11, 0, 2, 4, 6]);
    const E_MINOR_PENT = [4, 7, 9, 11, 2];
    const A_MINOR = [9, 11, 0, 2, 4, 5, 7];
    for (const id of ['arena-bend-lick', 'double-stop-shuffle', 'repeating-bend-lick', 'unison-bends', 'sweet-spot-box', 'vibrato-builder'])
      inScale(id, A_MINOR_PENT);
    inScale('open-e-hard-rock', E_MINOR_PENT);
    inScale('funk-single-note', E_MINOR_PENT);
    inScale('octave-melody', [4, 6, 7, 9, 11, 0, 2]);
    inScale('legato-run', A_MINOR);
    inScale('neoclassical-run', [9, 11, 0, 2, 4, 5, 8]);
    inScale('chicken-pickin', [7, 9, 11, 2, 4]);
    inScale('ode-to-joy', [0, 2, 4, 5, 7, 9, 11]);
    inScale('pima-arpeggio', [...A_MINOR, 8]);
    inScale('indie-arpeggios', [7, 9, 11, 0, 2, 4, 6]);
    inScale('boogie-bass-line', [9, 1, 4, 6, 7, 2, 11, 0]); // A then D: the C is D7's ♭7
    inScale('pedal-point-shred', [9, 11, 0, 2, 4, 5, 8]);
  });
});
