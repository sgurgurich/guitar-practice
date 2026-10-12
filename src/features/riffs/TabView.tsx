import { motion } from 'motion/react';
import { memo, useEffect, useRef } from 'react';
import type { TabItem } from '../../theory/tab';

const ROWS = [5, 4, 3, 2, 1, 0]; // high e on top, like printed tab
const ROW_NAMES = ['e', 'B', 'G', 'D', 'A', 'E'];

interface Props {
  id: string;
  items: TabItem[];
  active: number | null;
  /** Show "PM" over every step (riffs that are palm-muted throughout). */
  palmMute?: boolean;
}

export const TabView = memo(function TabView({ id, items, active, palmMute }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const hasUps = items.some((it) => it.kind === 'step' && it.up);

  // Keep the playing column in view on long riffs.
  useEffect(() => {
    const box = scroller.current;
    const col = box?.querySelector<HTMLElement>('.tab-col.on');
    if (!box || !col) return;
    const left = col.offsetLeft;
    if (left < box.scrollLeft + 40 || left > box.scrollLeft + box.clientWidth - 60) {
      box.scrollTo({ left: Math.max(0, left - box.clientWidth / 3), behavior: 'smooth' });
    }
  }, [active]);

  return (
    <div className="tab scroll-x" ref={scroller}>
      <div className="tab-grid">
        <div className="tab-col tab-names">
          <span className="tab-anno" />
          {ROW_NAMES.map((n) => (
            <span key={n} className="tab-cell">
              {n}
            </span>
          ))}
        </div>
        <div className="tab-bar" />
        {items.map((it, i) => {
          if (it.kind === 'bar') return <div key={i} className="tab-bar" />;
          const width = Math.max(1, ...it.notes.map((n) => n.label.length));
          const pm = it.notes.length > 0 && (palmMute || it.notes.every((n) => n.palmMute));
          const anno = it.up ? '↑' : hasUps && it.chord ? '↓' : pm ? 'PM' : '';
          return (
            <div key={i} className={`tab-col ${active === i ? 'on' : ''}`} style={{ minWidth: `${width + 1.4}ch` }}>
              {active === i && (
                <motion.span layoutId={`tab-cursor-${id}`} className="tab-cursor" transition={{ type: 'spring', stiffness: 700, damping: 45 }} />
              )}
              <span className="tab-anno">{anno}</span>
              {ROWS.map((s) => {
                const n = it.notes.find((x) => x.string === s);
                return (
                  <span key={s} className="tab-cell">
                    {n && <b>{n.label}</b>}
                  </span>
                );
              })}
            </div>
          );
        })}
        <div className="tab-bar end" />
      </div>
    </div>
  );
});

export function TabLegend() {
  return (
    <span className="tab-legend faint">
      <b>h</b> hammer-on · <b>p</b> pull-off · <b>/ \</b> slide · <b>7b9</b> bend · <b>~</b> vibrato · <b>&lt;12&gt;</b> harmonic ·{' '}
      <b>t</b> tap · <b>x</b> muted · <b>PM</b> palm mute · <b>↓ ↑</b> strum
    </span>
  );
}
