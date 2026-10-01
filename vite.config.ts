import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    // Playwright specs live in e2e/ and must not be picked up by Vitest
    // (both match *.spec.ts); defaults below are Vitest's own plus e2e.
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build,playwright}.config.*',
    ],
    coverage: {
      provider: 'v8',
      // `include` explicitly lists every source file, so untested files are
      // still counted in the denominator (no silent inflation of the numbers).
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/main.tsx',
        'src/**/*.test.{ts,tsx}',
        'src/test-setup.ts',
        'src/test-utils.ts',
      ],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
      },
    },
  },
})
