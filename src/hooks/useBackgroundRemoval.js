import { useCallback, useEffect, useRef, useState } from "react";
import { CancelledError, cancelRemoval, removeImageBackground } from "../lib/remover";
import { imageSize } from "../lib/format";

/**
 * Owns the current image, the removal job and its result, including the
 * object URLs, which are revoked as soon as they are replaced.
 *
 * status: { kind: "idle" }
 *       | { kind: "running", stage: null | { phase: "download", percent } | { phase: "process" } }
 *       | { kind: "error", message }
 */
export function useBackgroundRemoval() {
  const [source, setSource] = useState(null);
  const [result, setResult] = useState(null);
  const [status, setStatus] = useState({ kind: "idle" });
  const runId = useRef(0);
  const urls = useRef({ source: null, result: null });

  const replaceUrl = (slot, url) => {
    if (urls.current[slot]) URL.revokeObjectURL(urls.current[slot]);
    urls.current[slot] = url;
  };

  const run = useCallback(async (image) => {
    const id = ++runId.current;
    setStatus({ kind: "running", stage: null });
    try {
      const blob = await removeImageBackground(image.file, (stage) => {
        if (runId.current === id) setStatus({ kind: "running", stage });
      });
      if (runId.current !== id) return;
      const size = await imageSize(blob);
      const url = URL.createObjectURL(blob);
      replaceUrl("result", url);
      setResult({ sourceId: image.id, blob, url, ...size });
      setStatus({ kind: "idle" });
    } catch (error) {
      if (runId.current !== id || error instanceof CancelledError) return;
      setStatus({ kind: "error", message: error.message });
    }
  }, []);

  /** Load a new image and start removing its background right away. */
  const start = useCallback(
    async (file) => {
      let size;
      try {
        size = await imageSize(file);
      } catch {
        setStatus({ kind: "error", message: "This image couldn't be opened. Try a JPG, PNG or WebP file." });
        return;
      }
      const url = URL.createObjectURL(file);
      replaceUrl("source", url);
      replaceUrl("result", null);
      const image = { id: `${Date.now()}-${file.name}`, file, name: file.name, url, ...size };
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
    cancelRemoval();
    replaceUrl("source", null);
    replaceUrl("result", null);
    setSource(null);
    setResult(null);
    setStatus({ kind: "idle" });
  }, []);

  // Leaving the page stops the job and frees the images.
  useEffect(
    () => () => {
      runId.current += 1;
      cancelRemoval();
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
    start,
    rerun: () => source && run(source),
    cancel,
    reset,
  };
}
