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
 * Messages in:  { id, file }
 * Messages out: { id, type: "progress", key, current, total }
 *               { id, type: "done", blob }
 *               { id, type: "error", message }
 */

import { segmentForeground } from "@imgly/background-removal";
import { decontaminateEdges, refineMask } from "./refine-mask.js";

// The most accurate model the library ships.
const MODEL = "isnet_fp16";

async function removeBackground(id, file) {
  const [mask, bitmap] = await Promise.all([
    segmentForeground(file, {
      model: MODEL,
      device: "cpu",
      // Raw RGBA, so the mask isn't encoded to PNG and decoded again.
      output: { format: "image/x-rgba8" },
      progress: (key, current, total) => {
        self.postMessage({ id, type: "progress", key, current, total });
      },
    }),
    createImageBitmap(file),
  ]);

  const { width, height } = bitmap;
  const maskBytes = new Uint8Array(await mask.arrayBuffer());
  if (maskBytes.length !== width * height * 4) {
    bitmap.close();
    throw new Error("Unexpected mask size from the model.");
  }

  const alpha = new Uint8Array(width * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = maskBytes[i * 4 + 3];
  refineMask(alpha, width, height);

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;
  decontaminateEdges(pixels, alpha, width, height);
  // Multiply rather than replace, so parts of a PNG that were already
  // transparent stay transparent.
  for (let i = 0; i < alpha.length; i++) {
    pixels[i * 4 + 3] = Math.round((pixels[i * 4 + 3] * alpha[i]) / 255);
  }
  ctx.putImageData(image, 0, 0);

  const blob = await canvas.convertToBlob({ type: "image/png" });
  canvas.width = canvas.height = 0;
  return blob;
}

self.addEventListener("message", async (event) => {
  const { id, file } = event.data;
  try {
    self.postMessage({ id, type: "done", blob: await removeBackground(id, file) });
  } catch (error) {
    self.postMessage({ id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
});
