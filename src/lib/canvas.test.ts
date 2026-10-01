import { describe, expect, it, vi } from 'vitest';
import { buildPreviewStyle, drawTransformedImage, filterString } from './canvas';

const stubCanvas = () => {
  const ctx = {
    filter: '',
    save: vi.fn(),
    restore: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    drawImage: vi.fn(),
  };
  const canvas = {
    width: 0,
    height: 0,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;
  return { canvas, ctx };
};

describe('filterString', () => {
  it('is none with no adjustments', () => {
    expect(filterString(false, false)).toBe('none');
  });

  it('combines grayscale and invert', () => {
    expect(filterString(true, false)).toBe('grayscale(100%)');
    expect(filterString(false, true)).toBe('invert(100%)');
    expect(filterString(true, true)).toBe('grayscale(100%) invert(100%)');
  });
});

describe('buildPreviewStyle', () => {
  it('builds the preview css from adjustment state', () => {
    expect(buildPreviewStyle(false, false, 0)).toEqual({
      filter: 'none',
      transform: 'rotate(0deg)',
      transition: 'filter 150ms ease, transform 200ms ease',
    });
    expect(buildPreviewStyle(true, true, 90).filter).toBe('grayscale(100%) invert(100%)');
    expect(buildPreviewStyle(false, false, 270).transform).toBe('rotate(270deg)');
  });
});

describe('drawTransformedImage', () => {
  const img = { tag: 'img' } as unknown as CanvasImageSource;

  it('draws unrotated with identity transform', () => {
    const { canvas, ctx } = stubCanvas();
    const out = drawTransformedImage(canvas, img, 800, 600, {
      rotation: 0,
      grayscale: false,
      invert: false,
    });
    expect(out).toBe(canvas);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(ctx.filter).toBe('none');
    expect(ctx.translate).toHaveBeenCalledWith(400, 300);
    expect(ctx.rotate).not.toHaveBeenCalled();
    expect(ctx.drawImage).toHaveBeenCalledWith(img, -400, -300, 800, 600);
    expect(ctx.save).toHaveBeenCalledTimes(1);
    expect(ctx.restore).toHaveBeenCalledTimes(1);
  });

  it('swaps dimensions for 90/270 rotation', () => {
    for (const rotation of [90, 270]) {
      const { canvas, ctx } = stubCanvas();
      drawTransformedImage(canvas, img, 800, 600, { rotation, grayscale: false, invert: false });
      expect(canvas.width).toBe(600);
      expect(canvas.height).toBe(800);
      expect(ctx.rotate).toHaveBeenCalledWith((rotation * Math.PI) / 180);
    }
  });

  it('keeps dimensions for 180 rotation but still rotates', () => {
    const { canvas, ctx } = stubCanvas();
    drawTransformedImage(canvas, img, 800, 600, { rotation: 180, grayscale: true, invert: true });
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(ctx.filter).toBe('grayscale(100%) invert(100%)');
    expect(ctx.rotate).toHaveBeenCalledWith(Math.PI);
  });

  it('passes the canvas through when 2d context is unavailable', () => {
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => null),
    } as unknown as HTMLCanvasElement;
    const out = drawTransformedImage(canvas, img, 800, 600, {
      rotation: 0,
      grayscale: false,
      invert: false,
    });
    expect(out).toBe(canvas);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
  });
});
