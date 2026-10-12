import { CHORD_TYPES, chordDegrees, type ChordType } from './chords';
import { romanFor } from './keys';
import { degreeSemis, mod, noteName, type Degree, type Note } from './notes';

export interface HarmonizedChord {
  degree: number;
  rootPc: number;
  triad: ChordType | null;
  seventh: ChordType | null;
  roman: string;
  name: string;
  seventhName: string | null;
}

const shape = (t: ChordType) =>
  chordDegrees(t)
    .slice(1)
    .map((d) => mod(degreeSemis(d)))
    .join(',');

function matchType(intervals: number[], ids: string[]): ChordType | null {
  const key = intervals.join(',');
  return CHORD_TYPES.find((t) => ids.includes(t.id) && shape(t) === key) ?? null;
}

const MAJOR_SEMIS = [0, 2, 4, 5, 7, 9, 11];

/** Stack thirds on each degree of a seven-note scale. */
export function harmonize(rootPc: number, degrees: Degree[], notes: Note[]): HarmonizedChord[] {
  if (degrees.length !== 7) return [];
  const pcs = degrees.map((d) => mod(rootPc + degreeSemis(d)));
  return pcs.map((pc, i) => {
    const iv = (k: number) => mod(pcs[(i + k) % 7] - pc);
    const triad = matchType([iv(2), iv(4)], ['maj', 'm', 'dim', 'aug']);
    const seventh = matchType([iv(2), iv(4), iv(6)], ['maj7', '7', 'm7', 'm7b5', 'dim7', 'mMaj7', 'aug7']);
    // ♭/♯ relative to the major scale, e.g. ♭III in Aeolian
    const offset = mod(pc - rootPc - MAJOR_SEMIS[i] + 6) - 6;
    return {
      degree: i,
      rootPc: pc,
      triad,
      seventh,
      roman: triad ? romanFor(i, offset, triad) : String(i + 1),
      name: noteName(notes[i]) + (triad?.symbol ?? ''),
      seventhName: seventh ? noteName(notes[i]) + seventh.symbol : null,
    };
  });
}
