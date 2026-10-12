import type { ChordType } from './chords';
import { defaultVoicing, findVoicings, type Voicing } from './voicings';

// Remembers which voicing you picked for each chord (e.g. by scrolling a chord's
// tooltip), so playback uses the shape you chose.

const KEY = 'woodshed:voicing-choice';
const chordKey = (rootPc: number, type: ChordType) => `${rootPc}:${type.id}`;

let choices: Record<string, string> = {};
try {
  choices = JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {};
} catch {
  /* ignore */
}

export function chosenVoicing(rootPc: number, type: ChordType): Voicing | null {
  const picked = choices[chordKey(rootPc, type)];
  return (picked && findVoicings(rootPc, type).find((v) => v.key === picked)) || defaultVoicing(rootPc, type);
}

export function chooseVoicing(rootPc: number, type: ChordType, voicing: Voicing) {
  choices = { ...choices, [chordKey(rootPc, type)]: voicing.key };
  try {
    localStorage.setItem(KEY, JSON.stringify(choices));
  } catch {
    /* ignore */
  }
}
