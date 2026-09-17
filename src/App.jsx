import { useCallback, useState } from "react";
import { Download, Info, Scissors, ShieldCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { isSupported } from "./lib/remover";
import { downloadBlob, formatBytes, outputName } from "./lib/format";
import { useBackgroundRemoval } from "./hooks/useBackgroundRemoval";
import { FORMATS, canEncodeWebP, useExport } from "./hooks/useExport";
import { SiteHeader } from "./components/SiteHeader";
import { ToolHeader } from "./components/ToolHeader";
import { ToolInfo } from "./components/ToolInfo";
import { SiteFooter } from "./components/SiteFooter";
import { CurrentImage, Dropzone, usePageFileInput } from "./components/Dropzone";
import { Comparison } from "./components/Comparison";
import { StatusBar } from "./components/StatusBar";
import { Panel, Segmented } from "./components/Panel";

const FEATURES = [
  { icon: Sparkles, title: "Automatic", body: "People, products, pets and objects are detected and cut out for you." },
  { icon: Scissors, title: "Full resolution", body: "The cut-out keeps the resolution of your original image." },
  { icon: ShieldCheck, title: "Private", body: "Your photo never leaves your device. No sign-up, no watermark." },
];

const WHITE = "#ffffff";

export default function App() {
  const { source, result, status, notice, setNotice, start, rerun, cancel, reset } = useBackgroundRemoval();
  const [format, setFormat] = useState("png");
  const [backgroundMode, setBackgroundMode] = useState("transparent");
  const [customColor, setCustomColor] = useState("#000000");

  const running = status.kind === "running";
  // JPG has no transparency, so it falls back to white.
  const mode = backgroundMode === "transparent" && !FORMATS[format].transparency ? "white" : backgroundMode;
  const background = mode === "custom" ? customColor : mode === "white" ? WHITE : "transparent";
  const exported = useExport(result, format, background);

  const handleFile = useCallback(
    (file) => {
      if (!isSupported(file)) {
        setNotice(`"${file.name}" isn't supported. Choose a JPG, PNG or WebP image.`);
        return;
      }
      setNotice(null);
      void start(file);
    },
    [start, setNotice],
  );
  usePageFileInput(handleFile);

  const ready = Boolean(result && exported?.blob && !running);
  const downloadButton = (
    <button
      type="button"
      className="btn btn-default btn-md w-full"
      disabled={!ready}
      onClick={() => ready && downloadBlob(exported.blob, outputName(source.name, FORMATS[format].extension))}
    >
      <Download />
      Download {FORMATS[format].label}
      {ready && <span className="tabular hidden sm:inline">{formatBytes(exported.blob.size)}</span>}
    </button>
  );

  const noticeBox = notice && (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed text-muted-foreground">{notice}</p>
      <button
        type="button"
        className="btn btn-ghost btn-icon -my-1 size-7 text-muted-foreground"
        onClick={() => setNotice(null)}
        aria-label="Dismiss"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );

  const formatOptions = Object.entries(FORMATS).map(([value, { label }]) => ({
    value,
    label,
    disabled: value === "webp" && !canEncodeWebP,
  }));
  const backgroundOptions = [
    { value: "transparent", label: "None", swatch: "transparent", disabled: !FORMATS[format].transparency },
    { value: "white", label: "White", swatch: WHITE },
    { value: "custom", label: "Colour", swatch: customColor },
  ];

  return (
    <>
      <SiteHeader />
      <ToolHeader />

      <main className="flex-1">
        {!source ? (
          <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6 lg:px-8">
            {noticeBox}
            <Dropzone onFile={handleFile} />
            <div className="grid gap-3 sm:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <div key={title} className="rounded-xl border border-border bg-card p-4">
                  <p className="flex items-center gap-2 text-[13px] font-semibold">
                    <Icon className="size-4 text-primary" aria-hidden />
                    {title}
                  </p>
                  <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground">{body}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="mx-auto grid w-full max-w-400 grid-cols-1 gap-5 px-4 py-5 pb-24 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:px-8 lg:pb-5">
              <div className="min-w-0 space-y-3">
                {noticeBox}
                <div aria-live="polite">
                  <StatusBar status={status} onCancel={cancel} onRetry={rerun} />
                </div>
                {result?.downscaled && (
                  <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
                    <Info className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    <p className="text-[13px] leading-relaxed text-muted-foreground">
                      This image is very large, so it was scaled down to{" "}
                      <span className="tabular">
                        {result.width} × {result.height}
                      </span>{" "}
                      to fit in your browser's memory.
                    </p>
                  </div>
                )}
                <Comparison before={source} after={result} busy={running} />
              </div>

              <aside aria-label="Settings" className="min-w-0 space-y-4 lg:sticky lg:top-22 lg:self-start">
                <CurrentImage image={source} onFile={handleFile} onClear={reset} />

                <Panel title="Export">
                  <div className="space-y-2">
                    <p className="text-[12px] font-medium">Format</p>
                    <Segmented label="Format" value={format} onChange={setFormat} options={formatOptions} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[12px] font-medium">Background</p>
                    <Segmented label="Background" value={mode} onChange={setBackgroundMode} options={backgroundOptions} />
                    {mode === "custom" && (
                      <label className="flex items-center gap-2 text-[12px] text-muted-foreground">
                        <input
                          type="color"
                          value={customColor}
                          onChange={(event) => setCustomColor(event.target.value)}
                          className="h-8 w-12 cursor-pointer rounded-md border border-border bg-surface p-0.5"
                        />
                        <span className="tabular uppercase">{customColor}</span>
                        <span className="sr-only">Background colour</span>
                      </label>
                    )}
                  </div>
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    {background === "transparent"
                      ? `Saved as a ${FORMATS[format].label} with a transparent background`
                      : `Saved as a ${FORMATS[format].label} on a solid background`}
                    , at the size shown under Result. Camera and location details are not carried over.
                  </p>
                  {exported?.error && (
                    <p role="alert" className="text-[12px] text-destructive">
                      Couldn't create the {FORMATS[format].label} file. Try PNG instead.
                    </p>
                  )}
                  {downloadButton}
                </Panel>
              </aside>
            </div>

            {/* Keeps the main action within thumb reach on phones. */}
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
              {downloadButton}
            </div>
          </>
        )}
      </main>

      <ToolInfo />
      <SiteFooter />
    </>
  );
}
