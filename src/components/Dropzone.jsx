import { useEffect, useRef, useState } from "react";
import { ACCEPT } from "../lib/remover";
import { ImagePlusIcon, LockIcon } from "./Icons";

/**
 * Drag & drop, click-to-browse and paste. Files dropped anywhere on the page
 * are accepted too, so a near miss doesn't open the image in a new tab.
 */
export function Dropzone({ onFile, compact = false }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const hasFiles = (event) => event.dataTransfer?.types.includes("Files");
    const onDragOver = (event) => {
      if (hasFiles(event)) event.preventDefault();
    };
    const onDrop = (event) => {
      if (!hasFiles(event)) return;
      event.preventDefault();
      setDragging(false);
      const file = event.dataTransfer.files[0];
      if (file) onFile(file);
    };
    const onPaste = (event) => {
      const target = event.target;
      if (target instanceof HTMLElement && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
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

  const open = () => inputRef.current?.click();

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={ACCEPT}
      hidden
      onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) onFile(file);
        // Reset so choosing the same file again still fires.
        event.target.value = "";
      }}
    />
  );

  if (compact) {
    return (
      <>
        {input}
        <button type="button" className="button button-outline button-full" onClick={open}>
          <ImagePlusIcon />
          New image
        </button>
      </>
    );
  }

  return (
    <div
      className={`dropzone${dragging ? " is-dragging" : ""}`}
      role="button"
      tabIndex={0}
      aria-label="Choose an image, or drop one here"
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      onDragEnter={() => setDragging(true)}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false);
      }}
    >
      {input}
      <span className="drop-icon">
        <ImagePlusIcon size={22} />
      </span>
      <p className="drop-title">{dragging ? "Release to upload" : "Drop an image here"}</p>
      <p className="drop-hint">or click to choose a file — you can also paste with Ctrl + V</p>
      <span className="button button-primary">Choose image</span>
      <p className="privacy">
        <LockIcon size={14} />
        Processed locally in your browser
      </p>
      <p className="drop-formats">JPG · PNG · WebP</p>
    </div>
  );
}
