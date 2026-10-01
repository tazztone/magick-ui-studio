import { describe, expect, it } from 'vitest';
import { rangeIndices, tileRect, tileSpan, toggleSelect } from './tiles';

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

describe('tileRect', () => {
  it('matches tileSpan when overlap is 0 or negative', () => {
    for (const [total, n] of [[1024, 3], [1025, 3], [100, 7], [2, 4]] as Array<[number, number]>) {
      for (let i = 0; i < n; i++) {
        expect(tileRect(total, n, i, 0)).toEqual(tileSpan(total, n, i));
        expect(tileRect(total, n, i, -5)).toEqual(tileSpan(total, n, i));
      }
    }
  });

  it('shares an overlap strip between neighbors (even overlap)', () => {
    // 1000px / 4 tiles, overlap 10 -> interior tiles grow 5px per side
    expect(tileRect(1000, 4, 0, 10)).toEqual({ off: 0, size: 255 });
    expect(tileRect(1000, 4, 1, 10)).toEqual({ off: 245, size: 260 });
    expect(tileRect(1000, 4, 3, 10)).toEqual({ off: 745, size: 255 });
  });

  it('splits odd overlap floor/ceil to keep integer px', () => {
    // overlap 7 -> 3px before, 4px after
    expect(tileRect(1000, 4, 1, 7)).toEqual({ off: 247, size: 257 });
  });

  it('always covers its base span and stays in bounds', () => {
    for (const [total, n, o] of [[1025, 3, 10], [100, 7, 8], [1920, 5, 64], [7, 4, 3]] as Array<[number, number, number]>) {
      for (let i = 0; i < n; i++) {
        const base = tileSpan(total, n, i);
        const r = tileRect(total, n, i, o);
        expect(r.off).toBeLessThanOrEqual(base.off);
        expect(r.off + r.size).toBeGreaterThanOrEqual(base.off + base.size);
        expect(r.off).toBeGreaterThanOrEqual(0);
        expect(r.off + r.size).toBeLessThanOrEqual(total);
        expect(Number.isInteger(r.off)).toBe(true);
        expect(Number.isInteger(r.size)).toBe(true);
      }
    }
  });

  it('clamps absurd overlap to full bleed without crashing', () => {
    expect(tileRect(100, 4, 0, 200)).toEqual({ off: 0, size: 100 });
    expect(tileRect(100, 4, 2, 200)).toEqual({ off: 0, size: 100 });
  });
});

describe('toggleSelect', () => {
  it('adds a missing tile and removes a present one without mutating', () => {
    const base = new Set([1, 2]);
    expect([...toggleSelect(base, 3)].sort()).toEqual([1, 2, 3]);
    expect([...toggleSelect(base, 2)].sort()).toEqual([1]);
    expect([...base].sort()).toEqual([1, 2]); // input untouched
  });
});

describe('rangeIndices', () => {
  it('returns a single tile when anchor equals target', () => {
    expect(rangeIndices(5, 5, 3)).toEqual([5]);
  });

  it('selects the rect between anchor and target in a 3-col grid', () => {
    // rows 0-1, cols 0-1 => tiles 0,1,3,4 regardless of click order
    expect(rangeIndices(0, 4, 3)).toEqual([0, 1, 3, 4]);
    expect(rangeIndices(4, 0, 3)).toEqual([0, 1, 3, 4]);
  });

  it('selects a full row strip', () => {
    expect(rangeIndices(3, 5, 3)).toEqual([3, 4, 5]);
  });
});
