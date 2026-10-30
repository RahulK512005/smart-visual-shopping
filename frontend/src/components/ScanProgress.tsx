"use client";
import { useEffect, useState } from "react";

/** Shows work in progress. The step labels advance on a timer: they describe the stages, not measured progress. */
export function ScanProgress({ steps, title }: { steps: string[]; title: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => Math.min(n + 1, steps.length - 1)), 1500);
    return () => clearInterval(t);
  }, [steps.length]);

  const progress = ((i + 1) / steps.length) * 100;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise overflow-hidden rounded-2xl p-6"
      style={{
        background: "linear-gradient(145deg, rgba(124,58,237,.1), rgba(10,10,15,.9))",
        border: "1px solid rgba(167,139,250,.2)",
        boxShadow: "0 8px 32px rgba(124,58,237,.15)"
      }}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="h-8 w-8 flex items-center justify-center rounded-full text-sm"
          style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)" }}
        >
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
        <p className="font-display text-lg font-bold text-white">{title}</p>
      </div>

      <ol className="space-y-3">
        {steps.map((s, n) => (
          <li
            key={s}
            className={`flex items-center gap-3 text-sm font-medium transition-all duration-500 ${n > i ? "opacity-25" : "opacity-100"}`}
          >
            <span
              aria-hidden
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-extrabold transition-all duration-300 ${
                n < i
                  ? "text-ink"
                  : n === i
                  ? "text-ink animate-pulse-ring"
                  : "text-white/30 border border-white/10"
              }`}
              style={n < i
                ? { background: "linear-gradient(135deg,#06FFA5,#00D9FF)" }
                : n === i
                ? { background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }
                : { background: "rgba(255,255,255,.05)" }
              }
            >
              {n < i ? "✓" : n + 1}
            </span>
            <span className={n < i ? "text-white/60 line-through" : n === i ? "text-white" : "text-white/30"}>
              {s}
            </span>
          </li>
        ))}
      </ol>

      {/* Progress bar */}
      <div className="mt-6 h-1 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.06)" }} aria-hidden>
        <div
          className="h-full rounded-full transition-all duration-1000"
          style={{
            width: `${progress}%`,
            background: "linear-gradient(90deg,#7C3AED,#A78BFA,#06FFA5)",
            boxShadow: "0 0 10px rgba(167,139,250,.5)"
          }}
        />
      </div>
    </div>
  );
}
