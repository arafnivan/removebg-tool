# ImageDoctor Background Remover

A free AI background remover that runs entirely in your browser. Drop in a
JPG, PNG or WebP image and download a transparent PNG. The image is never
uploaded anywhere.

**Live:** <https://removebg-imgdoctor.vercel.app/>

Part of [ImageDoctor](https://imgdoctor.vercel.app), a set of free image tools that
run in the browser.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL_v3-blue.svg)](./LICENSE)

## Features

- **Private:** processing happens on your device. There is no backend and no upload.
- **Free:** no account, no watermark, no usage limit, no paid API.
- **Formats:** JPG, PNG and WebP in; transparent PNG out at the original resolution.
- **Upload:** drag and drop, file picker, or paste with Ctrl/⌘ + V.
- **Progress:** shows model download progress, then processing, with a cancel button.
- **Preview:** before/after slider, side by side, or result only, on a transparency checkerboard.
- **Models:** "Precise" (about 80 MB) or "Fast" (about 40 MB). Either downloads once and is then cached.
- **Responsive:** works in light and dark mode and on phones.
- **Stays responsive:** the model runs in a Web Worker, so the page doesn't freeze.

## How it works

The page uses [`@imgly/background-removal`](https://github.com/imgly/background-removal-js),
which runs an IS-Net segmentation model with ONNX Runtime Web.

1. On the first use, the model and the ONNX Runtime binaries are downloaded
   from IMG.LY's CDN (`staticimgly.com`). The browser caches them.
2. The image is decoded and segmented inside a Web Worker on your device.
3. The resulting cut-out is shown on a checkerboard and can be saved as PNG.

Only the model files are fetched from the network. The image itself never
leaves the browser.

## Getting started

Requires Node.js 20.19 or newer.

```bash
git clone https://github.com/arafnivan/removebg-tool.git
cd removebg-tool
npm install
npm run dev       # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the production build locally |

## Configuration

Copy `.env.example` to `.env.local` and set:

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_SOURCE_URL` | `https://github.com/arafnivan/removebg-tool` | "Source code" link on the page. **Must point to the repository you deploy from** (see [License](#license)). |
| `VITE_MAIN_SITE_URL` | `https://imgdoctor.vercel.app` | Link back to the main ImageDoctor site. |

These values are built into the page, so rebuild after changing them.

## Deployment

`npm run build` produces a static site in `dist/`. No server code is needed.

### Vercel (used for the live site)

1. Push this repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
   Vercel detects Vite: build command `npm run build`, output directory `dist`.
3. Name the project `removebg-imgdoctor` to get
   `https://removebg-imgdoctor.vercel.app`, or add your own domain under
   **Settings → Domains**.
4. Optional: set `VITE_SOURCE_URL` and `VITE_MAIN_SITE_URL` under
   **Settings → Environment Variables**, then redeploy.

`vercel.json` sets long-lived caching for the hashed files in `dist/assets/`.

### Other hosts

- **Cloudflare Pages / Netlify:** build command `npm run build`, output
  directory `dist`.
- **nginx / Apache / S3:** upload the contents of `dist/`.

Asset URLs are relative, so the build also works from a sub-path.

Notes:

- `dist/assets/` contains a ~24 MB `.wasm` file from ONNX Runtime. That is
  under Cloudflare Pages' 25 MiB per-file limit. Visitors don't download it;
  the library loads its runtime from IMG.LY's CDN.
- Files in `dist/assets/` have content hashes in their names, so they can be
  cached for a long time. Keep `index.html` uncached so new releases are
  picked up.
- If you add a Content Security Policy, allow `https://staticimgly.com` in
  `connect-src`, and allow `blob:` and `'wasm-unsafe-eval'` for scripts.

## Project structure

```
index.html                     HTML shell and meta tags
src/
  main.jsx                     React entry point
  App.jsx                      Page layout and state wiring
  config.js                    Source-code and main-site links
  styles.css                   All styles (light and dark)
  components/
    SiteHeader.jsx             Brand and "Source code" link
    SiteFooter.jsx             Licence, source and credits
    Dropzone.jsx               Drag & drop, file picker, paste
    Comparison.jsx             Before/after slider, side by side, result
    StatusBar.jsx              Progress, cancel, errors
    Icons.jsx                  Inline SVG icons
  hooks/
    useBackgroundRemoval.js    Image, job and result state
  lib/
    remover.js                 Worker client, progress, errors
    remover.worker.js          Runs @imgly/background-removal
    format.js                  File size, file names, downloads
public/favicon.svg
vercel.json                    Cache headers for Vercel
```

## License

Copyright (C) 2026 arafnivan

This program is free software: you can redistribute it and/or modify it under
the terms of the GNU Affero General Public License as published by the Free
Software Foundation, version 3 only.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE. See the [GNU Affero General Public License](./LICENSE)
for more details.

### Why AGPL-3.0

This project depends on `@imgly/background-removal`, which is licensed under
the AGPL-3.0. A work that includes it has to be distributed under the same
licence, so this project is AGPL-3.0 too. Third-party components and their
licences are listed in [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md).

### If you deploy or modify this project

- **Keep the source link.** Section 13 of the AGPL requires that users who
  interact with the site over a network can get the source code of the version
  they are using. The page links to it in the header and footer. Set
  `VITE_SOURCE_URL` to your own public repository.
- **Publish your changes.** If you run a modified version publicly, your
  modified source must be available under the AGPL-3.0 as well.
- **Keep the notices.** Keep `LICENSE`, `THIRD_PARTY_NOTICES.md` and the
  copyright notices.

Linking to this tool from another website does not put that website under
the AGPL; the two are separate programs.

This summary is not legal advice. If you need certainty for your situation,
read the licence or ask a lawyer. IMG.LY also offers
[commercial licences](https://img.ly/background-removal) for
`@imgly/background-removal`.

### Trademarks

The AGPL covers the code, not the "ImageDoctor" name. If you publish a fork,
please use your own name.

## Contributing

Issues and pull requests are welcome at
<https://github.com/arafnivan/removebg-tool>. By contributing, you agree that your
contributions are licensed under the AGPL-3.0.
