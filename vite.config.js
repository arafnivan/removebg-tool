import { readFileSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { collectThirdPartyLicenses } from "./scripts/third-party-licenses.js";
import { FAQ, SEO } from "./src/data/content.js";

const IMGLY_VERSION = JSON.parse(
  readFileSync("node_modules/@imgly/background-removal/package.json", "utf8"),
).version;

const DEFAULT_SITE_URL = "https://removebg-imgdoctor.vercel.app";

/**
 * Same isolation as production (see vercel.json), so ONNX Runtime can use
 * threads in dev and preview too.
 */
const ISOLATION_HEADERS = {
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Embedder-Policy": "credentialless",
};

/**
 * Ship the licence texts with the site, so the deployed code always carries
 * its AGPL-3.0 licence and the notices of the libraries bundled into it.
 */
function licenseFiles() {
  const files = {
    "LICENSE.txt": () => readFileSync("LICENSE", "utf8"),
    "THIRD_PARTY_NOTICES.txt": () => readFileSync("THIRD_PARTY_NOTICES.md", "utf8"),
    "third-party-licenses.txt": () => collectThirdPartyLicenses(process.cwd()),
  };
  return {
    name: "license-files",
    // Serve them in dev too, so the footer links work there.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[req.url?.split("?")[0].replace(/^\//, "")];
        if (!file) return next();
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end(file());
      });
    },
    generateBundle() {
      for (const [fileName, read] of Object.entries(files)) {
        this.emitFile({ type: "asset", fileName, source: read() });
      }
    },
  };
}

/**
 * ONNX Runtime references its own WebAssembly binary and an .mjs copy of
 * itself with `new URL(..., import.meta.url)`, so Vite copies them into the
 * build (~24 MB). Neither is ever requested: @imgly/background-removal
 * always sets `wasmPaths` to the binaries it downloads from its CDN, and the
 * .mjs copy is only used when the page is opened from a file:// URL.
 */
const UNUSED_ORT_ASSET = /(^|\/)ort-wasm-[^/]*\.wasm$|(^|\/)ort\.[^/]*\.mjs$/;

function stripUnusedOrtAssets() {
  return {
    name: "strip-unused-ort-assets",
    enforce: "post",
    apply: "build",
    generateBundle(_options, bundle) {
      for (const [fileName, output] of Object.entries(bundle)) {
        if (output.type === "asset" && UNUSED_ORT_ASSET.test(fileName)) delete bundle[fileName];
      }
    },
  };
}

const escapeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c");

/**
 * Fills in the absolute URLs index.html needs (canonical, Open Graph) and
 * adds structured data built from the same FAQ the page renders.
 */
function seo(siteUrl) {
  const pageUrl = `${siteUrl}/`;
  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: SEO.name,
      description: SEO.description,
      url: pageUrl,
      image: `${siteUrl}/brand/icon-512.png`,
      applicationCategory: "MultimediaApplication",
      operatingSystem: "Any (runs in a modern web browser)",
      browserRequirements: "Requires JavaScript and WebAssembly.",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
  return {
    name: "seo",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        return {
          html: html.replaceAll("%SITE_URL%", siteUrl),
          // JSON-LD is data, not script, so the CSP doesn't need to allow it.
          tags: structuredData.map((data) => ({
            tag: "script",
            attrs: { type: "application/ld+json" },
            children: escapeJson(data),
            injectTo: "head",
          })),
        };
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const siteUrl = (env.VITE_SITE_URL || DEFAULT_SITE_URL).replace(/\/$/, "");

  return {
    plugins: [react(), tailwindcss(), licenseFiles(), seo(siteUrl), stripUnusedOrtAssets()],
    // Relative asset URLs, so the build works from any subdomain or sub-path.
    base: "./",
    define: {
      // The worker needs it for the model CDN's URL (see remover.worker.js).
      __IMGLY_VERSION__: JSON.stringify(IMGLY_VERSION),
    },
    worker: {
      // The model loader uses dynamic imports, which classic workers can't do.
      format: "es",
      plugins: () => [stripUnusedOrtAssets()],
    },
    optimizeDeps: {
      // Pre-bundling breaks ONNX Runtime's own dynamic imports in dev.
      exclude: ["@imgly/background-removal", "onnxruntime-web"],
    },
    server: { headers: ISOLATION_HEADERS },
    preview: { headers: ISOLATION_HEADERS },
    build: {
      target: "es2022",
    },
  };
});
