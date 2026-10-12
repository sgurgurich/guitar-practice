// Core pitch/spelling utilities. Notes are stored as letter + accidental so that
// scales and chords are spelled correctly (e.g. F♯ major has an E♯, not an F).

export const LETTERS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
const LETTER_PC = [0, 2, 4, 5, 7, 9, 11];
const DEGREE_SEMIS = [0, 2, 4, 5, 7, 9, 11];

export const mod = (n: number, m = 12) => ((n % m) + m) % m;

export interface Note {
  letter: number; // 0..6 → C..B
  acc: number; // -2..2 (flats negative)
}

export interface Degree {
  num: number; // 1..13
  acc: number;
  id: string; // original string, e.g. "b7"
}

export const notePc = (n: Note) => mod(LETTER_PC[n.letter] + n.acc);

export function accidental(acc: number): string {
  if (acc === 0) return '';
  return acc > 0 ? '♯'.repeat(acc) : '♭'.repeat(-acc);
}

export const noteName = (n: Note) => LETTERS[n.letter] + accidental(n.acc);

export function parseNote(s: string): Note {
  const letter = LETTERS.indexOf(s[0].toUpperCase() as (typeof LETTERS)[number]);
  if (letter < 0) throw new Error(`Bad note: ${s}`);
  let acc = 0;
  for (const ch of s.slice(1)) {
    if (ch === '#' || ch === '♯') acc++;
    else if (ch === 'b' || ch === '♭') acc--;
  }
  return { letter, acc };
}

export function parseDegree(id: string): Degree {
  const m = /^(b{1,2}|#{1,2})?(\d+)$/.exec(id);
  if (!m) throw new Error(`Bad degree: ${id}`);
  const acc = m[1] ? (m[1][0] === 'b' ? -m[1].length : m[1].length) : 0;
  return { num: Number(m[2]), acc, id };
}

export const degreeSemis = (d: Degree) =>
  DEGREE_SEMIS[(d.num - 1) % 7] + d.acc + (d.num > 7 ? 12 : 0);

export const degreeLabel = (id: string) => id.replace(/bb/g, '♭♭').replace(/b/g, '♭').replace(/#/g, '♯');

export function spellDegree(root: Note, d: Degree): Note {
  const letter = (root.letter + d.num - 1) % 7;
  const targetPc = mod(notePc(root) + degreeSemis(d));
  let acc = mod(targetPc - LETTER_PC[letter]);
  if (acc > 6) acc -= 12;
  return { letter, acc };
}

export const spell = (root: Note, degrees: Degree[]) => degrees.map((d) => spellDegree(root, d));

/** Natural, sharp and flat spellings of a pitch class. */
function rootCandidates(pc: number): Note[] {
  const out: Note[] = [];
  for (let letter = 0; letter < 7; letter++) {
    const diff = mod(pc - LETTER_PC[letter]);
    if (diff === 0) out.push({ letter, acc: 0 });
    else if (diff === 1) out.push({ letter, acc: 1 });
    else if (diff === 11) out.push({ letter, acc: -1 });
  }
  // natural first, then sharps, then flats — used as the tie-breaker
  return out.sort((a, b) => rank(a.acc) - rank(b.acc));
}
const rank = (acc: number) => (acc === 0 ? 0 : acc > 0 ? 1 : 2);

/** Pick the enharmonic root that spells the given collection with the fewest accidentals. */
export function bestRoot(pc: number, degrees: Degree[]): Note {
  let best: Note | null = null;
  let bestScore = Infinity;
  for (const cand of rootCandidates(pc)) {
    const score = spell(cand, degrees).reduce(
      (s, n) => s + Math.abs(n.acc) + (Math.abs(n.acc) >= 2 ? 100 : 0),
      0,
    );
    if (score < bestScore) {
      bestScore = score;
      best = cand;
    }
  }
  return best!;
}

/** Labels for the 12 pitch classes, used on root pickers. */
export const PC_LABELS: { main: string; alt?: string }[] = [
  { main: 'C' },
  { main: 'C♯', alt: 'D♭' },
  { main: 'D' },
  { main: 'E♭', alt: 'D♯' },
  { main: 'E' },
  { main: 'F' },
  { main: 'F♯', alt: 'G♭' },
  { main: 'G' },
  { main: 'A♭', alt: 'G♯' },
  { main: 'A' },
  { main: 'B♭', alt: 'A♯' },
  { main: 'B' },
];

/** Standard tuning, low E to high E, as MIDI numbers. */
export const STANDARD_TUNING = [40, 45, 50, 55, 59, 64];

export const midiToFreq = (midi: number, a4 = 440) => a4 * Math.pow(2, (midi - 69) / 12);

const SHARP_NAMES = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
export const midiName = (midi: number) => SHARP_NAMES[mod(Math.round(midi))];
export const midiOctave = (midi: number) => Math.floor(Math.round(midi) / 12) - 1;

/** Map a pitch class to its degree label within a spelled collection (if present). */
export function degreeMap(rootPc: number, degrees: Degree[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const d of degrees) {
    const pc = mod(rootPc + degreeSemis(d));
    if (!map.has(pc)) map.set(pc, d.id);
  }
  return map;
}

/** Colour family for an interval, so the same function looks the same across the app. */
export function degreeRole(id: string): 'root' | 'third' | 'fifth' | 'seventh' | 'second' | 'fourth' | 'sixth' {
  const num = parseDegree(id).num;
  switch (((num - 1) % 7) + 1) {
    case 1:
      return 'root';
    case 2:
      return 'second';
    case 3:
      return 'third';
    case 4:
      return 'fourth';
    case 5:
      return 'fifth';
    case 6:
      return 'sixth';
    default:
      return 'seventh';
  }
}
