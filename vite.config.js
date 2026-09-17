import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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
