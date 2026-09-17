import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Columns2, Maximize2, MoveHorizontal, Square } from "lucide-react";
import { cn } from "../lib/cn";
import { formatBytes } from "../lib/format";
import { Segmented } from "./Panel";

const ZOOM_STEPS = ["fit", 0.25, 0.5, 1, 2];
const SPLIT_GAP = 12;
const CAPTION_SPACE = 24;
const STACK_BELOW = 480;

/** Natural size scaled by `zoom`, or scaled down (never up) to fit `box`. */
function displaySize(width, height, zoom, box) {
  const scale = zoom === "fit" ? Math.min(1, box.width / width, box.height / height) : zoom;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

/** Content-box size of an element, updated on resize. */
function useContentBox(ref) {
  const [box, setBox] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setBox((previous) =>
        previous && previous.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}

/**
 * Before/after preview on a transparency checkerboard.
 *
 * In the slider both layers are clipped to their own side of the handle, so
 * the transparent parts of the result show the checkerboard, not the original.
 */
export function Comparison({ before, after, busy }) {
  const [mode, setMode] = useState("slider");
  const [zoom, setZoom] = useState("fit");
  const [position, setPosition] = useState(50);
  const viewportRef = useRef(null);
  const frameRef = useRef(null);
  const dragging = useRef(false);
  const box = useContentBox(viewportRef);
  const activeMode = after ? mode : "original";

  const moveTo = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  useEffect(() => {
    const onMove = (event) => {
      if (!dragging.current) return;
      event.preventDefault();
      moveTo(event.clientX);
    };
    const onUp = () => {
      dragging.current = false;
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  const renderViewport = () => {
    if (activeMode === "split") {
      const stacked = box.width < STACK_BELOW;
      const pane = stacked
        ? { width: box.width, height: (box.height - SPLIT_GAP) / 2 - CAPTION_SPACE }
        : { width: (box.width - SPLIT_GAP) / 2, height: box.height - CAPTION_SPACE };
      return (
        <div
          className="m-auto grid"
          style={{ gap: SPLIT_GAP, gridTemplateColumns: stacked ? "max-content" : "repeat(2, max-content)" }}
        >
          <SidePane side={before} label="Original" size={displaySize(before.width, before.height, zoom, pane)} />
          <SidePane
            side={after}
            label="Background removed"
            size={displaySize(after.width, after.height, zoom, pane)}
            highlight
          />
        </div>
      );
    }

    if (activeMode === "slider") {
      return (
        <div
          ref={frameRef}
          className="relative m-auto shrink-0 cursor-ew-resize touch-none select-none"
          style={displaySize(before.width, before.height, zoom, box)}
          onPointerDown={(event) => {
            dragging.current = true;
            moveTo(event.clientX);
          }}
        >
          <img
            src={before.url}
            alt="Original"
            className="absolute inset-0 block size-full max-w-none object-contain"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            draggable={false}
          />
          <img
            src={after.url}
            alt="Background removed"
            className="absolute inset-0 block size-full max-w-none object-contain"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
            draggable={false}
          />
          <div
            className="absolute inset-y-0 w-px bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.35)]"
            style={{ left: `${position}%` }}
            aria-hidden
          >
            <span className="absolute top-1/2 left-1/2 flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-black/10 bg-white text-slate-700 shadow-md">
              <MoveHorizontal className="size-4" />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(position)}
            onChange={(event) => setPosition(Number(event.target.value))}
            className="sr-only"
            aria-label="Comparison slider position"
          />
          <span className="absolute top-2 left-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            Original
          </span>
          <span className="absolute top-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
            Result
          </span>
        </div>
      );
    }

    const side = activeMode === "processed" ? after : before;
    return (
      <img
        src={side.url}
        alt={activeMode === "processed" ? "Background removed" : "Original"}
        className="m-auto block max-w-none shrink-0 object-contain"
        style={displaySize(side.width, side.height, zoom, box)}
        draggable={false}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Segmented
          label="Comparison mode"
          value={activeMode}
          onChange={setMode}
          className="w-auto"
          options={[
            { value: "slider", label: "Slider", icon: MoveHorizontal, disabled: !after, hideLabelOnMobile: true },
            { value: "split", label: "Side by side", icon: Columns2, disabled: !after, hideLabelOnMobile: true },
            { value: "original", label: "Original", icon: Square, hideLabelOnMobile: true },
            { value: "processed", label: "Result", icon: Maximize2, disabled: !after, hideLabelOnMobile: true },
          ]}
        />
        <div className="flex items-center gap-1" role="group" aria-label="Zoom level">
          {ZOOM_STEPS.map((step) => (
            <button
              key={String(step)}
              type="button"
              aria-pressed={zoom === step}
              className={cn(
                "btn tabular h-7 px-2 text-[11px]",
                zoom === step ? "border border-border bg-surface-muted" : "btn-ghost",
              )}
              onClick={() => setZoom(step)}
            >
              {step === "fit" ? "Fit" : `${step * 100}%`}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={viewportRef}
        className={cn(
          "checkerboard flex h-[62vh] min-h-80 rounded-xl border p-4 transition-colors",
          zoom === "fit" ? "overflow-hidden" : "overflow-auto",
          busy ? "border-primary/50" : "border-border",
        )}
      >
        {box && box.width > 0 && box.height > 0 && renderViewport()}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Readout title="Original" primary={formatBytes(before.file.size)} secondary={`${before.width} × ${before.height}`} />
        <Readout
          title="Result"
          primary={after ? formatBytes(after.blob.size) : "—"}
          secondary={busy ? "Working…" : after ? `${after.width} × ${after.height} · PNG` : "Not processed yet"}
          dimmed={busy}
        />
      </div>
    </div>
  );
}

function SidePane({ side, label, size, highlight }) {
  return (
    <figure className="m-0 flex flex-col items-center justify-center gap-2">
      <img
        src={side.url}
        alt={label}
        className={cn(
          "block max-w-none rounded-lg object-contain ring-1",
          highlight ? "ring-primary/40" : "ring-border",
        )}
        style={size}
        draggable={false}
      />
      <figcaption className="tabular truncate text-[11px] text-muted-foreground" style={{ maxWidth: size.width }}>
        {label} · {side.width} × {side.height}
      </figcaption>
    </figure>
  );
}

function Readout({ title, primary, secondary, dimmed }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card px-3 py-2.5 transition-opacity",
        dimmed && "opacity-55",
      )}
    >
      <p className="text-[11px] tracking-wide text-muted-foreground uppercase">{title}</p>
      <p className="tabular mt-0.5 text-[17px] leading-tight font-semibold">{primary}</p>
      {secondary && <p className="tabular mt-0.5 text-[11px] text-muted-foreground">{secondary}</p>}
    </div>
  );
}
