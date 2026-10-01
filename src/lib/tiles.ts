// Split `total` px into `n` tiles covering every pixel (tile sizes differ by
// at most 1px), matching ImageMagick `-crop WxH@` semantics. Returns the
// pixel offset and size of tile `i` (0-based) along one axis.
export const tileSpan = (total: number, n: number, i: number) => {
  const off = Math.floor((i * total) / n);
  const end = Math.floor(((i + 1) * total) / n);
  return { off, size: end - off };
};
