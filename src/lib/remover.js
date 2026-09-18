/**
 * Client for the background-removal worker (@imgly/background-removal).
 *
 * The image never leaves the device: the model weights and the ONNX runtime
 * are downloaded from IMG.LY's CDN (once — the browser caches them), and
 * inference runs in a worker on this machine.
 *
 * The worker is kept warm once the model is loaded. Replacing or cancelling
 * an image while the model runs doesn't discard it: inference can't be
 * interrupted, but letting it finish (its result is dropped) costs less than
 * reading the model back from the HTTP cache, recompiling the WebAssembly and
 * rebuilding the session — and it works offline. The worker is only thrown
 * away when Cancel is pressed during the download (to stop it), after an
 * error (the library caches failed loads, so a retry needs a fresh worker),
 * and when the page goes away.
 */

const INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const INPUT_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export const ACCEPT = INPUT_TYPES.join(",");

export function isSupported(file) {
  return INPUT_TYPES.includes(file.type) || (!file.type && INPUT_EXTENSIONS.test(file.name));
}

/**
 * Largest image processed at full size, in pixels. iOS limits a canvas to
 * 16,777,216 pixels; devices with little memory get the same cap. Larger
 * images are scaled down to fit (the result says so).
 */
export function maxPixels() {
  const ios =
    /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (ios || (navigator.deviceMemory && navigator.deviceMemory <= 4)) return 16_000_000;
  return 36_000_000;
}

/** Images above this are refused outright: just decoding them risks a crash. */
export const REFUSE_PIXELS = 100_000_000;

export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

const isNetworkError = (message) => /fetch|network|resource metadata|not found/i.test(message);

function friendlyError(message) {
  const lower = message.toLowerCase();
  if (isNetworkError(lower)) {
    return new Error("Couldn't initiate the AI model. Check your internet connection and try again.");
  }
  if (lower.includes("memory") || lower.includes("allocation") || lower.includes("bad_alloc")) {
    return new Error("Your browser ran out of memory. Try a smaller image, or close other tabs.");
  }
  if (lower.includes("canvas")) {
    return new Error("This image is too large for your browser to process. Try a smaller image.");
  }
  if (lower.includes("decode") || lower.includes("unsupported") || lower.includes("invalid format")) {
    return new Error("This image couldn't be opened. Try a JPG, PNG or WebP file.");
  }
  return new Error("Something went wrong while removing the background. Please try again.");
}

const saveData = () => Boolean(navigator.connection?.saveData);

// WebGPU is used only if it failed nowhere yet in this tab. The model is
// half-precision, so the GPU must support 16-bit floats in shaders.
let gpuFailed = false;

async function pickDevice() {
  if (gpuFailed || !navigator.gpu) return "cpu";
  try {
    const adapter = await navigator.gpu.requestAdapter();
    return adapter?.features.has("shader-f16") ? "gpu" : "cpu";
  } catch {
    return "cpu";
  }
}

/** { worker, device, ready, download, preloaded } */
let current = null;
let pending = null;
let activeJob = null;
let jobCounter = 0;

function discard(record) {
  record.worker.terminate();
  if (current === record) current = null;
}

function getWorker() {
  if (current) return Promise.resolve(current);
  pending ??= pickDevice().then((device) => {
    const worker = new Worker(new URL("./remover.worker.js", import.meta.url), { type: "module" });
    const record = { worker, device, ready: false, download: null, preloaded: false };
    worker.addEventListener("message", (event) => onMessage(record, event.data));
    worker.addEventListener("error", (event) => {
      event.preventDefault();
      onFailure(record, event.message ?? "");
    });
    worker.postMessage({ type: "init", device });
    current = record;
    pending = null;
    return record;
  });
  return pending;
}

/** The worker failed: replace it, and retry the running job on the CPU if the GPU was to blame. */
function onFailure(record, message) {
  if (current !== record) return;
  discard(record);
  const gpuProblem = record.device === "gpu" && !isNetworkError(message);
  if (gpuProblem) gpuFailed = true;
  const job = activeJob;
  if (!job || job.record !== record) return;
  if (gpuProblem && !job.retried) {
    job.retried = true;
    void startJob(job);
    return;
  }
  activeJob = null;
  job.reject(friendlyError(message));
}

function onMessage(record, message) {
  const job = activeJob?.record === record ? activeJob : null;
  switch (message.type) {
    case "download":
      record.download = { loaded: message.loaded, total: message.total };
      if (job && !record.ready) job.onStage({ phase: "download", ...record.download });
      return;
    case "ready":
      record.ready = true;
      return;
    case "load-error":
      // A preload failed; a running job gets its own error message.
      if (!job) onFailure(record, message.message);
      return;
    case "phase":
      if (job?.id === message.id) job.onStage({ phase: message.phase });
      return;
    case "done":
      if (job?.id !== message.id) return;
      activeJob = null;
      job.resolve(message);
      return;
    case "error":
      if (job?.id === message.id) {
        onFailure(record, message.message);
      } else if (current === record && !activeJob) {
        // A dropped job failed; don't leave a possibly broken worker behind.
        discard(record);
      }
      return;
  }
}

async function startJob(job) {
  const record = await getWorker();
  if (activeJob !== job) return;
  job.record = record;
  if (record.download && !record.ready) job.onStage({ phase: "download", ...record.download });
  record.worker.postMessage({ type: "run", id: job.id, file: job.file, maxPixels: job.maxPixels });
}

/**
 * Start downloading the model before the user picks an image (e.g. when the
 * pointer reaches the drop zone). Skipped when the browser asks to save data.
 */
export function preloadModel() {
  if (saveData()) return;
  void getWorker().then((record) => {
    if (record.preloaded) return;
    record.preloaded = true;
    record.worker.postMessage({ type: "preload" });
  });
}

/**
 * Stop the running job. During the download the worker is discarded, which
 * stops it; once the model is loaded the worker is kept (see above).
 */
export function cancelRemoval() {
  const job = activeJob;
  if (!job) return;
  activeJob = null;
  const record = job.record;
  if (record && current === record) {
    if (record.ready) record.worker.postMessage({ type: "cancel", id: job.id });
    else discard(record);
  }
  job.reject(new CancelledError());
}

/** Stop everything and free the worker (the page is going away). */
export function disposeRemover() {
  cancelRemoval();
  if (current) discard(current);
}

/**
 * Resolves with { blob, width, height, originalWidth, originalHeight }: the
 * cut-out as a PNG, and its size (smaller than the original if it was scaled
 * down to fit in memory).
 *
 * `onStage` receives { phase: "download", loaded, total } while the model
 * downloads, then { phase: "process" } once this image is being worked on.
 */
export function removeImageBackground(file, onStage) {
  // One job at a time. A job replaced by a new image is dropped without
  // discarding the worker: a download in progress is still needed, and a
  // running inference is left to finish (see above).
  const previous = activeJob;
  if (previous) {
    activeJob = null;
    if (previous.record && current === previous.record) {
      previous.record.worker.postMessage({ type: "cancel", id: previous.id });
    }
    previous.reject(new CancelledError());
  }

  return new Promise((resolve, reject) => {
    const job = {
      id: `job-${++jobCounter}`,
      file,
      maxPixels: maxPixels(),
      onStage,
      resolve,
      reject,
      record: null,
      retried: false,
    };
    activeJob = job;
    void startJob(job);
  });
}
