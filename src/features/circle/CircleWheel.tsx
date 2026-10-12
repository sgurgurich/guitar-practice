import { motion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useRef } from 'react';
import { CIRCLE_MAJOR, CIRCLE_MAJOR_ALT, CIRCLE_MINOR, CIRCLE_MINOR_ALT, type KeyInfo, type Ring } from '../../theory/keys';
import { accidental, mod } from '../../theory/notes';

interface Props {
  keyInfo: KeyInfo;
  sevenths: boolean;
  rotate: boolean;
  playing: { ring: Ring; index: number } | null;
  onSelect: (index: number, ring: Ring) => void;
}

const R_OUT = 238;
const R_MID = 162;
const R_IN = 100;
const rad = (d: number) => (d * Math.PI) / 180;
const pt = (r: number, a: number) => [r * Math.sin(rad(a)), -r * Math.cos(rad(a))] as const;

function sector(r0: number, r1: number, a0: number, a1: number) {
  const [x0, y0] = pt(r1, a0);
  const [x1, y1] = pt(r1, a1);
  const [x2, y2] = pt(r0, a1);
  const [x3, y3] = pt(r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 0 1 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 0 0 ${x3},${y3} Z`;
}

const pretty = (s: string) => s.replace(/#/g, '♯').replace(/b(?=$|m)/g, '♭');

function sigLabel(i: number) {
  if (i === 0) return '';
  if (i <= 5) return `${i}♯`;
  if (i === 6) return '6♯/6♭';
  return `${12 - i}♭`;
}

export function CircleWheel({ keyInfo, sevenths, rotate, playing, onSelect }: Props) {
  const angle = useSpring(0, { stiffness: 90, damping: 17, mass: 0.9 });
  const counter = useTransform(angle, (a) => -a);
  const current = useRef(0);

  useEffect(() => {
    const target = rotate ? -keyInfo.index * 30 : 0;
    const delta = mod(target - current.current + 180, 360) - 180;
    current.current += delta;
    angle.set(current.current);
  }, [keyInfo.index, rotate, angle]);

  const chords = sevenths ? keyInfo.sevenths : keyInfo.triads;
  const inKey = new Map<string, (typeof chords)[number]>();
  for (const c of chords) inKey.set(`${c.ring}-${c.index}`, c);
  const tonicId = `${keyInfo.mode === 'major' ? 'outer' : 'inner'}-${keyInfo.index}`;
  const playingId = playing ? `${playing.ring}-${playing.index}` : null;

  return (
    <svg viewBox="-260 -260 520 520" className="wheel" role="img" aria-label="Circle of fifths">
      <defs>
        <linearGradient id="tonic-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffb547" />
          <stop offset="1" stopColor="#ff6a3d" />
        </linearGradient>
        <radialGradient id="hub-grad">
          <stop offset="0" stopColor="var(--surface-3)" />
          <stop offset="1" stopColor="var(--surface-2)" />
        </radialGradient>
      </defs>

      <motion.g style={{ rotate: angle }}>
        {(['outer', 'inner'] as const).map((ring) =>
          Array.from({ length: 12 }, (_, i) => {
            const id = `${ring}-${i}`;
            const chord = inKey.get(id);
            const a0 = i * 30 - 15;
            const a1 = i * 30 + 15;
            const [r0, r1] = ring === 'outer' ? [R_MID, R_OUT] : [R_IN, R_MID];
            const isTonic = id === tonicId;
            const isDim = chord?.type.id.includes('dim') || chord?.type.id === 'm7b5';
            const cls = ['wseg', ring, chord ? 'in-key' : '', isDim ? 'dim' : '', isTonic ? 'tonic' : '', playingId === id ? 'playing' : '']
              .filter(Boolean)
              .join(' ');
            const name = ring === 'outer' ? pretty(CIRCLE_MAJOR[i]) : pretty(CIRCLE_MINOR[i]) + 'm';
            const alt = ring === 'outer' ? CIRCLE_MAJOR_ALT[i] : CIRCLE_MINOR_ALT[i];
            const [lx, ly] = pt(ring === 'outer' ? 206 : 135, i * 30);
            const [nx, ny] = pt(ring === 'outer' ? 177 : 113, i * 30);
            // In-key chords use the key's own spelling (e.g. D♯m in F♯ major, not E♭m).
            const label = chord ? chord.name : name;
            return (
              <g key={id} className={cls} onClick={() => onSelect(i, ring)}>
                <path d={sector(r0 + 2, r1 - 2, a0 + 0.8, a1 - 0.8)} className="wseg-path" />
                <Label x={lx} y={ly} counter={counter} className="wseg-name">
                  {label}
                </Label>
                {ring === 'outer' && !chord && alt && (
                  <Label x={nx} y={ny} counter={counter} className="wseg-sub">
                    {alt}
                  </Label>
                )}
                {ring === 'outer' && !chord && !alt && (
                  <Label x={nx} y={ny} counter={counter} className="wseg-sub">
                    {sigLabel(i)}
                  </Label>
                )}
                {chord && (
                  <Label x={nx} y={ny} counter={counter} className="wseg-roman">
                    {chord.roman}
                  </Label>
                )}
              </g>
            );
          }),
        )}
      </motion.g>

      <circle r={R_IN - 6} fill="url(#hub-grad)" className="hub" />
      <motion.g key={keyInfo.name} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
        <text y={-14} className="hub-key">
          {keyInfo.name.split(' ')[0]}
          {keyInfo.mode === 'minor' ? 'm' : ''}
        </text>
        <text y={14} className="hub-mode">
          {keyInfo.mode}
        </text>
        <text y={38} className="hub-sig">
          {keyInfo.signature.count === 0
            ? 'no ♯ / ♭'
            : `${keyInfo.signature.count}${keyInfo.signature.type === 'sharp' ? accidental(1) : accidental(-1)}`}
        </text>
      </motion.g>
    </svg>
  );
}

function Label({
  x,
  y,
  counter,
  className,
  children,
}: {
  x: number;
  y: number;
  counter: MotionValue<number>;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.text
      x={x}
      y={y}
      dy="0.35em"
      className={className}
      style={{ rotate: counter, transformBox: 'fill-box', transformOrigin: 'center' }}
    >
      {children}
    </motion.text>
  );
}
