/**
 * Runs the background-removal model off the main thread.
 *
 * Inference takes several seconds of solid CPU time; on the main thread that
 * would freeze scrolling, the progress bar and the cancel button. The model
 * and the ONNX runtime are fetched once and stay loaded for the life of the
 * worker, so a second image skips straight to inference.
 *
 * Messages in:  { id, file }
 * Messages out: { id, type: "progress", key, current, total }
 *               { id, type: "done", blob }
 *               { id, type: "error", message }
 */

import { removeBackground } from "@imgly/background-removal";

// The most accurate model the library ships.
const MODEL = "isnet_fp16";

self.addEventListener("message", async (event) => {
  const { id, file } = event.data;

  try {
    const blob = await removeBackground(file, {
      model: MODEL,
      device: "cpu",
      output: { format: "image/png" },
      progress: (key, current, total) => {
        self.postMessage({ id, type: "progress", key, current, total });
      },
    });
    self.postMessage({ id, type: "done", blob });
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
