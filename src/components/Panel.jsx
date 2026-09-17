import { useRef } from "react";
import { cn } from "../lib/cn";

/** A titled settings card, as in the main site's right-hand rail. */
export function Panel({ title, description, className, children }) {
  return (
    <section className={cn("rounded-xl border border-border bg-card", className)}>
      {title && (
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-[13px] font-semibold tracking-tight">{title}</h3>
          {description && <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p>}
        </header>
      )}
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

const NEXT_KEYS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Segmented control (single choice). Full width by default; pass a className
 * (e.g. "w-auto") for a compact group whose buttons size to their labels.
 *
 * Keyboard: a radio group — one Tab stop, arrow keys move and select,
 * Home/End jump to the first/last option. Disabled options are skipped.
 */
export function Segmented({ label, value, options, onChange, disabled, className }) {
  const fill = className === undefined;
  const buttons = useRef([]);
  const enabled = options.map((option) => !disabled && !option.disabled);
  const activeIndex = options.findIndex((option) => option.value === value);
  const tabStop = enabled[activeIndex] ? activeIndex : enabled.indexOf(true);

  const select = (index) => {
    buttons.current[index]?.focus();
    if (options[index].value !== value) onChange(options[index].value);
  };

  const onKeyDown = (event) => {
    const from = buttons.current.indexOf(event.target);
    if (from < 0) return;
    const count = options.length;
    let target = -1;
    if (event.key in NEXT_KEYS) {
      const step = NEXT_KEYS[event.key];
      for (let i = 1; i <= count; i++) {
        const candidate = (from + step * i + count * i) % count;
        if (enabled[candidate]) {
          target = candidate;
          break;
        }
      }
    } else if (event.key === "Home") {
      target = enabled.indexOf(true);
    } else if (event.key === "End") {
      target = enabled.lastIndexOf(true);
    } else {
      return;
    }
    event.preventDefault();
    if (target >= 0) select(target);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1", className ?? "w-full")}
    >
      {options.map((option, index) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            ref={(element) => {
              buttons.current[index] = element;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.hideLabelOnMobile ? option.label : undefined}
            tabIndex={index === tabStop ? 0 : -1}
            title={option.label}
            disabled={!enabled[index]}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              fill && "min-w-0 flex-1",
              "disabled:pointer-events-none disabled:opacity-50",
              active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.swatch && (
              <span
                className="checkerboard size-3.5 shrink-0 rounded-full border border-border"
                style={option.swatch === "transparent" ? undefined : { background: option.swatch }}
                aria-hidden
              />
            )}
            {Icon && <Icon className="size-4" aria-hidden />}
            <span className={cn(fill && "truncate", option.hideLabelOnMobile && "hidden sm:inline")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
