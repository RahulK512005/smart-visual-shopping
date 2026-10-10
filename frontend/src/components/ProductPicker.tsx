"use client";
import { useMemo, useState } from "react";
import { getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { Product } from "@/lib/types";
import { EmptyState, ErrorBox, Spinner } from "./States";
import { ProductImage } from "./ProductImage";

export function ProductPicker({ label, selected, onSelect }: { label: string; selected: Product | null; onSelect: (p: Product) => void }) {
  const { state, reload } = useAsync((s) => getProducts(s), []);
  const [q, setQ] = useState("");
  const products = useMemo(() => (state.status === "ready" ? state.data : []), [state]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? products.filter((p) => [p.name, p.brand, p.model, p.category].join(" ").toLowerCase().includes(needle)) : products;
  }, [products, q]);

  return (
    <div>
      <label className="text-sm font-medium" htmlFor={`pick-${label}`}>Search the catalog</label>
      <input id={`pick-${label}`} className="input mt-1" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, brand or model" />
      <div className="mt-3 max-h-80 overflow-y-auto">
        {state.status === "loading" && <Spinner label="Loading products" />}
        {state.status === "error" && <ErrorBox message={state.error} onRetry={reload} />}
        {state.status === "ready" && shown.length === 0 && <EmptyState title="No products match">Try a different name or brand.</EmptyState>}
        <ul className="space-y-2">
          {shown.map((p) => {
            const isSel = selected?.id === p.id;
            return (
              <li key={p.id}>
                <button type="button" aria-pressed={isSel} onClick={() => onSelect(p)}
                  className={`flex w-full items-center gap-3 rounded-md border p-2 text-left ${isSel ? "border-brand bg-brand-tint" : "border-line bg-white hover:bg-paper"}`}>
                  <ProductImage src={p.imageUrl} alt={p.name} className="h-12 w-12 shrink-0 rounded" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{p.name}</span>
                    <span className="block truncate text-xs text-muted">{[p.brand, p.model].filter(Boolean).join(" · ")}</span>
                  </span>
                  {isSel && <span className="text-xs font-semibold text-brand-dark">✓ Selected</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
