import { Feather, Flame, Zap } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import type { Tone } from '../audio/amp';
import { getTone, setTone, strum, subscribeTone } from '../audio/guitar';
import { Segmented } from './controls';

export const useTone = () => useSyncExternalStore(subscribeTone, getTone);

const LABELS: Record<Tone, { label: string; icon: typeof Zap; title: string }> = {
  clean: { label: 'Clean', icon: Feather, title: 'Clean tone' },
  rock: { label: 'Rock', icon: Zap, title: 'Crunchy rock distortion' },
  metal: { label: 'Metal', icon: Flame, title: 'High-gain metal distortion' },
};

/** Global guitar tone switch; applies to every chord, scale, progression and riff playback. */
export function ToneToggle({ compact }: { compact?: boolean }) {
  const tone = useTone();
  return (
    <Segmented
      label="Guitar tone"
      value={tone}
      options={(Object.keys(LABELS) as Tone[]).map((t) => {
        const { label, icon: Icon, title } = LABELS[t];
        return {
          value: t,
          title,
          label: (
            <span className="tone-opt">
              <Icon size={13} />
              {!compact && label}
            </span>
          ),
        };
      })}
      onChange={(t) => {
        if (t === getTone()) return;
        setTone(t);
        // A quick E5 so you hear the new tone straight away.
        strum([40, 47, 52], { spacing: 0.012, length: 0.7, choke: true });
      }}
    />
  );
}
