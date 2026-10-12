// A compact tab notation that can be both drawn and played back.
//
//   "E3 A5 - G/7 | @G ^@G"
//
// Whitespace separates steps; "|" is a bar line; "-" is a rest (let ring).
// A note is: [m]<string>[technique]<fret>[*][b<target>][~]
//   m      palm mute            string  E A D G B e (low → high)
//   h p    hammer-on / pull-off  / \    slide up / down into the note
//   t      tapped note          *       natural harmonic
//   b9     bend up to sound like fret 9      ~  vibrato
//   x      dead (muted) note instead of a fret number
// Notes joined with "+" sound together. "@Name" expands a chord from the riff's
// chord table; prefix "^" for an up-strum.

export const STRING_LETTERS = ['E', 'A', 'D', 'G', 'B', 'e'] as const;

export interface TabNote {
  string: number; // 0 = low E
  fret: number | null; // null = dead note
  label: string;
  hammer?: boolean;
  pull?: boolean;
  slide?: 'up' | 'down';
  tap?: boolean;
  harmonic?: boolean;
  bendTo?: number;
  vibrato?: boolean;
  palmMute?: boolean;
}

export type TabItem = { kind: 'bar' } | { kind: 'step'; notes: TabNote[]; up?: boolean; chord?: string };

const NOTE_RE = /^(m)?([EADGBe])([hpt/\\])?(\d+|x)(\*)?(?:b(\d+))?(~)?$/;

export function parseNote(token: string): TabNote {
  const m = NOTE_RE.exec(token);
  if (!m) throw new Error(`Bad tab note "${token}"`);
  const [, pm, letter, tech, fretStr, harm, bend, vib] = m;
  const fret = fretStr === 'x' ? null : Number(fretStr);
  const note: TabNote = { string: STRING_LETTERS.indexOf(letter as (typeof STRING_LETTERS)[number]), fret, label: '' };
  if (pm) note.palmMute = true;
  if (tech === 'h') note.hammer = true;
  if (tech === 'p') note.pull = true;
  if (tech === 't') note.tap = true;
  if (tech === '/') note.slide = 'up';
  if (tech === '\\') note.slide = 'down';
  if (harm) note.harmonic = true;
  if (bend) note.bendTo = Number(bend);
  if (vib) note.vibrato = true;
  const core = fret === null ? 'x' : harm ? `<${fret}>` : String(fret);
  note.label = (tech ?? '') + core + (bend ? `b${bend}` : '') + (vib ? '~' : '');
  return note;
}

export function parseTab(src: string, chords: Record<string, string> = {}): TabItem[] {
  return src
    .trim()
    .split(/\s+/)
    .map((tok): TabItem => {
      if (tok === '|') return { kind: 'bar' };
      if (tok === '-') return { kind: 'step', notes: [] };
      const up = tok.startsWith('^');
      const body = up ? tok.slice(1) : tok;
      if (body.startsWith('@')) {
        const name = body.slice(1);
        const def = chords[name];
        if (!def) throw new Error(`Unknown chord "@${name}"`);
        return { kind: 'step', notes: def.split('+').map(parseNote), up, chord: name };
      }
      return { kind: 'step', notes: body.split('+').map(parseNote), up };
    });
}

/** Steps per bar, for validation and bar-aware playback. */
export function barLengths(items: TabItem[]): number[] {
  const out = [0];
  for (const it of items) {
    if (it.kind === 'bar') out.push(0);
    else out[out.length - 1]++;
  }
  return out;
}

/** Sounding pitch of a note (natural harmonics ring above the fretted pitch). */
const HARMONIC_INTERVAL: Record<number, number> = { 12: 12, 7: 19, 19: 19, 5: 24, 24: 24, 4: 28, 9: 28 };
export function noteMidi(n: TabNote, tuning: number[]): number | null {
  if (n.fret === null) return null;
  const open = tuning[n.string];
  return n.harmonic ? open + (HARMONIC_INTERVAL[n.fret] ?? 12) : open + n.fret;
}
