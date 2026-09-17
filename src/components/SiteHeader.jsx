import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, MAIN_SITE_NAME, mainUrl } from "../config";
import { CATEGORIES, toolsIn } from "../data/tools";
import { cn } from "../lib/cn";
import { ToolTile } from "./ToolIcon";
import { ThemeToggle } from "./ThemeToggle";

export function BrandLogo({ height = 32 }) {
  return (
    <img
      src={LOGO_URL}
      alt={MAIN_SITE_NAME}
      width={Math.round((height * LOGO_WIDTH) / LOGO_HEIGHT)}
      height={height}
      className="shrink-0"
    />
  );
}

/** The main ImageDoctor header; every tool link goes to the main site. */
export function SiteHeader() {
  const [openCategory, setOpenCategory] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);

  useEffect(() => {
    if (!openCategory) return;
    const onPointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) setOpenCategory(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenCategory(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openCategory]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-350 items-center gap-3 px-5 sm:px-8">
        <a href={mainUrl("/")} aria-label={`${MAIN_SITE_NAME} home`} className="flex shrink-0 items-center">
          <BrandLogo height={32} />
        </a>

        <nav ref={navRef} className="relative ml-4 hidden items-center gap-1 lg:flex" aria-label="Main">
          {CATEGORIES.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => setOpenCategory((current) => (current === category.id ? null : category.id))}
              aria-expanded={openCategory === category.id}
              aria-haspopup="true"
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] transition-colors",
                openCategory === category.id ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {category.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", openCategory === category.id && "rotate-180")}
                aria-hidden
              />
            </button>
          ))}

          <a
            href={mainUrl("/tools")}
            className="rounded-full px-3 py-1.5 text-[14px] text-muted-foreground transition-colors hover:text-foreground"
          >
            All tools
          </a>

          {openCategory && (
            <div className="animate-fade-in absolute top-full left-0 z-50 mt-2 w-[660px] rounded-2xl border border-border bg-popover p-2.5 shadow-[0_16px_50px_-12px_rgb(0_0_0/0.18)]">
              <div className="grid grid-cols-2 gap-1">
                {toolsIn(openCategory).map((tool) => (
                  <a
                    key={tool.slug}
                    href={mainUrl(`/tools/${tool.slug}`)}
                    className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-accent"
                  >
                    <ToolTile icon={tool.icon} hue={tool.hue} size="sm" className="mt-0.5" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium">{tool.title}</span>
                      <span className="line-clamp-1 text-[11px] text-muted-foreground">{tool.description}</span>
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <ThemeToggle />
          <a href={mainUrl("/tools")} className="btn btn-default btn-sm ml-1 hidden rounded-full px-4 sm:inline-flex">
            Start processing
          </a>
          <button
            type="button"
            className="btn btn-ghost btn-icon lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-in fixed inset-x-0 top-16 bottom-0 z-40 overflow-y-auto border-t border-border bg-background lg:hidden">
          <nav className="mx-auto w-full max-w-350 space-y-6 px-5 py-6" aria-label="Mobile">
            {CATEGORIES.map((category) => (
              <div key={category.id}>
                <p className="mb-2 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{category.label}</p>
                <div className="grid gap-0.5 sm:grid-cols-2">
                  {toolsIn(category.id).map((tool) => (
                    <a
                      key={tool.slug}
                      href={mainUrl(`/tools/${tool.slug}`)}
                      className="flex items-center gap-3 rounded-lg px-2 py-2 text-[14px] transition-colors hover:bg-accent"
                    >
                      <ToolTile icon={tool.icon} hue={tool.hue} size="sm" />
                      {tool.title}
                    </a>
                  ))}
                </div>
              </div>
            ))}
            <a href={mainUrl("/tools")} className="btn btn-default btn-md w-full">
              All tools
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
