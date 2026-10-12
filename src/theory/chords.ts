import { bestRoot, noteName, parseDegree, spell, type Degree, type Note } from './notes';

export interface ChordType {
  id: string;
  /** Suffix shown after the root, e.g. "m7♭5". */
  symbol: string;
  name: string;
  group: 'Triads' | 'Sevenths' | 'Sixths & Sus' | 'Extended' | 'Power';
  degrees: string[];
  /** Degrees a guitar voicing may leave out. */
  optional?: string[];
  minStrings?: number;
  maxStrings?: number;
}

export const CHORD_TYPES: ChordType[] = [
  { id: 'maj', symbol: '', name: 'Major', group: 'Triads', degrees: ['1', '3', '5'] },
  { id: 'm', symbol: 'm', name: 'Minor', group: 'Triads', degrees: ['1', 'b3', '5'] },
  { id: 'dim', symbol: '°', name: 'Diminished', group: 'Triads', degrees: ['1', 'b3', 'b5'], minStrings: 3 },
  { id: 'aug', symbol: '+', name: 'Augmented', group: 'Triads', degrees: ['1', '3', '#5'], minStrings: 3 },
  { id: '5', symbol: '5', name: 'Power chord', group: 'Power', degrees: ['1', '5'], minStrings: 2, maxStrings: 3 },

  { id: 'maj7', symbol: 'maj7', name: 'Major 7th', group: 'Sevenths', degrees: ['1', '3', '5', '7'], optional: ['5'] },
  { id: '7', symbol: '7', name: 'Dominant 7th', group: 'Sevenths', degrees: ['1', '3', '5', 'b7'], optional: ['5'] },
  { id: 'm7', symbol: 'm7', name: 'Minor 7th', group: 'Sevenths', degrees: ['1', 'b3', '5', 'b7'], optional: ['5'] },
  { id: 'm7b5', symbol: 'm7♭5', name: 'Half-diminished', group: 'Sevenths', degrees: ['1', 'b3', 'b5', 'b7'] },
  { id: 'dim7', symbol: '°7', name: 'Diminished 7th', group: 'Sevenths', degrees: ['1', 'b3', 'b5', 'bb7'] },
  { id: 'mMaj7', symbol: 'm(maj7)', name: 'Minor-major 7th', group: 'Sevenths', degrees: ['1', 'b3', '5', '7'], optional: ['5'] },
  { id: 'aug7', symbol: '+7', name: 'Augmented 7th', group: 'Sevenths', degrees: ['1', '3', '#5', 'b7'] },

  { id: '6', symbol: '6', name: 'Major 6th', group: 'Sixths & Sus', degrees: ['1', '3', '5', '6'], optional: ['5'] },
  { id: 'm6', symbol: 'm6', name: 'Minor 6th', group: 'Sixths & Sus', degrees: ['1', 'b3', '5', '6'], optional: ['5'] },
  { id: 'sus2', symbol: 'sus2', name: 'Suspended 2nd', group: 'Sixths & Sus', degrees: ['1', '2', '5'] },
  { id: 'sus4', symbol: 'sus4', name: 'Suspended 4th', group: 'Sixths & Sus', degrees: ['1', '4', '5'] },
  { id: '7sus4', symbol: '7sus4', name: 'Dominant 7 sus4', group: 'Sixths & Sus', degrees: ['1', '4', '5', 'b7'], optional: ['5'] },
  { id: 'add9', symbol: 'add9', name: 'Add 9', group: 'Sixths & Sus', degrees: ['1', '3', '5', '9'], optional: ['5'] },
  { id: 'madd9', symbol: 'm(add9)', name: 'Minor add 9', group: 'Sixths & Sus', degrees: ['1', 'b3', '5', '9'], optional: ['5'] },

  { id: '9', symbol: '9', name: 'Dominant 9th', group: 'Extended', degrees: ['1', '3', '5', 'b7', '9'], optional: ['5'] },
  { id: 'maj9', symbol: 'maj9', name: 'Major 9th', group: 'Extended', degrees: ['1', '3', '5', '7', '9'], optional: ['5'] },
  { id: 'm9', symbol: 'm9', name: 'Minor 9th', group: 'Extended', degrees: ['1', 'b3', '5', 'b7', '9'], optional: ['5'] },
  { id: '69', symbol: '6/9', name: 'Six-nine', group: 'Extended', degrees: ['1', '3', '5', '6', '9'], optional: ['5'] },
  { id: 'm11', symbol: 'm11', name: 'Minor 11th', group: 'Extended', degrees: ['1', 'b3', '5', 'b7', '9', '11'], optional: ['5', '9'] },
  { id: '13', symbol: '13', name: 'Dominant 13th', group: 'Extended', degrees: ['1', '3', '5', 'b7', '9', '13'], optional: ['5', '9'] },
  { id: '7b9', symbol: '7♭9', name: 'Dominant 7 ♭9', group: 'Extended', degrees: ['1', '3', '5', 'b7', 'b9'], optional: ['5'] },
  { id: '7#9', symbol: '7♯9', name: 'Dominant 7 ♯9', group: 'Extended', degrees: ['1', '3', '5', 'b7', '#9'], optional: ['5'] },
];

export const CHORD_GROUPS = ['Triads', 'Power', 'Sevenths', 'Sixths & Sus', 'Extended'] as const;

export const getChordType = (id: string) => CHORD_TYPES.find((c) => c.id === id) ?? CHORD_TYPES[0];

export const chordDegrees = (c: ChordType): Degree[] => c.degrees.map(parseDegree);

/**
 * Bass degrees for each inversion, index 0 = root position. Only chord tones up to the
 * 7th count — a 9th or 13th in the bass is a different chord, not an inversion.
 */
export const inversions = (c: ChordType): string[] => [
  '1',
  ...c.degrees.filter((d) => d !== '1' && parseDegree(d).num <= 7),
];

export const INVERSION_NAMES = ['Root position', '1st inversion', '2nd inversion', '3rd inversion'];

export interface SpelledChord {
  root: Note;
  type: ChordType;
  name: string;
  notes: Note[];
  degrees: Degree[];
}

export function spellChord(rootPc: number, type: ChordType, root?: Note): SpelledChord {
  const degrees = chordDegrees(type);
  const r = root ?? bestRoot(rootPc, degrees);
  return { root: r, type, name: noteName(r) + type.symbol, notes: spell(r, degrees), degrees };
}
