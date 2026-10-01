import JSZip from 'jszip';
import { tileRect, tileSpan } from './lib/tiles';
import { batchCommand, singleImageCommand, type ShellType } from './lib/imagemagick';

/** Sanitize overlap input to a non-negative integer px value. */
const clampOverlap = (o: unknown): number =>
  Number.isFinite(o as number) ? Math.max(0, Math.floor(o as number)) : 0;
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Upload, Grid, Terminal, Download, Copy, 
  Scissors, RefreshCw, X, Check, Eye, EyeOff, 
  Sliders, Sparkles, ZoomIn, ZoomOut, Maximize2, 
  ChevronDown, ChevronUp, Plus, Minus, FolderPlus,
  CheckCircle2
} from 'lucide-react';

const createSampleSvg = (title = 'TEST PATTERN', subtitle = '1024 × 1024') => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#18181b" />
        <stop offset="50%" stop-color="#09090b" />
        <stop offset="100%" stop-color="#18181b" />
      </linearGradient>
      <pattern id="grid" width="64" height="64" patternUnits="userSpaceOnUse">
        <path d="M 64 0 L 0 0 0 64" fill="none" stroke="#27272a" stroke-width="1.5" />
      </pattern>
      <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#8b5cf6" />
        <stop offset="100%" stop-color="#06b6d4" />
      </linearGradient>
    </defs>
    <rect width="1024" height="1024" fill="url(#bg)" />
    <rect width="1024" height="1024" fill="url(#grid)" />
    <circle cx="512" cy="512" r="320" fill="none" stroke="url(#glow)" stroke-width="6" stroke-dasharray="16,8" />
    <polygon points="512,280 680,680 344,680" fill="#a855f7" opacity="0.25" />
    <polygon points="512,280 680,680 344,680" fill="none" stroke="#c084fc" stroke-width="3" />
    <text x="512" y="500" fill="#fafafa" font-size="44" font-family="system-ui, sans-serif" font-weight="800" text-anchor="middle" letter-spacing="6">${title}</text>
    <text x="512" y="540" fill="#a1a1aa" font-size="18" font-family="monospace" text-anchor="middle" letter-spacing="2">${subtitle}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const GRID_PRESETS = [
  { label: '3×3 Grid', rows: 3, cols: 3, desc: 'Instagram & Sprites' },
  { label: '3×1 Strip', rows: 1, cols: 3, desc: 'Horizontal Banner' },
  { label: '2×2 Quad', rows: 2, cols: 2, desc: '4 Equal Quadrants' },
  { label: '4×4 Sheet', rows: 4, cols: 4, desc: '16 Compact Tiles' },
  { label: '1×3 Column', rows: 3, cols: 1, desc: 'Vertical Carousel' },
];

export default function App() {
  const [images, setImages] = useState<any[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  // Logical workflow tabs
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' | 'resize' | 'adjust'
  
  // Grid parameters
  const [cols, setCols] = useState(3);
  const [rows, setRows] = useState(3);
  // Overlap (px) shared between adjacent tiles; clamped per tile, see tileRect
  const [overlap, setOverlap] = useState(0);
  const overlapPx = clampOverlap(overlap);
  const [showGridOverlay, setShowGridOverlay] = useState(true);
  const [selectedTile, setSelectedTile] = useState(null);

  // Resize parameters
  const [resizePercent, setResizePercent] = useState(100);

  // Transform / adjustments
  const [rotation, setRotation] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [invert, setInvert] = useState(false);

  // Export settings
  const [outputFormat, setOutputFormat] = useState('png'); // 'png' | 'jpeg' | 'webp'
  const [quality, setQuality] = useState(90);

  // CLI & Terminal state
  const [shellType, setShellType] = useState<ShellType>('bash'); // 'bash' | 'powershell' | 'cmd'
  const [showCliSnippet, setShowCliSnippet] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Canvas visual state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fileInputRef = useRef(null);

  const activeImage = images[activeIndex] || null;

  // Actual px size of the selected tile (base span + overlap extension)
  const selectedTileSize =
    selectedTile && activeImage
      ? {
          w: tileSpan(activeImage.width, cols, selectedTile.col).size,
          h: tileSpan(activeImage.height, rows, selectedTile.row).size,
          ew: tileRect(activeImage.width, cols, selectedTile.col, overlapPx).size,
          eh: tileRect(activeImage.height, rows, selectedTile.row, overlapPx).size,
        }
      : null;

  useEffect(() => {
    setSelectedTile(null);
  }, [activeIndex, cols, rows]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2400);
  };

  const processFiles = async (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;

    const list: File[] = Array.from(files).filter((f: File) => f.type.startsWith('image/'));
    if (list.length === 0) {
      showToast('Please upload valid image files');
      return;
    }

    const loadedList = await Promise.all(
      list.map((file: File) => {
        return new Promise<any>(resolve => {
          const img = new Image();
          const src = URL.createObjectURL(file);
          img.onload = () => {
            resolve({
              id: Math.random().toString(36).substring(2, 9),
              file,
              name: file.name,
              baseName: file.name.substring(0, file.name.lastIndexOf('.')) || file.name,
              src,
              width: img.naturalWidth || img.width,
              height: img.naturalHeight || img.height,
              sizeKb: (file.size / 1024).toFixed(1),
              imgElement: img
            });
          };
          img.src = src;
        });
      })
    );

    setImages(prev => [...prev, ...loadedList]);
    setActiveIndex(images.length); // automatically focus newly loaded file
    showToast(`Loaded ${loadedList.length} image(s)`);
  };

  const loadDemo = () => {
    const dataUrl = createSampleSvg('IMAGE SLICER', '1024 × 1024 SAMPLE');
    const img = new Image();
    img.onload = () => {
      const demoItem = {
        id: Math.random().toString(36).substring(2, 9),
        name: 'sample_target.png',
        baseName: 'sample_target',
        src: dataUrl,
        width: img.width,
        height: img.height,
        sizeKb: '14.2',
        imgElement: img
      };
      setImages(prev => [...prev, demoItem]);
      setActiveIndex(images.length);
      showToast('Sample image ready');
    };
    img.src = dataUrl;
  };

  const removeImage = (e, index) => {
    e.stopPropagation();
    const item = images[index];
    if (item?.src?.startsWith('blob:')) {
      URL.revokeObjectURL(item.src);
    }
    const updated = images.filter((_, i) => i !== index);
    setImages(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
  };

  const generatedCommand = useMemo(() => {
    if (images.length === 0) return '# Upload images to generate syntax';
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const current = activeImage || images[0];

    let flags = [];
    if (activeTab === 'resize' && resizePercent !== 100) {
      flags.push(`-resize ${resizePercent}%`);
    }
    if (rotation !== 0) {
      flags.push(`-rotate ${rotation}`);
    }
    if (grayscale) {
      flags.push(`-colorspace Gray`);
    }
    if (invert) {
      flags.push(`-negate`);
    }
    if (outputFormat === 'jpeg' || outputFormat === 'webp') {
      flags.push(`-quality ${quality}`);
    }
    flags.push(`-strip`);

    const flagStr = flags.length > 0 ? ` ${flags.join(' ')}` : '';

    if (images.length === 1) {
      const rot90 = rotation === 90 || rotation === 270;
      return singleImageCommand({
        name: current.name,
        baseName: current.baseName,
        ext,
        flags: flagStr,
        shell: shellType,
        mode: activeTab,
        w: rot90 ? current.height : current.width,
        h: rot90 ? current.width : current.height,
        cols,
        rows,
        overlap: overlapPx,
      });
    }


    return batchCommand({
      count: images.length,
      ext,
      flags: flagStr,
      shell: shellType,
      cols,
      rows,
      overlap: activeTab === 'grid' ? overlapPx : 0,
      rotation,
    });
  }, [images, activeImage, activeTab, cols, rows, overlapPx, resizePercent, rotation, grayscale, invert, outputFormat, quality, shellType]);

  const copyCliCode = () => {
    try {
      const el = document.createElement('textarea');
      el.value = generatedCommand;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopiedNotification(true);
      setTimeout(() => setCopiedNotification(false), 2000);
      showToast('Command copied to clipboard');
    } catch {
      showToast('Failed to copy');
    }
  };

  const renderTransformedCanvas = (imgElement, targetW, targetH) => {
    const canvas = document.createElement('canvas');
    const isRotated90 = rotation === 90 || rotation === 270;
    canvas.width = isRotated90 ? targetH : targetW;
    canvas.height = isRotated90 ? targetW : targetH;
    const ctx = canvas.getContext('2d');

    let filterStr = '';
    if (grayscale) filterStr += ' grayscale(100%)';
    if (invert) filterStr += ' invert(100%)';
    ctx.filter = filterStr.trim() || 'none';

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotation !== 0) ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(imgElement, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();

    return canvas;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const downloadSingleTile = async (r, c) => {
    if (!activeImage) return;
    const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;
    const mimeType = `image/${outputFormat}`;
    const baseCanvas = renderTransformedCanvas(activeImage.imgElement, activeImage.width, activeImage.height);
    const { off: tileX, size: tileW } = tileRect(baseCanvas.width, cols, c, overlapPx);
    const { off: tileY, size: tileH } = tileRect(baseCanvas.height, rows, r, overlapPx);
    if (tileW === 0 || tileH === 0) { showToast('Tile has zero size at this grid'); return; }
    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = tileW;
    tileCanvas.height = tileH;
    const ctx = tileCanvas.getContext('2d');

    ctx.drawImage(baseCanvas, tileX, tileY, tileW, tileH, 0, 0, tileW, tileH);
    const blob: Blob | null = await new Promise<Blob | null>(res => tileCanvas.toBlob(res, mimeType, quality / 100));
    if (!blob) { showToast('Could not render tile image'); return; }
    const tileIdx = r * cols + c;
    downloadBlob(blob, `${activeImage.baseName}_tile_${tileIdx}.${ext}`);
    showToast(`Exported tile #${tileIdx}`);
  };

  const handleBatchExport = async () => {
    if (images.length === 0) return;

    setIsProcessing(true);
    try {
      const zip = new JSZip();
      const mimeType = `image/${outputFormat}`;
      const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let outW = item.width;
        let outH = item.height;

        if (activeTab === 'resize' && resizePercent !== 100) {
          outW = Math.round(item.width * (resizePercent / 100));
          outH = Math.round(item.height * (resizePercent / 100));
        }

        const rendered = renderTransformedCanvas(item.imgElement, outW, outH);

        if (activeTab === 'grid') {
          const folder = (images.length > 1 ? zip.folder(item.baseName) : zip) ?? zip;
          let count = 0;

          for (let r = 0; r < rows; r++) {
            const { off: tileY, size: tileH } = tileRect(rendered.height, rows, r, overlapPx);
            for (let c = 0; c < cols; c++) {
              const { off: tileX, size: tileW } = tileRect(rendered.width, cols, c, overlapPx);
              if (tileW === 0 || tileH === 0) { count++; continue; }
              const tileCanvas = document.createElement('canvas');
              tileCanvas.width = tileW;
              tileCanvas.height = tileH;
              const tCtx = tileCanvas.getContext('2d');

              tCtx.drawImage(rendered, tileX, tileY, tileW, tileH, 0, 0, tileW, tileH);
              const blob: Blob | null = await new Promise<Blob | null>(res => tileCanvas.toBlob(res, mimeType, quality / 100));
              if (blob) folder.file(`${item.baseName}_tile_${count}.${ext}`, blob);
              count++;
            }
          }
        } else {
          const blob: Blob | null = await new Promise<Blob | null>(res => rendered.toBlob(res, mimeType, quality / 100));
          if (blob) zip.file(`${item.baseName}_processed.${ext}`, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const archiveName = images.length > 1 ? 'magick_batch_tiles.zip' : `${images[0].baseName}_tiles.zip`;
      downloadBlob(zipBlob, archiveName);
      showToast('Export complete!');
    } catch (err) {
      console.error(err);
      showToast('Export failed. Check console.');
    } finally {
      setIsProcessing(false);
    }
  };

  const previewFilterStyle = useMemo(() => {
    let filterStr = '';
    if (grayscale) filterStr += ' grayscale(100%)';
    if (invert) filterStr += ' invert(100%)';
    return {
      filter: filterStr.trim() || 'none',
      transform: `rotate(${rotation}deg)`,
      transition: 'filter 150ms ease, transform 200ms ease'
    };
  }, [grayscale, invert, rotation]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-violet-600/30">
      
      {/* 1. TOP APP BAR: Brand, Active Summary & Export */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-900/90 backdrop-blur sticky top-0 z-30 px-3 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-900/40">
            <Sparkles size={16} />
          </div>
          <div>
            <div className="font-semibold text-sm tracking-tight text-zinc-100 flex items-center gap-1.5">
              <span>Magick Studio</span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-violet-400 bg-violet-950/60 px-1.5 py-0.5 rounded border border-violet-800/50">
                CLI
              </span>
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center gap-2">
          {images.length === 0 ? (
            <button
              onClick={loadDemo}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/80 transition-all flex items-center gap-1.5"
            >
              <Sparkles size={13} className="text-violet-400" />
              <span>Load Sample</span>
            </button>
          ) : (
            <button
              onClick={handleBatchExport}
              disabled={isProcessing}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-md shadow-emerald-950/50 flex items-center gap-1.5 disabled:opacity-50"
            >
              {isProcessing ? <RefreshCw className="animate-spin" size={13} /> : <Download size={13} />}
              <span>{isProcessing ? 'Processing...' : images.length > 1 ? `Export All (${images.length})` : 'Export Tiles'}</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. LOGICAL WORKFLOW BODY */}
      <main className="flex-1 flex flex-col lg:flex-row min-h-0">
        
        {/* LEFT / TOP: SOURCE IMAGES & INTERACTIVE CANVAS */}
        <section className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-zinc-950/70 relative">
          
          {/* STEP 1: IMAGES BAR / DOCK (Load Images First) */}
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-10 px-3 rounded-lg border border-dashed border-zinc-700 hover:border-violet-500 bg-zinc-900 hover:bg-zinc-800/80 text-zinc-300 text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0"
            >
              <FolderPlus size={15} className="text-violet-400" />
              <span>{images.length === 0 ? 'Load Images' : 'Add More'}</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => { processFiles(e.target.files); e.target.value = ''; }}
              multiple
              accept="image/*"
              className="hidden"
            />

            {images.length === 0 ? (
              <div className="text-xs text-zinc-500 pl-2">
                Drop files or click <span className="text-violet-400 font-medium cursor-pointer" onClick={loadDemo}>Load Sample</span> to begin
              </div>
            ) : (
              <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveIndex(idx)}
                    className={`h-10 pl-2 pr-1 rounded-lg border flex items-center gap-2 cursor-pointer transition-all shrink-0 ${
                      activeIndex === idx
                        ? 'bg-violet-600/20 border-violet-500/60 text-zinc-100 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    <img src={img.src} alt="" className="w-6 h-6 rounded object-cover border border-zinc-700/60 bg-black shrink-0" />
                    <div className="text-xs max-w-[90px] sm:max-w-[120px] truncate font-medium">
                      {img.name}
                    </div>
                    <button
                      onClick={(e) => removeImage(e, idx)}
                      className="p-1 hover:text-red-400 rounded text-zinc-500 transition-colors"
                      title="Remove file"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STEP 2: CANVAS PREVIEW & DIRECT MANIPULATION */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              processFiles(e.dataTransfer.files);
            }}
            className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 min-h-[360px] lg:min-h-[500px] relative overflow-hidden select-none"
            style={{
              backgroundImage: 'radial-gradient(#27272a 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}
          >
            {/* Canvas Floating Controls */}
            {activeImage && (
              <div className="absolute top-3 left-3 z-20 flex items-center gap-1 bg-zinc-900/90 border border-zinc-800 rounded-lg p-1 shadow-lg backdrop-blur">
                <button
                  onClick={() => setZoomLevel(z => Math.max(0.4, z - 0.2))}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={13} />
                </button>
                <span className="text-[11px] font-mono text-zinc-300 w-9 text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  onClick={() => setZoomLevel(z => Math.min(2.5, z + 0.2))}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={13} />
                </button>
                <div className="w-px h-3.5 bg-zinc-800" />
                <button
                  onClick={() => setZoomLevel(1)}
                  className="p-1.5 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                  title="Reset Zoom"
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            )}

            {/* Grid Overlay Toggle */}
            {activeImage && activeTab === 'grid' && (
              <button
                onClick={() => setShowGridOverlay(!showGridOverlay)}
                className={`absolute top-3 right-3 z-20 text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 font-medium shadow-lg backdrop-blur transition-all ${
                  showGridOverlay
                    ? 'bg-violet-600/20 border-violet-500/60 text-violet-300'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-400'
                }`}
              >
                {showGridOverlay ? <Eye size={13} /> : <EyeOff size={13} />}
                <span>{showGridOverlay ? `${cols}×${rows} Grid${overlapPx > 0 ? ` +${overlapPx}` : ''}` : 'Grid Off'}</span>
              </button>
            )}

            {/* Empty State */}
            {!activeImage ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full max-w-sm border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging ? 'border-violet-500 bg-violet-950/20' : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
                }`}
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
                  <Upload size={22} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Select or drop images</p>
                  <p className="text-xs text-zinc-500 mt-1">Supports PNG, JPG, WebP & SVG</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); loadDemo(); }}
                  className="mt-2 text-xs font-medium px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
                >
                  Try Sample Image
                </button>
              </div>
            ) : (
              /* Canvas Viewport */
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: 'center center'
                }}
                className="relative inline-block max-w-full shadow-2xl ring-1 ring-zinc-800/80 rounded transition-transform duration-75"
              >
                <img
                  src={activeImage.src}
                  alt="Preview"
                  style={previewFilterStyle}
                  className="max-h-[50vh] lg:max-h-[60vh] max-w-[85vw] lg:max-w-[42vw] object-contain block bg-zinc-950"
                />

                {/* Grid Overlay Slices (rects mirror export math, incl. overlap) */}
                {activeTab === 'grid' && showGridOverlay && (
                  <div className="absolute inset-0 z-10 border-2 border-violet-500/80 pointer-events-none">
                    {Array.from({ length: cols * rows }).map((_, i) => {
                      const r = Math.floor(i / cols);
                      const c = i % cols;
                      const isSel = selectedTile?.index === i;
                      const xr = tileRect(activeImage.width, cols, c, overlapPx);
                      const yr = tileRect(activeImage.height, rows, r, overlapPx);
                      return (
                        <div
                          key={i}
                          onClick={() => setSelectedTile({ index: i, row: r, col: c })}
                          style={{
                            left: `${(xr.off / activeImage.width) * 100}%`,
                            top: `${(yr.off / activeImage.height) * 100}%`,
                            width: `${(xr.size / activeImage.width) * 100}%`,
                            height: `${(yr.size / activeImage.height) * 100}%`,
                          }}
                          className={`absolute border border-violet-400/50 cursor-pointer transition-colors pointer-events-auto ${
                            isSel
                              ? 'bg-violet-600/35 ring-2 ring-violet-400 ring-inset'
                              : 'bg-violet-500/10 hover:bg-violet-500/20 active:bg-violet-500/30'
                          }`}
                        >
                          <span className="absolute top-1 left-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/70 text-violet-300 font-bold backdrop-blur">
                            #{i}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Tile Inspector Bar */}
            {selectedTile && activeTab === 'grid' && activeImage && (
              <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 z-20 bg-zinc-900/95 border border-zinc-700/80 rounded-xl p-2.5 shadow-2xl backdrop-blur flex items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-zinc-200">
                    Tile #{selectedTile.index} (R{selectedTile.row + 1}, C{selectedTile.col + 1})
                  </div>
                  <div className="text-[11px] font-mono text-violet-400">
                    {selectedTileSize ? `${selectedTileSize.w} × ${selectedTileSize.h} px` : '—'}
                    {selectedTileSize && overlapPx > 0 && (
                      <span className="text-zinc-500"> (+{overlapPx} → {selectedTileSize.ew} × {selectedTileSize.eh})</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => downloadSingleTile(selectedTile.row, selectedTile.col)}
                  className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Download size={12} />
                  <span>Download Tile</span>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* RIGHT / BOTTOM: CONTROLS & CLI (Fully Scrollable, Never Blocked) */}
        <section className="w-full lg:w-[420px] bg-zinc-900/30 flex flex-col shrink-0 min-h-0 border-t lg:border-t-0">
          
          {/* Tool Mode Tabs */}
          <div className="p-3 border-b border-zinc-800/80 bg-zinc-900/50 flex gap-1">
            <button
              onClick={() => setActiveTab('grid')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'grid'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Grid size={14} />
              <span>Grid Slices</span>
            </button>
            <button
              onClick={() => setActiveTab('resize')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'resize'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Scissors size={14} />
              <span>Resize</span>
            </button>
            <button
              onClick={() => setActiveTab('adjust')}
              className={`flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                activeTab === 'adjust'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
              }`}
            >
              <Sliders size={14} />
              <span>Adjust</span>
            </button>
          </div>

          {/* Scrollable Settings Panel */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 max-h-[calc(100vh-140px)] pb-16">
            
            {/* GRID SETTINGS */}
            {activeTab === 'grid' && (
              <div className="space-y-4">
                {/* Presets */}
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">Popular Presets</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {GRID_PRESETS.map(p => (
                      <button
                        key={p.label}
                        onClick={() => { setCols(p.cols); setRows(p.rows); }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          cols === p.cols && rows === p.rows
                            ? 'bg-violet-600/20 border-violet-500 text-violet-200'
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        <div className="text-xs font-bold text-zinc-200">{p.label}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Touch-Friendly Stepper: Columns & Rows */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Columns */}
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Columns (X)</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCols(c => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={cols}
                        onChange={(e) => setCols(Math.max(1, Number(e.target.value)))}
                        className="flex-1 bg-transparent text-center font-mono font-bold text-sm text-zinc-100 focus:outline-none"
                      />
                      <button
                        onClick={() => setCols(c => Math.min(24, c + 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Rows */}
                  <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                    <div className="text-[10px] uppercase font-bold text-zinc-500 mb-2">Rows (Y)</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setRows(r => Math.max(1, r - 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      >
                        <Minus size={13} />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="24"
                        value={rows}
                        onChange={(e) => setRows(Math.max(1, Number(e.target.value)))}
                        className="flex-1 bg-transparent text-center font-mono font-bold text-sm text-zinc-100 focus:outline-none"
                      />
                      <button
                        onClick={() => setRows(r => Math.min(24, r + 1))}
                        className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Overlap Control */}
                <div className="bg-zinc-900 p-3 rounded-xl border border-zinc-800">
                  <div className="flex justify-between items-center text-xs mb-2">
                    <span className="text-zinc-300 font-medium">Tile Overlap</span>
                    <span className="font-mono font-bold text-violet-400">{overlapPx}px</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setOverlap(o => Math.max(0, clampOverlap(o) - 1))}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      title="Less overlap"
                    >
                      <Minus size={13} />
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="128"
                      step="1"
                      value={overlapPx}
                      onChange={(e) => setOverlap(Number(e.target.value))}
                      className="flex-1 accent-violet-500 bg-zinc-800 cursor-pointer h-2 rounded-lg"
                    />
                    <button
                      onClick={() => setOverlap(o => Math.min(512, clampOverlap(o) + 1))}
                      className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-200 flex items-center justify-center transition-transform"
                      title="More overlap"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1.5">Shared strip between neighbors. 0 = edge-to-edge.</div>
                </div>

                {/* Slicing Metrics Box */}
                <div className="bg-zinc-900/60 p-3 rounded-xl border border-zinc-800 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total Slices:</span>
                    <span className="font-mono font-bold text-violet-400">{cols * rows} tiles</span>
                  </div>
                  {activeImage && (
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Tile Dimensions:</span>
                      <span className="font-mono text-zinc-300">
                        {tileRect(activeImage.width, cols, 0, overlapPx).size} × {tileRect(activeImage.height, rows, 0, overlapPx).size} px
                        {overlapPx > 0 && <span className="text-violet-400"> (base {tileSpan(activeImage.width, cols, 0).size} × {tileSpan(activeImage.height, rows, 0).size} +{overlapPx})</span>}
                      </span>
                    </div>
                  )}
                  {activeImage && overlapPx > 0 && (() => {
                    const spans = [
                      ...Array.from({ length: cols }, (_, c) => tileSpan(activeImage.width, cols, c).size),
                      ...Array.from({ length: rows }, (_, r) => tileSpan(activeImage.height, rows, r).size),
                    ];
                    const minTile = Math.min(...spans);
                    return minTile > 0 && overlapPx >= minTile ? (
                      <div className="text-[11px] text-amber-400/90 pt-1">
                        Overlap ≥ smallest tile ({minTile}px) — edge tiles go full-bleed.
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>
            )}

            {/* RESIZE SETTINGS */}
            {activeTab === 'resize' && (
              <div className="space-y-4">
                <div className="bg-zinc-900 p-3.5 rounded-xl border border-zinc-800 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-300 font-medium">Scale Percentage</span>
                    <span className="font-mono font-bold text-violet-400">{resizePercent}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="200"
                    step="5"
                    value={resizePercent}
                    onChange={(e) => setResizePercent(Number(e.target.value))}
                    className="w-full accent-violet-500 bg-zinc-800 cursor-pointer h-2 rounded-lg"
                  />
                  {activeImage && (
                    <div className="text-[11px] font-mono text-zinc-400 text-right">
                      {Math.round(activeImage.width * (resizePercent / 100))} × {Math.round(activeImage.height * (resizePercent / 100))} px
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ADJUSTMENT SETTINGS */}
            {activeTab === 'adjust' && (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-300 block mb-2">Rotate Angle</label>
                  <div className="grid grid-cols-4 gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                    {[0, 90, 180, 270].map(deg => (
                      <button
                        key={deg}
                        onClick={() => setRotation(deg)}
                        className={`py-1.5 text-xs font-mono rounded-lg transition-colors ${
                          rotation === deg ? 'bg-zinc-800 text-violet-400 font-bold' : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={() => setGrayscale(!grayscale)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                      grayscale ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Grayscale
                  </button>
                  <button
                    onClick={() => setInvert(!invert)}
                    className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                      invert ? 'bg-violet-600/20 border-violet-500 text-violet-300' : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    Invert
                  </button>
                </div>
              </div>
            )}

            {/* EXPORT FORMAT & QUALITY */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block">Export Format</label>
              <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                {['png', 'jpeg', 'webp'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setOutputFormat(fmt)}
                    className={`flex-1 text-xs py-1.5 rounded-lg capitalize font-medium transition-colors ${
                      outputFormat === fmt ? 'bg-zinc-800 text-violet-400 font-bold shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    {fmt === 'jpeg' ? 'JPG' : fmt}
                  </button>
                ))}
              </div>

              {(outputFormat === 'jpeg' || outputFormat === 'webp') && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Quality</span>
                    <span className="font-mono text-zinc-300">{quality}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={quality}
                    onChange={(e) => setQuality(Number(e.target.value))}
                    className="w-full accent-violet-500 bg-zinc-800 cursor-pointer h-1.5 rounded"
                  />
                </div>
              )}
            </div>

            {/* MINIMAL CLI COMMAND GENERATOR (Collapsible, Never Traps Viewport) */}
            <div className="pt-2 border-t border-zinc-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setShowCliSnippet(!showCliSnippet)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300 hover:text-zinc-100 transition-colors"
                >
                  <Terminal size={14} className="text-violet-400" />
                  <span>ImageMagick CLI Syntax</span>
                  {showCliSnippet ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </button>
                <button
                  onClick={copyCliCode}
                  className="text-xs px-2 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 flex items-center gap-1 transition-colors"
                >
                  {copiedNotification ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                  <span>{copiedNotification ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              {showCliSnippet && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800 text-[10px]">
                    <button
                      onClick={() => setShellType('bash')}
                      className={`flex-1 py-1 rounded-md transition-colors ${
                        shellType === 'bash' ? 'bg-zinc-800 text-violet-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Bash
                    </button>
                    <button
                      onClick={() => setShellType('powershell')}
                      className={`flex-1 py-1 rounded-md transition-colors ${
                        shellType === 'powershell' ? 'bg-zinc-800 text-violet-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      PowerShell
                    </button>
                    <button
                      onClick={() => setShellType('cmd')}
                      className={`flex-1 py-1 rounded-md transition-colors ${
                        shellType === 'cmd' ? 'bg-zinc-800 text-violet-400 font-bold' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      CMD
                    </button>
                  </div>
                  <pre className="bg-black/80 border border-zinc-800/80 rounded-xl p-3 font-mono text-[11px] text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
                    {generatedCommand}
                  </pre>
                </div>
              )}
            </div>

          </div>
        </section>

      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-800 text-zinc-100 border border-zinc-700 px-3.5 py-2 rounded-xl shadow-xl text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 size={14} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
}