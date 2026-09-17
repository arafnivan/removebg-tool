import { useEffect, useRef, useState } from "react";
import { FolderOpen, ImagePlus, RefreshCw, X } from "lucide-react";
import { ACCEPT } from "../lib/remover";
import { cn } from "../lib/cn";
import { formatBytes } from "../lib/format";
import { PrivacyBadge } from "./ToolHeader";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Files dropped or pasted anywhere on the page are accepted, so a near miss
 * doesn't open the image in a new tab.
 */
export function usePageFileInput(onFile) {
  useEffect(() => {
    const hasFiles = (event) => event.dataTransfer?.types.includes("Files");
    const onDragOver = (event) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    };
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA)$/.test(target.tagName))) {
        return;
      }
      const file = [...(event.clipboardData?.files ?? [])][0];
      if (!file) return;
      event.preventDefault();
      onFile(file);
    };
    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
  }, [onFile]);
}

function FileInput({ inputRef, onFile }) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      className="sr-only"
      tabIndex={-1}
      aria-label="Choose an image"
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
        // Reset so choosing the same file again still fires.
        event.target.value = "";
      }}
    />
  );
}

/** The large drop target shown before an image is added. */
export function Dropzone({ onFile }) {
  const inputRef = useRef(null);
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragEnter={() => {
        depth.current += 1;
        setDragging(true);
      }}
      onDragLeave={() => {
        depth.current -= 1;
        if (depth.current <= 0) setDragging(false);
      }}
      onDrop={() => {
        depth.current = 0;
        setDragging(false);
      }}
      className={cn(
        "relative rounded-xl border border-dashed px-6 py-10 transition-colors sm:py-14",
        dragging ? "border-primary bg-primary/5" : "border-border bg-surface-muted/40",
      )}
    >
      <FileInput inputRef={inputRef} onFile={onFile} />
      <div className="flex flex-col items-center gap-4 text-center">
        <span
          className={cn(
            "flex size-12 items-center justify-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors",
            dragging && "border-primary/40 text-primary",
          )}
        >
          <ImagePlus className="size-5" aria-hidden />
        </span>

        <div className="space-y-1.5">
          <p className="text-[15px] font-medium">
            {dragging ? "Release to upload" : "Drop an image to remove its background"}
          </p>
          <p className="mx-auto max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Drag &amp; drop, paste with {isMac ? "⌘" : "Ctrl"} + V, or choose a file.
          </p>
        </div>

        <button type="button" className="btn btn-default btn-md" onClick={() => inputRef.current?.click()}>
          <FolderOpen />
          Choose image
        </button>

        <div className="flex flex-col items-center gap-2">
          <PrivacyBadge />
          <p className="text-[11px] text-muted-foreground">JPG · PNG · WebP</p>
        </div>
      </div>
    </div>
  );
}

/** The loaded image, with Replace and Remove — as in the main site's side panel. */
export function CurrentImage({ image, onFile, onClear }) {
  const inputRef = useRef(null);
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-2.5">
      <img
        src={image.url}
        alt=""
        className="checkerboard size-11 shrink-0 rounded-lg border border-border object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium" title={image.name}>
          {image.name}
        </p>
        <p className="tabular truncate text-[11px] text-muted-foreground">
          {image.width} × {image.height} · {formatBytes(image.file.size)}
        </p>
      </div>
      <FileInput inputRef={inputRef} onFile={onFile} />
      <button type="button" className="btn btn-outline btn-sm" onClick={() => inputRef.current?.click()}>
        <RefreshCw />
        Replace
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-icon text-muted-foreground"
        onClick={onClear}
        aria-label="Remove image and start over"
      >
        <X />
      </button>
    </div>
  );
}
