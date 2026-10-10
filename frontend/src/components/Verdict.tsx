import type { CheckStatus, Verdict } from "@/lib/types";

export const VERDICT_META: Record<Verdict, { label: string; icon: string; cls: string; blurb: string }> = {
  compatible: { label: "Compatible", icon: "✓", cls: "border-ok bg-ok-tint text-ok", blurb: "The backend found these products work together." },
  incompatible: { label: "Incompatible", icon: "✕", cls: "border-bad bg-bad-tint text-bad", blurb: "The backend found at least one check that fails." },
  cannot_verify: { label: "Cannot verify", icon: "?", cls: "border-warn bg-warn-tint text-warn", blurb: "There isn't enough verified information to decide." },
};

export const STATUS_META: Record<CheckStatus, { label: string; icon: string; cls: string }> = {
  passed: { label: "Passed", icon: "✓", cls: "text-ok" },
  failed: { label: "Failed", icon: "✕", cls: "text-bad" },
  warning: { label: "Warning", icon: "!", cls: "text-warn" },
  unknown: { label: "Unverified", icon: "?", cls: "text-warn" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span className={`inline-flex items-center gap-2 rounded-md border-2 px-3 py-1.5 text-lg font-bold ${m.cls}`}>
      <span aria-hidden>{m.icon}</span>{m.label}
    </span>
  );
}
