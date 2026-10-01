import { describe, expect, it } from 'vitest';
import { createSampleSvg } from './sample';

describe('createSampleSvg', () => {
  it('returns a data URL with default titles', () => {
    const url = createSampleSvg();
    expect(url.startsWith('data:image/svg+xml;charset=utf-8,')).toBe(true);
    expect(decodeURIComponent(url)).toContain('TEST PATTERN');
    expect(decodeURIComponent(url)).toContain('1024 × 1024');
  });

  it('interpolates custom title and subtitle', () => {
    const url = createSampleSvg('IMAGE SLICER', '1024 × 1024 SAMPLE');
    const decoded = decodeURIComponent(url);
    expect(decoded).toContain('IMAGE SLICER');
    expect(decoded).toContain('1024 × 1024 SAMPLE');
    expect(decoded).toContain('<svg');
    expect(decoded).toContain('</svg>');
  });

  it('URL-encodes markup so the URL has no raw angle brackets', () => {
    const url = createSampleSvg('A&B <test>', 'x');
    expect(url).not.toContain('<');
    expect(url).not.toContain('>');
    expect(decodeURIComponent(url)).toContain('A&B <test>');
  });
});
