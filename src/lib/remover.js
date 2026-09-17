/**
 * Client for the background-removal worker (@imgly/background-removal).
 *
 * The image never leaves the device: the model weights and the ONNX runtime
 * are downloaded from IMG.LY's CDN (once — the browser caches them), and
 * inference runs in a worker on this machine.
 */

export const MODELS = {
  isnet_fp16: {
    label: "Precise",
    hint: "Cleaner edges around hair and fine detail. ~80 MB one-time download.",
  },
  isnet_quint8: {
    label: "Fast",
    hint: "Smaller model, quicker first run. ~40 MB one-time download.",
  },
};

export const DEFAULT_MODEL = "isnet_fp16";

const INPUT_TYPES = ["image/jpeg", "image/png", "image/webp"];
const INPUT_EXTENSIONS = /\.(jpe?g|png|webp)$/i;

export const ACCEPT = INPUT_TYPES.join(",");

export function isSupported(file) {
  return INPUT_TYPES.includes(file.type) || (!file.type && INPUT_EXTENSIONS.test(file.name));
}

export class CancelledError extends Error {
  constructor() {
    super("Cancelled");
    this.name = "CancelledError";
  }
}

/**
 * The library reports progress per resource (`fetch:<file>`) and per step
 * (`compute:<step>`). Fold the downloads into one percentage so the bar moves
 * steadily instead of restarting for each file.
 *
 * Stages passed to `onStage`:
 *   { phase: "download", percent }  — model files are downloading
 *   { phase: "process" }            — inference is running
 */
function createProgressTracker(onStage) {
  const downloads = new Map();
  return ({ key, current, total }) => {
    if (!key.startsWith("fetch:")) {
      onStage({ phase: "process" });
      return;
    }
    downloads.set(key, { current, total });
    let loaded = 0;
    let expected = 0;
    for (const entry of downloads.values()) {
      loaded += entry.current;
      expected += entry.total;
    }
    onStage({ phase: "download", percent: expected ? Math.round((loaded / expected) * 100) : 0 });
  };
}

function friendlyError(message) {
  const lower = message.toLowerCase();
  if (lower.includes("fetch") || lower.includes("network")) {
    return new Error(
      "The AI model couldn't be downloaded. Check your internet connection and try again — it's only needed the first time.",
    );
  }
  if (lower.includes("memory") || lower.includes("allocation") || lower.includes("bad_alloc")) {
    return new Error("Your browser ran out of memory. Try a smaller image, or close other tabs.");
  }
  if (lower.includes("decode") || lower.includes("unsupported") || lower.includes("invalid format")) {
    return new Error("This image couldn't be opened. Try a JPG, PNG or WebP file.");
  }
  return new Error("Something went wrong while removing the background. Please try again.");
}

let worker = null;
let activeJob = null;
let jobCounter = 0;

/**
 * Stop the running job. Inference can't be interrupted part-way, so the
 * worker is discarded; the next run starts a fresh one and gets the model
 * files back from the browser cache.
 */
export function cancelRemoval() {
  if (!activeJob) return;
  worker?.terminate();
  worker = null;
  const job = activeJob;
  activeJob = null;
  job.reject(new CancelledError());
}

/** Resolves with the cut-out as a PNG Blob. */
export function removeImageBackground(file, model, onStage) {
  // One job at a time — two concurrent inferences would each run at half speed.
  cancelRemoval();

  worker ??= new Worker(new URL("./remover.worker.js", import.meta.url), { type: "module" });
  const target = worker;
  const track = createProgressTracker(onStage);
  const id = `job-${++jobCounter}`;

  return new Promise((resolve, reject) => {
    const cleanup = () => {
      target.removeEventListener("message", onMessage);
      target.removeEventListener("error", onError);
      if (activeJob?.id === id) activeJob = null;
    };
    const onMessage = (event) => {
      const message = event.data;
      if (message.id !== id) return;
      if (message.type === "progress") {
        track(message);
        return;
      }
      cleanup();
      if (message.type === "done") resolve(message.blob);
      else reject(friendlyError(message.message));
    };
    const onError = (event) => {
      event.preventDefault();
      cleanup();
      target.terminate();
      if (worker === target) worker = null;
      reject(friendlyError(event.message ?? ""));
    };

    activeJob = {
      id,
      reject: (error) => {
        cleanup();
        reject(error);
      },
    };
    target.addEventListener("message", onMessage);
    target.addEventListener("error", onError);
    target.postMessage({ id, file, model });
  });
}
