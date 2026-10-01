import { tileRect } from './tiles';

export type ShellType = 'bash' | 'powershell' | 'cmd';

/** Explicit per-tile `WxH+X+Y` geometries covering W×H with `overlap` px shared. */
export const tileGeometries = (
  w: number, h: number, cols: number, rows: number, overlap: number,
): string[] => {
  const geoms: string[] = [];
  for (let r = 0; r < rows; r++) {
    const yr = tileRect(h, rows, r, overlap);
    for (let c = 0; c < cols; c++) {
      const xr = tileRect(w, cols, c, overlap);
      geoms.push(`${xr.size}x${yr.size}+${xr.off}+${yr.off}`);
    }
  }
  return geoms;
};

export type SingleOpts = {
  name: string;
  baseName: string;
  ext: string;
  /** Leading space included when non-empty, e.g. ` -strip`. */
  flags: string;
  shell: ShellType;
  /** 'grid' slices; anything else exports the whole processed image. */
  mode: string;
  w: number;
  h: number;
  cols: number;
  rows: number;
  overlap: number;
};

export const singleImageCommand = (o: SingleOpts): string => {
  if (o.mode !== 'grid') {
    return `magick "${o.name}"${o.flags} "${o.baseName}_processed.${o.ext}"`;
  }
  if (!(o.overlap > 0)) {
    return `magick "${o.name}"${o.flags} -crop ${o.cols}x${o.rows}@ +repage "${o.baseName}_tile_%d.${o.ext}"`;
  }
  const geoms = tileGeometries(o.w, o.h, o.cols, o.rows, o.overlap);
  const tileName = (i: string) => `${o.baseName}_tile_${i}.${o.ext}`;
  if (o.shell === 'powershell') {
    return `# PowerShell Slicing with ${o.overlap}px overlap\n$tiles = @(\n${geoms.map(g => `  "${g}"`).join(',\n')}\n)\nfor ($i = 0; $i -lt $tiles.Count; $i++) {\n  magick "${o.name}"${o.flags} -crop $tiles[$i] +repage "${tileName('$i')}"\n}`;
  }
  if (o.shell === 'cmd') {
    return `:: Windows CMD Slicing with ${o.overlap}px overlap\nsetlocal enabledelayedexpansion\n${geoms.map((g, k) => `set "T${k}=${g}"`).join('\n')}\nset /a n=0\nfor %%g in (${geoms.map((_, k) => `%T${k}%`).join(' ')}) do (\n  magick "${o.name}"${o.flags} -crop %%g +repage "${tileName('!n!')}"\n  set /a n+=1\n)`;
  }
  return `# Bash Slicing with ${o.overlap}px overlap\ntiles=(\n${geoms.map(g => `  "${g}"`).join('\n')}\n)\nfor i in "\${!tiles[@]}"; do\n  magick "${o.name}"${o.flags} -crop "\${tiles[$i]}" +repage "${tileName('$i')}"\ndone`;
};

export type BatchOpts = {
  count: number;
  ext: string;
  flags: string;
  shell: ShellType;
  cols: number;
  rows: number;
  overlap: number;
};

/** Generic directory scripts (no concrete filenames); overlap geometries are
 *  computed at runtime per file via `identify`, mirroring `tileRect` exactly. */
export const batchCommand = (o: BatchOpts): string => {
  const overlapActive = o.overlap > 0;
  const bf = Math.floor(o.overlap / 2);
  const af = o.overlap - bf;
  if (o.shell === 'powershell') {
    const extGuard = `if (@('.png','.jpg','.jpeg','.webp','.gif','.bmp','.tiff','.avif','.svg') -notcontains $_.Extension.ToLower()) { return }`;
    if (overlapActive) {
      return `# PowerShell Batch Slicing (${o.count} files, overlap ${o.overlap}px)\n$C=${o.cols}; $R=${o.rows}; $BF=${bf}; $AF=${af}\nNew-Item -ItemType Directory -Force -Path "slices" | Out-Null\nGet-ChildItem -File | ForEach-Object {\n  $base = $_.BaseName\n  ${extGuard}\n  New-Item -ItemType Directory -Force -Path "slices/$base" | Out-Null\n  $dim = (magick identify -format "%w %h" $_.FullName).Split()\n  $W = [int]$dim[0]; $H = [int]$dim[1]\n  if ($W -le 0 -or $H -le 0) { return }\n  $n = 0\n  for ($r = 0; $r -lt $R; $r++) {\n    $ro = [math]::Floor($r*$H/$R); $rs = [math]::Floor(($r+1)*$H/$R) - $ro\n    $y0 = $ro; if ($r -gt 0) { $y0 = $ro - $BF }; if ($y0 -lt 0) { $y0 = 0 }\n    $y1 = $ro+$rs; if ($r -lt ($R-1)) { $y1 = $ro+$rs+$AF }; if ($y1 -gt $H) { $y1 = $H }\n    $th = $y1-$y0\n    for ($c = 0; $c -lt $C; $c++) {\n      $co = [math]::Floor($c*$W/$C); $cs = [math]::Floor(($c+1)*$W/$C) - $co\n      $x0 = $co; if ($c -gt 0) { $x0 = $co - $BF }; if ($x0 -lt 0) { $x0 = 0 }\n      $x1 = $co+$cs; if ($c -lt ($C-1)) { $x1 = $co+$cs+$AF }; if ($x1 -gt $W) { $x1 = $W }\n      $tw = $x1-$x0\n      magick $_.FullName${o.flags} -crop "\${tw}x\${th}+\${x0}+\${y0}" +repage "slices/$base/$($base)_tile_$n.${o.ext}"\n      $n++\n    }\n  }\n}\nWrite-Host "Done!" -ForegroundColor Green`;
    }
    return `# PowerShell Batch Slicing (${o.count} files)\nNew-Item -ItemType Directory -Force -Path "slices" | Out-Null\nGet-ChildItem -File | ForEach-Object {\n  $base = $_.BaseName\n  ${extGuard}\n  New-Item -ItemType Directory -Force -Path "slices/$base" | Out-Null\n  magick $_.FullName${o.flags} -crop ${o.cols}x${o.rows}@ +repage "slices/$base/$($base)_tile_%d.${o.ext}"\n}\nWrite-Host "Done!" -ForegroundColor Green`;
  }
  if (o.shell === 'cmd') {
    const imgGlobs = '*.png *.jpg *.jpeg *.webp *.gif *.bmp *.tiff *.avif *.svg';
    if (overlapActive) {
      const blocks: string[] = [];
      let k = 0;
      for (let r = 0; r < o.rows; r++) {
        for (let c = 0; c < o.cols; c++) {
          blocks.push(
            `  set /a "ro=${r}*%H%/${o.rows}"\n` +
            `  set /a "rs=${r + 1}*%H%/${o.rows}-ro"\n` +
            `  set /a "y0=${r > 0 ? `ro-${bf}` : 'ro'}"\n` +
            `  set /a "y0=y0<0?0:y0"\n` +
            `  set /a "y1=${r < o.rows - 1 ? `ro+rs+${af}` : 'ro+rs'}"\n` +
            `  set /a "y1=y1>%H%?%H%:y1"\n` +
            `  set /a "co=${c}*%W%/${o.cols}"\n` +
            `  set /a "cs=${c + 1}*%W%/${o.cols}-co"\n` +
            `  set /a "x0=${c > 0 ? `co-${bf}` : 'co'}"\n` +
            `  set /a "x0=x0<0?0:x0"\n` +
            `  set /a "x1=${c < o.cols - 1 ? `co+cs+${af}` : 'co+cs'}"\n` +
            `  set /a "x1=x1>%W%?%W%:x1"\n` +
            `  set /a "tw=x1-x0" & set /a "th=y1-y0"\n` +
            `  magick "%~1"${o.flags} -crop %tw%x%th%+%x0%+%y0% +repage "slices\\%~n1\\%~n1_tile_${k}.${o.ext}"`,
          );
          k++;
        }
      }
      return `:: Windows CMD Batch (${o.count} files, overlap ${o.overlap}px)\n@echo off\nsetlocal\nif not exist slices mkdir slices\nfor %%f in (${imgGlobs}) do if exist "%%f" call :slice "%%f"\nexit /b\n\n:slice\nset "W=" & set "H="\nfor /f "tokens=1,2" %%w in ('magick identify -format "%%w %%h" "%~1"') do set "W=%%w" & set "H=%%h"\nif not defined W exit /b\nif not defined H exit /b\nif not exist "slices\\%~n1" mkdir "slices\\%~n1"\n${blocks.join('\n')}\nexit /b`;
    }
    return `:: Windows CMD Batch (${o.count} files)\n@echo off\nif not exist slices mkdir slices\nfor %%f in (${imgGlobs}) do (\n  if exist "%%f" (\n  if not exist "slices\\%%~nf" mkdir "slices\\%%~nf"\n  magick "%%f"${o.flags} -crop ${o.cols}x${o.rows}@ +repage "slices\\%%~nf\\%%~nf_tile_%%d.${o.ext}"\n  )\n)\necho Slicing finished!`;
  }
  const bashGuard = 'for f in *.*; do\n  [ -e "$f" ] || continue\n  case "${f##*.}" in\n    [Pp][Nn][Gg]|[Jj][Pp][Gg]|[Jj][Pp][Ee][Gg]|[Ww][Ee][Bb][Pp]|[Gg][Ii][Ff]|[Bb][Mm][Pp]|[Tt][Ii][Ff][Ff]|[Aa][Vv][Ii][Ff]|[Ss][Vv][Gg]) ;;\n    *) continue ;;\n  esac';
  if (overlapActive) {
    return `#!/usr/bin/env bash\n# Process ${o.count} images with ImageMagick (overlap ${o.overlap}px)\nC=${o.cols}; R=${o.rows}; BF=${bf}; AF=${af}\nmkdir -p slices\n${bashGuard}\n  base="\${f%.*}"\n  mkdir -p "slices/$base"\n  read W H <<< $(magick identify -format "%w %h" "$f")\n  [ -z "$W" ] && continue\n  n=0\n  for ((r=0; r<R; r++)); do\n    ro=$((r*H/R)); rs=$(((r+1)*H/R-ro))\n    if [ $r -gt 0 ]; then y0=$((ro-BF)); else y0=$ro; fi\n    if [ $y0 -lt 0 ]; then y0=0; fi\n    if [ $r -lt $((R-1)) ]; then y1=$((ro+rs+AF)); else y1=$((ro+rs)); fi\n    if [ $y1 -gt $H ]; then y1=$H; fi\n    th=$((y1-y0))\n    for ((c=0; c<C; c++)); do\n      co=$((c*W/C)); cs=$(((c+1)*W/C-co))\n      if [ $c -gt 0 ]; then x0=$((co-BF)); else x0=$co; fi\n      if [ $x0 -lt 0 ]; then x0=0; fi\n      if [ $c -lt $((C-1)) ]; then x1=$((co+cs+AF)); else x1=$((co+cs)); fi\n      if [ $x1 -gt $W ]; then x1=$W; fi\n      tw=$((x1-x0))\n      magick "$f"${o.flags} -crop "\${tw}x\${th}+\${x0}+\${y0}" +repage "slices/$base/\${base}_tile_$n.${o.ext}"\n      n=$((n+1))\n    done\n  done\ndone\necho "Slicing complete!"`;
  }
  return `#!/usr/bin/env bash\n# Process ${o.count} images with ImageMagick\nmkdir -p slices\n${bashGuard}\n  base="\${f%.*}"\n  mkdir -p "slices/$base"\n  magick "$f"${o.flags} -crop ${o.cols}x${o.rows}@ +repage "slices/$base/\${base}_tile_%d.${o.ext}"\ndone\necho "Slicing complete!"`;
};
