import { describe, expect, it } from 'vitest';
import {
  buildFlags,
  buildGeneratedCommand,
  exportExt,
  resolveExportDims,
  type ExportState,
} from './export-command';

const state = (over: Partial<ExportState> = {}): ExportState => ({
  images: [{ name: 'photo.png', baseName: 'photo', width: 1024, height: 768 }],
  activeImage: null,
  activeTab: 'grid',
  cols: 3,
  rows: 3,
  overlapPx: 0,
  resizePercent: 100,
  rotation: 0,
  grayscale: false,
  invert: false,
  outputFormat: 'png',
  quality: 90,
  shellType: 'bash',
  ...over,
});

describe('exportExt', () => {
  it('maps jpeg to jpg and passes the rest through', () => {
    expect(exportExt('jpeg')).toBe('jpg');
    expect(exportExt('png')).toBe('png');
    expect(exportExt('webp')).toBe('webp');
  });
});

describe('buildFlags', () => {
  it('always strips metadata', () => {
    expect(buildFlags(state())).toEqual(['-strip']);
  });

  it('adds resize only on the resize tab off 100%', () => {
    expect(buildFlags(state({ activeTab: 'resize', resizePercent: 50 }))).toContain('-resize 50%');
    expect(buildFlags(state({ activeTab: 'resize', resizePercent: 100 }))).toEqual(['-strip']);
    expect(buildFlags(state({ activeTab: 'grid', resizePercent: 50 }))).toEqual(['-strip']);
  });

  it('adds rotation, grayscale, invert independently', () => {
    expect(buildFlags(state({ rotation: 90 }))).toContain('-rotate 90');
    expect(buildFlags(state({ rotation: 0 }))).not.toContain('-rotate 0');
    expect(buildFlags(state({ grayscale: true }))).toContain('-colorspace Gray');
    expect(buildFlags(state({ invert: true }))).toContain('-negate');
  });

  it('adds quality only for lossy formats', () => {
    expect(buildFlags(state({ outputFormat: 'jpeg', quality: 80 }))).toContain('-quality 80');
    expect(buildFlags(state({ outputFormat: 'webp', quality: 70 }))).toContain('-quality 70');
    expect(buildFlags(state({ outputFormat: 'png' }))).not.toContain('-quality 90');
  });

  it('orders flags deterministically', () => {
    expect(
      buildFlags(
        state({
          activeTab: 'resize',
          resizePercent: 50,
          rotation: 90,
          grayscale: true,
          invert: true,
          outputFormat: 'jpeg',
          quality: 80,
        }),
      ),
    ).toEqual([
      '-resize 50%',
      '-rotate 90',
      '-colorspace Gray',
      '-negate',
      '-quality 80',
      '-strip',
    ]);
  });
});

describe('resolveExportDims', () => {
  it('scales on the resize tab off 100%', () => {
    expect(resolveExportDims({ width: 1024, height: 768 }, 'resize', 50)).toEqual({
      outW: 512,
      outH: 384,
    });
    expect(resolveExportDims({ width: 100, height: 100 }, 'resize', 33)).toEqual({
      outW: 33,
      outH: 33,
    });
  });

  it('passes dimensions through otherwise', () => {
    expect(resolveExportDims({ width: 1024, height: 768 }, 'resize', 100)).toEqual({
      outW: 1024,
      outH: 768,
    });
    expect(resolveExportDims({ width: 1024, height: 768 }, 'grid', 50)).toEqual({
      outW: 1024,
      outH: 768,
    });
    expect(resolveExportDims({ width: 1024, height: 768 }, 'adjust', 50)).toEqual({
      outW: 1024,
      outH: 768,
    });
  });
});

describe('buildGeneratedCommand', () => {
  it('prompts for upload with no images', () => {
    expect(buildGeneratedCommand(state({ images: [] }))).toBe('# Upload images to generate syntax');
  });

  it('builds the classic one-liner for a single grid image without overlap', () => {
    expect(buildGeneratedCommand(state())).toBe(
      'magick "photo.png" -strip -crop 3x3@ +repage "photo_tile_%d.png"',
    );
  });

  it('exports the whole image in non-grid modes', () => {
    expect(buildGeneratedCommand(state({ activeTab: 'resize', resizePercent: 50 }))).toBe(
      'magick "photo.png" -resize 50% -strip "photo_processed.png"',
    );
    expect(buildGeneratedCommand(state({ activeTab: 'adjust', grayscale: true }))).toBe(
      'magick "photo.png" -colorspace Gray -strip "photo_processed.png"',
    );
  });

  it('swaps W/H for 90/270 rotation on a single image with overlap', () => {
    const s = state({ rotation: 90, overlapPx: 10 });
    const cmd = buildGeneratedCommand(s);
    // rotated dims: 768 wide x 1024 tall; first geometry reflects the swap
    // (256 + 5px after-overlap) x (341 + 5px after-overlap)
    expect(cmd).toContain('261x346+0+0');
    expect(buildGeneratedCommand(state({ rotation: 180, overlapPx: 10 }))).toContain('346x261+0+0');
  });

  it('prefers the active image over the first image', () => {
    const s = state({
      images: [{ name: 'a.png', baseName: 'a', width: 100, height: 100 }],
      activeImage: { name: 'b.png', baseName: 'b', width: 200, height: 200 },
    });
    expect(buildGeneratedCommand(s)).toContain('"b.png"');
    expect(buildGeneratedCommand(state())).toContain('"photo.png"');
  });

  it('maps jpeg output to jpg extension', () => {
    expect(buildGeneratedCommand(state({ outputFormat: 'jpeg' }))).toContain('photo_tile_%d.jpg');
  });

  it('builds batch commands for multiple images', () => {
    const s = state({
      images: [
        { name: 'a.png', baseName: 'a', width: 100, height: 100 },
        { name: 'b.png', baseName: 'b', width: 100, height: 100 },
      ],
    });
    const cmd = buildGeneratedCommand(s);
    expect(cmd).toContain('# Process 2 images with ImageMagick');
    expect(cmd).toContain('-crop 3x3@');
  });

  it('forces overlap to 0 for batch exports off the grid tab', () => {
    const multi = (tab: string) =>
      state({
        images: [
          { name: 'a.png', baseName: 'a', width: 100, height: 100 },
          { name: 'b.png', baseName: 'b', width: 100, height: 100 },
        ],
        activeTab: tab,
        overlapPx: 10,
      });
    expect(buildGeneratedCommand(multi('grid'))).toContain('overlap 10px');
    expect(buildGeneratedCommand(multi('resize'))).not.toContain('overlap');
    expect(buildGeneratedCommand(multi('adjust'))).not.toContain('overlap');
  });

  it('threads shell and rotation into batch commands', () => {
    const s = state({
      images: [
        { name: 'a.png', baseName: 'a', width: 100, height: 100 },
        { name: 'b.png', baseName: 'b', width: 100, height: 100 },
      ],
      shellType: 'powershell',
      rotation: 90,
      overlapPx: 10,
    });
    expect(buildGeneratedCommand(s)).toContain('$t=$W; $W=$H; $H=$t');
  });
});
