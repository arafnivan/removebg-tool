import { Lock, WandSparkles } from "lucide-react";
import {
  COPYRIGHT,
  LIBRARY_URL,
  LICENSE_URL,
  MAIN_SITE_NAME,
  SOURCE_URL,
  THIRD_PARTY_LICENSES_URL,
  mainUrl,
} from "../config";

const linkClass = "underline underline-offset-2 hover:text-foreground";
import { CATEGORIES, THIS_TOOL, toolsIn } from "../data/tools";
import { BrandLogo } from "./SiteHeader";

function GitHubMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

/**
 * The main ImageDoctor footer, plus this tool's source link. The link is what
 * satisfies AGPL-3.0 section 13: everyone using the page over the network is
 * offered the source of the running version.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto w-full max-w-350 px-5 py-14 sm:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))]">
          <div className="space-y-3">
            <a href={mainUrl("/")} aria-label={`${MAIN_SITE_NAME} home`} className="flex w-fit items-center">
              <BrandLogo height={30} />
            </a>
            <p className="max-w-xs text-[13px] leading-relaxed text-muted-foreground">
              A browser-based image toolbox. Resize, compress, convert, crop, edit and batch-process images without
              uploading them anywhere.
            </p>
            <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-success">
              <Lock className="size-3.5" aria-hidden />
              Processed locally in your browser
            </p>
            <a
              href={THIS_TOOL.href}
              aria-current="page"
              className="flex w-fit items-center gap-1.5 text-[13.5px] font-medium text-primary hover:underline"
            >
              <WandSparkles className="size-3.5" aria-hidden />
              {THIS_TOOL.title}
            </a>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noopener"
              className="btn btn-outline btn-sm mt-1 flex w-fit"
            >
              <GitHubMark className="size-4" />
              Source code on GitHub
            </a>
          </div>

          {CATEGORIES.map((category) => (
            <nav key={category.id} aria-label={category.label}>
              <h2 className="mb-4 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">{category.label}</h2>
              <ul className="space-y-2">
                {toolsIn(category.id).map((tool) => (
                  <li key={tool.slug}>
                    <a
                      href={mainUrl(`/tools/${tool.slug}`)}
                      className="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {tool.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* AGPL-3.0 "Appropriate Legal Notices": copyright, no warranty, licence. */}
        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-7 text-[12px] leading-relaxed text-muted-foreground lg:flex-row lg:justify-between lg:gap-8">
          <p className="max-w-2xl">
            {COPYRIGHT}. This background remover is free software: you can redistribute and/or modify it under the
            terms of the{" "}
            <a href={LICENSE_URL} target="_blank" rel="noopener" className={linkClass}>
              GNU Affero General Public License v3.0
            </a>
            . It comes with ABSOLUTELY NO WARRANTY.
          </p>
          <p className="shrink-0">
            <a href={SOURCE_URL} target="_blank" rel="noopener" className={linkClass}>
              Source code
            </a>
            {" · "}
            <a href={THIRD_PARTY_LICENSES_URL} target="_blank" rel="noopener" className={linkClass}>
              Third-party licences
            </a>
            {" · Powered by "}
            <a href={LIBRARY_URL} target="_blank" rel="noopener" className={linkClass}>
              @imgly/background-removal
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
