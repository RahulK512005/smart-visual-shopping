import type { CheckStatus, Verdict } from "@/lib/types";

export const VERDICT_META: Record<Verdict, { label: string; icon: string; bg: string; chip: string; blurb: string }> = {
  compatible: {
    label: "Compatible",
    icon: "✓",
    bg: "linear-gradient(145deg, rgba(6,255,165,.15), rgba(10,10,15,.95))",
    chip: "linear-gradient(135deg,#06FFA5,#00D9FF)",
    blurb: "Verified hardware, protocol and interface all line up.",
  },
  partially_compatible: {
    label: "Partly compatible",
    icon: "~",
    bg: "linear-gradient(145deg, rgba(255,184,0,.12), rgba(10,10,15,.95))",
    chip: "linear-gradient(135deg,#FFB800,#FF8C00)",
    blurb: "It works, with advisories or reduced performance.",
  },
  incompatible: {
    label: "Not compatible",
    icon: "✕",
    bg: "linear-gradient(145deg, rgba(255,68,68,.12), rgba(10,10,15,.95))",
    chip: "linear-gradient(135deg,#FF4444,#FF6B6B)",
    blurb: "At least one critical requirement fails.",
  },
  cannot_verify: {
    label: "Not enough information",
    icon: "?",
    bg: "linear-gradient(145deg, rgba(167,139,250,.12), rgba(10,10,15,.95))",
    chip: "linear-gradient(135deg,#A78BFA,#7C3AED)",
    blurb: "We can't decide without the missing details below.",
  },
};

export const STATUS_META: Record<CheckStatus, { label: string; icon: string; dot: string; text: string }> = {
  passed: { label: "Passed", icon: "✓", dot: "neon", text: "text-neon" },
  failed: { label: "Failed", icon: "✕", dot: "bad", text: "text-bad" },
  warning: { label: "Warning", icon: "!", dot: "warn", text: "text-warn" },
  unknown: { label: "Unverified", icon: "?", dot: "volt", text: "text-volt/70" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const m = VERDICT_META[verdict];
  return (
    <span
      className="inline-flex items-center gap-3 rounded-full py-2.5 pl-2.5 pr-6 font-display text-2xl font-extrabold text-white shadow-neon"
      style={{ background: "rgba(255,255,255,.1)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,.15)" }}
    >
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold text-ink"
        style={{ background: m.chip }}
      >
        {m.icon}
      </span>
      <span>{m.label}</span>
    </span>
  );
}
