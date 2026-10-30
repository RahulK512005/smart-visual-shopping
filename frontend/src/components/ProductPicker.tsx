"use client";
import { useEffect, useState } from "react";
import { ApiError, formatPrice, getProductPage, type ProductPage } from "@/lib/api";
import type { Product } from "@/lib/types";
import { FilterChips } from "./FilterChips";
import { ProductImage } from "./ProductImage";
import { EmptyState, ErrorBox, Spinner } from "./States";

export const FASHION_CATEGORIES = ["clothing", "footwear", "watches", "accessories"];
export const TECH_CATEGORIES = ["smartphone", "laptop", "smartwatch", "charger", "cable", "case", "audio", "monitor", "hub"];
export const CATEGORIES = [...FASHION_CATEGORIES, ...TECH_CATEGORIES];

const CATEGORY_LABELS: Record<string, string> = {
  clothing: "Clothing & Tops",
  footwear: "Shoes & Footwear",
  watches: "Watches",
  accessories: "Bags & Accessories",
  smartphone: "Smartphone",
  laptop: "Laptop",
  smartwatch: "Smartwatch",
  charger: "Charger",
  cable: "Cable",
  case: "Case",
  audio: "Audio",
  monitor: "Monitor",
  hub: "Hub",
};

/** Dual-catalog picker: seamlessly switches between Gen-Z Fashion Apparel and Tech & Electronics. */
export function ProductPicker({ label, selected, onSelect }: { label: string; selected: Product | null; onSelect: (p: Product | null) => void }) {
  const [department, setDepartment] = useState<"fashion" | "tech">("fashion");
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

    // Determine target category filter:
    // If a specific chip is selected, use it.
    // If no chip is selected and no search text is entered, constrain to active department.
    let targetCat: string | undefined = cat[0];
    if (!targetCat && !debounced.trim()) {
      targetCat = department === "fashion" ? FASHION_CATEGORIES.join(",") : TECH_CATEGORIES.join(",");
    }

    getProductPage({ q: debounced, category: targetCat, page: 1, pageSize: 8 }, ctl.signal)
      .then((p) => { setItems(p.items); setPageInfo({ page: p.page, totalPages: p.totalPages, total: p.total }); })
      .catch((e) => { if (!ctl.signal.aborted) setError(e instanceof ApiError ? e.message : "We couldn't load products."); })
      .finally(() => { if (!ctl.signal.aborted) setLoading(false); });
    return () => ctl.abort();
  }, [debounced, cat, department, reloadKey]);

  async function more() {
    setLoading(true);
    try {
      let targetCat: string | undefined = cat[0];
      if (!targetCat && !debounced.trim()) {
        targetCat = department === "fashion" ? FASHION_CATEGORIES.join(",") : TECH_CATEGORIES.join(",");
      }
      const p = await getProductPage({ q: debounced, category: targetCat, page: pageInfo.page + 1, pageSize: 8 });
      setItems((cur) => [...cur, ...p.items]);
      setPageInfo({ page: p.page, totalPages: p.totalPages, total: p.total });
    } catch (e) { setError(e instanceof ApiError ? e.message : "We couldn't load more products."); }
    finally { setLoading(false); }
  }

  const activeCategories = department === "fashion" ? FASHION_CATEGORIES : TECH_CATEGORIES;

  return (
    <div className="space-y-4">
      {/* Department Switcher */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-xl p-1 bg-white/5 border border-white/10" role="tablist" aria-label="Catalog Department">
          <button
            type="button"
            role="tab"
            aria-selected={department === "fashion"}
            onClick={() => { setDepartment("fashion"); setCat([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              department === "fashion"
                ? "bg-gradient-to-r from-neon to-cyan text-ink shadow-[0_0_12px_rgba(6,255,165,0.3)]"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>👗</span>
            <span>Fashion Catalog</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={department === "tech"}
            onClick={() => { setDepartment("tech"); setCat([]); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              department === "tech"
                ? "bg-gradient-to-r from-neon to-cyan text-ink shadow-[0_0_12px_rgba(6,255,165,0.3)]"
                : "text-white/60 hover:text-white"
            }`}
          >
            <span>⚡</span>
            <span>Tech & Gadgets</span>
          </button>
        </div>
        <span className="text-xs text-white/40 hidden sm:inline">
          {department === "fashion" ? "Outfit Styling & Aesthetics" : "Hardware Compatibility"}
        </span>
      </div>

      <div>
        <label className="sr-only" htmlFor={`pick-${label}`}>Search the catalog</label>
        <input
          id={`pick-${label}`}
          className="input"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={department === "fashion" ? "Search clothing, sneakers, dresses, bags..." : "Search name, brand or model..."}
        />
      </div>

      <FilterChips
        label="Filter by category"
        options={activeCategories.map((c) => ({ value: c, label: CATEGORY_LABELS[c] || c }))}
        selected={cat}
        onChange={setCat}
      />

      {error && <ErrorBox message={error} onRetry={() => setReloadKey((k) => k + 1)} />}
      {!error && !loading && items.length === 0 && (
        <EmptyState title="We could not find a close match in this catalog">Try a different search term, or clear the category filters.</EmptyState>
      )}

      <ul className="grid gap-2 sm:grid-cols-2">
        {items.map((p) => {
          const on = selected?.id === p.id;
          return (
            <li key={p.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(on ? null : p)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition-all duration-200 ${
                  on ? "border-neon bg-neon/15 shadow-[0_0_20px_rgba(6,255,165,0.2)]" : "border-white/10 bg-white/5 hover:-translate-y-0.5 hover:border-white/20"
                }`}
              >
                <ProductImage src={p.imageUrl} alt="" category={p.category} className="h-14 w-14 shrink-0 rounded-xl" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-white">{p.name}</span>
                  <span className="block truncate text-xs text-white/50">{[p.brand, formatPrice(p.price, p.currency)].filter(Boolean).join(" · ")}</span>
                </span>
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs font-extrabold ${
                    on ? "border-neon bg-neon text-ink" : "border-white/20 text-transparent"
                  }`}
                >
                  ✓
                </span>
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
