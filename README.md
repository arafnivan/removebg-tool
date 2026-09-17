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
- **Formats:** JPG, PNG and WebP in; transparent PNG (default) or WebP out, or JPG/PNG/WebP on a white or custom background colour. Output keeps the original resolution up to about 36 MP (16 MP on iPhone/iPad and low-memory devices); larger images are scaled down.
- **Upload:** drag and drop, file picker, or paste with Ctrl/⌘ + V.
- **Progress:** the one-time model download shows real progress; a cancel button is always available.
- **Preview:** before/after slider, side by side, or result only, on a transparency checkerboard.
- **Looks like ImageDoctor:** same header, tool layout, colours and footer as the main site, with light, dark and system themes.
- **Responsive:** works on phones, with the download button kept at the bottom of the screen.
- **Stays responsive:** the model runs in a Web Worker, so the page doesn't freeze.

## How it works

The page uses [`@imgly/background-removal`](https://github.com/imgly/background-removal-js),
which runs an IS-Net segmentation model with ONNX Runtime Web.

1. On the first use, the model and the ONNX Runtime binaries are downloaded
   from IMG.LY's CDN (`staticimgly.com`). The browser caches them.
2. The image is decoded and segmented inside a Web Worker on your device.
3. The mask is cleaned up (`src/lib/refine-mask.js`): faint background haze
   and small stray patches are removed, the subject is made solid, and
   background colour is taken out of soft edges such as hair and fur.
4. The resulting cut-out is shown on a checkerboard and can be saved as PNG,
   WebP or JPG.

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
| `VITE_SITE_URL` | `https://removebg-imgdoctor.vercel.app` | Public URL of this deployment, for the canonical link, Open Graph image and structured data. |

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
4. Optional: set `VITE_SOURCE_URL`, `VITE_MAIN_SITE_URL` and `VITE_SITE_URL` under
   **Settings → Environment Variables**, then redeploy.

`vercel.json` sets long-lived caching for the hashed files in `dist/assets/`,
and these headers on every response:

- `Cross-Origin-Opener-Policy: same-origin` and
  `Cross-Origin-Embedder-Policy: credentialless`, which make the page
  cross-origin isolated so ONNX Runtime can run on several threads. (Safari
  doesn't support `credentialless` yet and runs single-threaded.)
- A Content-Security-Policy, plus `X-Content-Type-Options`,
  `Referrer-Policy` and `Permissions-Policy`. The worker script
  (`assets/remover.worker-*.js`) gets its own policy that also allows
  `'unsafe-eval'`, which the `ndarray` package inside
  `@imgly/background-removal` needs (it compiles code with `new Function`).

### Other hosts

- **Cloudflare Pages / Netlify:** build command `npm run build`, output
  directory `dist`.
- **nginx / Apache / S3:** upload the contents of `dist/`.

Asset URLs are relative, so the build also works from a sub-path.

Notes:

- Files in `dist/assets/` have content hashes in their names, so they can be
  cached for a long time. Keep `index.html` uncached so new releases are
  picked up.
- Copy the headers from `vercel.json`. Without the cross-origin isolation
  headers the model still works, only slower. With a Content Security
  Policy, allow `https://staticimgly.com` in `connect-src`, `blob:` and
  `'wasm-unsafe-eval'` for scripts and workers, and `'unsafe-eval'` for the
  worker script.

## Project structure

```
index.html                     HTML shell and meta tags (structured data is added at build time)
public/theme-init.js           Applies the saved theme before first paint
public/brand/                  ImageDoctor logo and icons (not AGPL, see Trademarks)
src/
  main.jsx                     React entry point
  App.jsx                      Page layout and state wiring
  config.js                    Source-code and main-site links
  styles.css                   Tailwind CSS v4 + ImageDoctor design tokens
  data/tools.js                Main-site tools for menus, footer, related tools
  data/content.js              "How it works" and FAQ copy (also used for JSON-LD)
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
    useExport.js               PNG / WebP / JPG export with background colour
  lib/
    remover.js                 Worker client, progress, errors
    remover.worker.js          Runs @imgly/background-removal
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
icons in `public/brand/` are copies of the main site's artwork and are not
covered by the AGPL. If you publish a fork, please replace them with your own
name and artwork (`public/brand/`, `LOGO_*` in `src/config.js`).

## Contributing

Issues and pull requests are welcome at
<https://github.com/arafnivan/removebg-tool>. By contributing, you agree that your
contributions are licensed under the AGPL-3.0.
