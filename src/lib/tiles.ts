// Split `total` px into `n` tiles covering every pixel (tile sizes differ by
// at most 1px), matching ImageMagick `-crop WxH@` semantics. Returns the
// pixel offset and size of tile `i` (0-based) along one axis.
export const tileSpan = (total: number, n: number, i: number) => {
  const off = Math.floor((i * total) / n);
  const end = Math.floor(((i + 1) * total) / n);
  return { off, size: end - off };
};

// Overlapping tile rect: the base `tileSpan` widened so adjacent tiles share
// an `overlap`-px strip (split floor/ceil per side to keep integer px),
// clamped to [0, total]. Edge tiles extend only inward. `overlap <= 0`
// behaves exactly like `tileSpan`.
export const tileRect = (total: number, n: number, i: number, overlap: number) => {
  const base = tileSpan(total, n, i);
  if (!(overlap > 0)) return { ...base };
  const before = Math.floor(overlap / 2);
  const after = overlap - before;
  const off = Math.max(0, base.off - (i > 0 ? before : 0));
  const end = Math.min(total, base.off + base.size + (i < n - 1 ? after : 0));
  return { off, size: Math.max(0, end - off) };
};
