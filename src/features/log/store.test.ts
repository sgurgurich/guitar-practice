import { describe, expect, it } from 'vitest';
import { currentStreak, longestStreak, minutesByDate, type Session } from './store';

const s = (date: string, minutes = 20): Session => ({ id: date + minutes, date, minutes, focus: [], createdAt: 0 });

describe('practice stats', () => {
  const sessions = [s('2026-10-08'), s('2026-10-09'), s('2026-10-10'), s('2026-10-10', 15), s('2026-10-12'), s('2026-10-01'), s('2026-10-02')];
  const byDate = minutesByDate(sessions);

  it('sums minutes per day', () => {
    expect(byDate.get('2026-10-10')).toBe(35);
  });

  it('counts the current streak, allowing today to be unplayed so far', () => {
    expect(currentStreak(byDate, new Date(2026, 9, 12))).toBe(1); // missed the 11th
    expect(currentStreak(byDate, new Date(2026, 9, 11))).toBe(3); // 8, 9, 10 — today not played yet
    expect(currentStreak(byDate, new Date(2026, 9, 14))).toBe(0);
  });

  it('finds the longest streak, across month boundaries', () => {
    expect(longestStreak(byDate)).toBe(3);
    expect(longestStreak(minutesByDate([s('2026-09-30'), s('2026-10-01'), s('2026-10-02'), s('2026-10-03')]))).toBe(4);
  });
});
