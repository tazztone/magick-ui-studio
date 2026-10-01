export const createSampleSvg = (title = 'TEST PATTERN', subtitle = '1024 × 1024') => {
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
