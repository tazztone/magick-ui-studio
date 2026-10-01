export const GRID_MIN = 1;
export const GRID_MAX = 24;
export const OVERLAP_MAX = 128;

/** Sanitize overlap input to a non-negative integer px value. */
export const clampOverlap = (o: unknown): number =>
  Number.isFinite(o as number) ? Math.max(0, Math.floor(o as number)) : 0;

/** Clamp typed grid counts to the supported range (stepper buttons already clamp). */
export const clampGridCount = (v: unknown): number => {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return GRID_MIN;
  return Math.min(GRID_MAX, Math.max(GRID_MIN, n));
};
