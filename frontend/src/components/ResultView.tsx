import type { CompatibilityResult, Product } from "@/lib/types";
import { formatPrice } from "@/lib/api";
import { ProductImage } from "./ProductImage";
import { SpecTable } from "./SpecTable";
import { STATUS_META, VERDICT_META, VerdictBadge } from "./Verdict";

function Summary({ title, p }: { title: string; p: Product }) {
  return (
    <section className="card flex gap-3 p-4" aria-label={title}>
      <ProductImage src={p.imageUrl} alt={p.name} className="h-20 w-20 shrink-0 rounded" />
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted">{title}</p>
        <p className="font-semibold">{p.name}</p>
        <p className="text-sm text-muted">{[p.brand, p.model, formatPrice(p.price, p.currency)].filter(Boolean).join(" · ")}</p>
      </div>
    </section>
  );
}

export function ResultView({ result, owned, candidate, onChange }: { result: CompatibilityResult; owned: Product; candidate: Product; onChange: () => void }) {
  const meta = VERDICT_META[result.verdict];
  const group = (s: CompatibilityResult["checks"][number]["status"][]) => result.checks.filter((c) => s.includes(c.status));
  const failed = group(["failed"]);
  const passed = group(["passed"]);
  const uncertain = group(["warning", "unknown"]);

  const Checks = ({ title, items }: { title: string; items: typeof result.checks }) =>
    items.length === 0 ? null : (
      <section className="card p-4">
        <h3 className="font-semibold">{title} ({items.length})</h3>
        <ul className="mt-3 space-y-4">
          {items.map((c, i) => {
            const s = STATUS_META[c.status];
            return (
              <li key={`${c.name}-${i}`} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <p className={`font-medium ${s.cls}`}><span aria-hidden>{s.icon} </span>{c.name} <span className="text-sm font-normal">({s.label}{c.severity ? `, ${c.severity}` : ""})</span></p>
                {c.explanation && <p className="mt-1 text-sm">{c.explanation}</p>}
                {(c.ownedValue || c.candidateValue) && (
                  <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                    <div><dt className="text-muted">Product you own</dt><dd>{c.ownedValue ?? "Not provided"}</dd></div>
                    <div><dt className="text-muted">Product to buy</dt><dd>{c.candidateValue ?? "Not provided"}</dd></div>
                  </dl>
                )}
                {c.evidence.length > 0 && <p className="mt-2 text-xs text-muted">Evidence: {c.evidence.join("; ")}</p>}
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="space-y-4" data-testid="compat-result">
      <div className="grid gap-4 sm:grid-cols-2">
        <Summary title="Product you own" p={owned} />
        <Summary title="Product to buy" p={candidate} />
      </div>
      <section role="status" aria-label="Compatibility verdict" className={`rounded-lg border-2 p-5 ${meta.cls}`}>
        <VerdictBadge verdict={result.verdict} />
        <p className="mt-2 text-ink">{result.summary ?? meta.blurb}</p>
      </section>
      <Checks title="Failed checks" items={failed} />
      <Checks title="Warnings and unverified checks" items={uncertain} />
      <Checks title="Passed checks" items={passed} />
      {result.checks.length === 0 && <p className="text-sm text-muted">The backend did not return individual checks for this result.</p>}
      {result.missingSpecs.length > 0 && (
        <section className="card border-warn p-4">
          <h3 className="font-semibold text-warn"><span aria-hidden>? </span>Missing specifications</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{result.missingSpecs.map((m) => <li key={m}>{m}</li>)}</ul>
        </section>
      )}
      {result.warnings.length > 0 && (
        <section className="card border-warn p-4">
          <h3 className="font-semibold text-warn"><span aria-hidden>! </span>Warnings</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{result.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </section>
      )}
      {result.evidence.length > 0 && (
        <section className="card p-4">
          <h3 className="font-semibold">Evidence</h3>
          <ul className="mt-2 list-disc pl-5 text-sm">{result.evidence.map((e) => <li key={e} className="break-words">{e}</li>)}</ul>
        </section>
      )}
      <details className="card p-4">
        <summary className="cursor-pointer font-semibold">Compare specifications</summary>
        <div className="mt-3 grid gap-6 sm:grid-cols-2">
          <div><h4 className="mb-1 text-sm font-semibold">{owned.name}</h4><SpecTable specs={owned.specs} caption={`Specifications for ${owned.name}`} /></div>
          <div><h4 className="mb-1 text-sm font-semibold">{candidate.name}</h4><SpecTable specs={candidate.specs} caption={`Specifications for ${candidate.name}`} /></div>
        </div>
      </details>
      <button type="button" className="btn-secondary" onClick={onChange}>Change products and check again</button>
    </div>
  );
}
