import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, Menu, WandSparkles, X } from "lucide-react";
import { LOGO_HEIGHT, LOGO_URL, LOGO_WIDTH, MAIN_SITE_NAME, mainUrl } from "../config";
import { CATEGORIES, THIS_TOOL, toolsIn } from "../data/tools";
import { cn } from "../lib/cn";
import { ToolTile } from "./ToolIcon";
import { ThemeToggle } from "./ThemeToggle";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

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

/** The small "AI" label next to the highlighted tool, as on the main site. */
export function ToolBadge({ className }) {
  return (
    <span
      className={cn(
        "rounded-full bg-primary px-1.5 py-px text-[10px] leading-4 font-semibold tracking-wide text-primary-foreground",
        className,
      )}
    >
      {THIS_TOOL.badge}
    </span>
  );
}

/** The main site's highlighted "Remove BG" pill; here it is the current page. */
function CurrentToolPill({ className }) {
  return (
    <a
      href={THIS_TOOL.href}
      aria-current="page"
      className={cn(
        "flex shrink-0 items-center gap-1.5 rounded-full border border-primary/40 bg-primary/12 py-1 pr-1.5 pl-2.5 text-[14px] font-medium whitespace-nowrap text-primary",
        className,
      )}
    >
      <WandSparkles className="size-3.5" aria-hidden />
      <span className="min-[1440px]:hidden">{THIS_TOOL.navTitle}</span>
      <span className="hidden min-[1440px]:inline">{THIS_TOOL.shortTitle}</span>
      <ToolBadge />
    </a>
  );
}

/** The main site's highlighted tool card, for the mobile menu. */
function CurrentToolCard({ className }) {
  return (
    <a
      href={THIS_TOOL.href}
      aria-current="page"
      className={cn(
        "flex items-center gap-3.5 rounded-xl border border-primary/45 bg-linear-to-r from-primary/8 via-card to-card px-3 py-3",
        className,
      )}
    >
      <ToolTile icon={THIS_TOOL.icon} hue={THIS_TOOL.hue} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-[14px] font-medium tracking-[-0.01em]">{THIS_TOOL.title}</span>
          <ToolBadge className="shrink-0" />
        </span>
        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">You are here</span>
      </span>
      <ArrowUpRight className="size-4 shrink-0 text-primary" aria-hidden />
    </a>
  );
}

/** The main ImageDoctor header; every tool link goes to the main site. */
export function SiteHeader() {
  const [openCategory, setOpenCategory] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef(null);
  const menuButtonRef = useRef(null);
  const mobilePanelRef = useRef(null);

  useEffect(() => {
    if (!openCategory) return;
    const onPointerDown = (event) => {
      if (!navRef.current?.contains(event.target)) setOpenCategory(null);
    };
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      // Return focus to the disclosure button so keyboard users aren't lost.
      if (navRef.current?.contains(document.activeElement)) {
        navRef.current.querySelector(`[data-category="${openCategory}"]`)?.focus();
      }
      setOpenCategory(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openCategory]);

  // The mobile menu is modal: scroll lock, focus kept inside it (plus the
  // button that closes it), Escape closes it and focus goes back to the button.
  useEffect(() => {
    if (!mobileOpen) return;
    document.body.style.overflow = "hidden";
    const panel = mobilePanelRef.current;
    const button = menuButtonRef.current;
    panel?.querySelector(FOCUSABLE)?.focus();

    const close = () => {
      setMobileOpen(false);
      button?.focus();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const items = [button, ...panel.querySelectorAll(FOCUSABLE)].filter(Boolean);
      const first = items[0];
      const last = items[items.length - 1];
      const inside = items.includes(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault();
        first.focus();
      }
    };
    // The menu only exists below lg; growing past it must not leave an
    // invisible modal (and its scroll lock) behind.
    const desktop = window.matchMedia("(min-width: 1024px)");
    const onResize = () => desktop.matches && setMobileOpen(false);
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onResize);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onResize);
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
              data-category={category.id}
              onClick={() => setOpenCategory((current) => (current === category.id ? null : category.id))}
              aria-expanded={openCategory === category.id}
              aria-haspopup="true"
              className={cn(
                "flex items-center gap-1 rounded-full px-3 py-1.5 text-[14px] whitespace-nowrap transition-colors",
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
            className="rounded-full px-3 py-1.5 text-[14px] whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
          >
            All tools
          </a>

          <CurrentToolPill className="ml-2" />

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
          {/* Hidden where the header is tightest; "All tools" goes to the same page. */}
          <a
            href={mainUrl("/tools")}
            className="btn btn-default btn-sm ml-1 hidden rounded-full px-4 sm:inline-flex lg:hidden xl:inline-flex"
          >
            Start processing
          </a>
          <button
            ref={menuButtonRef}
            type="button"
            className="btn btn-ghost btn-icon lg:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
          >
            {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
          </button>
        </div>
      </div>

      {/* The header's backdrop-filter makes it the containing block for fixed
          children, so bottom-0 would end at the header; the panel is sized
          from the viewport instead. */}
      {mobileOpen && (
        <div
          ref={mobilePanelRef}
          id="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className="animate-fade-in fixed inset-x-0 top-16 z-40 h-[calc(100dvh-4rem)] overflow-y-auto border-t border-border bg-background lg:hidden"
        >
          <nav className="mx-auto w-full max-w-350 space-y-6 px-5 py-6" aria-label="Mobile">
            <CurrentToolCard />
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
