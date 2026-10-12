import { AnimatePresence, motion } from 'motion/react';
import { memo, useMemo } from 'react';
import { STANDARD_TUNING } from '../theory/notes';
import './fretboard.css';

export interface FretMark {
  string: number; // 0 = low E
  fret: number;
  label: string;
  color: string;
  root?: boolean;
  dim?: boolean;
  active?: boolean;
  /** Characteristic note — drawn with a dashed halo. */
  ring?: boolean;
}

interface Props {
  marks: FretMark[];
  frets?: number;
  onPlay?: (string: number, fret: number) => void;
  /** Fret range to outline (inclusive). */
  window?: [number, number] | null;
}

const STRING_GAP = 32;
const TOP = 22;
const NUT_X = 54;
const WIDTH = 1100;
const RIGHT = 16;
const INLAYS = [3, 5, 7, 9, 15, 17, 19, 21];

/** Gently tapered fret spacing — closer to a real neck than equal widths, but still readable. */
function fretXs(frets: number) {
  const r = Math.pow(2, -1 / 24);
  const span = WIDTH - NUT_X - RIGHT;
  return Array.from({ length: frets + 1 }, (_, f) => NUT_X + (span * (1 - Math.pow(r, f))) / (1 - Math.pow(r, frets)));
}

export const Fretboard = memo(function Fretboard({ marks, frets = 15, onPlay, window }: Props) {
  const xs = useMemo(() => fretXs(frets), [frets]);
  const strings = STANDARD_TUNING.length;
  const boardH = STRING_GAP * (strings - 1);
  const height = TOP + boardH + 44;
  const y = (s: number) => TOP + (strings - 1 - s) * STRING_GAP;
  const noteX = (f: number) => (f === 0 ? NUT_X - 26 : (xs[f - 1] + xs[f]) / 2);

  return (
    <div className="fretboard scroll-x">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} className="fretboard-svg" role="img" aria-label="Fretboard">
        <defs>
          <linearGradient id="fb-wood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--fret-wood)" />
            <stop offset="1" stopColor="var(--fret-wood)" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <rect x={NUT_X} y={TOP - 12} width={xs[frets] - NUT_X} height={boardH + 24} rx={6} fill="url(#fb-wood)" />

        {window && (
          <motion.rect
            className="fb-window"
            initial={false}
            animate={{
              x: xs[Math.max(0, window[0] - 1)] - (window[0] === 0 ? 46 : 0),
              width: xs[Math.min(frets, window[1])] - xs[Math.max(0, window[0] - 1)] + (window[0] === 0 ? 46 : 0),
            }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            y={TOP - 16}
            height={boardH + 32}
            rx={10}
          />
        )}

        {INLAYS.filter((f) => f <= frets).map((f) => (
          <circle key={f} cx={noteX(f)} cy={TOP + boardH / 2} r={6} className="fb-inlay" />
        ))}
        {[12, 24]
          .filter((f) => f <= frets)
          .map((f) => (
            <g key={f}>
              <circle cx={noteX(f)} cy={TOP + STRING_GAP * 1.5} r={6} className="fb-inlay" />
              <circle cx={noteX(f)} cy={TOP + STRING_GAP * 3.5} r={6} className="fb-inlay" />
            </g>
          ))}

        {xs.map((x, f) =>
          f === 0 ? (
            <rect key={f} x={x - 3} y={TOP - 12} width={6} height={boardH + 24} rx={2} className="fb-nut" />
          ) : (
            <line key={f} x1={x} x2={x} y1={TOP - 12} y2={TOP + boardH + 12} className="fb-fret" />
          ),
        )}

        {STANDARD_TUNING.map((_, s) => (
          <line
            key={s}
            x1={NUT_X - 40}
            x2={xs[frets]}
            y1={y(s)}
            y2={y(s)}
            className="fb-string"
            strokeWidth={0.9 + (strings - 1 - s) * 0.32}
          />
        ))}

        {xs.slice(1).map((_, i) => {
          const f = i + 1;
          return (
            <text key={f} x={noteX(f)} y={TOP + boardH + 34} className={`fb-num ${INLAYS.includes(f) || f % 12 === 0 ? 'strong' : ''}`}>
              {f}
            </text>
          );
        })}

        {onPlay &&
          STANDARD_TUNING.map((_, s) =>
            xs.map((x, f) => (
              <rect
                key={`${s}-${f}`}
                className="fb-hit"
                x={f === 0 ? NUT_X - 48 : xs[f - 1]}
                width={f === 0 ? 46 : x - xs[f - 1]}
                y={y(s) - STRING_GAP / 2}
                height={STRING_GAP}
                onPointerDown={() => onPlay(s, f)}
              />
            )),
          )}

        <AnimatePresence>
          {marks.map((m) => (
            <motion.g
              key={`${m.string}-${m.fret}`}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.2, transition: { duration: 0.15 } }}
              transition={{ type: 'spring', stiffness: 420, damping: 24, delay: m.fret * 0.012 + m.string * 0.008 }}
              style={{ x: noteX(m.fret), y: y(m.string) }}
              className="fb-mark"
            >
              <motion.g
                initial={false}
                animate={{ opacity: m.dim ? 0.16 : 1, scale: m.active ? 1.3 : 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
              >
                {m.active && <circle r={20} className="fb-glow" style={{ fill: m.color }} />}
                {m.ring && <circle r={17} className="fb-ring" style={{ stroke: m.color }} />}
                <circle r={13} style={{ fill: m.color }} className={m.root ? 'fb-dot root' : 'fb-dot'} />
                <text className="fb-label" dy="0.35em">
                  {m.label}
                </text>
              </motion.g>
            </motion.g>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
});
