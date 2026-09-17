import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { getTheme, setTheme, watchSystemTheme } from "../lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

/**
 * Theme menu with the keyboard behaviour of an ARIA menu button: arrows,
 * Home/End move between items, Escape closes and returns focus, Tab closes.
 */
export function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const buttonRef = useRef(null);
  const itemRefs = useRef([]);
  // Which item gets focus when the menu opens.
  const initialFocus = useRef("checked");

  useEffect(() => watchSystemTheme(), []);

  useEffect(() => {
    if (!open) return;
    const items = itemRefs.current;
    const checked = OPTIONS.findIndex((option) => option.value === theme);
    const index = { first: 0, last: items.length - 1 }[initialFocus.current] ?? Math.max(0, checked);
    items[index]?.focus();

    const onPointerDown = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // Focus is only placed when the menu opens, not on every theme change.
  }, [open]);

  const openWith = (focus) => {
    initialFocus.current = focus;
    setOpen(true);
  };

  const close = (returnFocus) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const choose = (value) => {
    setTheme(value);
    setThemeState(value);
    close(true);
  };

  const onMenuKeyDown = (event) => {
    const items = itemRefs.current;
    const current = items.indexOf(document.activeElement);
    const move = {
      ArrowDown: (current + 1) % items.length,
      ArrowUp: (current - 1 + items.length) % items.length,
      Home: 0,
      End: items.length - 1,
    }[event.key];
    if (move !== undefined) {
      event.preventDefault();
      items[move]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={buttonRef}
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label="Change colour theme"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? "theme-menu" : undefined}
        onClick={() => (open ? close(false) : openWith("checked"))}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            openWith(event.key === "ArrowDown" ? "first" : "last");
          }
        }}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </button>
      {open && (
        <div
          id="theme-menu"
          role="menu"
          aria-label="Colour theme"
          onKeyDown={onMenuKeyDown}
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 w-40 rounded-xl border border-border bg-popover p-1 shadow-[0_16px_50px_-12px_rgb(0_0_0/0.18)]"
        >
          {OPTIONS.map(({ value, label, icon: Icon }, index) => (
            <button
              key={value}
              ref={(element) => {
                itemRefs.current[index] = element;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              tabIndex={-1}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-accent focus-visible:bg-accent"
              onClick={() => choose(value)}
            >
              <Icon className="size-4 text-muted-foreground" aria-hidden />
              {label}
              {theme === value && <Check className="ml-auto size-3.5 opacity-60" aria-hidden />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
