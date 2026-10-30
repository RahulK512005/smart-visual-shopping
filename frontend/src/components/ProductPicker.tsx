"use client";
import { useEffect, useState } from "react";
import { ApiError, formatPrice, getProductPage, type ProductPage } from "@/lib/api";
import type { Product } from "@/lib/types";
import { FilterChips } from "./FilterChips";
import { ProductImage } from "./ProductImage";
import { EmptyState, ErrorBox, Spinner } from "./States";

export const CATEGORIES = ["smartphone", "laptop", "smartwatch", "charger", "cable", "case", "audio", "monitor", "hub"];

/** Catalog picker. Click a product to select it, click it again to deselect. Search and category are handled by the backend. */
export function ProductPicker({ label, selected, onSelect }: { label: string; selected: Product | null; onSelect: (p: Product | null) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [pageInfo, setPageInfo] = useState<Pick<ProductPage, "page" | "totalPages" | "total">>({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    setLoading(true); setError(null);
    getProductPage({ q: debounced, category: cat[0], page: 1, pageSize: 8 }, ctl.signal)
      .then((p) => { setItems(p.items); setPageInfo({ page: p.page, totalPages: p.totalPages, total: p.total }); })
      .catch((e) => { if (!ctl.signal.aborted) setError(e instanceof ApiError ? e.message : "We couldn't load products."); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [debounced, cat, reloadKey]);

  async function more() {
    setLoading(true);
    try {
      const p = await getProductPage({ q: debounced, category: cat[0], page: pageInfo.page + 1, pageSize: 8 });
      setItems((cur) => [...cur, ...p.items]);
      setPageInfo({ page: p.page, totalPages: p.totalPages, total: p.total });
    } catch (e) { setError(e instanceof ApiError ? e.message : "We couldn't load more products."); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="sr-only" htmlFor={`pick-${label}`}>Search the catalog</label>
        <input id={`pick-${label}`} className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, brand or model" />
      </div>
      <FilterChips label="Filter by category" options={CATEGORIES.map((c) => ({ value: c }))} selected={cat} onChange={setCat} />

      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && !loading && items.length === 0 && (
        <EmptyState title="We could not find a close match in this demo catalog">Try a different name, or clear the filters.</EmptyState>
      )}
      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((p) => {
          const on = selected?.id === p.id;
          return (
            <li key={p.id}>
              <button type="button" aria-pressed={on} onClick={() => onSelect(on ? null : p)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition-all duration-200 ${on ? "border-ink bg-volt shadow-lift" : "border-line bg-white hover:-translate-y-0.5 hover:border-ink"}`}>
                <ProductImage src={p.imageUrl} alt="" category={p.category} className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{p.name}</span>
                  <span className="block truncate text-xs text-ink/60">{[p.brand, formatPrice(p.price, p.currency)].filter(Boolean).join(" · ")}</span>
                </span>
                <span aria-hidden className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${on ? "border-ink bg-ink text-volt" : "border-ink/20 text-transparent"}`}>✓</span>
                <span className="sr-only">{on ? "Selected. Click to deselect." : "Click to select."}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {loading && <Spinner label="Loading products" />}
      {!loading && pageInfo.page < pageInfo.totalPages && (
        <button type="button" className="btn-secondary w-full" onClick={more}>Show more ({pageInfo.total - items.length} left)</button>
      )}
    </div>
  );
}
