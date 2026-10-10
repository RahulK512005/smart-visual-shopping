import { stageLabel } from "../utils/format";

export default function ProgressPanel({ stage, progress }: { stage?: string; progress?: number }) {
  return (
    <div className="progress" role="status" aria-live="polite">
      <p><strong>{stageLabel(stage)}…</strong></p>
      <div className="bar" aria-hidden="true">
        <span style={progress !== undefined ? { width: `${Math.max(8, progress)}%` } : undefined} className={progress === undefined ? "indeterminate" : ""} />
      </div>
    </div>
  );
}
