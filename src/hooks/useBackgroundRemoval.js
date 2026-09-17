import { useCallback, useEffect, useRef, useState } from "react";
import {
  CancelledError,
  REFUSE_PIXELS,
  cancelRemoval,
  disposeRemover,
  removeImageBackground,
} from "../lib/remover";
import { imageSize } from "../lib/format";

const UNREADABLE = "This image couldn't be opened. Try a JPG, PNG or WebP file.";

/**
 * Owns the current image, the removal job and its result, including the
 * object URLs, which are revoked as soon as they are replaced.
 *
 * status: { kind: "idle" }
 *       | { kind: "running", stage: null | { phase: "download", loaded, total } | { phase: "process" } }
 *       | { kind: "error", message }   — the current image's job failed (Retry reruns it)
 *
 * notice: a problem with a file that was *not* loaded (unsupported,
 * unreadable, too large). It never affects the current image or its job.
 */
export function useBackgroundRemoval() {
  const [source, setSource] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ kind: "idle" });
  const [notice, setNotice] = useState(null);
  // runId: the job whose updates may be shown. loadId: the newest file being
  // opened, so a slow-to-decode earlier file can't replace a later one.
  const runId = useRef(0);
  const loadId = useRef(0);
  const urls = useRef({ source: null, result: null });

  const replaceUrl = (slot, url) => {
    if (urls.current[slot]) URL.revokeObjectURL(urls.current[slot]);
    urls.current[slot] = url;
  };

  const run = useCallback(async (image) => {
    const id = ++runId.current;
    setStatus({ kind: "running", stage: null });
    try {
      const output = await removeImageBackground(image.file, (stage) => {
        if (runId.current === id) setStatus({ kind: "running", stage });
      });
      if (runId.current !== id) return;
      const url = URL.createObjectURL(output.blob);
      replaceUrl("result", url);
      setResult({
        sourceId: image.id,
        blob: output.blob,
        url,
        width: output.width,
        height: output.height,
        downscaled: output.width !== output.originalWidth || output.height !== output.originalHeight,
      });
      setStatus({ kind: "idle" });
    } catch (error) {
      if (runId.current !== id || error instanceof CancelledError) return;
      setStatus({ kind: "error", message: error.message });
    }
  }, []);

  /** Load a new image and start removing its background right away. */
  const start = useCallback(
    async (file) => {
      const id = ++loadId.current;
      let size;
      try {
        size = await imageSize(file);
      } catch {
        if (loadId.current === id) setNotice(UNREADABLE);
        return;
      }
      if (loadId.current !== id) return;
      if (size.width * size.height > REFUSE_PIXELS) {
        const megapixels = Math.round((size.width * size.height) / 1e6);
        setNotice(
          `"${file.name}" is too large (${megapixels} megapixels). Choose an image under ${REFUSE_PIXELS / 1e6} megapixels.`,
        );
        return;
      }
      setNotice(null);
      const url = URL.createObjectURL(file);
      replaceUrl("source", url);
      replaceUrl("result", null);
      const image = { id: `${Date.now()}-${id}-${file.name}`, file, name: file.name, url, ...size };
      setSource(image);
      setResult(null);
      void run(image);
    },
    [run],
  );

  const cancel = useCallback(() => {
    runId.current += 1;
    cancelRemoval();
    setStatus({ kind: "idle" });
  }, []);

  const reset = useCallback(() => {
    runId.current += 1;
    loadId.current += 1;
    cancelRemoval();
    replaceUrl("source", null);
    replaceUrl("result", null);
    setSource(null);
    setResult(null);
    setStatus({ kind: "idle" });
  }, []);

  // Leaving the page stops the job, frees the worker and the images.
  useEffect(
    () => () => {
      runId.current += 1;
      loadId.current += 1;
      disposeRemover();
      replaceUrl("source", null);
      replaceUrl("result", null);
    },
    [],
  );

  return {
    source,
    // Never show a result that belongs to a previous image.
    result: result && source && result.sourceId === source.id ? result : null,
    status,
    notice,
    setNotice,
    start,
    rerun: () => source && run(source),
    cancel,
    reset,
  };
}
