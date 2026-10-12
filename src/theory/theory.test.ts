import { describe, expect, it } from 'vitest';
import { getChordType, spellChord } from './chords';
import { getKey, PROGRESSIONS, resolveStep } from './keys';
import { bestRoot, noteName, spell } from './notes';
import { getScale, scaleDegrees } from './scales';
import { assignFingers, findVoicings } from './voicings';

const names = (pc: number, scale: string) => {
  const d = scaleDegrees(getScale(scale));
  return spell(bestRoot(pc, d), d).map(noteName).join(' ');
};
const shape = (v: { frets: (number | null)[] }) => v.frets.map((f) => (f === null ? 'x' : f)).join('');

describe('spelling', () => {
  it('spells scales with correct letters', () => {
    expect(names(6, 'ionian')).toBe('F♯ G♯ A♯ B C♯ D♯ E♯');
    expect(names(1, 'ionian')).toBe('D♭ E♭ F G♭ A♭ B♭ C');
    expect(names(8, 'aeolian')).toBe('G♯ A♯ B C♯ D♯ E F♯');
    expect(names(2, 'dorian')).toBe('D E F G A B C');
    expect(names(9, 'minor-pentatonic')).toBe('A C D E G');
    expect(names(9, 'blues')).toBe('A C D E♭ E G');
    expect(names(4, 'phrygian-dominant')).toBe('E F G♯ A B C D');
  });
  it('spells chords', () => {
    expect(spellChord(11, getChordType('m7b5')).notes.map(noteName).join(' ')).toBe('B D F A');
    expect(spellChord(1, getChordType('maj')).name).toBe('D♭');
    expect(spellChord(8, getChordType('m')).name).toBe('G♯m');
  });
});

describe('keys', () => {
  it('builds diatonic chords and signatures', () => {
    const g = getKey(1, 'major');
    expect(g.triads.map((c) => c.name).join(' ')).toBe('G Am Bm C D Em F♯°');
    expect(g.signature.notes).toEqual(['F♯']);
    const f = getKey(11, 'major');
    expect(f.signature.notes).toEqual(['B♭']);
    const em = getKey(1, 'minor');
    expect(em.sevenths.map((c) => c.roman).join(' ')).toBe('i7 iiø7 IIImaj7 iv7 v7 VImaj7 VII7');
  });
  it('resolves borrowed chords', () => {
    const c = getKey(0, 'major');
    const mixo = PROGRESSIONS.find((p) => p.id === 'mixo-rock')!;
    expect(mixo.steps.map((s) => resolveStep(c, s, false).name).join(' ')).toBe('C B♭ F C');
    expect(resolveStep(c, mixo.steps[1], false).roman).toBe('♭VII');
  });
  it('resolves J-pop progressions', () => {
    const c = getKey(0, 'major');
    const show = (id: string) =>
      PROGRESSIONS.find((p) => p.id === id)!.steps.map((s) => resolveStep(c, s, false)).map((r) => `${r.roman}:${r.name}`).join(' ');
    expect(show('royal-road')).toBe('IVmaj7:Fmaj7 V7:G7 iii7:Em7 vi:Am');
    expect(show('marusa')).toBe('IVmaj7:Fmaj7 III7:E7 vi7:Am7 I7:C7');
    expect(show('komuro')).toBe('vi:Am IV:F V:G I:C');
  });
});

describe('voicings', () => {
  it('fingers common shapes', () => {
    expect(assignFingers([null, null, 0, 2, 3, 2])!.fingers).toEqual([null, null, null, 1, 3, 2]);
    const f = assignFingers([1, 3, 3, 2, 1, 1])!;
    expect(f.barre).toEqual({ fret: 1, from: 0, to: 5 });
    expect(f.fingers).toEqual([1, 3, 4, 2, 1, 1]);
  });
  it('finds the open chords', () => {
    const has = (pc: number, id: string, s: string) =>
      expect(findVoicings(pc, getChordType(id)).map(shape)).toContain(s);
    has(0, 'maj', 'x32010');
    has(7, 'maj', '320003');
    has(2, 'maj', 'xx0232');
    has(4, 'm', '022000');
    has(9, 'm', 'x02210');
    has(5, 'maj', '133211');
    has(10, 'maj', 'x13331');
    has(9, '7', 'x02020');
    has(4, '5', '022xxx');
  });
  it('finds voicings for every chord type and root', async () => {
    const { CHORD_TYPES } = await import('./chords');
    for (const t of CHORD_TYPES) for (let pc = 0; pc < 12; pc++) {
      expect(findVoicings(pc, t).length, `${pc} ${t.id}`).toBeGreaterThan(2);
    }
  });
});

describe('inversions', () => {
  it('finds standard inverted shapes', async () => {
    const { inversions } = await import('./chords');
    const has = (pc: number, id: string, bass: string, s: string) =>
      expect(findVoicings(pc, getChordType(id), bass).map(shape)).toContain(s);
    has(0, 'maj', '3', '032010'); // C/E
    has(0, 'maj', '5', '332010'); // C/G
    has(9, 'm', 'b3', 'x32210'); // Am/C
    expect(inversions(getChordType('m7'))).toEqual(['1', 'b3', '5', 'b7']);
    expect(inversions(getChordType('13'))).toEqual(['1', '3', '5', 'b7']);
  });
});
