import { describe, expect, it } from 'vitest';
import { baseNameOf, createImageRecord } from './images';

describe('baseNameOf', () => {
  it('strips the last extension', () => {
    expect(baseNameOf('photo.png')).toBe('photo');
    expect(baseNameOf('my.photo.jpg')).toBe('my.photo');
  });

  it('falls back to the full name without an extension', () => {
    expect(baseNameOf('photo')).toBe('photo');
    expect(baseNameOf('.png')).toBe('.png');
  });
});

describe('createImageRecord', () => {
  const raw = {
    id: 'abc123',
    name: 'photo.png',
    size: 2048,
    src: 'blob:mock-1',
    naturalWidth: 800,
    naturalHeight: 600,
    width: 800,
    height: 600,
    imgElement: { tag: 'img' },
  };

  it('builds a gallery record from a finished load', () => {
    expect(createImageRecord(raw)).toEqual({
      id: 'abc123',
      name: 'photo.png',
      baseName: 'photo',
      src: 'blob:mock-1',
      width: 800,
      height: 600,
      sizeKb: '2.0',
      imgElement: { tag: 'img' },
    });
  });

  it('falls back to layout size when natural size is 0', () => {
    const rec = createImageRecord({ ...raw, naturalWidth: 0, naturalHeight: 0 });
    expect(rec.width).toBe(800);
    expect(rec.height).toBe(600);
  });

  it('formats kilobytes with one decimal', () => {
    expect(createImageRecord({ ...raw, size: 14.2 * 1024 }).sizeKb).toBe('14.2');
  });
});
