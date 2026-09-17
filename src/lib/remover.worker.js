/**
 * Runs the background-removal model off the main thread.
 *
 * Inference takes seconds of solid compute; on the main thread that would
 * freeze scrolling, the progress bar and the cancel button. The model and the
 * ONNX runtime are loaded once and stay loaded for the life of the worker, so
 * a second image skips straight to inference.
 *
 * Two engines, picked once per worker:
 *  - BiRefNet-lite (MIT, fp16) on WebGPU. Much more accurate than IS-Net:
 *    cleaner hair, no stray background objects, thin parts kept. It needs
 *    WebGPU — on the CPU (WASM) backend it runs out of the 4 GB wasm memory.
 *  - IS-Net via @imgly/background-removal on the CPU, as a fallback when
 *    WebGPU is missing or fails.
 *
 * Both get a high-quality 1024×1024 downscale made by the browser (the
 * library's own resize point-samples large photos), and the mask is scaled
 * back up by the browser too. See refine-mask.js for the post-processing.
 *
 * Messages in:  { id, file }
 * Messages out: { id, type: "progress", key, current, total }
 *               { id, type: "done", blob }
 *               { id, type: "error", message }
 */

import { prepareForWebGpu } from "./onnx-webgpu.js";
import { cleanMask, estimateForeground } from "./refine-mask.js";

const SIZE = 1024;

const BIREFNET = {
  url: "https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/de15b22ba131738a16dff04aab8bdf8dc32e3ac1/onnx/model_fp16.onnx",
  size: 114538221,
  mean: [0.485, 0.456, 0.406],
  std: [0.229, 0.224, 0.225],
};

const MODEL_CACHE = "removebg-models-v1";

/**
 * WebGPU's default limit is 8 storage buffers per shader, and ONNX Runtime
 * binds one per tensor input and output of a node. See onnx-webgpu.js.
 */
const MAX_NODE_BUFFERS = 8;

/** The job currently being processed; progress is reported against it. */
let currentId = null;
const report = (key, current, total) => {
  if (currentId) self.postMessage({ id: currentId, type: "progress", key, current, total });
};

/** Download a model with progress, keeping it in Cache Storage for next time. */
async function fetchModel(url, key, expectedSize) {
  let cache = null;
  try {
    cache = await caches.open(MODEL_CACHE);
    const hit = await cache.match(url);
    if (hit) return new Uint8Array(await hit.arrayBuffer());
  } catch {
    // Cache Storage can be unavailable (private mode, blocked storage).
  }
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`Model fetch failed (${response.status})`);
  const total = Number(response.headers.get("content-length")) || expectedSize;
  const reader = response.body.getReader();
  const chunks = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    report(`fetch:${key}`, Math.min(loaded, total), total);
  }
  const blob = new Blob(chunks);
  // Quota errors only cost a re-download next time.
  cache?.put(url, new Response(blob)).catch(() => {});
  return new Uint8Array(await blob.arrayBuffer());
}

async function hasWebGpuF16() {
  try {
    const adapter = await navigator.gpu?.requestAdapter();
    return Boolean(adapter?.features.has("shader-f16"));
  } catch {
    return false;
  }
}

async function createBiRefNet() {
  // The runtime's .wasm file is emitted by Vite next to the bundle.
  const ort = await import("onnxruntime-web-webgpu/webgpu");
  ort.env.wasm.numThreads = 1;
  ort.env.logLevel = "error";
  const model = prepareForWebGpu(await fetchModel(BIREFNET.url, "birefnet", BIREFNET.size), MAX_NODE_BUFFERS);
  report("compute:init", 0, 1);
  const session = await ort.InferenceSession.create(model, {
    executionProviders: ["webgpu"],
    graphOptimizationLevel: "all",
    logSeverityLevel: 3,
  });
  const [inputName] = session.inputNames;
  const [outputName] = session.outputNames;

  return async (rgba) => {
    const n = SIZE * SIZE;
    const input = new Float32Array(3 * n);
    for (let c = 0; c < 3; c++) {
      const mean = BIREFNET.mean[c];
      const std = BIREFNET.std[c];
      for (let i = 0; i < n; i++) input[c * n + i] = (rgba[i * 4 + c] / 255 - mean) / std;
    }
    const tensor = new ort.Tensor("float32", input, [1, 3, SIZE, SIZE]);
    const outputs = await session.run({ [inputName]: tensor });
    const logits = outputs[outputName].data;
    const mask = new Uint8Array(n);
    for (let i = 0; i < n; i++) mask[i] = Math.round(255 / (1 + Math.exp(-logits[i])));
    tensor.dispose?.();
    outputs[outputName].dispose?.();
    return mask;
  };
}

async function createIsNet() {
  const { segmentForeground } = await import("@imgly/background-removal");
  const config = {
    model: "isnet_fp16",
    device: "cpu",
    output: { format: "image/x-rgba8" },
    progress: report,
  };
  return async (rgba) => {
    // Already 1024×1024, so the library's own resize is a no-op.
    const blob = new Blob([rgba], { type: `image/x-rgba8;width=${SIZE};height=${SIZE}` });
    const out = new Uint8Array(await (await segmentForeground(blob, config)).arrayBuffer());
    const mask = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < mask.length; i++) mask[i] = out[i * 4 + 3];
    return mask;
  };
}

/** Resolves to { name, run, floor } — `floor` is the haze cut for cleanMask. */
let enginePromise = null;
function getEngine() {
  enginePromise ??= (async () => {
    if (await hasWebGpuF16()) {
      try {
        return { name: "birefnet", run: await createBiRefNet(), floor: 10 };
      } catch (error) {
        console.warn("WebGPU model failed to load, using the CPU model instead.", error);
      }
    }
    return { name: "isnet", run: await createIsNet(), floor: 20 };
  })();
  enginePromise.catch(() => {
    enginePromise = null;
  });
  return enginePromise;
}

function pixelsOf(source, width, height, quality) {
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.imageSmoothingQuality = quality;
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

/** Scale a SIZE×SIZE mask up (or down) to width×height with browser smoothing. */
function resizeMask(mask, width, height) {
  const small = new ImageData(SIZE, SIZE);
  for (let i = 0; i < mask.length; i++) {
    const j = i * 4;
    small.data[j] = small.data[j + 1] = small.data[j + 2] = mask[i];
    small.data[j + 3] = 255;
  }
  const smallCanvas = new OffscreenCanvas(SIZE, SIZE);
  smallCanvas.getContext("2d").putImageData(small, 0, 0);
  const big = pixelsOf(smallCanvas, width, height, "high").data;
  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = big[i * 4];
  return alpha;
}

async function runModel(rgba) {
  const engine = await getEngine();
  report("compute:inference", 0, 1);
  try {
    return { mask: await engine.run(rgba), floor: engine.floor };
  } catch (error) {
    if (engine.name !== "birefnet") throw error;
    // e.g. the GPU ran out of memory or the device was lost.
    console.warn("WebGPU inference failed, using the CPU model instead.", error);
    enginePromise = createIsNet().then((run) => ({ name: "isnet", run, floor: 20 }));
    return runModel(rgba);
  }
}

async function removeBackground(file) {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  try {
    const input = pixelsOf(bitmap, SIZE, SIZE, "high").data;
    const { mask, floor } = await runModel(input);
    report("compute:mask", 0, 1);

    const alpha = resizeMask(mask, width, height);
    cleanMask(alpha, { floor });

    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    const image = ctx.getImageData(0, 0, width, height);
    const pixels = image.data;
    estimateForeground(pixels, alpha, width, height);
    // Multiply rather than replace, so parts of a PNG that were already
    // transparent stay transparent.
    for (let i = 0; i < alpha.length; i++) {
      pixels[i * 4 + 3] = Math.round((pixels[i * 4 + 3] * alpha[i]) / 255);
    }
    ctx.putImageData(image, 0, 0);

    report("compute:encode", 0, 1);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    canvas.width = canvas.height = 0;
    return blob;
  } finally {
    bitmap.close();
  }
}

self.addEventListener("message", async (event) => {
  const { id, file } = event.data;
  currentId = id;
  try {
    self.postMessage({ id, type: "done", blob: await removeBackground(file) });
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  } finally {
    currentId = null;
  }
});
