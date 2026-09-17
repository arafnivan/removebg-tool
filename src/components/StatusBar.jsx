import { Loader2, TriangleAlert, X } from "lucide-react";

const megabytes = (bytes) => `${Math.max(1, Math.round(bytes / (1024 * 1024)))} MB`;

/**
 * Progress while a job runs, or the error from the last one.
 *
 * While the AI model downloads (first use only) the bar shows real progress
 * over all its files; after that it is indeterminate, because the model gives
 * no progress while it runs.
 */
export function StatusBar({ status, onCancel, onRetry }) {
  if (status.kind === "error") {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3"
      >
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[13px] font-medium text-destructive">Couldn't remove the background</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{status.message}</p>
        </div>
        <button type="button" className="btn btn-outline btn-sm shrink-0" onClick={onRetry}>
          Retry
        </button>
      </div>
    );
  }

  if (status.kind !== "running") return null;

  const download = status.stage?.phase === "download" ? status.stage : null;
  const percent = download?.total ? Math.min(100, Math.floor((download.loaded / download.total) * 100)) : null;
  const label = download
    ? `Downloading AI model (one-time${download.total ? `, ${megabytes(download.total)}` : " download"})…`
    : "Removing background…";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="flex items-baseline justify-between gap-3 text-[13px] font-medium">
          <span className="min-w-0 truncate">{label}</span>
          {/* Not announced: the progress bar carries the value for assistive tech. */}
          {percent !== null && (
            <span className="tabular shrink-0 text-[12px] text-muted-foreground" aria-hidden>
              {percent}%
            </span>
          )}
        </p>
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
          role="progressbar"
          aria-label={download ? "AI model download" : "Background removal"}
          aria-valuemin={percent === null ? undefined : 0}
          aria-valuemax={percent === null ? undefined : 100}
          aria-valuenow={percent ?? undefined}
        >
          {percent === null ? (
            <div className="animate-progress h-full w-1/3 rounded-full bg-primary" />
          ) : (
            <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${percent}%` }} />
          )}
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        <X />
        Cancel
      </button>
    </div>
  );
}
