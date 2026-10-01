import { describe, expect, it } from 'vitest';
import { tileSpan } from './tiles';

const cases: Array<[number, number]> = [
  [1024, 3],
  [1025, 3],
  [1024, 4],
  [100, 7],
  [1920, 3],
  [1080, 3],
  [2, 4],
  [1, 3],
  [500, 1],
  [999, 999],
];

describe('tileSpan', () => {
  for (const [total, n] of cases) {
    it(`covers all ${total}px with ${n} tiles`, () => {
      let pos = 0;
      let min = Infinity;
      let max = 0;
      for (let i = 0; i < n; i++) {
        const s = tileSpan(total, n, i);
        expect(s.off).toBe(pos); // contiguous, no gaps
        expect(s.size).toBeGreaterThanOrEqual(0);
        pos += s.size;
        min = Math.min(min, s.size);
        max = Math.max(max, s.size);
      }
      expect(pos).toBe(total); // no dropped edge pixels
      expect(max - min).toBeLessThanOrEqual(1);
    });
  }

  it('splits evenly divisible sizes exactly', () => {
    expect(tileSpan(1024, 4, 0)).toEqual({ off: 0, size: 256 });
    expect(tileSpan(1024, 4, 3)).toEqual({ off: 768, size: 256 });
  });
});
