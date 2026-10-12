// Original riffs and exercises, each built to drill one or two techniques.

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  1: 'Beginner',
  2: 'Novice',
  3: 'Intermediate',
  4: 'Advanced',
  5: 'Expert',
};

export interface Riff {
  id: string;
  title: string;
  difficulty: Difficulty;
  techniques: string[];
  description: string;
  tips: string[];
  /** Suggested starting tempo and the goal tempo. */
  bpm: number;
  targetBpm: number;
  /** Steps per beat: 1 quarters, 2 eighths, 3 triplets, 4 sixteenths, 6 sextuplets. */
  perBeat: 1 | 2 | 3 | 4 | 6;
  swing?: boolean;
  /** Let every note choke quickly, like a palm-muted rhythm part. */
  palmMute?: boolean;
  chords?: Record<string, string>;
  tab: string;
}

const POWER = {
  E5: 'E0+A2+D2',
  F5: 'E1+A3+D3',
  G5: 'E3+A5+D5',
  A5: 'E5+A7+D7',
  B5: 'E7+A9+D9',
  C5: 'E8+A10+D10',
};

export const RIFFS: Riff[] = [
  {
    id: 'spider-walk',
    title: 'Spider Walk',
    difficulty: 1,
    techniques: ['Warm-up', 'Alternate picking', 'Finger independence'],
    description: 'The classic 1-2-3-4 chromatic warm-up, up across all six strings and back down.',
    tips: [
      'One finger per fret — keep each finger hovering just above its fret.',
      'Strict down-up alternate picking, even on string changes.',
      'Leave fingers down until you need them; it builds independence.',
    ],
    bpm: 60,
    targetBpm: 140,
    perBeat: 2,
    tab: `E1 E2 E3 E4 A1 A2 A3 A4 | D1 D2 D3 D4 G1 G2 G3 G4 | B1 B2 B3 B4 e1 e2 e3 e4 |
          e4 e3 e2 e1 B4 B3 B2 B1 | G4 G3 G2 G1 D4 D3 D2 D1 | A4 A3 A2 A1 E4 E3 E2 E1`,
  },
  {
    id: 'open-chord-changes',
    title: 'Campfire Changes',
    difficulty: 1,
    techniques: ['Chords', 'Strumming', 'Rhythm'],
    description: 'G – C – Em – D with the go-to down, down-up, up-down-up strum pattern.',
    tips: [
      'Keep your strumming hand moving down-up constantly, even when you miss the strings.',
      'Look for "anchor" fingers that stay put between chords (ring finger between G and C).',
      'Start changing chords on the last up-strum of each bar so you land on time.',
    ],
    bpm: 70,
    targetBpm: 120,
    perBeat: 2,
    chords: {
      G: 'E3+A2+D0+G0+B0+e3',
      C: 'A3+D2+G0+B1+e0',
      Em: 'E0+A2+D2+G0+B0+e0',
      D: 'D0+G2+B3+e2',
    },
    tab: `@G - @G ^@G - ^@G @G ^@G | @C - @C ^@C - ^@C @C ^@C | @Em - @Em ^@Em - ^@Em @Em ^@Em | @D - @D ^@D - ^@D @D ^@D`,
  },
  {
    id: 'boogie-shuffle',
    title: 'Twelve-Bar Boogie in A',
    difficulty: 1,
    techniques: ['Blues', 'Rhythm', 'Palm muting'],
    description: 'The traditional shuffle boogie over a full 12-bar blues — I, IV and V.',
    tips: [
      'Swing it: long-short, long-short, like a heartbeat.',
      'Rest the side of your picking hand lightly on the strings by the bridge.',
      'Keep your index finger planted; only the ring finger reaches for the 6th.',
    ],
    bpm: 80,
    targetBpm: 140,
    perBeat: 2,
    swing: true,
    palmMute: true,
    chords: { A5: 'A0+D2', A6: 'A0+D4', D5: 'D0+G2', D6: 'D0+G4', E5: 'E0+A2', E6: 'E0+A4' },
    tab: `@A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 |
          @D5 @D5 @D6 @D6 @D5 @D5 @D6 @D6 | @D5 @D5 @D6 @D6 @D5 @D5 @D6 @D6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 |
          @E5 @E5 @E6 @E6 @E5 @E5 @E6 @E6 | @D5 @D5 @D6 @D6 @D5 @D5 @D6 @D6 | @A5 @A5 @A6 @A6 @A5 @A5 @A6 @A6 | @E5 @E5 @E6 @E6 @E5 @E5 @E6 @E6`,
  },
  {
    id: 'garage-power',
    title: 'Garage Power Riff',
    difficulty: 2,
    techniques: ['Power chords', 'Palm muting', 'Rock'],
    description: 'Chugging open E with power-chord stabs — the backbone of rock rhythm playing.',
    tips: [
      'Palm-mute the open E notes, then lift your palm so the power chords ring.',
      'Use downstrokes only for a tighter, heavier sound.',
      'Slide the same power-chord shape — don’t re-finger it.',
    ],
    bpm: 90,
    targetBpm: 150,
    perBeat: 2,
    chords: POWER,
    tab: `mE0 mE0 @G5 - mE0 mE0 @A5 - | mE0 mE0 @G5 - mE0 @F5 @E5 -`,
  },
  {
    id: 'legato-pentatonic',
    title: 'Hammer & Pull Workout',
    difficulty: 2,
    techniques: ['Legato', 'Pentatonic'],
    description: 'Hammer-ons and pull-offs through the A minor pentatonic box, string by string.',
    tips: [
      'Pick only the first note of each group — the rest come from the fretting hand.',
      'Hammer from above with the fingertip; pull off slightly downward to "pluck" the string.',
      'Aim for every note to be the same volume.',
    ],
    bpm: 70,
    targetBpm: 130,
    perBeat: 2,
    tab: `e5 eh8 ep5 - B5 Bh8 Bp5 - | G5 Gh7 Gp5 - D5 Dh7 Dp5 - | A5 Ah7 Ap5 - E5 Eh8 Ep5 - | D5 Dh7 G5 Gh7 G7~ - - -`,
  },
  {
    id: 'bend-to-pitch',
    title: 'Bend to Pitch',
    difficulty: 2,
    techniques: ['Bending', 'Vibrato', 'Ear training'],
    description: 'Play the target note, then bend up to match it exactly — whole steps and half steps.',
    tips: [
      'Bend with two or three fingers behind the fretting finger for strength.',
      'Push from the wrist, like turning a doorknob — not just the fingers.',
      'Listen: the bent note should sound identical to the reference note.',
    ],
    bpm: 60,
    targetBpm: 90,
    perBeat: 2,
    tab: `G9 - - - G7b9 - - - | B10 - - - B8b10 - - - | B6 - - - B5b6 - - - | G7b9 - B8 - e5~ - - -`,
  },
  {
    id: 'slide-shifts',
    title: 'Sliding Between Boxes',
    difficulty: 2,
    techniques: ['Slides', 'Position shifts', 'Pentatonic'],
    description: 'Use slides to travel between A minor pentatonic positions instead of staying stuck in one box.',
    tips: [
      'Keep pressure on the string while sliding so the note doesn’t die.',
      'Slide with the finger that will play the next notes in the new position.',
      'Target the destination fret by ear — no overshooting.',
    ],
    bpm: 70,
    targetBpm: 110,
    perBeat: 2,
    tab: `G5 G7 G/9 - B8 B/10 - - | e8 e/10 - e12 e10 - B10 - | B10 B\\8 - G9 G\\7 - G5 - | D7 D\\5 - - E5~ - - -`,
  },
  {
    id: 'natural-harmonics',
    title: 'Bell Tones',
    difficulty: 2,
    techniques: ['Harmonics'],
    description: 'Natural harmonics at the 12th, 7th and 5th frets — chime-like and great for tuning by ear.',
    tips: [
      'Touch the string directly above the fret wire — don’t press it down.',
      'Pick firmly near the bridge, then lift the fretting finger right away.',
      'The 5th-fret harmonics are the quietest; pick a little harder.',
    ],
    bpm: 60,
    targetBpm: 100,
    perBeat: 1,
    tab: `E12* A12* D12* G12* | B12* e12* G12* - | E7* A7* D7* G7* | G5* B5* e5* -`,
  },
  {
    id: 'travis-picking',
    title: 'Travis Picking Pattern',
    difficulty: 3,
    techniques: ['Fingerstyle', 'Travis picking'],
    description: 'Alternating thumb bass with melody on top, over C – G – Am – C/G.',
    tips: [
      'The thumb plays every beat on the bass strings — it never stops, like a drummer.',
      'Practise the thumb alone until it’s automatic, then add fingers.',
      'Index finger takes the G string, middle finger the B and high E.',
    ],
    bpm: 60,
    targetBpm: 110,
    perBeat: 2,
    tab: `A3+e0 G0 D2 B1 A3 G0 D2 B1 | E3+e3 G0 D0 B0 E3 G0 D0 B0 | A0+e0 G2 D2 B1 A0 G2 D2 B1 | A3+B1 G0 D2 B1 E3 G0 D2 B1`,
  },
  {
    id: 'pentatonic-threes',
    title: 'Pentatonic in Threes',
    difficulty: 3,
    techniques: ['Alternate picking', 'Sequences', 'Pentatonic'],
    description: 'A minor pentatonic in overlapping groups of three, played as triplets.',
    tips: [
      'Accent the first note of each group to feel the pattern against the beat.',
      'Notice the picking pattern flips each group — down-up-down, then up-down-up.',
      'Once it’s clean, try it descending.',
    ],
    bpm: 60,
    targetBpm: 120,
    perBeat: 3,
    tab: `E5 E8 A5 E8 A5 A7 A5 A7 D5 A7 D5 D7 | D5 D7 G5 D7 G5 G7 G5 G7 B5 G7 B5 B8 | B5 B8 e5 B8 e5 e8 e5 - - - - -`,
  },
  {
    id: 'metal-gallop',
    title: 'Galloping Thunder',
    difficulty: 3,
    techniques: ['Palm muting', 'Metal', 'Rhythm'],
    description: 'The eighth-plus-two-sixteenths "gallop" on a muted low E, with power-chord hits.',
    tips: [
      'Pick down-down-up or down-up-down — try both and pick the one that stays even.',
      'Keep the palm mute consistent; it’s what makes the gallop punchy.',
      'Relax your picking arm — tension kills endurance at higher tempos.',
    ],
    bpm: 90,
    targetBpm: 170,
    perBeat: 4,
    chords: POWER,
    tab: `mE0 - mE0 mE0 mE0 - mE0 mE0 mE0 - mE0 mE0 @G5 - @A5 - | mE0 - mE0 mE0 mE0 - mE0 mE0 mE0 - mE0 mE0 @C5 - @B5 -`,
  },
  {
    id: 'funk-sixteenths',
    title: 'Funk Scratch',
    difficulty: 3,
    techniques: ['Funk', 'Muting', 'Strumming'],
    description: 'Sixteenth-note strumming on an E9, mixing chord stabs with muted "chk" scratches.',
    tips: [
      'Your hand moves in constant 16ths: down on the beat, up on the "a".',
      'Release fretting pressure (don’t lift off) to get the muted scratch.',
      'Small, loose wrist motion — think shaking water off your hand.',
    ],
    bpm: 80,
    targetBpm: 110,
    perBeat: 4,
    chords: { E9: 'A7+D6+G7+B7', X: 'Ax+Dx+Gx+Bx' },
    tab: `@E9 ^@X @X ^@E9 @X ^@E9 @X ^@X @E9 ^@X @X ^@E9 @X ^@E9 @X ^@X |
          @E9 ^@X @X ^@E9 @X ^@E9 @X ^@X @E9 ^@X @X ^@X @E9 ^@E9 @E9 -`,
  },
  {
    id: 'blues-phrases',
    title: 'Blues Phrase Toolkit',
    difficulty: 3,
    techniques: ['Blues', 'Bending', 'Vibrato', 'Phrasing'],
    description: 'Four bars of A blues vocabulary: a bend, a resolution, a blue-note run and a vibrato ending.',
    tips: [
      'Leave space — the rests are part of the phrase.',
      'Add vibrato only after the note has sounded clean for a moment.',
      'The 8th fret on the G string is the "blue note" (♭5) — pass through it, don’t sit on it.',
    ],
    bpm: 70,
    targetBpm: 110,
    perBeat: 2,
    swing: true,
    tab: `e8 - e5 - B8b10 - B8 B5 | G7 - G5 - D7~ - - - | G5 Gh7 Gh8 Gp7 G5 D7 - - | D5 D7 - - E5~ - - -`,
  },
  {
    id: 'three-nps-major',
    title: 'Three-Notes-Per-String G Major',
    difficulty: 4,
    techniques: ['Alternate picking', 'Scales', 'Speed'],
    description: 'G major up and down in the three-notes-per-string pattern, in triplets so each string gets one beat.',
    tips: [
      'Each string is one beat — use the click to check you change strings on time.',
      'Stretch with the hand, not the wrist; keep the thumb behind the neck.',
      'Push the tempo 5 bpm at a time and only when it’s clean three times in a row.',
    ],
    bpm: 60,
    targetBpm: 140,
    perBeat: 3,
    tab: `E3 E5 E7 A3 A5 A7 D4 D5 D7 G4 G5 G7 | B5 B7 B8 e5 e7 e8 e7 e5 B8 B7 B5 G7 | G5 G4 D7 D5 D4 A7 A5 A3 E7 E5 E3 -`,
  },
  {
    id: 'sweep-arpeggios',
    title: 'Sweep Arpeggios',
    difficulty: 4,
    techniques: ['Sweep picking', 'Arpeggios'],
    description: 'Three-string sweeps over Am – F – C – G, finishing with a five-string Am sweep.',
    tips: [
      'One continuous pick motion per direction — let the pick "fall" through the strings.',
      'Lift each fretting finger as soon as its note has sounded so notes don’t blur into a chord.',
      'Go painfully slow first. Sweeping only works when it’s clean.',
    ],
    bpm: 50,
    targetBpm: 120,
    perBeat: 3,
    tab: `G14 B13 e12 B13 G14 - G10 B10 e8 B10 G10 - | G12 B13 e12 B13 G12 - G7 B8 e7 B8 G7 - | A12 D14 G14 B13 e12 B13 G14 D14 A12 - - -`,
  },
  {
    id: 'tapping-triplets',
    title: 'Tapping Triplets',
    difficulty: 4,
    techniques: ['Tapping', 'Legato'],
    description: 'Two-hand tapping on the high E: tap, pull off, hammer on — outlining Am, F, C and E.',
    tips: [
      'Tap with the side of your pick-hand middle finger so you can keep holding the pick.',
      'Pull the tapping finger slightly sideways off the string to sound the next note.',
      'Mute the lower strings with your fretting-hand palm to stop ringing.',
    ],
    bpm: 60,
    targetBpm: 140,
    perBeat: 3,
    tab: `et12 ep5 eh8 et12 ep5 eh8 et12 ep5 eh8 et12 ep5 eh8 | et13 ep5 eh8 et13 ep5 eh8 et13 ep5 eh8 et13 ep5 eh8 |
          et15 ep8 eh12 et15 ep8 eh12 et15 ep8 eh12 et15 ep8 eh12 | et10 ep4 eh7 et10 ep4 eh7 et10 ep4 eh7 et10 ep4 eh7`,
  },
  {
    id: 'pentatonic-cascade',
    title: 'Pentatonic Cascade',
    difficulty: 5,
    techniques: ['Speed', 'Alternate picking', 'Pentatonic'],
    description: 'Six-note groups cascading down then up the A minor pentatonic box, as sextuplets.',
    tips: [
      'Think in groups of six — one per beat — not individual notes.',
      'Keep the picking motion small and close to the strings.',
      'Use the metronome trainer: +2 bpm every 4 bars.',
    ],
    bpm: 60,
    targetBpm: 120,
    perBeat: 6,
    tab: `e8 e5 B8 B5 G7 G5 B8 B5 G7 G5 D7 D5 G7 G5 D7 D5 A7 A5 D7 D5 A7 A5 E8 E5 |
          E5 E8 A5 A7 D5 D7 A5 A7 D5 D7 G5 G7 D5 D7 G5 G7 B5 B8 G5 G7 B5 B8 e5 e8`,
  },
  {
    id: 'string-skipping',
    title: 'String-Skipping Arpeggios',
    difficulty: 5,
    techniques: ['String skipping', 'Arpeggios'],
    description: 'Wide-interval arpeggios over Am – F – G – Am, skipping the G string for a big, open sound.',
    tips: [
      'Mute the skipped string with the underside of your fretting finger.',
      'Practise the jump from D to B on its own — it’s where notes get missed.',
      'The 5-fret stretch to the top note is big; shift rather than strain if needed.',
    ],
    bpm: 60,
    targetBpm: 130,
    perBeat: 3,
    tab: `A12 D14 B13 e17 B13 D14 A8 D10 B10 e13 B10 D10 | A10 D12 B12 e15 B12 D12 A12 D14 B13 e17 B13 D14`,
  },
];
