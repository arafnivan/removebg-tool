import { useEffect, useState } from "react";

export const FORMATS = {
  png: { mime: "image/png", extension: "png", label: "PNG", transparency: true },
  webp: { mime: "image/webp", extension: "webp", label: "WebP", transparency: true },
  jpeg: { mime: "image/jpeg", extension: "jpg", label: "JPG", transparency: false },
};

const QUALITY = 0.92;

/** Safari (before 17) and some others can't encode WebP and silently fall back to PNG. */
export const canEncodeWebP = (() => {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    return canvas.toDataURL("image/webp").startsWith("data:image/webp");
  } catch {
    return false;
  }
})();

async function encode(result, format, background) {
  const { mime } = FORMATS[format];
  // The cut-out already is a transparent PNG.
  if (format === "png" && background === "transparent") return result.blob;

  const bitmap = await createImageBitmap(result.blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");
    if (background !== "transparent") {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(bitmap, 0, 0);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, QUALITY));
    if (!blob || blob.type !== mime) throw new Error(`Couldn't encode ${FORMATS[format].label}`);
    return blob;
  } finally {
    bitmap.close();
    canvas.width = canvas.height = 0;
  }
}

/**
 * The file that "Download" saves, re-encoded when the format or background
 * changes (after a short pause, so dragging the colour picker stays smooth).
 *
 * Returns { blob, format } once ready, null while encoding, or { error }.
 */
export function useExport(result, format, background) {
  const [state, setState] = useState(null);
  const key = result ? `${result.url}|${format}|${background}` : null;

  useEffect(() => {
    if (!result) return;
    let stale = false;
    const direct = format === "png" && background === "transparent";
    const timer = setTimeout(
      () => {
        encode(result, format, background).then(
          (blob) => !stale && setState({ key, blob, format }),
          (error) => !stale && setState({ key, error: error.message }),
        );
      },
      direct ? 0 : 200,
    );
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [result, format, background, key]);

  return state?.key === key ? state : null;
}
