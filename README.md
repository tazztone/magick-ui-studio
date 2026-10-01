# Magick UI Studio

Browser-based image grid slicer with tile inspector, batch ZIP export, and
ImageMagick command generator. Upload images, slice them into configurable
grids, preview / download individual tiles, and copy ready-to-run `magick`
commands (Bash, PowerShell, CMD).

Built with **Vite + React + TypeScript + Tailwind CSS**, with icons from
`lucide-react` and client-side ZIP archives via `jszip`.

## Features

- **Touch & desktop grid slicing** — responsive layout with touch steppers and
  presets (3×3, 3×1, 2×2, 4×4, 1×3)
- **Interactive tile inspector** — click any grid tile to preview and download
  just that tile
- **Client-side batch compression** — multi-image slicing with direct `.zip`
  export in the browser (no server)
- **Multi-shell ImageMagick syntax** — instant Bash / PowerShell / Windows CMD
  command generator with copy-to-clipboard
- **Resize / rotate / grayscale / invert** transforms with live preview

## Getting started

Prerequisites: Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Start the dev server (default: http://localhost:5173)
npm run dev

# Type-check + production build (outputs to dist/)
npm run build

# Preview the production build locally
npm run preview
```

> **Sandbox note:** if your npm registry mirror blocks packages, install with
> the official registry and a project-local cache:
> `npm --cache ./.npm-cache --registry=https://registry.npmjs.org install`

## Project structure

```
magick-ui-studio/
├── index.html            # Entry HTML (title: Magick UI Studio)
├── src/
│   ├── App.tsx           # Entire studio UI (slicer, inspector, export, CLI)
│   ├── main.tsx          # React root + global CSS import
│   └── index.css         # Tailwind directives + dark base theme
├── public/               # Static assets (favicons)
├── tailwind.config.js    # Tailwind content paths
├── postcss.config.js     # Tailwind + Autoprefixer
└── vite.config.ts        # Vite + React plugin
```

## Deployment

### Vercel (recommended, 1-click)

1. Push this repo to GitHub.
2. Go to [vercel.com](https://vercel.com), log in with GitHub.
3. **Add New Project** → select `magick-ui-studio` → keep defaults
   (Framework: Vite) → **Deploy**.

Every `git push` to `main` redeploys automatically.

### GitHub Pages

```bash
npm install  # gh-pages is already a devDependency
```

In `vite.config.ts`, set the base repository path:

```ts
export default defineConfig({
  base: '/magick-ui-studio/',
  plugins: [react()],
})
```

Then publish:

```bash
npm run deploy   # builds (predeploy) and pushes dist/ to gh-pages
```

## Scripts

| Command          | What it does                              |
| ---------------- | ----------------------------------------- |
| `npm run dev`    | Start Vite dev server with HMR            |
| `npm run build`  | `tsc -b` type-check + Vite production build |
| `npm run preview`| Serve `dist/` locally                     |
| `npm run deploy` | Publish `dist/` to GitHub Pages           |

## License

MIT — do whatever you want with it.
