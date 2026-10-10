import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { ApiError } from "../api/client";
import { useJobRunner } from "../hooks/useJobRunner";
import { useProducts } from "../hooks/useProducts";
import ProgressPanel from "../components/ProgressPanel";
import ErrorBanner from "../components/ErrorBanner";
import { formatPrice, friendlyError } from "../utils/format";
import type { AdminStats } from "../types";

export default function Admin() {
  const { products, loading, error: prodError, retry } = useProducts();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const { state, run } = useJobRunner<{ ok: boolean }>();

  const loadStats = useCallback(() => {
    setStatsError(null);
    api.adminStats().then(setStats).catch((e: ApiError) => setStatsError(friendlyError(e.code, e.message)));
  }, []);
  useEffect(loadStats, [loadStats]);
  useEffect(() => { if (state.phase === "done") loadStats(); }, [state.phase, loadStats]);

  return (
    <div className="page">
      <h1>Catalog</h1>
      <p className="lead">The products customers can search, and the state of the image search index.</p>

      {statsError && <ErrorBanner message={statsError} onRetry={loadStats} />}
      {stats && (
        <div className="stats">
          <div><strong>{stats.product_count}</strong><span>products</span></div>
          <div><strong>{stats.indexed_count}</strong><span>in search index</span></div>
          <div><strong>{stats.last_indexed_at ? new Date(stats.last_indexed_at).toLocaleString() : "Never"}</strong><span>last indexed</span></div>
        </div>
      )}
      <div className="actions">
        <button className="btn" disabled={state.phase === "running"} onClick={() => run(() => api.adminReindex())}>Rebuild search index</button>
      </div>
      {state.phase === "running" && <ProgressPanel stage={state.stage} progress={state.progress} />}
      {state.phase === "error" && <ErrorBanner message={state.error ?? "Indexing failed."} />}
      {state.phase === "done" && <div className="banner ok" role="status">Search index rebuilt.</div>}

      {loading && <p className="muted" role="status">Loading products…</p>}
      {prodError && <ErrorBanner message={prodError} onRetry={retry} />}
      {products.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th></tr></thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td><img src={p.image_url} alt="" /> {p.name}</td>
                  <td>{p.sku}</td><td>{p.category}</td><td>{formatPrice(p.price, p.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
