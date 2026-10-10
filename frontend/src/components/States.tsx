import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-6 text-sm text-muted">
      <span aria-hidden className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-brand" />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-lg border border-bad bg-bad-tint p-4 text-sm text-bad">
      <p className="font-semibold"><span aria-hidden>✕ </span>Something went wrong</p>
      <p className="mt-1 text-ink">{message}</p>
      {onRetry && <button type="button" onClick={onRetry} className="btn-secondary mt-3">Try again</button>}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card p-8 text-center">
      <p className="font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-muted">{children}</div>}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => <div key={i} className="card h-72 animate-pulse bg-line/40" />)}
    </div>
  );
}
