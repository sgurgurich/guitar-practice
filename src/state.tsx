import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Page = 'metronome' | 'circle' | 'chords' | 'scales' | 'riffs' | 'tuner' | 'log';
export const PAGES: Page[] = ['metronome', 'circle', 'chords', 'scales', 'riffs', 'tuner', 'log'];

/** useState backed by localStorage. Falls back silently when storage is unavailable. */
export function useStored<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const storageKey = `woodshed:${key}`;
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw !== null) {
        const parsed = JSON.parse(raw);
        // Merge objects so newly added settings get their defaults.
        return isPlainObject(initial) && isPlainObject(parsed) ? { ...initial, ...parsed } : parsed;
      }
    } catch {
      /* ignore */
    }
    return initial;
  });
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  }, [storageKey, value]);
  return [value, setValue];
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

export interface ChordSel {
  rootPc: number;
  typeId: string;
  /** 0 = root position, 1 = first inversion, … */
  inversion?: number;
}
export interface ScaleSel {
  rootPc: number;
  scaleId: string;
}

interface AppState {
  page: Page;
  go: (page: Page) => void;
  chord: ChordSel;
  setChord: (c: ChordSel) => void;
  scale: ScaleSel;
  setScale: (s: ScaleSel) => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

const Ctx = createContext<AppState | null>(null);

const pageFromHash = (): Page => {
  const h = window.location.hash.replace(/^#\/?/, '') as Page;
  return PAGES.includes(h) ? h : 'metronome';
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [chord, setChord] = useStored<ChordSel>('chord', { rootPc: 0, typeId: 'maj' });
  const [scale, setScale] = useStored<ScaleSel>('scale', { rootPc: 9, scaleId: 'minor-pentatonic' });
  const [theme, setTheme] = useStored<'dark' | 'light'>(
    'theme',
    window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark',
  );

  useEffect(() => {
    const onHash = () => {
      setPage(pageFromHash());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0c0e13' : '#f6f4f0');
  }, [theme]);

  const go = useCallback((p: Page) => {
    window.location.hash = `/${p}`;
    setPage(p);
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <Ctx.Provider value={{ page, go, chord, setChord, scale, setScale, theme, setTheme }}>{children}</Ctx.Provider>
  );
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp outside provider');
  return ctx;
}
