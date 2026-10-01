import { describe, expect, it } from 'vitest';
import { batchCommand, singleImageCommand, tileGeometries } from './imagemagick';
import { tileRect } from './tiles';

const base = {
  name: 'photo.png',
  baseName: 'photo',
  ext: 'png',
  flags: ' -strip',
} as const;

describe('tileGeometries', () => {
  it('matches export math (tileRect) for every tile', () => {
    const W = 1025, H = 777, cols = 3, rows = 2, O = 10;
    const geoms = tileGeometries(W, H, cols, rows, O);
    expect(geoms).toHaveLength(cols * rows);
    let k = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const xr = tileRect(W, cols, c, O);
        const yr = tileRect(H, rows, r, O);
        expect(geoms[k]).toBe(`${xr.size}x${yr.size}+${xr.off}+${yr.off}`);
        k++;
      }
    }
  });
});

describe('singleImageCommand', () => {
  it('keeps the classic one-liner when overlap is 0', () => {
    expect(
      singleImageCommand({ ...base, shell: 'bash', mode: 'grid', w: 1024, h: 1024, cols: 3, rows: 3, overlap: 0 }),
    ).toBe('magick "photo.png" -strip -crop 3x3@ +repage "photo_tile_%d.png"');
  });

  it('exports the whole image in non-grid modes', () => {
    expect(
      singleImageCommand({ ...base, shell: 'bash', mode: 'resize', w: 1024, h: 1024, cols: 3, rows: 3, overlap: 10 }),
    ).toBe('magick "photo.png" -strip "photo_processed.png"');
  });

  it('emits explicit overlapping geometries per shell', () => {
    const opts = { ...base, mode: 'grid', w: 1025, h: 777, cols: 3, rows: 2, overlap: 10 } as const;
    const geoms = tileGeometries(1025, 777, 3, 2, 10);
    const bash = singleImageCommand({ ...opts, shell: 'bash' });
    for (const g of geoms) expect(bash).toContain(`"${g}"`);
    expect(bash).toContain('for i in "${!tiles[@]}"');
    expect(bash).not.toMatch(/-crop \d+x\d+@/);

    const ps = singleImageCommand({ ...opts, shell: 'powershell' });
    for (const g of geoms) expect(ps).toContain(`"${g}"`);

    const cmd = singleImageCommand({ ...opts, shell: 'cmd' });
    for (const [k, g] of geoms.entries()) expect(cmd).toContain(`set "T${k}=${g}"`);
  });
});

describe('batchCommand', () => {
  const opts = { count: 3, ext: 'png', flags: ' -strip', cols: 3, rows: 2, overlap: 0 } as const;

  it('keeps the classic loops when overlap is 0', () => {
    expect(batchCommand({ ...opts, shell: 'bash' })).toBe(
      '#!/usr/bin/env bash\n# Process 3 images with ImageMagick\nmkdir -p slices\nfor f in *.*; do\n  [ -e "$f" ] || continue\n  case "${f##*.}" in\n    [Pp][Nn][Gg]|[Jj][Pp][Gg]|[Jj][Pp][Ee][Gg]|[Ww][Ee][Bb][Pp]|[Gg][Ii][Ff]|[Bb][Mm][Pp]|[Tt][Ii][Ff][Ff]|[Aa][Vv][Ii][Ff]|[Ss][Vv][Gg]) ;;\n    *) continue ;;\n  esac\n  base="${f%.*}"\n  mkdir -p "slices/$base"\n  magick "$f" -strip -crop 3x2@ +repage "slices/$base/${base}_tile_%d.png"\ndone\necho "Slicing complete!"',
    );
    expect(batchCommand({ ...opts, shell: 'powershell' })).toContain('-crop 3x2@');
    expect(batchCommand({ ...opts, shell: 'cmd' })).toContain('-crop 3x2@');
  });

  it('computes geometries at runtime when overlap is active', () => {
    const o = { ...opts, overlap: 10 };
    const bash = batchCommand({ ...o, shell: 'bash' });
    expect(bash).toContain('magick identify -format "%w %h"');
    expect(bash).toContain('for ((r=0; r<R; r++))');
    expect(bash).toContain('case "${f##*.}"');
    expect(bash).toContain('[ -z "$W" ]');

    const ps = batchCommand({ ...o, shell: 'powershell' });
    expect(ps).toContain('[math]::Floor');
    expect(ps).toContain('-notcontains $_.Extension');
    expect(ps).toContain('if ($W -le 0 -or $H -le 0) { return }');
    expect(ps).toContain('-crop "${tw}x${th}+${x0}+${y0}"');

    const cmd = batchCommand({ ...o, shell: 'cmd' });
    expect(cmd).toContain('call :slice');
    expect(cmd).toContain('*.png *.jpg');
    expect(cmd).toContain('if not defined W exit /b');
    // one magick line per tile (3x2 = 6)
    expect(cmd.split('magick "%~1"').length - 1).toBe(6);
    // CMD set /a has no ternary: clamps must be LSS/GTR guards
    expect(cmd).not.toMatch(/set \/a ".*\?.*:.*"/);
    expect(cmd).toContain('if %y0% LSS 0');
    expect(cmd).toContain('if %y1% GTR %H%');
    expect(cmd).toContain('if %x0% LSS 0');
    expect(cmd).toContain('if %x1% GTR %W%');
  });

  it('swaps W/H at runtime for 90/270 rotation when overlap is active', () => {
    const o = { ...opts, overlap: 10 };
    expect(batchCommand({ ...o, shell: 'bash', rotation: 90 })).toContain('t=$W; W=$H; H=$t');
    expect(batchCommand({ ...o, shell: 'powershell', rotation: 270 })).toContain('$t=$W; $W=$H; $H=$t');
    expect(batchCommand({ ...o, shell: 'cmd', rotation: 90 })).toContain('set "t=%W%" & set "W=%H%" & set "H=%t%"');
    // 0/180 need no swap; overlap-0 loops never carry it either
    expect(batchCommand({ ...o, shell: 'bash', rotation: 0 })).not.toContain('t=$W');
    expect(batchCommand({ ...o, shell: 'bash', rotation: 180 })).not.toContain('t=$W');
    expect(batchCommand({ ...opts, shell: 'bash', rotation: 90 })).not.toContain('t=$W');
  });
});

describe('singleImageCommand exact scripts', () => {
  const opts = { ...base, mode: 'grid', w: 100, h: 100, cols: 2, rows: 1, overlap: 4 } as const;

  it('emits the exact bash script', () => {
    expect(singleImageCommand({ ...opts, shell: 'bash' })).toBe(
      `# Bash Slicing with 4px overlap\ntiles=(\n  "52x100+0+0"\n  "52x100+48+0"\n)\nfor i in "\${!tiles[@]}"; do\n  magick "photo.png" -strip -crop "\${tiles[$i]}" +repage "photo_tile_$i.png"\ndone`,
    );
  });

  it('emits the exact powershell script', () => {
    expect(singleImageCommand({ ...opts, shell: 'powershell' })).toBe(
      `# PowerShell Slicing with 4px overlap\n$tiles = @(\n  "52x100+0+0",\n  "52x100+48+0"\n)\nfor ($i = 0; $i -lt $tiles.Count; $i++) {\n  magick "photo.png" -strip -crop $tiles[$i] +repage "photo_tile_$i.png"\n}`,
    );
  });

  it('emits the exact cmd script', () => {
    expect(singleImageCommand({ ...opts, shell: 'cmd' })).toBe(
      `:: Windows CMD Slicing with 4px overlap\nsetlocal enabledelayedexpansion\nset "T0=52x100+0+0"\nset "T1=52x100+48+0"\nset /a n=0\nfor %%g in (%T0% %T1%) do (\n  magick "photo.png" -strip -crop %%g +repage "photo_tile_!n!.png"\n  set /a n+=1\n)`,
    );
  });

  it('concatenates empty flags without a double space', () => {
    expect(
      singleImageCommand({ ...base, flags: '', shell: 'bash', mode: 'resize', w: 10, h: 10, cols: 1, rows: 1, overlap: 0 }),
    ).toBe('magick "photo.png" "photo_processed.png"');
  });
});

describe('batchCommand exact scripts', () => {
  it('emits exact non-overlap powershell and cmd loops', () => {
    const opts = { count: 2, ext: 'png', flags: '', cols: 2, rows: 2, overlap: 0 } as const;
    expect(batchCommand({ ...opts, shell: 'powershell' })).toBe(
      `# PowerShell Batch Slicing (2 files)\nNew-Item -ItemType Directory -Force -Path "slices" | Out-Null\nGet-ChildItem -File | ForEach-Object {\n  $base = $_.BaseName\n  if (@('.png','.jpg','.jpeg','.webp','.gif','.bmp','.tiff','.avif','.svg') -notcontains $_.Extension.ToLower()) { return }\n  New-Item -ItemType Directory -Force -Path "slices/$base" | Out-Null\n  magick $_.FullName -crop 2x2@ +repage "slices/$base/$($base)_tile_%d.png"\n}\nWrite-Host "Done!" -ForegroundColor Green`,
    );
    expect(batchCommand({ ...opts, shell: 'cmd' })).toBe(
      `:: Windows CMD Batch (2 files)\n@echo off\nif not exist slices mkdir slices\nfor %%f in (*.png *.jpg *.jpeg *.webp *.gif *.bmp *.tiff *.avif *.svg) do (\n  if exist "%%f" (\n  if not exist "slices\\%%~nf" mkdir "slices\\%%~nf"\n  magick "%%f" -crop 2x2@ +repage "slices\\%%~nf\\%%~nf_tile_%%d.png"\n  )\n)\necho Slicing finished!`,
    );
  });

  it('treats undefined and 180 rotation identically (no swap)', () => {
    const opts = { count: 1, ext: 'png', flags: '', cols: 2, rows: 2, overlap: 10 } as const;
    expect(batchCommand({ ...opts, shell: 'bash' })).toBe(
      batchCommand({ ...opts, shell: 'bash', rotation: 180 }),
    );
    expect(batchCommand({ ...opts, shell: 'bash' })).not.toContain('H=$t');
  });
});
