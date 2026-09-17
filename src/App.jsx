import { useCallback, useState } from "react";
import { DEFAULT_MODEL, MODELS, isSupported } from "./lib/remover";
import { downloadBlob, formatBytes, outputName } from "./lib/format";
import { useBackgroundRemoval } from "./hooks/useBackgroundRemoval";
import { SiteHeader } from "./components/SiteHeader";
import { SiteFooter } from "./components/SiteFooter";
import { Dropzone } from "./components/Dropzone";
import { Comparison } from "./components/Comparison";
import { StatusBar } from "./components/StatusBar";
import { DownloadIcon } from "./components/Icons";

export default function App() {
  const { source, result, status, start, rerun, cancel } = useBackgroundRemoval();
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

  const downloadButton = (
    <button
      type="button"
      className="button button-primary button-full"
      disabled={!result || running}
      onClick={() => result && downloadBlob(result.blob, outputName(source.name))}
    >
      <DownloadIcon />
      Download PNG
      {result && <span className="download-size">{formatBytes(result.blob.size)}</span>}
    </button>
  );

  return (
    <>
      <SiteHeader />

      <main className="container main">
        <section className="intro">
          <h1>Free AI Background Remover</h1>
          <p>
            Cut out people, products, pets and objects and download a transparent PNG. The AI runs in your
            browser — your photo is never uploaded.
          </p>
        </section>

        {notice && (
          <p className="notice" role="alert">
            {notice}
          </p>
        )}

        {!source ? (
          <section className="upload" aria-label="Upload an image">
            <Dropzone onFile={handleFile} />
            <div className="note">
              <strong>Private by design.</strong> The first time you use this tool your browser downloads the AI
              model (about 40–80 MB) and keeps it cached. After that, every image is processed right here on your
              device. No account, no watermark, no usage limit.
            </div>
          </section>
        ) : (
          <section className="workspace" aria-label="Background removal">
            <div className="preview-column">
              <div aria-live="polite">
                <StatusBar status={status} onCancel={cancel} onRetry={() => rerun(model)} />
              </div>
              <Comparison before={source} after={result} busy={running} />
              <p className="file-info">
                {source.name} · {source.width} × {source.height} · {formatBytes(source.file.size)}
                {result && ` → PNG · ${formatBytes(result.blob.size)}`}
              </p>
            </div>

            <aside className="panel-column">
              <div className="panel">
                <h2>Model</h2>
                <div className="segmented segmented-full" role="radiogroup" aria-label="Model">
                  {Object.entries(MODELS).map(([value, option]) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={model === value}
                      onClick={() => setModel(value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <p className="hint">{MODELS[model].hint}</p>
                {stale && (
                  <button type="button" className="button button-primary button-full" onClick={() => rerun(model)}>
                    Apply {MODELS[model].label.toLowerCase()} model
                  </button>
                )}
              </div>

              <div className="panel">
                <h2>Export</h2>
                <p className="hint">
                  Saved as a PNG with a transparent background, at the original resolution. Camera and location
                  metadata are not carried over.
                </p>
                {downloadButton}
                <Dropzone onFile={handleFile} compact />
              </div>
            </aside>

            {/* Keeps the main action within thumb reach on phones. */}
            <div className="mobile-bar">{downloadButton}</div>
          </section>
        )}
      </main>

      <SiteFooter />
    </>
  );
}
