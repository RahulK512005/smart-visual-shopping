"use client";
import { useEffect, useState } from "react";
import { ApiError, getProductPage } from "@/lib/api";
import type { Product } from "@/lib/types";
import { CATEGORIES } from "@/components/ProductPicker";
import { FilterChips } from "@/components/FilterChips";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorBox, SkeletonGrid, Spinner } from "@/components/States";

export default function CatalogPage() {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [cat, setCat] = useState<string[]>([]);
  const [items, setItems] = useState<Product[]>([]);
  const [info, setInfo] = useState({ page: 1, totalPages: 1, total: 0 });
  const [first, setFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState(0);

  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);

  useEffect(() => {
    const ctl = new AbortController();
    setFirst(true); setError(null);
    getProductPage({ q: debounced, category: cat[0], page: 1, pageSize: 12 }, ctl.signal)
      .then((p) => { setItems(p.items); setInfo({ page: p.page, totalPages: p.totalPages, total: p.total }); })
      .catch((e) => { if (!ctl.signal.aborted) setError(e instanceof ApiError ? e.message : "We couldn't load the catalog."); })
      .finally(() => { if (!ctl.signal.aborted) setFirst(false); });
    return () => ctl.abort();
  }, [debounced, cat, key]);

  async function more() {
    setLoadingMore(true);
    try {
      const p = await getProductPage({ q: debounced, category: cat[0], page: info.page + 1, pageSize: 12 });
      setItems((cur) => [...cur, ...p.items]);
      setInfo({ page: p.page, totalPages: p.totalPages, total: p.total });
    } catch (e) { setError(e instanceof ApiError ? e.message : "We couldn't load more."); }
    finally { setLoadingMore(false); }
  }

  return (
    <div className="space-y-8 pt-4">
      <div>
        <p className="eyebrow text-muted">Demo catalog</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl">Everything we can match</h1>
      </div>
      <div className="sticky top-16 z-20 -mx-4 space-y-3 bg-paper/90 px-4 py-3 backdrop-blur-xl sm:mx-0 sm:rounded-3xl sm:px-4">
        <label className="sr-only" htmlFor="catalog-q">Search the catalog</label>
        <input id="catalog-q" type="search" className="input" placeholder="Search name, brand or model" value={q} onChange={(e) => setQ(e.target.value)} />
        <FilterChips label="Filter by category" options={CATEGORIES.map((c) => ({ value: c }))} selected={cat} onChange={setCat} />
      </div>

      {first && <SkeletonGrid />}
      {error && <ErrorBox message={error} onRetry={() => setKey((k) => k + 1)} />}
      {!first && !error && items.length === 0 && (
        <EmptyState title="We could not find a close match in this demo catalog" action={<button type="button" className="btn-primary" onClick={() => { setQ(""); setCat([]); }}>Clear search</button>}>
          Try another name, or clear the filters.
        </EmptyState>
      )}
      {!first && items.length > 0 && (
        <>
          <p className="text-sm font-medium text-muted" aria-live="polite">Showing {items.length} of {info.total}</p>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((p) => <div key={p.id} className="animate-rise"><ProductCard product={p} /></div>)}
          </div>
          {info.page < info.totalPages && (
            <div className="flex justify-center">
              {loadingMore ? <Spinner label="Loading more" /> : <button type="button" className="btn-primary" onClick={more}>Load more</button>}
            </div>
          )}
        </>
      )}
    </div>
  );
}
