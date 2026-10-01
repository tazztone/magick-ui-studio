## Install

- `npm --cache ./.npm-cache --registry=https://registry.npmjs.org install`

## Test (sandbox /tmp is read-only)

- `mkdir -p .tmp-vitest && TMPDIR="$PWD/.tmp-vitest" npm test`
- `mkdir -p .tmp-vitest && TMPDIR="$PWD/.tmp-vitest" npm run test:e2e` (uses system Chrome; no browser download)
