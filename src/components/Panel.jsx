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

/**
 * Segmented control (single choice). Full width by default; pass a className
 * (e.g. "w-auto") for a compact group whose buttons size to their labels.
 */
export function Segmented({ label, value, options, onChange, disabled, className }) {
  const fill = className === undefined;
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("inline-flex items-center gap-1 rounded-lg bg-surface-muted p-1", className ?? "w-full")}
    >
      {options.map((option) => {
        const Icon = option.icon;
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            title={option.label}
            disabled={disabled || option.disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors",
              fill && "min-w-0 flex-1",
              "disabled:pointer-events-none disabled:opacity-50",
              active ? "bg-surface text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-4" aria-hidden />}
            <span className={cn(fill && "truncate", option.hideLabelOnMobile && "hidden sm:inline")}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
