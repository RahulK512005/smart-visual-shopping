import { useEffect, useState } from "react";
import { api } from "../api";
import { ApiError } from "../api/client";
import { friendlyError } from "../utils/format";
import type { Product } from "../types";

let cache: Product[] | null = null;

/** Loads the product catalog once and shares it between components. */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>(cache ?? []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache && attempt === 0) return;
    let live = true;
    setLoading(true);
    setError(null);
    api.listProducts()
      .then((items) => { if (live) { cache = items; setProducts(items); } })
      .catch((e: ApiError) => { if (live) setError(friendlyError(e.code, e.message)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [attempt]);

  return { products, loading, error, retry: () => setAttempt((a) => a + 1) };
}
