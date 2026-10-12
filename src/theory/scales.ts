import { parseDegree, type Degree } from './notes';

export interface ScaleDef {
  id: string;
  name: string;
  alias?: string;
  group: string;
  degrees: string[];
  /** Short description of the sound. */
  character: string;
  /** Where you hear it. */
  usage: string;
  /** Parent scale relationship, for modes. */
  parent?: string;
  /** Degrees that give the scale its unique flavour. */
  signature?: string[];
  /** Seventh-chord quality built on the tonic. */
  chord?: string;
}

export const SCALES: ScaleDef[] = [
  // ── Modes of the major scale ──
  {
    id: 'ionian',
    name: 'Ionian',
    alias: 'Major',
    group: 'Modes of Major',
    degrees: ['1', '2', '3', '4', '5', '6', '7'],
    character: 'Bright, stable and resolved — the reference point every other mode is compared to.',
    usage: 'Pop, rock, country, folk. The default "happy" sound.',
    parent: '1st mode of the major scale',
    signature: ['3', '7'],
    chord: 'maj7',
  },
  {
    id: 'dorian',
    name: 'Dorian',
    group: 'Modes of Major',
    degrees: ['1', '2', 'b3', '4', '5', '6', 'b7'],
    character: 'Minor, but with a natural 6th that keeps it soulful and hopeful rather than sad.',
    usage: 'Funk, modal jazz, blues-rock, Latin rock, Celtic folk.',
    parent: '2nd mode of the major scale',
    signature: ['6'],
    chord: 'm7',
  },
  {
    id: 'phrygian',
    name: 'Phrygian',
    group: 'Modes of Major',
    degrees: ['1', 'b2', 'b3', '4', '5', 'b6', 'b7'],
    character: 'Dark and tense — the ♭2 sitting a half step above the root gives an exotic edge.',
    usage: 'Flamenco, thrash & death metal, cinematic tension.',
    parent: '3rd mode of the major scale',
    signature: ['b2'],
    chord: 'm7',
  },
  {
    id: 'lydian',
    name: 'Lydian',
    group: 'Modes of Major',
    degrees: ['1', '2', '3', '#4', '5', '6', '7'],
    character: 'The brightest mode. The ♯4 makes major sound dreamy, floating and weightless.',
    usage: 'Film and TV scores, prog, instrumental rock guitar.',
    parent: '4th mode of the major scale',
    signature: ['#4'],
    chord: 'maj7',
  },
  {
    id: 'mixolydian',
    name: 'Mixolydian',
    group: 'Modes of Major',
    degrees: ['1', '2', '3', '4', '5', '6', 'b7'],
    character: 'Major with a ♭7 — bluesy, laid-back and a little rebellious.',
    usage: 'Classic rock, blues, country, jam bands. Fits any dominant 7 chord.',
    parent: '5th mode of the major scale',
    signature: ['b7'],
    chord: '7',
  },
  {
    id: 'aeolian',
    name: 'Aeolian',
    alias: 'Natural Minor',
    group: 'Modes of Major',
    degrees: ['1', '2', 'b3', '4', '5', 'b6', 'b7'],
    character: 'The natural minor scale — melancholy, serious and emotional.',
    usage: 'Rock ballads, pop, metal, classical.',
    parent: '6th mode of the major scale',
    signature: ['b6'],
    chord: 'm7',
  },
  {
    id: 'locrian',
    name: 'Locrian',
    group: 'Modes of Major',
    degrees: ['1', 'b2', 'b3', '4', 'b5', 'b6', 'b7'],
    character: 'The darkest mode. Its ♭5 means there is no stable tonic chord — unsettled and dissonant.',
    usage: 'Heavy riffs, and in jazz over m7♭5 chords.',
    parent: '7th mode of the major scale',
    signature: ['b5'],
    chord: 'm7b5',
  },

  // ── Pentatonic & blues ──
  {
    id: 'minor-pentatonic',
    name: 'Minor Pentatonic',
    group: 'Pentatonic & Blues',
    degrees: ['1', 'b3', '4', '5', 'b7'],
    character: 'Five notes, no half steps. Impossible to sound wrong — the backbone of rock and blues soloing.',
    usage: 'Blues, rock, metal, funk. Usually the first scale guitarists learn.',
    signature: ['b3', 'b7'],
    chord: 'm7',
  },
  {
    id: 'major-pentatonic',
    name: 'Major Pentatonic',
    group: 'Pentatonic & Blues',
    degrees: ['1', '2', '3', '5', '6'],
    character: 'Sweet, open and melodic — major without the half-step tension.',
    usage: 'Country, Southern rock, pop and soul melodies.',
    signature: ['3', '6'],
    chord: '6',
  },
  {
    id: 'blues',
    name: 'Blues',
    alias: 'Minor Blues',
    group: 'Pentatonic & Blues',
    degrees: ['1', 'b3', '4', 'b5', '5', 'b7'],
    character: 'Minor pentatonic plus the ♭5 "blue note" — gritty and expressive.',
    usage: 'Blues, rock, jazz. Slide or bend into the ♭5.',
    signature: ['b5'],
    chord: '7',
  },
  {
    id: 'major-blues',
    name: 'Major Blues',
    group: 'Pentatonic & Blues',
    degrees: ['1', '2', 'b3', '3', '5', '6'],
    character: 'Major pentatonic with a ♭3 passing tone — the classic country-blues lick sound.',
    usage: 'Country, Southern rock, jump blues.',
    signature: ['b3'],
    chord: '7',
  },

  // ── Minor variants ──
  {
    id: 'harmonic-minor',
    name: 'Harmonic Minor',
    group: 'Minor Variants',
    degrees: ['1', '2', 'b3', '4', '5', 'b6', '7'],
    character: 'Natural minor with a raised 7th — the gap between ♭6 and 7 sounds dramatic and exotic.',
    usage: 'Classical, neoclassical shred, Middle Eastern and Eastern European music.',
    signature: ['b6', '7'],
    chord: 'mMaj7',
  },
  {
    id: 'melodic-minor',
    name: 'Melodic Minor',
    alias: 'Jazz Minor',
    group: 'Minor Variants',
    degrees: ['1', '2', 'b3', '4', '5', '6', '7'],
    character: 'Minor with a major 6th and 7th — smooth, sophisticated and slightly mysterious.',
    usage: 'Jazz, fusion, film music.',
    signature: ['6', '7'],
    chord: 'mMaj7',
  },
  {
    id: 'phrygian-dominant',
    name: 'Phrygian Dominant',
    group: 'Minor Variants',
    degrees: ['1', 'b2', '3', '4', '5', 'b6', 'b7'],
    character: 'Phrygian with a major 3rd — fiery, Spanish and unmistakable.',
    usage: 'Flamenco, metal, klezmer, Middle Eastern music.',
    parent: '5th mode of harmonic minor',
    signature: ['b2', '3'],
    chord: '7',
  },
  {
    id: 'lydian-dominant',
    name: 'Lydian Dominant',
    group: 'Minor Variants',
    degrees: ['1', '2', '3', '#4', '5', '6', 'b7'],
    character: 'Lydian ♯4 meets Mixolydian ♭7 — bright but bluesy.',
    usage: 'Jazz and fusion over 7♯11 chords.',
    parent: '4th mode of melodic minor',
    signature: ['#4', 'b7'],
    chord: '7',
  },
  {
    id: 'altered',
    name: 'Altered',
    alias: 'Super Locrian',
    group: 'Minor Variants',
    degrees: ['1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7'],
    character: 'Every possible tension over a dominant chord — maximum pull back to the tonic.',
    usage: 'Jazz, over the V7 in a ii–V–I.',
    parent: '7th mode of melodic minor',
    signature: ['b2', 'b3', 'b5', 'b6'],
    chord: '7',
  },

  // ── Symmetric ──
  {
    id: 'whole-tone',
    name: 'Whole Tone',
    group: 'Symmetric',
    degrees: ['1', '2', '3', '#4', '#5', 'b7'],
    character: 'All whole steps — dreamy and ambiguous, with no clear centre.',
    usage: 'Impressionist classical, jazz over augmented chords, dream sequences.',
    signature: ['#4', '#5'],
    chord: '7',
  },
  {
    id: 'diminished-hw',
    name: 'Diminished (H–W)',
    alias: 'Dominant Diminished',
    group: 'Symmetric',
    degrees: ['1', 'b2', 'b3', '3', '#4', '5', '6', 'b7'],
    character: 'Alternating half and whole steps — tense, angular and symmetrical.',
    usage: 'Jazz over 7♭9 chords, metal.',
    signature: ['b2', 'b3', '#4'],
    chord: '7',
  },
  {
    id: 'diminished-wh',
    name: 'Diminished (W–H)',
    group: 'Symmetric',
    degrees: ['1', '2', 'b3', '4', 'b5', 'b6', '6', '7'],
    character: 'Alternating whole and half steps — the natural fit for diminished 7 chords.',
    usage: 'Jazz, horror and suspense film scores.',
    signature: ['b5', '7'],
    chord: 'dim7',
  },
];

export const SCALE_GROUPS = [...new Set(SCALES.map((s) => s.group))];

export const getScale = (id: string) => SCALES.find((s) => s.id === id) ?? SCALES[0];

export const scaleDegrees = (s: ScaleDef): Degree[] => s.degrees.map(parseDegree);

/** Modes ordered from brightest to darkest. */
export const MODE_BRIGHTNESS = ['lydian', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'phrygian', 'locrian'];
