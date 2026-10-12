import { describe, expect, it } from 'vitest';
import { detectPitch } from './pitch';

const SR = 48000;

/** Fundamental plus decaying harmonics, roughly like a plucked string. */
function tone(freq: number, len = 4096) {
  const buf = new Float32Array(len);
  const phase = Math.random() * Math.PI * 2;
  for (let i = 0; i < len; i++) {
    let v = 0;
    for (let h = 1; h <= 6; h++) v += Math.sin(2 * Math.PI * freq * h * (i / SR) + phase * h) / (h * 1.3);
    buf[i] = 0.3 * v;
  }
  return buf;
}

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);

describe('detectPitch', () => {
  it.each([82.41, 110, 146.83, 196, 246.94, 329.63, 440, 73.42])('detects %f Hz within 2 cents', (f) => {
    const r = detectPitch(tone(f), SR);
    expect(r).not.toBeNull();
    expect(Math.abs(cents(r!.freq, f))).toBeLessThan(2);
  });

  it('ignores silence', () => {
    expect(detectPitch(new Float32Array(4096), SR)).toBeNull();
  });
});
