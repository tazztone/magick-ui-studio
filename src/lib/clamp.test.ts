import { describe, expect, it } from 'vitest';
import { clampGridCount, clampOverlap, GRID_MAX, GRID_MIN, OVERLAP_MAX } from './clamp';

describe('clampOverlap', () => {
  it('floors positive values and clamps negatives to 0', () => {
    expect(clampOverlap(10)).toBe(10);
    expect(clampOverlap(10.9)).toBe(10);
    expect(clampOverlap(0)).toBe(0);
    expect(clampOverlap(-5)).toBe(0);
    expect(clampOverlap(-0.5)).toBe(0);
  });

  it('returns 0 for non-finite and non-numeric input', () => {
    expect(clampOverlap(NaN)).toBe(0);
    expect(clampOverlap(Infinity)).toBe(0);
    expect(clampOverlap(-Infinity)).toBe(0);
    expect(clampOverlap(undefined)).toBe(0);
    expect(clampOverlap(null)).toBe(0);
    expect(clampOverlap('10')).toBe(0);
    expect(clampOverlap({})).toBe(0);
  });

  it('exposes the documented overlap ceiling', () => {
    expect(OVERLAP_MAX).toBe(128);
    expect(clampOverlap(OVERLAP_MAX)).toBe(OVERLAP_MAX);
  });
});

describe('clampGridCount', () => {
  it('passes through in-range integers', () => {
    expect(clampGridCount(1)).toBe(1);
    expect(clampGridCount(3)).toBe(3);
    expect(clampGridCount(24)).toBe(24);
  });

  it('floors fractional input', () => {
    expect(clampGridCount(3.9)).toBe(3);
    expect(clampGridCount('4.9')).toBe(4);
  });

  it('clamps to the supported range', () => {
    expect(clampGridCount(0)).toBe(GRID_MIN);
    expect(clampGridCount(-7)).toBe(GRID_MIN);
    expect(clampGridCount(25)).toBe(GRID_MAX);
    expect(clampGridCount(999)).toBe(GRID_MAX);
  });

  it('falls back to GRID_MIN for non-numeric input', () => {
    expect(clampGridCount(NaN)).toBe(GRID_MIN);
    expect(clampGridCount(Infinity)).toBe(GRID_MIN);
    expect(clampGridCount(undefined)).toBe(GRID_MIN);
    expect(clampGridCount(null)).toBe(GRID_MIN);
    expect(clampGridCount('')).toBe(GRID_MIN);
    expect(clampGridCount('abc')).toBe(GRID_MIN);
    expect(clampGridCount({})).toBe(GRID_MIN);
  });

  it('coerces numeric strings', () => {
    expect(clampGridCount('6')).toBe(6);
  });
});
