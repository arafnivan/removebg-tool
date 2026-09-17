/**
 * Runs the background-removal model off the main thread.
 *
 * Inference takes several seconds of solid CPU time; on the main thread that
 * would freeze scrolling, the progress bar and the cancel button. The model
 * and the ONNX runtime are fetched once and stay loaded for the life of the
 * worker, so a second image skips straight to inference.
 *
 * The model's mask is cleaned up before it is applied (see refine-mask.js):
 * faint haze and stray background islands are removed, and background colour
 * is taken out of the subject's soft edges.
 *
 * Jobs run one at a time. A job that is cancelled while it waits is skipped;
 * one cancelled mid-inference (which can't be interrupted) finishes the model
 * step, skips the rest and reports nothing.
 *
 * Messages in:  { type: "init", device }            — pick the device; sent once, first
 *               { type: "preload" }                 — load the model now
 *               { type: "run", id, file, maxPixels }
 *               { type: "cancel", id }
 * Messages out: { type: "download", loaded, total } — model download progress (bytes)
 *               { type: "ready" }                   — model loaded
 *               { type: "load-error", message }     — model failed to load
 *               { id, type: "phase", phase: "process" }
 *               { id, type: "done", blob, width, height, originalWidth, originalHeight }
 *               { id, type: "error", message, stage: "load" | "run" }
 */

import { preload, segmentForeground } from "@imgly/background-removal";
import { decontaminateEdges, refineMask } from "./refine-mask.js";

// The most accurate model the library ships.
const MODEL = "isnet_fp16";
// Where the library downloads the model and ONNX Runtime binaries from
// (its default publicPath, for the installed library version).
const PUBLIC_PATH = `https://staticimgly.com/@imgly/background-removal-data/${__IMGLY_VERSION__}/dist/`;

let config = null;
let loading = null;
const cancelled = new Set();
let queue = Promise.resolve();

class CancelledJob extends Error {}

function canvas2d(width, height) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  // Browsers return null (Safari) or throw past their canvas size limit.
  if (!ctx) throw new Error("Canvas unavailable: the image is too large for this browser.");
  return { canvas, ctx };
}

function release(canvas) {
  canvas.width = canvas.height = 0;
}

/**
 * The library reports each file's progress separately (`fetch:<file>`, with
 * that file's size), one file after another. The sizes of all three files
 * are listed in the CDN's resources.json, so fetch it once and report one
 * overall figure that only ever grows.
 */
async function downloadTracker(device) {
  const suffix = device === "gpu" ? ".jsep" : "";
  const keys = [
    `/models/${MODEL}`,
    `/onnxruntime-web/ort-wasm-simd-threaded${suffix}.wasm`,
    `/onnxruntime-web/ort-wasm-simd-threaded${suffix}.mjs`,
  ];
  let expected = 0;
  try {
    const response = await fetch(new URL("resources.json", PUBLIC_PATH));
    const resources = await response.json();
    for (const key of keys) expected += resources[key]?.size ?? 0;
  } catch {
    // Fall back to the sizes the library reports as each file starts.
  }
  const files = new Map();
  let last = 0;
  return (key, current, size) => {
    if (!key.startsWith("fetch:")) return;
    files.set(key, { current, size });
    let loaded = 0;
    let known = 0;
    for (const file of files.values()) {
      loaded += file.current;
      known += file.size;
    }
    const total = Math.max(expected, known);
    last = Math.max(last, loaded);
    self.postMessage({ type: "download", loaded: Math.min(last, total), total });
  };
}

/** Load the model once. A failure is reported and the worker is replaced. */
function loadModel() {
  loading ??= (async () => {
    const progress = await downloadTracker(config.device);
    // The library memoises its session by JSON.stringify(config), which
    // skips functions, so adding the callback keeps the key unchanged.
    config.progress = progress;
    await preload(config);
    self.postMessage({ type: "ready" });
  })();
  return loading;
}

function check(id) {
  if (cancelled.has(id)) throw new CancelledJob();
}

/** Decode the image, scaling it down if it has more than `maxPixels`. */
async function decode(file, maxPixels) {
  // createImageBitmap reads the file's contents, so a missing or wrong MIME
  // type (common for files from some file managers) doesn't matter.
  const bitmap = await createImageBitmap(file);
  const originalWidth = bitmap.width;
  const originalHeight = bitmap.height;
  const scale = Math.min(1, Math.sqrt(maxPixels / (originalWidth * originalHeight)));
  const width = Math.max(1, Math.floor(originalWidth * scale));
  const height = Math.max(1, Math.floor(originalHeight * scale));
  try {
    const { canvas, ctx } = canvas2d(width, height);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, 0, 0, width, height);
    return { canvas, ctx, width, height, originalWidth, originalHeight };
  } finally {
    bitmap.close();
  }
}

async function removeBackground(id, file, maxPixels) {
  self.postMessage({ id, type: "phase", phase: "process" });

  const { canvas, ctx, width, height, originalWidth, originalHeight } = await decode(file, maxPixels);
  try {
    // Hand the decoded pixels to the library as raw RGBA, so it doesn't
    // decode the file a second time (or reject it for its MIME type).
    let input = new Blob([ctx.getImageData(0, 0, width, height).data], {
      type: `image/x-rgba8;width=${width};height=${height}`,
    });
    // Must be the very object preload() got, or the model is loaded again.
    let mask = await segmentForeground(input, config);
    input = null;
    check(id);

    let maskBytes = new Uint8Array(await mask.arrayBuffer());
    mask = null;
    if (maskBytes.length !== width * height * 4) throw new Error("Unexpected mask size from the model.");
    const alpha = new Uint8Array(width * height);
    for (let i = 0; i < alpha.length; i++) alpha[i] = maskBytes[i * 4 + 3];
    maskBytes = null;
    refineMask(alpha, width, height);
    check(id);

    const image = ctx.getImageData(0, 0, width, height);
    const pixels = image.data;
    decontaminateEdges(pixels, alpha, width, height);
    // Multiply rather than replace, so parts of a PNG that were already
    // transparent stay transparent.
    for (let i = 0; i < alpha.length; i++) {
      pixels[i * 4 + 3] = Math.round((pixels[i * 4 + 3] * alpha[i]) / 255);
    }
    ctx.putImageData(image, 0, 0);
    check(id);

    const blob = await canvas.convertToBlob({ type: "image/png" });
    return { blob, width, height, originalWidth, originalHeight };
  } finally {
    release(canvas);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data;
  switch (message.type) {
    case "init":
      // The same object is passed on every call; see loadModel().
      config ??= {
        model: MODEL,
        device: message.device,
        publicPath: PUBLIC_PATH,
        // Raw RGBA, so the mask isn't encoded to PNG and decoded again.
        output: { format: "image/x-rgba8" },
      };
      break;
    case "preload":
      loadModel().catch((error) => {
        self.postMessage({ type: "load-error", message: error instanceof Error ? error.message : String(error) });
      });
      break;
    case "cancel":
      cancelled.add(message.id);
      break;
    case "run": {
      const { id, file, maxPixels } = message;
      queue = queue.then(async () => {
        let stage = "load";
        try {
          check(id);
          await loadModel();
          check(id);
          stage = "run";
          const result = await removeBackground(id, file, maxPixels);
          self.postMessage({ id, type: "done", ...result });
        } catch (error) {
          if (error instanceof CancelledJob) return;
          self.postMessage({
            id,
            type: "error",
            stage,
            message: error instanceof Error ? error.message : String(error),
          });
        } finally {
          cancelled.delete(id);
        }
      });
      break;
    }
  }
});
