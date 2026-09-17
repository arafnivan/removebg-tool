import { AlertIcon } from "./Icons";

function stageLabel(stage) {
  if (!stage) return "Starting…";
  if (stage.phase === "download") return `Downloading AI model… ${stage.percent}%`;
  return "Removing background…";
}

/** Progress while a job runs, or the error from the last one. */
export function StatusBar({ status, onCancel, onRetry }) {
  if (status.kind === "error") {
    return (
      <div className="alert" role="alert">
        <AlertIcon />
        <div className="alert-body">
          <p className="alert-title">Couldn't remove the background</p>
          <p>{status.message}</p>
        </div>
        <button type="button" className="button button-outline button-sm" onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }

  if (status.kind !== "running") return null;

  // Only the download reports real numbers; inference shows an animated bar.
  const percent = status.stage?.phase === "download" ? status.stage.percent : null;

  return (
    <div className="status">
      <span className="spinner" aria-hidden="true" />
      <div className="status-body">
        <p className="status-text">{stageLabel(status.stage)}</p>
        <div
          className={`progress${percent === null ? " is-indeterminate" : ""}`}
          role="progressbar"
          aria-label="Background removal progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent ?? undefined}
        >
          <div className="progress-bar" style={percent === null ? undefined : { width: `${percent}%` }} />
        </div>
      </div>
      <button type="button" className="button button-ghost button-sm" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
