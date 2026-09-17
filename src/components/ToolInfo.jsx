import { ArrowRight, ChevronDown } from "lucide-react";
import { mainUrl } from "../config";
import { RELATED_TOOLS } from "../data/tools";
import { ToolTile } from "./ToolIcon";

const BODY = [
  "An AI segmentation model looks at every pixel and estimates how likely it is to belong to the main subject — a person, a product, a pet or an object. That estimate becomes a transparency mask, which is applied to your original image so the cut-out keeps its full resolution.",
  "Everything runs inside your browser, so your photo stays on your device the whole time. The first image takes longer because the AI model is downloaded once; after that, most images finish in several seconds.",
  "The result is always a PNG, because JPG can't store transparency. For a smaller file, convert it to WebP, which keeps the transparent background.",
];

const FAQ = [
  {
    q: "Is the background remover really free?",
    a: "Yes. There are no credits, watermarks or resolution limits, and no account is needed.",
  },
  {
    q: "Are my images uploaded anywhere?",
    a: "No. The image is processed on your own device and never sent to a server.",
  },
  {
    q: "Why is the PNG larger than my original JPG?",
    a: "Transparent images are saved as lossless PNG. Run the result through the Image Converter to get a WebP with the same transparency at a fraction of the size.",
  },
];

/** "How it works", FAQ and related tools — the section under every tool. */
export function ToolInfo() {
  return (
    <section className="border-t border-border bg-surface-muted/50">
      <div className="mx-auto grid w-full max-w-350 grid-cols-1 gap-12 px-5 py-16 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="max-w-2xl min-w-0">
          <h2 className="display-md">How the background remover works</h2>
          <div className="mt-3 space-y-3">
            {BODY.map((paragraph) => (
              <p key={paragraph} className="body-copy">
                {paragraph}
              </p>
            ))}
          </div>

          <div className="mt-8">
            <h3 className="display-sm">Common questions</h3>
            <div className="mt-2">
              {FAQ.map((item) => (
                <details key={item.q} className="group border-b border-border">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[14px] font-medium [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <p className="pb-4 text-[14px] leading-relaxed text-muted-foreground">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>

        <aside>
          <h2 className="mb-4 text-[11px] tracking-[0.14em] text-muted-foreground uppercase">Related tools</h2>
          <div className="space-y-1.5">
            {RELATED_TOOLS.map((tool) => (
              <a
                key={tool.slug}
                href={mainUrl(`/tools/${tool.slug}`)}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 transition-colors hover:border-primary/30"
              >
                <ToolTile icon={tool.icon} hue={tool.hue} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-medium">{tool.title}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{tool.description}</span>
                </span>
                <ArrowRight
                  className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  aria-hidden
                />
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
