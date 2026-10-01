/** Export filename builders (single source of truth for download + zip names). */
export const tileFileName = (baseName: string, idx: number, ext: string): string =>
  `${baseName}_tile_${idx}.${ext}`;

export const processedFileName = (baseName: string, ext: string): string =>
  `${baseName}_processed.${ext}`;

export const selectedZipName = (baseName: string, count: number): string =>
  `${baseName}_selected_${count}.zip`;

export const batchArchiveName = (count: number, firstBaseName: string): string =>
  count > 1 ? 'magick_batch_tiles.zip' : `${firstBaseName}_tiles.zip`;
