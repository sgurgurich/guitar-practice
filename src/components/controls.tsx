import { motion } from 'motion/react';
import { useId, type CSSProperties, type ReactNode } from 'react';
import { PC_LABELS, degreeLabel, degreeRole } from '../theory/notes';

const pillSpring = { type: 'spring', stiffness: 500, damping: 38 } as const;

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
  wrap,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  label?: string;
  /** Let options flow onto multiple lines instead of scrolling. */
  wrap?: boolean;
}) {
  const id = useId();
  return (
    <div className={wrap ? 'seg seg-wrap' : 'seg'} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          className="seg-btn"
          aria-pressed={o.value === value}
          title={o.title}
          onClick={() => onChange(o.value)}
        >
          {o.value === value && <motion.div layoutId={`seg-${id}`} className="seg-pill" transition={pillSpring} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function RootPicker({
  value,
  onChange,
  names,
}: {
  value: number;
  onChange: (pc: number) => void;
  /** Override the label for a pitch class (e.g. the spelling chosen for the current scale). */
  names?: Partial<Record<number, string>>;
}) {
  const id = useId();
  return (
    <div className="roots" role="group" aria-label="Root note">
      {PC_LABELS.map((l, pc) => {
        const main = names?.[pc] ?? l.main;
        const alt = l.alt && main === l.main ? l.alt : l.alt ? l.main : undefined;
        return (
          <motion.button
            key={pc}
            className="root-btn"
            aria-pressed={pc === value}
            onClick={() => onChange(pc)}
            whileTap={{ scale: 0.92 }}
          >
            {pc === value && <motion.div layoutId={`root-${id}`} className="root-pill" transition={pillSpring} />}
            <span>{main}</span>
            {alt && <small>{alt}</small>}
          </motion.button>
        );
      })}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <button className="switch" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span className="switch-track">
        <motion.span layout className="switch-thumb" transition={pillSpring} />
      </span>
      {children}
    </button>
  );
}

export function Range({
  value,
  min,
  max,
  step = 1,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      min={min}
      max={max}
      step={step}
      value={value}
      style={{ '--pct': `${pct}%` } as CSSProperties}
      onChange={(e) => onChange(Number(e.target.value))}
    />
  );
}

export const degColor = (id: string) => `var(--deg-${degreeRole(id)})`;

export function IntervalLegend({ degrees }: { degrees: string[] }) {
  const roles = new Map<string, string>();
  for (const d of degrees) {
    const role = degreeRole(d);
    roles.set(role, roles.has(role) ? `${roles.get(role)} / ${degreeLabel(d)}` : degreeLabel(d));
  }
  return (
    <div className="legend">
      {[...roles].map(([role, label]) => (
        <span key={role}>
          <i style={{ background: `var(--deg-${role})` }} />
          {role === 'root' ? 'Root' : label}
        </span>
      ))}
    </div>
  );
}
