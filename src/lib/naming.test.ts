import { describe, expect, it } from 'vitest';
import { batchArchiveName, processedFileName, selectedZipName, tileFileName } from './naming';

describe('naming', () => {
  it('builds per-tile filenames', () => {
    expect(tileFileName('photo', 0, 'png')).toBe('photo_tile_0.png');
    expect(tileFileName('photo', 12, 'jpg')).toBe('photo_tile_12.jpg');
  });

  it('builds processed filenames', () => {
    expect(processedFileName('photo', 'png')).toBe('photo_processed.png');
    expect(processedFileName('a', 'webp')).toBe('a_processed.webp');
  });

  it('builds multi-select zip names', () => {
    expect(selectedZipName('photo', 2)).toBe('photo_selected_2.zip');
    expect(selectedZipName('photo', 1)).toBe('photo_selected_1.zip');
  });

  it('names batch archives by image count', () => {
    expect(batchArchiveName(1, 'photo')).toBe('photo_tiles.zip');
    expect(batchArchiveName(2, 'photo')).toBe('magick_batch_tiles.zip');
    expect(batchArchiveName(10, 'other')).toBe('magick_batch_tiles.zip');
  });
});
