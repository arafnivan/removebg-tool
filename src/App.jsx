import { useCallback, useState } from "react";
import { Download, Scissors, ShieldCheck, Sparkles, TriangleAlert, X } from "lucide-react";
import { DEFAULT_MODEL, MODELS, isSupported } from "./lib/remover";
import { downloadBlob, formatBytes, outputName } from "./lib/format";
import { useBackgroundRemoval } from "./hooks/useBackgroundRemoval";
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
  { icon: Scissors, title: "Full resolution", body: "The cut-out keeps every pixel of your original image." },
  { icon: ShieldCheck, title: "Private", body: "Your photo never leaves your device. No sign-up, no watermark." },
];

const MODEL_OPTIONS = Object.entries(MODELS).map(([value, option]) => ({ value, label: option.label }));

export default function App() {
  const { source, result, status, start, rerun, cancel, reset } = useBackgroundRemoval();
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [notice, setNotice] = useState(null);

  const running = status.kind === "running";
  // The result was made with the other model and won't refresh on its own.
  const stale = Boolean(result && result.model !== model && !running);

  const handleFile = useCallback(
    (file) => {
      if (!isSupported(file)) {
        setNotice(`"${file.name}" isn't supported. Choose a JPG, PNG or WebP image.`);
        return;
      }
      setNotice(null);
      void start(file, model);
    },
    [start, model],
  );
  usePageFileInput(handleFile);

  const downloadButton = (
    <button
      type="button"
      className="btn btn-default btn-md w-full"
      disabled={!result || running}
      onClick={() => result && downloadBlob(result.blob, outputName(source.name))}
    >
      <Download />
      Download PNG
      {result && <span className="tabular hidden sm:inline">{formatBytes(result.blob.size)}</span>}
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
              <div className="min-w-0 space-y-3" aria-live="polite">
                {noticeBox}
                <StatusBar status={status} onCancel={cancel} onRetry={() => rerun(model)} />
                <Comparison before={source} after={result} busy={running} />
              </div>

              <aside aria-label="Settings" className="min-w-0 space-y-4 lg:sticky lg:top-22 lg:self-start">
                <CurrentImage image={source} onFile={handleFile} onClear={reset} />

                <Panel title="Remove background" description="AI cut-out, processed on your device">
                  <div className="space-y-1.5">
                    <p className="text-[13px] font-medium text-muted-foreground">Model</p>
                    <Segmented label="Model" value={model} options={MODEL_OPTIONS} onChange={setModel} />
                    <p className="text-[11px] leading-relaxed text-muted-foreground">{MODELS[model].hint}</p>
                  </div>
                  {stale && (
                    <button type="button" className="btn btn-default btn-md w-full" onClick={() => rerun(model)}>
                      <Sparkles />
                      Apply {MODELS[model].label.toLowerCase()} model
                    </button>
                  )}
                </Panel>

                <Panel title="Export">
                  <p className="text-[12px] leading-relaxed text-muted-foreground">
                    Saved as a PNG with a transparent background, at the original resolution. Camera and location
                    details are not carried over.
                  </p>
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
