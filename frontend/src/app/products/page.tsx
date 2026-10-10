"use client";
import { getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorBox, SkeletonGrid } from "@/components/States";

export default function CatalogPage() {
  const { state, reload } = useAsync((s) => getProducts(s), []);
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Catalog</h1>
      {state.status === "loading" && <SkeletonGrid />}
      {state.status === "error" && <ErrorBox message={state.error} onRetry={reload} />}
      {state.status === "ready" && state.data.length === 0 && <EmptyState title="No products yet">The backend returned an empty catalog.</EmptyState>}
      {state.status === "ready" && state.data.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {state.data.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
