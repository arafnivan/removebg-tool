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
- **Progress:** a progress bar with a cancel button while the background is removed.
- **Preview:** before/after slider, side by side, or result only, on a transparency checkerboard.
- **Looks like ImageDoctor:** same header, tool layout, colours and footer as the main site, with light, dark and system themes.
- **Responsive:** works on phones, with the download button kept at the bottom of the screen.
- **Stays responsive:** the model runs in a Web Worker, so the page doesn't freeze.

## How it works

The image is segmented inside a Web Worker with ONNX Runtime Web, using one
of two models:

| Browser | Model | Download (once) |
| --- | --- | --- |
| WebGPU with `shader-f16` (current Chrome, Edge, and others) | [BiRefNet-lite](https://github.com/ZhengPeng7/BiRefNet) (MIT), fp16, from [Hugging Face](https://huggingface.co/onnx-community/BiRefNet_lite-ONNX) | ~115 MB |
| No WebGPU, or WebGPU fails | IS-Net via [`@imgly/background-removal`](https://github.com/imgly/background-removal-js), from IMG.LY's CDN (`staticimgly.com`) | ~88 MB + runtime |

BiRefNet is clearly more accurate (hair, thin parts, no stray background
objects), but it only fits in memory on the GPU, so the CPU keeps IS-Net.

1. The model is downloaded once and kept in the browser's Cache Storage.
   Before BiRefNet is loaded, `src/lib/onnx-webgpu.js` rewrites a few graph
   nodes (no change in output) so they run on ONNX Runtime's WebGPU backend.
2. The browser downscales the image to 1024 × 1024 with high-quality
   filtering, the model predicts a mask, and the browser scales the mask back
   to the original size.
3. The mask is cleaned up (`src/lib/refine-mask.js`): faint haze becomes
   transparent, near-opaque pixels become opaque, and background colour is
   taken out of soft edges such as hair and fur (Blur-Fusion foreground
   estimation).
4. The resulting cut-out is shown on a checkerboard and can be saved as PNG.

Only the model and runtime files are fetched from the network. The image
itself never leaves the browser.

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

`vercel.json` sets long-lived caching for the hashed files in `dist/assets/`,
and the `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy`
headers that let ONNX Runtime use several CPU threads. Set the same headers
on other hosts (the dev and preview servers already do).

### Other hosts

- **Cloudflare Pages / Netlify:** build command `npm run build`, output
  directory `dist`.
- **nginx / Apache / S3:** upload the contents of `dist/`.

Asset URLs are relative, so the build also works from a sub-path.

Notes:

- Files in `dist/assets/` have content hashes in their names, so they can be
  cached for a long time. Keep `index.html` uncached so new releases are
  picked up.
- If you add a Content Security Policy, allow `https://staticimgly.com`,
  `https://huggingface.co` and `https://*.hf.co` in `connect-src`, and allow
  `blob:` and `'wasm-unsafe-eval'` for scripts.

## Project structure

```
index.html                     HTML shell, meta tags, theme before first paint
src/
  main.jsx                     React entry point
  App.jsx                      Page layout and state wiring
  config.js                    Source-code and main-site links
  styles.css                   Tailwind CSS v4 + ImageDoctor design tokens
  data/tools.js                Main-site tools for menus, footer, related tools
  components/
    SiteHeader.jsx             ImageDoctor header, tool menus, mobile menu
    ThemeToggle.jsx            Light / dark / system
    ToolHeader.jsx             Breadcrumb, icon, title, privacy badge
    Dropzone.jsx               Drag & drop, file picker, paste, current image
    Comparison.jsx             Slider, side by side, original, result, zoom
    StatusBar.jsx              Progress, cancel, errors
    Panel.jsx                  Settings cards and segmented controls
    ToolInfo.jsx               How it works, FAQ, related tools
    SiteFooter.jsx             ImageDoctor footer, licence and source link
    ToolIcon.jsx               Tool icons on tinted tiles
  hooks/
    useBackgroundRemoval.js    Image, job and result state
  lib/
    remover.js                 Worker client, progress, errors
    remover.worker.js          Picks a model, runs it, applies the mask
    onnx-webgpu.js             Makes the BiRefNet graph WebGPU-friendly
    refine-mask.js             Mask clean-up and edge colour correction
    format.js                  File size, file names, downloads
    theme.js                   Theme storage
    cn.js                      Class name helper
scripts/
  third-party-licenses.js      Collects dependency licences at build time
vercel.json                    Build settings and headers for Vercel
```

The page uses [Tailwind CSS v4](https://tailwindcss.com), the
[Geist](https://vercel.com/font) font (self-hosted via Fontsource) and
[Lucide](https://lucide.dev) icons. Links in the header, menus and footer point
to the main ImageDoctor site (`VITE_MAIN_SITE_URL`).

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
  they are using. The page links to it in the footer. Set `VITE_SOURCE_URL` to
  your own public repository.
- **Deploy what you publish.** The live site must run code that is in the
  linked repository. Deploying from the GitHub repository (as Vercel does)
  keeps the two in step; if you deploy from your machine, push first.
- **Publish your changes.** If you run a modified version publicly, your
  modified source must be available under the AGPL-3.0 as well.
- **Keep the legal notices.** Section 5(d) requires the page to show the
  copyright, that there is no warranty, and where to find the licence. The
  footer does this; change `COPYRIGHT` in `src/config.js` for your fork.
- **Keep the licence files.** Keep `LICENSE`, `THIRD_PARTY_NOTICES.md` and the
  copyright notices. The build publishes `LICENSE.txt`,
  `THIRD_PARTY_NOTICES.txt` and `third-party-licenses.txt` (the full licence
  text of every bundled package) next to the page.

Linking to this tool from another website does not put that website under
the AGPL; the two are separate programs.

This summary is not legal advice. If you need certainty for your situation,
read the licence or ask a lawyer. IMG.LY also offers
[commercial licences](https://img.ly/background-removal) for
`@imgly/background-removal`.

### Trademarks

The AGPL covers the code, not the "ImageDoctor" name or logo. The logo and
favicon are loaded from the main ImageDoctor site and are not part of this
repository. If you publish a fork, please use your own name and logo
(`LOGO_URL` in `src/config.js` and the icon links in `index.html`).

## Contributing

Issues and pull requests are welcome at
<https://github.com/arafnivan/removebg-tool>. By contributing, you agree that your
contributions are licensed under the AGPL-3.0.
