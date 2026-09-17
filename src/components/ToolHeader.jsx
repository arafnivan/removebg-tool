import { ChevronRight, Lock } from "lucide-react";
import { mainUrl } from "../config";
import { THIS_TOOL } from "../data/tools";
import { cn } from "../lib/cn";
import { ToolTile } from "./ToolIcon";

export function PrivacyBadge({ className }) {
  return (
    <span
      className={cn(
        "items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[12px] text-muted-foreground",
        // Callers may pass their own display (e.g. "hidden sm:inline-flex").
        className ?? "inline-flex",
      )}
    >
      <Lock className="size-3.5 text-success" aria-hidden />
      Processed locally in your browser
    </span>
  );
}

/** Breadcrumb, icon, title and description — the header every ImageDoctor tool has. */
export function ToolHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto w-full max-w-350 px-5 py-5 sm:px-8">
        <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1 text-[12px] text-muted-foreground">
          <a href={mainUrl("/")} className="transition-colors hover:text-foreground">
            Home
          </a>
          <ChevronRight className="size-3" aria-hidden />
          <a href={mainUrl("/tools")} className="transition-colors hover:text-foreground">
            Tools
          </a>
          <ChevronRight className="size-3" aria-hidden />
          <span className="truncate font-medium text-foreground">{THIS_TOOL.title}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <ToolTile icon={THIS_TOOL.icon} hue={THIS_TOOL.hue} size="lg" className="hidden sm:flex" />
            <div className="min-w-0">
              <h1 className="display-md">{THIS_TOOL.title}</h1>
              <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
                {THIS_TOOL.description}
              </p>
            </div>
          </div>
          <PrivacyBadge className="hidden sm:inline-flex" />
        </div>
      </div>
    </header>
  );
}
