import { chordDegrees, type ChordType } from './chords';
import { STANDARD_TUNING, degreeSemis, mod, parseDegree } from './notes';

export interface Voicing {
  /** Fret per string, low E → high E. null = muted. */
  frets: (number | null)[];
  fingers: (number | null)[];
  barre: { fret: number; from: number; to: number } | null;
  /** First fret drawn on a chord diagram. */
  baseFret: number;
  /** Lowest fretted position, 0 for open-position shapes. */
  position: number;
  midis: number[];
  score: number;
  key: string;
}

const SPAN = 3; // max distance between lowest and highest fretted note

interface Fingering {
  fingers: (number | null)[];
  barre: Voicing['barre'];
  count: number;
}

/** Assign fingers 1–4, using a barre on the lowest fret when more than four notes are fretted. */
export function assignFingers(frets: (number | null)[]): Fingering | null {
  const fingers: (number | null)[] = frets.map(() => null);
  const fretted = frets.flatMap((f, s) => (f !== null && f > 0 ? [s] : []));
  if (fretted.length === 0) return { fingers, barre: null, count: 0 };

  const minF = Math.min(...fretted.map((s) => frets[s]!));
  let barre: Voicing['barre'] = null;
  let rest = fretted;

  if (fretted.length > 4) {
    const atMin = fretted.filter((s) => frets[s] === minF);
    if (atMin.length < 2) return null;
    const from = atMin[0];
    const to = atMin[atMin.length - 1];
    for (let s = from; s <= to; s++) {
      const f = frets[s];
      if (f === null || f < minF) return null;
    }
    barre = { fret: minF, from, to };
    for (const s of atMin) fingers[s] = 1;
    rest = fretted.filter((s) => fingers[s] === null);
  }

  const firstFree = barre ? 2 : 1;
  if (rest.length > 5 - firstFree) return null;

  rest = [...rest].sort((a, b) => frets[a]! - frets[b]! || a - b);
  let prev = firstFree - 1;
  rest.forEach((s, i) => {
    const remaining = rest.length - i - 1;
    const desired = frets[s]! - minF + 1; // one finger per fret
    const f = Math.max(prev + 1, Math.min(desired, 4 - remaining));
    fingers[s] = f;
    prev = f;
  });

  return { fingers, barre, count: (barre ? 1 : 0) + rest.length };
}

const cache = new Map<string, Voicing[]>();

/**
 * Search the neck for playable voicings. `bass` is the chord degree that must be the
 * lowest note: "1" for root position, "3" for first inversion, and so on.
 */
export function findVoicings(rootPc: number, type: ChordType, bass = '1', tuning = STANDARD_TUNING): Voicing[] {
  const cacheKey = `${rootPc}:${type.id}:${bass}:${tuning.join(',')}`;
  const hit = cache.get(cacheKey);
  if (hit) return hit;

  const degrees = chordDegrees(type);
  // A degree can't be left out if it's the one in the bass.
  const optional = new Set((type.optional ?? []).filter((d) => d !== bass));
  const allowed = new Set(degrees.map((d) => mod(rootPc + degreeSemis(d))));
  const required = new Set(degrees.filter((d) => !optional.has(d.id)).map((d) => mod(rootPc + degreeSemis(d))));
  const bassPc = mod(rootPc + degreeSemis(parseDegree(bass)));
  const minStrings = type.minStrings ?? 4;
  const maxStrings = type.maxStrings ?? 6;

  const found = new Map<string, Voicing>();

  for (let start = 0; start <= 12; start++) {
    const lo = Math.max(1, start);
    const hi = lo + SPAN;
    const options = tuning.map((open) => {
      const opts: (number | null)[] = [null];
      if (start === 0 && allowed.has(mod(open))) opts.push(0);
      for (let f = lo; f <= hi; f++) if (allowed.has(mod(open + f))) opts.push(f);
      return opts;
    });

    const frets: (number | null)[] = new Array(tuning.length).fill(null);
    const walk = (s: number) => {
      if (s === tuning.length) {
        const v = evaluate(frets, tuning, bassPc, required, allowed, optional.size > 0, minStrings, maxStrings);
        if (v && (!found.has(v.key) || found.get(v.key)!.score < v.score)) found.set(v.key, v);
        return;
      }
      for (const f of options[s]) {
        frets[s] = f;
        walk(s + 1);
      }
      frets[s] = null;
    };
    walk(0);
  }

  // Drop voicings that are a strict subset of another, unless they avoid a barre.
  const all = [...found.values()];
  const kept = all.filter(
    (a) =>
      !all.some(
        (b) =>
          b !== a &&
          b.midis.length > a.midis.length &&
          a.frets.every((f, s) => f === null || b.frets[s] === f) &&
          (b.barre === null || a.barre !== null),
      ),
  );

  // Best-scoring first, at most three per position so results spread across the neck.
  const perPosition = new Map<number, number>();
  const result = kept
    .sort((a, b) => b.score - a.score)
    .filter((v) => {
      const n = perPosition.get(v.position) ?? 0;
      perPosition.set(v.position, n + 1);
      return n < 3;
    })
    .slice(0, 16)
    .sort((a, b) => a.position - b.position || b.score - a.score);
  cache.set(cacheKey, result);
  return result;
}

function evaluate(
  frets: (number | null)[],
  tuning: number[],
  bassPc: number,
  required: Set<number>,
  allowed: Set<number>,
  hasOptional: boolean,
  minStrings: number,
  maxStrings: number,
): Voicing | null {
  const sounded = frets.flatMap((f, s) => (f !== null ? [s] : []));
  const n = sounded.length;
  if (n < minStrings || n > maxStrings) return null;

  const first = sounded[0];
  const last = sounded[n - 1];
  const interiorMutes = last - first + 1 - n;
  if (interiorMutes > 1 || (interiorMutes > 0 && (n < 4 || maxStrings < 6))) return null;

  const midis = sounded.map((s) => tuning[s] + frets[s]!);
  if (mod(midis[0]) !== bassPc) return null;

  const pcs = new Set(midis.map((m) => mod(m)));
  for (const r of required) if (!pcs.has(r)) return null;

  const frettedFrets = sounded.map((s) => frets[s]!).filter((f) => f > 0);
  const minF = frettedFrets.length ? Math.min(...frettedFrets) : 0;
  const maxF = frettedFrets.length ? Math.max(...frettedFrets) : 0;
  if (maxF - minF > SPAN) return null;

  const fingering = assignFingers(frets);
  if (!fingering) return null;

  const hasOpen = sounded.some((s) => frets[s] === 0);
  const complete = hasOptional ? pcs.size === allowed.size : true;

  let score = n * 4;
  score -= interiorMutes * 3;
  score += complete ? 2 : 0;
  score -= fingering.count * 0.5;
  score -= fingering.barre ? 1 : 0;
  score -= minF * 0.15;
  score += hasOpen ? 3 : 0;
  score -= maxF - minF === SPAN ? 1.5 : 0;
  // Bass notes crowded within a 2nd sound muddy.
  if (midis.length > 1 && midis[1] - midis[0] < 3) score -= 3;

  return {
    frets: [...frets],
    fingers: fingering.fingers,
    barre: fingering.barre,
    baseFret: maxF <= 4 ? 1 : minF,
    position: hasOpen ? 0 : minF,
    midis,
    score,
    key: frets.map((f) => (f === null ? 'x' : f)).join('-'),
  };
}

/** A sensible "go-to" voicing for playback — the best-scoring one in the lower half of the neck. */
export function defaultVoicing(rootPc: number, type: ChordType): Voicing | null {
  const all = findVoicings(rootPc, type);
  const low = all.filter((v) => v.position <= 7);
  const pool = low.length ? low : all;
  return pool.reduce<Voicing | null>((best, v) => (!best || v.score > best.score ? v : best), null);
}
