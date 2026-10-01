import { batchCommand, singleImageCommand, type ShellType } from './imagemagick';

export type ImageMeta = {
  name: string;
  baseName: string;
  width: number;
  height: number;
};

export type ExportState = {
  images: ImageMeta[];
  activeImage: ImageMeta | null;
  /** 'grid' slices; anything else exports the whole processed image. */
  activeTab: string;
  cols: number;
  rows: number;
  overlapPx: number;
  resizePercent: number;
  rotation: number;
  grayscale: boolean;
  invert: boolean;
  outputFormat: string;
  quality: number;
  shellType: ShellType;
};

export const exportExt = (outputFormat: string): string =>
  outputFormat === 'jpeg' ? 'jpg' : outputFormat;

export const buildFlags = (
  s: Pick<
    ExportState,
    'activeTab' | 'resizePercent' | 'rotation' | 'grayscale' | 'invert' | 'outputFormat' | 'quality'
  >,
): string[] => {
  const flags: string[] = [];
  if (s.activeTab === 'resize' && s.resizePercent !== 100) {
    flags.push(`-resize ${s.resizePercent}%`);
  }
  if (s.rotation !== 0) {
    flags.push(`-rotate ${s.rotation}`);
  }
  if (s.grayscale) {
    flags.push(`-colorspace Gray`);
  }
  if (s.invert) {
    flags.push(`-negate`);
  }
  if (s.outputFormat === 'jpeg' || s.outputFormat === 'webp') {
    flags.push(`-quality ${s.quality}`);
  }
  flags.push(`-strip`);
  return flags;
};

/** Output dimensions for batch export (resize tab scales, otherwise 1:1). */
export const resolveExportDims = (
  item: Pick<ImageMeta, 'width' | 'height'>,
  activeTab: string,
  resizePercent: number,
): { outW: number; outH: number } => {
  if (activeTab === 'resize' && resizePercent !== 100) {
    return {
      outW: Math.round(item.width * (resizePercent / 100)),
      outH: Math.round(item.height * (resizePercent / 100)),
    };
  }
  return { outW: item.width, outH: item.height };
};

/** CLI text for the generator panel (pure equivalent of the former useMemo body). */
export const buildGeneratedCommand = (s: ExportState): string => {
  if (s.images.length === 0) return '# Upload images to generate syntax';
  const ext = exportExt(s.outputFormat);
  const current = s.activeImage || s.images[0];

  // `-strip` is always present so the flag string is never empty.
  const flagStr = ` ${buildFlags(s).join(' ')}`;

  if (s.images.length === 1) {
    const rot90 = s.rotation === 90 || s.rotation === 270;
    return singleImageCommand({
      name: current.name,
      baseName: current.baseName,
      ext,
      flags: flagStr,
      shell: s.shellType,
      mode: s.activeTab,
      w: rot90 ? current.height : current.width,
      h: rot90 ? current.width : current.height,
      cols: s.cols,
      rows: s.rows,
      overlap: s.overlapPx,
    });
  }

  return batchCommand({
    count: s.images.length,
    ext,
    flags: flagStr,
    shell: s.shellType,
    cols: s.cols,
    rows: s.rows,
    overlap: s.activeTab === 'grid' ? s.overlapPx : 0,
    rotation: s.rotation,
  });
};
