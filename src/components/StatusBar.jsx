import { Loader2, TriangleAlert, X } from "lucide-react";

/**
 * Progress while a job runs, or the error from the last one.
 *
 * The first run spends most of its time fetching the model; that progress
 * drives the bar, but users only need to know the background is being removed.
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

  const percent = status.stage?.phase === "download" ? status.stage.percent : null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
      <Loader2 className="size-4 shrink-0 animate-spin text-primary" aria-hidden />
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[13px] font-medium">Removing background…</p>
        <div
          className="relative h-1.5 w-full overflow-hidden rounded-full bg-primary/15"
          role="progressbar"
          aria-label="Background removal progress"
          aria-valuemin={0}
          aria-valuemax={100}
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
