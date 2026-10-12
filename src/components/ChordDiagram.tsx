import { motion } from 'motion/react';
import { memo } from 'react';
import type { Voicing } from '../theory/voicings';
import { STANDARD_TUNING, mod } from '../theory/notes';
import { degColor } from './controls';

export type DiagramLabel = 'finger' | 'interval' | 'note';

interface Props {
  voicing: Voicing;
  /** pitch class → degree id (e.g. "b3") */
  degrees: Map<number, string>;
  /** pitch class → spelled note name */
  names: Map<number, string>;
  label: DiagramLabel;
  rows?: number;
}

const SX = 22; // left
const GAP = 17; // string spacing
const TOP = 28;
const ROW = 22;

export const ChordDiagram = memo(function ChordDiagram({ voicing, degrees, names, label, rows = 5 }: Props) {
  const { frets, fingers, barre, baseFret } = voicing;
  const x = (s: number) => SX + s * GAP;
  const yMid = (f: number) => TOP + (f - baseFret + 0.5) * ROW;
  const width = SX + GAP * 5 + 22;
  const height = TOP + ROW * rows + 26;
  const pcOf = (s: number) => mod(STANDARD_TUNING[s] + frets[s]!);

  const text = (s: number) => {
    const pc = pcOf(s);
    if (label === 'finger') return fingers[s] ? String(fingers[s]) : '';
    if (label === 'note') return names.get(pc) ?? '';
    return (degrees.get(pc) ?? '').replace(/b/g, '♭').replace(/#/g, '♯');
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="chord-svg" role="img">
      {baseFret === 1 ? (
        <rect x={x(0) - 1.5} y={TOP - 5} width={GAP * 5 + 3} height={5} rx={1.5} className="cd-nut" />
      ) : (
        <text x={x(0) - 9} y={yMid(baseFret)} dy="0.35em" className="cd-base">
          {baseFret}
        </text>
      )}

      {Array.from({ length: rows + 1 }, (_, i) => (
        <line key={i} x1={x(0)} x2={x(5)} y1={TOP + i * ROW} y2={TOP + i * ROW} className="cd-fret" />
      ))}
      {frets.map((_, s) => (
        <line key={s} x1={x(s)} x2={x(s)} y1={TOP} y2={TOP + rows * ROW} className="cd-string" />
      ))}

      {frets.map((f, s) =>
        f === null ? (
          <text key={s} x={x(s)} y={TOP - 12} className="cd-mute">
            ×
          </text>
        ) : f === 0 ? (
          <circle key={s} cx={x(s)} cy={TOP - 14} r={4.2} className="cd-open" style={{ stroke: degColor(degrees.get(pcOf(s)) ?? '1') }} />
        ) : null,
      )}

      {barre && (
        <motion.rect
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          x={x(barre.from) - 8.5}
          y={yMid(barre.fret) - 8.5}
          width={x(barre.to) - x(barre.from) + 17}
          height={17}
          rx={8.5}
          className="cd-barre"
        />
      )}

      {frets.map((f, s) => {
        if (f === null || f === 0) return null;
        const deg = degrees.get(pcOf(s)) ?? '1';
        const isRoot = deg === '1';
        const t = text(s);
        return (
          <motion.g
            key={s}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 22, delay: 0.04 + s * 0.035 }}
            style={{ x: x(s), y: yMid(f) }}
          >
            <circle r={8} style={{ fill: degColor(deg) }} className={isRoot ? 'cd-dot root' : 'cd-dot'} />
            <text dy="0.36em" className={`cd-label ${t.length > 2 ? 'small' : ''}`}>
              {t}
            </text>
          </motion.g>
        );
      })}

      {frets.map((f, s) =>
        f === null ? null : (
          <text key={s} x={x(s)} y={TOP + rows * ROW + 16} className="cd-foot">
            {/* Footer shows whichever of note/interval the dots don't. */}
            {label === 'interval'
              ? names.get(pcOf(s))
              : (degrees.get(pcOf(s)) ?? '').replace(/b/g, '♭').replace(/#/g, '♯')}
          </text>
        ),
      )}
    </svg>
  );
});
