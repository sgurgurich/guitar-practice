export interface Tuning {
  name: string;
  /** Open-string MIDI notes, low → high. */
  notes: number[];
}

export const STANDARD: Tuning = { name: 'Standard', notes: [40, 45, 50, 55, 59, 64] };
export const DROP_D: Tuning = { name: 'Drop D', notes: [38, 45, 50, 55, 59, 64] };
export const OPEN_G: Tuning = { name: 'Open G', notes: [38, 43, 50, 55, 59, 62] };
