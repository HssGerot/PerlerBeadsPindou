# AGENTS.md

## Project Overview

PerlerBeadsPindou is a local-only Vite + React + TypeScript web app for
turning uploaded images into perler bead patterns.

Current capabilities:

- Image upload and in-browser pixel reading
- Image-to-bead grid generation
- Dominant-color and average-color sampling modes
- 48-color and full-palette matching
- Bead preview with grid and color-code toggles
- Color usage statistics
- PNG pattern export
- Basic SEO files for `https://perlerbead.i9527.xin/`

User images, generated bead grids, and exported results must stay in browser
memory unless the user explicitly downloads a file. Do not persist image data,
pixel data, generated patterns, or file names in local storage, URLs, cookies,
logs, or analytics.

## Common Commands

Run from the project root:

```bash
npm install
npm run dev
npm test -- --run
npm run build
```

Local production preview:

```bash
npm run preview -- --host 127.0.0.1
```

## Architecture Notes

- `src/App.tsx` owns the current single-page workbench UI.
- `src/styles.css` contains the current global layout and component styling.
- Framework-independent logic lives under `src/core`.
- Image reading:
  - `src/core/browserImage.ts`
- Color and palette logic:
  - `src/core/color.ts`
  - `src/core/palette.ts`
- Pattern generation:
  - `src/core/imageToBeads.ts`
- Export and download:
  - `src/core/exportPattern.ts`
  - `src/core/downloadFile.ts`
- SEO and deploy-adjacent static files:
  - `public/robots.txt`
  - `public/sitemap.xml`
  - `index.html`
  - `sync.sh`

## Implementation Rules

- Keep image processing and export logic framework-independent where practical.
- Keep uploaded images and generated patterns in memory only.
- Prefer small, focused core modules over adding page-local utility logic.
- Use existing visual density and color tokens in `src/styles.css`.
- Keep UI compact: settings on the left, preview in the center, usage stats on
  the right.
- Do not add new runtime dependencies unless they remove substantial complexity.
- The `下载预览` button is still a placeholder; do not imply it is implemented
  unless the behavior is added and verified.
- The deployment bucket in `sync.sh` is currently inferred from the domain as
  `oss://perlerbead-i9527-xin`; verify bucket existence before deployment.

## Testing Guidance

- Follow test-first changes for behavior updates and bug fixes.
- For core behavior, test the relevant `src/core/*.test.ts` file first.
- For UI behavior, test through `src/App.test.tsx`.
- Before claiming completion, run:

```bash
npm test -- --run
npm run build
```

- For visual or browser-specific behavior, also verify through the local dev or
  preview page when practical.

## Current UX Decisions

- Uploading an image automatically generates the bead pattern.
- Bead width defaults to 60 cells.
- Dominant color is the default sampling mode.
- Full palette is the default palette mode.
- Color codes and grid lines are shown by default.
- PNG export includes the bead grid and color usage legend.
- Empty preview uses a stable 3x3 bead icon, not pseudo-element shadows, to
  avoid overlap with empty-state text.

## Git Notes

- Do not revert unrelated user changes.
- Do not commit generated artifacts such as `dist/` unless explicitly requested.
- Keep commits scoped to source, tests, config, static metadata, and dependency
  files needed for the requested change.
