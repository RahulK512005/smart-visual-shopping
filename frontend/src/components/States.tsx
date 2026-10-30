import type { ReactNode } from "react";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" className="flex items-center gap-3 py-8 text-sm font-medium text-white/40">
      <span
        aria-hidden
        className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-volt"
      />
      <span>{label}…</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry, title = "That didn't work" }: { message: string; onRetry?: () => void; title?: string }) {
  return (
    <div
      role="alert"
      className="animate-rise rounded-2xl p-5 text-sm"
      style={{ background: "rgba(255,68,68,.08)", border: "1px solid rgba(255,68,68,.2)" }}
    >
      <p className="flex items-center gap-2 font-display text-base font-bold" style={{ color: "#FF6B6B" }}>
        <span
          aria-hidden
          className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
          style={{ background: "#FF4444" }}
        >
          ✕
        </span>
        {title}
      </p>
      <p className="mt-2 text-white/60">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-secondary mt-4">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div
      className="animate-rise rounded-2xl p-12 text-center"
      style={{
        background: "rgba(255,255,255,.02)",
        border: "1px solid rgba(255,255,255,.06)",
        backdropFilter: "blur(12px)"
      }}
    >
      <div
        aria-hidden
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
        style={{ background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.2)" }}
      >
        ◌
      </div>
      <p className="font-display text-lg font-bold text-white">{title}</p>
      {children && (
        <div className="mx-auto mt-2 max-w-md text-sm text-white/40 leading-relaxed">{children}</div>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div role="status" aria-label="Loading products" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl"
          style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.06)" }}
        >
          <div className="skeleton h-48 w-full" style={{ animationDelay: `${i * 0.1}s` }} />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-1/3 rounded-full" />
            <div className="skeleton h-4 w-4/5 rounded-full" />
            <div className="skeleton h-4 w-1/4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
