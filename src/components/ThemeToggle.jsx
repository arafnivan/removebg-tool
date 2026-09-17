import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Sun } from "lucide-react";
import { getTheme, setTheme, watchSystemTheme } from "../lib/theme";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeToggle() {
  const [theme, setThemeState] = useState(getTheme);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => watchSystemTheme(), []);

  useEffect(() => {
    if (!open) return;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="btn btn-ghost btn-icon"
        aria-label="Change colour theme"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Sun className="size-4 dark:hidden" />
        <Moon className="hidden size-4 dark:block" />
      </button>
      {open && (
        <div
          role="menu"
          className="animate-fade-in absolute top-full right-0 z-50 mt-2 w-40 rounded-xl border border-border bg-popover p-1 shadow-[0_16px_50px_-12px_rgb(0_0_0/0.18)]"
        >
          {OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              type="button"
              role="menuitemradio"
              aria-checked={theme === value}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] hover:bg-accent"
              onClick={() => {
                setTheme(value);
                setThemeState(value);
                setOpen(false);
              }}
            >
              <Icon className="size-4 text-muted-foreground" />
              {label}
              {theme === value && <Check className="ml-auto size-3.5 opacity-60" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
