import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { collectThirdPartyLicenses } from "./scripts/third-party-licenses.js";

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

export default defineConfig({
  plugins: [react(), tailwindcss(), licenseFiles()],
  // Relative asset URLs, so the build works from any subdomain or sub-path.
  base: "./",
  worker: {
    // The model loader uses dynamic imports, which classic workers can't do.
    format: "es",
  },
  optimizeDeps: {
    // Pre-bundling breaks ONNX Runtime's own dynamic imports in dev.
    exclude: ["@imgly/background-removal", "onnxruntime-web"],
  },
  build: {
    target: "es2022",
  },
});
