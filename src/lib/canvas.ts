export type TransformOpts = {
  rotation: number;
  grayscale: boolean;
  invert: boolean;
};

export const filterString = (grayscale: boolean, invert: boolean): string => {
  let filterStr = '';
  if (grayscale) filterStr += ' grayscale(100%)';
  if (invert) filterStr += ' invert(100%)';
  return filterStr.trim() || 'none';
};

export const buildPreviewStyle = (grayscale: boolean, invert: boolean, rotation: number) => ({
  filter: filterString(grayscale, invert),
  transform: `rotate(${rotation}deg)`,
  transition: 'filter 150ms ease, transform 200ms ease',
});

/**
 * Draw `imgElement` onto an injected `canvas` applying rotation + CSS filters.
 * The canvas is injected (rather than created) so tests can supply a stub 2D
 * context; a missing context passes the canvas through untouched and callers
 * fall back to their blob-failure toast.
 */
export const drawTransformedImage = (
  canvas: HTMLCanvasElement,
  imgElement: CanvasImageSource,
  targetW: number,
  targetH: number,
  opts: TransformOpts,
): HTMLCanvasElement => {
  const isRotated90 = opts.rotation === 90 || opts.rotation === 270;
  canvas.width = isRotated90 ? targetH : targetW;
  canvas.height = isRotated90 ? targetW : targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas; // 2d unavailable: callers fall back to blob-failure toast

  ctx.filter = filterString(opts.grayscale, opts.invert);

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  if (opts.rotation !== 0) ctx.rotate((opts.rotation * Math.PI) / 180);
  ctx.drawImage(imgElement, -targetW / 2, -targetH / 2, targetW, targetH);
  ctx.restore();

  return canvas;
};
