"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { visualSearch, ApiError } from "@/lib/api";
import type { SearchResult } from "@/lib/types";
import { useCompatibility } from "@/context/CompatibilityContext";
import { ImageUploader } from "@/components/ImageUploader";
import { ProductCard } from "@/components/ProductCard";
import { EmptyState, ErrorBox, Spinner } from "@/components/States";

export default function SearchPage() {
  const router = useRouter();
  const { setOwned, setCandidate } = useCompatibility();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const busy = useRef(false);

  async function run() {
    if (!file || busy.current) return; // block duplicate submissions
    busy.current = true;
    setLoading(true); setError(null); setResults(null);
    try {
      setResults(await visualSearch(file));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The search failed. Try again.");
    } finally {
      busy.current = false; setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Visual search</h1>
        <p className="mt-2 max-w-2xl text-muted">Upload a photo of a product to find similar items in the catalog.</p>
      </div>
      <div className="max-w-2xl space-y-4">
        <ImageUploader file={file} disabled={loading} onChange={(f) => { setFile(f); setResults(null); setError(null); }} />
        <button type="button" className="btn-primary" disabled={!file || loading} onClick={run}>
          {loading ? "Searching…" : "Search similar products"}
        </button>
      </div>

      {loading && <Spinner label="Searching the catalog" />}
      {error && <ErrorBox message={error} onRetry={run} />}
      {results && results.length === 0 && (
        <EmptyState title="No similar products found">Try a clearer photo, a plainer background, or a different angle.</EmptyState>
      )}
      {results && results.length > 0 && (
        <section aria-labelledby="res">
          <h2 id="res" className="text-xl font-bold">{results.length} similar {results.length === 1 ? "product" : "products"}</h2>
          <p className="mt-1 max-w-3xl rounded-md bg-brand-tint p-3 text-sm">
            Visual similarity shows how alike the images look. It is not the probability that a product is an exact match, and it does not mean the product is compatible with anything you own.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((r) => (
              <ProductCard
                key={r.product.id}
                product={r.product}
                rank={r.rank}
                score={r.score}
                explanation={r.explanation}
                actions={
                  <div className="flex flex-wrap gap-2 w-full">
                    <button type="button" className="btn-primary text-xs" onClick={() => { setCandidate(r.product); router.push("/compatibility"); }}>Check compatibility</button>
                    <button type="button" className="btn-secondary text-xs" onClick={() => { setOwned(r.product); router.push("/compatibility"); }}>I own this</button>
                    <button
                      type="button"
                      className="btn-secondary text-xs"
                      onClick={async () => {
                        setLoading(true);
                        try {
                          const { searchMoreLikeThis } = await import("@/lib/api");
                          setResults(await searchMoreLikeThis(r.product.id));
                        } catch (err) {
                          setError("Failed to fetch similar products.");
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      More like this
                    </button>
                  </div>
                }
              />
            ))}

          </div>
        </section>
      )}
    </div>
  );
}
