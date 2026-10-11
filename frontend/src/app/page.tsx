"use client";
import Link from "next/link";
import { getHealth, getProducts } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { EmptyState, ErrorBox, SkeletonGrid } from "@/components/States";
import { ProductCard } from "@/components/ProductCard";

function BackendStatus() {
  const { state } = useAsync(() => getHealth(), []);
  const text = state.status === "loading" ? "Checking backend…" : state.status === "error" ? "Backend unreachable" : state.data.ok ? "Backend connected" : "Backend reports a problem";
  const good = state.status === "ready" && state.data.ok;
  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${good ? "border-ok text-ok" : "border-line text-muted"}`}>
      <span aria-hidden>{good ? "✓" : state.status === "loading" ? "…" : "!"}</span>{text}
    </p>
  );
}

export default function Home() {
  const { state, reload } = useAsync((s) => getProducts(s), []);
  return (
    <div className="space-y-12">
      <section>
        <BackendStatus />
        <h1 className="mt-4 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-5xl">Find it from a photo. Check it fits what you own.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">Upload a picture to find similar products, then ask whether a product you want to buy works with one you already have.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <Link href="/search" className="card block border-2 border-brand p-6 hover:bg-brand-tint">
            <h2 className="text-xl font-bold">Search by photo</h2>
            <p className="mt-2 text-sm text-muted">Upload or capture an image and see visually similar products from the catalog.</p>
            <span className="btn-primary mt-4">Start a visual search</span>
          </Link>
          <Link href="/compatibility" className="card block border-2 border-ink p-6 hover:bg-brand-tint">
            <h2 className="text-xl font-bold">Check compatibility</h2>
            <p className="mt-2 text-sm text-muted">Pick the product you own and the one you want, and get a verdict with the reasons behind it.</p>
            <span className="btn-secondary mt-4">Open the checker</span>
          </Link>
        </div>
      </section>

      <section aria-labelledby="how">
        <h2 id="how" className="text-xl font-bold">Tips for good results</h2>
        <ul className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <li className="card p-4">Photograph one product at a time against a plain background.</li>
          <li className="card p-4">Use good light and keep the product in focus and fully in frame.</li>
          <li className="card p-4">Similar-looking products can still be incompatible. Always run a compatibility check before buying.</li>
        </ul>
      </section>

      <section aria-labelledby="browse">
        <div className="flex items-end justify-between gap-4">
          <h2 id="browse" className="text-xl font-bold">From the catalog</h2>
          <Link href="/products" className="text-sm font-semibold text-brand-dark underline">Browse all products</Link>
        </div>
        <div className="mt-4">
          {state.status === "loading" && <SkeletonGrid count={3} />}
          {state.status === "error" && <ErrorBox message={state.error} onRetry={reload} />}
          {state.status === "ready" && state.data.length === 0 && <EmptyState title="The catalog is empty">Products will appear here once the backend has loaded them.</EmptyState>}
          {state.status === "ready" && state.data.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {state.data.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
