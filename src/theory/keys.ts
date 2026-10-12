import { getChordType, type ChordType } from './chords';
import { mod, noteName, notePc, parseNote, spell, type Note } from './notes';
import { getScale, scaleDegrees } from './scales';

export type KeyMode = 'major' | 'minor';

/** Circle of fifths, clockwise from the top. Minor keys are the relative minors. */
export const CIRCLE_MAJOR = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
export const CIRCLE_MAJOR_ALT: Record<number, string> = { 5: 'C♭', 6: 'G♭', 7: 'C♯' };
export const CIRCLE_MINOR = ['A', 'E', 'B', 'F#', 'C#', 'G#', 'Eb', 'Bb', 'F', 'C', 'G', 'D'];
export const CIRCLE_MINOR_ALT: Record<number, string> = { 5: 'A♭m', 6: 'D♯m', 7: 'A♯m' };

export type Ring = 'outer' | 'inner';

export interface DiatonicChord {
  degree: number; // 0-based scale degree
  roman: string;
  root: Note;
  rootPc: number;
  type: ChordType;
  name: string;
  ring: Ring;
  index: number;
}

export interface KeyInfo {
  index: number;
  mode: KeyMode;
  tonic: Note;
  name: string;
  scale: Note[];
  scaleId: string;
  signature: { count: number; type: 'sharp' | 'flat' | null; notes: string[] };
  triads: DiatonicChord[];
  sevenths: DiatonicChord[];
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_TRIADS = ['maj', 'm', 'm', 'maj', 'maj', 'm', 'dim'];
const MAJOR_SEVENTHS = ['maj7', 'm7', 'm7', 'maj7', '7', 'm7', 'm7b5'];
const MINOR_TRIADS = ['m', 'dim', 'maj', 'm', 'm', 'maj', 'maj'];
const MINOR_SEVENTHS = ['m7', 'm7b5', 'maj7', 'm7', 'm7', 'maj7', '7'];

const MINOR_QUALITIES = new Set(['m', 'dim', 'm7', 'm7b5', 'dim7', 'm6', 'm9', 'm11', 'mMaj7', 'madd9']);

export function romanFor(degree: number, acc: number, type: ChordType): string {
  const minor = MINOR_QUALITIES.has(type.id);
  const base = minor ? ROMAN[degree].toLowerCase() : ROMAN[degree];
  const prefix = acc < 0 ? '♭' : acc > 0 ? '♯' : '';
  const suffix: Record<string, string> = {
    dim: '°',
    m7b5: 'ø7',
    dim7: '°7',
    aug: '+',
    '7': '7',
    maj7: 'maj7',
    m7: '7',
    '9': '9',
    m9: '9',
    maj9: 'maj9',
  };
  return prefix + base + (suffix[type.id] ?? '');
}

/** Where a chord with this root/quality lives on the circle. */
export function circlePos(rootPc: number, type: ChordType): { ring: Ring; index: number } {
  return MINOR_QUALITIES.has(type.id)
    ? { ring: 'inner', index: mod((rootPc - 9) * 7) }
    : { ring: 'outer', index: mod(rootPc * 7) };
}

const SHARP_ORDER = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
const FLAT_ORDER = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];

export function getKey(index: number, mode: KeyMode): KeyInfo {
  const tonic = parseNote(mode === 'major' ? CIRCLE_MAJOR[index] : CIRCLE_MINOR[index]);
  const scaleId = mode === 'major' ? 'ionian' : 'aeolian';
  const scale = spell(tonic, scaleDegrees(getScale(scaleId)));

  const accs = scale.filter((n) => n.acc !== 0);
  const type = accs.length === 0 ? null : accs[0].acc > 0 ? 'sharp' : 'flat';
  const order = type === 'flat' ? FLAT_ORDER : SHARP_ORDER;
  const letters = new Set(accs.map((n) => noteName({ letter: n.letter, acc: 0 })));
  const signature = {
    count: accs.length,
    type,
    notes: order.filter((l) => letters.has(l)).map((l) => l + (type === 'flat' ? '♭' : '♯')),
  } as const;

  const build = (qualities: string[]) =>
    scale.map((root, degree): DiatonicChord => {
      const t = getChordType(qualities[degree]);
      const rootPc = notePc(root);
      return {
        degree,
        roman: romanFor(degree, 0, t),
        root,
        rootPc,
        type: t,
        name: noteName(root) + t.symbol,
        ...circlePos(rootPc, t),
      };
    });

  return {
    index,
    mode,
    tonic,
    name: `${noteName(tonic)} ${mode}`,
    scale,
    scaleId,
    signature: { ...signature, notes: [...signature.notes] },
    triads: build(mode === 'major' ? MAJOR_TRIADS : MINOR_TRIADS),
    sevenths: build(mode === 'major' ? MAJOR_SEVENTHS : MINOR_SEVENTHS),
  };
}

// ── Progressions ──

export interface ProgStep {
  deg: number;
  acc?: number;
  quality?: string;
}

export interface Progression {
  id: string;
  name: string;
  description: string;
  mode: KeyMode;
  steps: ProgStep[];
  sevenths?: boolean;
}

const s = (...degs: number[]): ProgStep[] => degs.map((deg) => ({ deg }));

export const PROGRESSIONS: Progression[] = [
  { id: 'pop', name: 'Pop anthem', description: 'The most-used progression in modern pop.', mode: 'major', steps: s(0, 4, 5, 3) },
  { id: 'doowop', name: "'50s doo-wop", description: 'Classic ballad and doo-wop changes.', mode: 'major', steps: s(0, 5, 3, 4) },
  { id: 'rock', name: 'Three-chord rock', description: 'Rock & roll, punk, folk and country staple.', mode: 'major', steps: s(0, 3, 4, 0) },
  { id: 'sensitive', name: 'Sensitive', description: 'Pop-anthem chords starting on the vi — bittersweet.', mode: 'major', steps: s(5, 3, 0, 4) },
  {
    id: 'two-five-one',
    name: 'ii–V–I',
    description: 'The essential jazz cadence.',
    mode: 'major',
    sevenths: true,
    steps: s(1, 4, 0, 0),
  },
  {
    id: 'turnaround',
    name: 'Jazz turnaround',
    description: 'I–vi–ii–V loops back to the top of a tune.',
    mode: 'major',
    sevenths: true,
    steps: s(0, 5, 1, 4),
  },
  {
    id: 'mixo-rock',
    name: 'Mixolydian rock',
    description: 'Borrows ♭VII for an anthemic classic-rock sound.',
    mode: 'major',
    steps: [{ deg: 0 }, { deg: 6, acc: -1, quality: 'maj' }, { deg: 3 }, { deg: 0 }],
  },
  { id: 'canon', name: 'Canon', description: "Pachelbel's descending sequence.", mode: 'major', steps: s(0, 4, 5, 2, 3, 0, 3, 4) },
  {
    id: 'royal-road',
    name: 'Royal Road (王道進行)',
    description: 'The signature J-pop and anime progression — wistful and dramatic.',
    mode: 'major',
    steps: [
      { deg: 3, quality: 'maj7' },
      { deg: 4, quality: '7' },
      { deg: 2, quality: 'm7' },
      { deg: 5, quality: 'm' },
    ],
  },
  {
    id: 'marusa',
    name: 'Just the Two of Us (丸サ進行)',
    description: 'City-pop favourite; the III7 and I7 add bluesy, jazzy colour.',
    mode: 'major',
    steps: [
      { deg: 3, quality: 'maj7' },
      { deg: 2, quality: '7' },
      { deg: 5, quality: 'm7' },
      { deg: 0, quality: '7' },
    ],
  },
  { id: 'komuro', name: 'Komuro (小室進行)', description: "Driving '90s J-pop and anime-opening changes.", mode: 'major', steps: s(5, 3, 4, 0) },
  {
    id: 'blues',
    name: '12-bar blues',
    description: 'All dominant 7ths — the foundation of blues and rock.',
    mode: 'major',
    steps: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4].map((deg) => ({ deg, quality: '7' })),
  },

  { id: 'epic', name: 'Epic minor', description: 'i–VI–III–VII: cinematic and driving.', mode: 'minor', steps: s(0, 5, 2, 6) },
  { id: 'minor-145', name: 'Minor i–iv–v', description: 'The minor-key three-chord trick.', mode: 'minor', steps: s(0, 3, 4, 0) },
  {
    id: 'andalusian',
    name: 'Andalusian cadence',
    description: 'Descending flamenco progression with a major V.',
    mode: 'minor',
    steps: [{ deg: 0 }, { deg: 6 }, { deg: 5 }, { deg: 4, quality: 'maj' }],
  },
  {
    id: 'minor-251',
    name: 'Minor ii–V–i',
    description: 'Jazz cadence in minor, with a dominant V7.',
    mode: 'minor',
    steps: [{ deg: 1, quality: 'm7b5' }, { deg: 4, quality: '7' }, { deg: 0, quality: 'm7' }, { deg: 0, quality: 'm7' }],
  },
  { id: 'aeolian-vamp', name: 'Aeolian vamp', description: 'i–VI–VII — rock and metal staple.', mode: 'minor', steps: s(0, 5, 6, 0) },
  { id: 'minor-descend', name: 'Rising minor', description: 'i–iv–VII–III: moody and resolving to the relative major.', mode: 'minor', steps: s(0, 3, 6, 2) },
  {
    id: 'minor-blues',
    name: 'Minor blues',
    description: '12 bars in minor with a ♭VI7–V7 turnaround.',
    mode: 'minor',
    steps: [
      ...[0, 0, 0, 0, 3, 3, 0, 0].map((deg) => ({ deg, quality: 'm7' })),
      { deg: 5, quality: '7' },
      { deg: 4, quality: '7' },
      { deg: 0, quality: 'm7' },
      { deg: 4, quality: '7' },
    ],
  },
];

export interface ResolvedStep {
  roman: string;
  root: Note;
  name: string;
  rootPc: number;
  type: ChordType;
  ring: Ring;
  index: number;
}

/** Turn a progression step into a concrete chord in a key. */
export function resolveStep(key: KeyInfo, step: ProgStep, sevenths: boolean): ResolvedStep {
  const pool = sevenths ? key.sevenths : key.triads;
  const base = key.scale[step.deg];
  const acc = step.acc ?? 0;
  const root: Note = { letter: base.letter, acc: base.acc + acc };
  const type = step.quality ? getChordType(step.quality) : pool[step.deg].type;
  const rootPc = notePc(root);
  return {
    roman: romanFor(step.deg, acc, type),
    root,
    name: noteName(root) + type.symbol,
    rootPc,
    type,
    ...circlePos(rootPc, type),
  };
}
