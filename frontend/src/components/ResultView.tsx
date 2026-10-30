import Link from "next/link";
import { formatPrice } from "@/lib/api";
import type { CompatibilityCheck, CompatibilityResult, Product } from "@/lib/types";
import { ProductImage } from "./ProductImage";
import { SpecTable } from "./SpecTable";
import { STATUS_META, VERDICT_META, VerdictBadge } from "./Verdict";

function Summary({ title, p }: { title: string; p: Product }) {
  return (
    <section
      className="flex items-center gap-4 p-4 rounded-2xl"
      style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}
      aria-label={title}
    >
      <ProductImage src={p.imageUrl} alt={p.name} category={p.category} className="h-18 w-18 shrink-0 rounded-xl" />
      <div className="min-w-0">
        <p className="eyebrow">{title}</p>
        <Link href={`/products/${encodeURIComponent(p.id)}`} className="block truncate font-display text-base font-bold text-white hover:text-volt transition-colors">
          {p.name}
        </Link>
        <p className="truncate text-xs text-white/40">{[p.brand, p.model, formatPrice(p.price, p.currency)].filter(Boolean).join(" · ")}</p>
      </div>
    </section>
  );
}

function Checks({ title, items, open }: { title: string; items: CompatibilityCheck[]; open?: boolean }) {
  if (items.length === 0) return null;
  const s0 = items[0] ? STATUS_META[items[0].status] : null;
  return (
    <details
      open={open}
      className="group overflow-hidden rounded-2xl"
      style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-display text-base font-bold text-white hover:bg-white/5 transition-colors">
        <span className="flex items-center gap-2">
          {s0 && (
            <span
              className="h-2 w-2 rounded-full"
              style={{
                background: s0.dot === "neon" ? "#06FFA5" : s0.dot === "bad" ? "#FF4444" : s0.dot === "warn" ? "#FFB800" : "#A78BFA"
              }}
            />
          )}
          {title}
          <span className="ml-1 text-sm font-normal text-white/40">({items.length})</span>
        </span>
        <span aria-hidden className="text-xl text-white/40 transition-transform duration-300 group-open:rotate-45">+</span>
      </summary>
      <ul className="space-y-4 border-t border-white/5 p-5">
        {items.map((c, i) => {
          const s = STATUS_META[c.status];
          return (
            <li key={`${c.name}-${i}`} className="flex gap-3">
              <span
                aria-hidden
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-ink"
                style={{
                  background: s.dot === "neon"
                    ? "linear-gradient(135deg,#06FFA5,#00D9FF)"
                    : s.dot === "bad"
                    ? "linear-gradient(135deg,#FF4444,#FF6B6B)"
                    : s.dot === "warn"
                    ? "linear-gradient(135deg,#FFB800,#FF8C00)"
                    : "linear-gradient(135deg,#A78BFA,#7C3AED)"
                }}
              >
                {s.icon}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-bold text-white">
                  {c.name}{" "}
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: s.dot === "neon" ? "#06FFA5" : s.dot === "bad" ? "#FF6B6B" : s.dot === "warn" ? "#FFB800" : "#A78BFA"
                    }}
                  >
                    ({s.label}{c.severity ? `, ${c.severity}` : ""})
                  </span>
                </p>
                {c.explanation && <p className="mt-1 text-sm leading-relaxed text-white/60">{c.explanation}</p>}
                {(c.ownedValue || c.candidateValue) && (
                  <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-white/30">What you own</dt>
                      <dd className="mt-0.5 font-semibold text-white">{c.ownedValue ?? "Not provided"}</dd>
                    </div>
                    <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.06)" }}>
                      <dt className="text-xs font-bold uppercase tracking-wide text-white/30">What you want</dt>
                      <dd className="mt-0.5 font-semibold text-white">{c.candidateValue ?? "Not provided"}</dd>
                    </div>
                  </dl>
                )}
                {c.evidence.length > 0 && (
                  <p className="mt-2 text-xs text-white/30">Evidence: {c.evidence.join("; ")}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </details>
  );
}

export function ResultView({ result, owned, candidate, onChange }: { result: CompatibilityResult; owned: Product; candidate: Product; onChange: () => void }) {
  const meta = VERDICT_META[result.verdict];
  const by = (s: CompatibilityCheck["status"][]) => result.checks.filter((c) => s.includes(c.status));

  return (
    <div className="animate-rise space-y-6" data-testid="compat-result">
      {/* Verdict hero */}
      <section
        role="status"
        aria-label="Compatibility verdict"
        className="relative overflow-hidden rounded-2xl p-7 sm:p-10"
        style={{ background: meta.bg, border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 20px 60px rgba(0,0,0,.4)" }}
      >
        {/* BG orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb absolute -right-16 -top-16 h-48 w-48 opacity-20" style={{ background: "radial-gradient(circle,rgba(255,255,255,.3),transparent)" }} />
          <div className="orb absolute -bottom-20 right-32 h-40 w-40 opacity-10" style={{ background: "radial-gradient(circle,rgba(255,255,255,.3),transparent)" }} />
        </div>
        <p className="eyebrow relative">Verdict</p>
        <div className="animate-pop relative mt-3"><VerdictBadge verdict={result.verdict} /></div>
        <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-white/80 sm:text-lg">{result.summary ?? meta.blurb}</p>
        <p className="relative mt-4 text-xs font-semibold text-white/40">Decided by the VYUMI rules engine from verified specs. It is not an AI guess.</p>
      </section>

      {/* Products comparison */}
      <div className="grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <Summary title="What you own" p={owned} />
        <span
          aria-hidden
          className="hidden h-10 w-10 items-center justify-center rounded-full font-display text-lg font-extrabold text-ink sm:flex"
          style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}
        >
          +
        </span>
        <Summary title="What you want" p={candidate} />
      </div>

      {/* Checks */}
      <Checks title="Failed checks" items={by(["failed"])} open />
      <Checks title="Warnings and unverified checks" items={by(["warning", "unknown"])} open />
      <Checks title="Passed checks" items={by(["passed"])} />
      {result.checks.length === 0 && <p className="text-sm text-white/40">The backend did not return individual checks for this result.</p>}

      {/* Missing specs */}
      {result.missingSpecs.length > 0 && (
        <section
          className="rounded-2xl border-2 border-dashed p-5"
          style={{ borderColor: "rgba(167,139,250,.25)", background: "rgba(167,139,250,.06)" }}
        >
          <h3 className="font-display text-lg font-bold text-white">What would resolve this</h3>
          <p className="mt-1 text-sm text-white/40">Missing specifications:</p>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            {result.missingSpecs.map((m) => (
              <li key={m} className="flex gap-2">
                <span aria-hidden className="font-extrabold text-volt/60">?</span>
                <span>{m}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <section
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,184,0,.06)", border: "1px solid rgba(255,184,0,.15)" }}
        >
          <h3 className="font-display text-lg font-bold" style={{ color: "#FFB800" }}>Warnings</h3>
          <ul className="mt-2 space-y-2 text-sm text-white/60">
            {result.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <span aria-hidden style={{ color: "#FFB800" }}>!</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Evidence */}
      {result.evidence.length > 0 && (
        <section
          className="rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
        >
          <h3 className="font-display text-lg font-bold text-white">Evidence</h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-white/50">
            {result.evidence.map((e) => <li key={e} className="break-words">{e}</li>)}
          </ul>
        </section>
      )}

      {/* Spec table */}
      <details
        className="group overflow-hidden rounded-2xl"
        style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between p-5 font-display text-base font-bold text-white hover:bg-white/5 transition-colors">
          Compare specifications
          <span aria-hidden className="text-xl text-white/40 transition-transform duration-300 group-open:rotate-45">+</span>
        </summary>
        <div className="grid gap-6 border-t border-white/5 p-5 sm:grid-cols-2">
          <div>
            <h4 className="mb-3 font-bold text-white/80">{owned.name}</h4>
            <SpecTable specs={owned.specs} caption={`Specifications for ${owned.name}`} />
          </div>
          <div>
            <h4 className="mb-3 font-bold text-white/80">{candidate.name}</h4>
            <SpecTable specs={candidate.specs} caption={`Specifications for ${candidate.name}`} />
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-primary" onClick={onChange}>Try another</button>
        <Link href={`/products/${encodeURIComponent(candidate.id)}`} className="btn-secondary">View product</Link>
      </div>
    </div>
  );
}
