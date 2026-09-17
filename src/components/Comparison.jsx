import { useLayoutEffect, useRef, useState } from "react";
import { MoveIcon } from "./Icons";

const VIEWS = [
  { value: "slider", label: "Before / After" },
  { value: "split", label: "Side by side" },
  { value: "result", label: "Result" },
];

const SPLIT_GAP = 12;
const CAPTION_SPACE = 26;
const STACK_BELOW = 520;

/** Content-box size of an element, updated on resize. */
function useBoxSize(ref) {
  const [size, setSize] = useState(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.floor(entry.contentRect.width);
      const height = Math.floor(entry.contentRect.height);
      setSize((previous) =>
        previous && previous.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/** Scale an image down (never up) to fit inside a box. */
function fit(image, box) {
  const scale = Math.min(1, box.width / image.width, box.height / image.height);
  return {
    width: Math.max(1, Math.round(image.width * scale)),
    height: Math.max(1, Math.round(image.height * scale)),
  };
}

/**
 * Before/after preview on a transparency checkerboard.
 *
 * In the slider both layers are clipped to their own side of the handle, so
 * the transparent parts of the result show the checkerboard, not the original.
 */
export function Comparison({ before, after, busy }) {
  const [view, setView] = useState("slider");
  const [position, setPosition] = useState(50);
  const viewportRef = useRef(null);
  const frameRef = useRef(null);
  const box = useBoxSize(viewportRef);
  const activeView = after ? view : "before";

  const moveTo = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100)));
  };

  const renderView = () => {
    if (!box || box.width <= 0 || box.height <= 0) return null;

    if (activeView === "split") {
      const stacked = box.width < STACK_BELOW;
      const pane = stacked
        ? { width: box.width, height: (box.height - SPLIT_GAP) / 2 - CAPTION_SPACE }
        : { width: (box.width - SPLIT_GAP) / 2, height: box.height - CAPTION_SPACE };
      return (
        <div className={`split${stacked ? " is-stacked" : ""}`} style={{ gap: SPLIT_GAP }}>
          <figure>
            <img src={before.url} alt="Original" style={fit(before, pane)} draggable={false} />
            <figcaption>Before</figcaption>
          </figure>
          <figure>
            <img src={after.url} alt="Background removed" style={fit(after, pane)} draggable={false} />
            <figcaption>After</figcaption>
          </figure>
        </div>
      );
    }

    if (activeView === "slider") {
      return (
        <div
          ref={frameRef}
          className="compare"
          style={fit(before, box)}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            moveTo(event.clientX);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) moveTo(event.clientX);
          }}
        >
          <img
            className="layer"
            src={before.url}
            alt="Original"
            style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
            draggable={false}
          />
          <img
            className="layer"
            src={after.url}
            alt="Background removed"
            style={{ clipPath: `inset(0 0 0 ${position}%)` }}
            draggable={false}
          />
          <div className="handle" style={{ left: `${position}%` }}>
            <span>
              <MoveIcon />
            </span>
          </div>
          <span className="tag tag-left">Before</span>
          <span className="tag tag-right">After</span>
          <input
            className="sr-only"
            type="range"
            min="0"
            max="100"
            value={Math.round(position)}
            onChange={(event) => setPosition(Number(event.target.value))}
            aria-label="Before and after slider"
          />
        </div>
      );
    }

    const image = activeView === "result" ? after : before;
    return (
      <img
        className="single"
        src={image.url}
        alt={activeView === "result" ? "Background removed" : "Original"}
        style={fit(image, box)}
        draggable={false}
      />
    );
  };

  return (
    <div className="comparison">
      <div className="segmented" role="radiogroup" aria-label="Preview mode">
        {VIEWS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={activeView === option.value}
            disabled={!after}
            onClick={() => setView(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div ref={viewportRef} className={`viewport checkerboard${busy ? " is-busy" : ""}`}>
        {renderView()}
      </div>
    </div>
  );
}
