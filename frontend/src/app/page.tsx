"use client";

import Link from "next/link";
import { getHealth, getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { EmptyState, ErrorBox, SkeletonGrid } from "@/components/States";
import { ProductCard } from "@/components/ProductCard";
import { UnifiedShoppingExperience } from "@/components/UnifiedShoppingExperience";

function BackendStatus() {
  const { state } = useAsync(() => getHealth(), []);
  const text =
    state.status === "loading"
      ? "Checking backend…"
      : state.status === "error"
      ? "Backend unreachable"
      : state.data.ok
      ? "Backend & FAISS connected"
      : "Backend reports a problem";
  const good = state.status === "ready" && state.data.ok;
  return (
    <p
      role="status"
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${
        good ? "border-ok text-ok bg-ok-tint/30" : "border-line text-muted"
      }`}
    >
      <span aria-hidden>{good ? "✓" : state.status === "loading" ? "…" : "!"}</span>
      {text}
    </p>
  );
}

export default function Home() {
  const { state, reload } = useAsync((s) => getProducts(s), []);

  return (
    <div className="space-y-12">
      <div className="flex items-center justify-between">
        <BackendStatus />
        <span className="text-xs text-muted font-medium">320+ Indexed Products in FAISS Vector Store</span>
      </div>

      {/* Primary Unified Experience: Mode A & Mode B in ONE Tool */}
      <UnifiedShoppingExperience />

      {/* Catalog Preview */}
      <section aria-labelledby="browse" className="pt-8 border-t border-line">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 id="browse" className="text-xl font-bold text-ink">
              Verified Product Catalog
            </h2>
            <p className="text-sm text-muted">
              Browse products with complete, verified specifications, charging protocols, and dimensions.
            </p>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-dark hover:underline"
          >
            Browse all 320+ products →
          </Link>
        </div>
        <div className="mt-4">
          {state.status === "loading" && <SkeletonGrid count={3} />}
          {state.status === "error" && <ErrorBox message={state.error} onRetry={reload} />}
          {state.status === "ready" && state.data.length === 0 && (
            <EmptyState title="The catalog is empty">
              Products will appear here once the backend has loaded them.
            </EmptyState>
          )}
          {state.status === "ready" && state.data.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.data.slice(0, 3).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
