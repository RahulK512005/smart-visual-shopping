import type { CheckStatus, Verdict } from "@/lib/types";

export const VERDICT_META: Record<Verdict, { label: string; icon: string; cls: string; blurb: string }> = {
  compatible: { label: "Compatible", icon: "✓", cls: "border-ok bg-ok-tint text-ok", blurb: "Fully Compatible: Verified hardware, protocol, and interface alignment." },
  partially_compatible: { label: "Partly Compatible", icon: "⚡", cls: "border-amber-500 bg-amber-50 text-amber-700", blurb: "Partly Compatible: Works with technical advisories or reduced speed." },
  incompatible: { label: "Incompatible", icon: "✕", cls: "border-bad bg-bad-tint text-bad", blurb: "Not Compatible: At least one critical hardware requirement fails." },
  cannot_verify: { label: "Cannot verify", icon: "?", cls: "border-warn bg-warn-tint text-warn", blurb: "Not Enough Information: Missing verified technical specifications to decide." },
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
