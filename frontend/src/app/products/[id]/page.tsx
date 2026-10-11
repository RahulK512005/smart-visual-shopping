"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatPrice, getProduct } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useCompatibility } from "@/context/CompatibilityContext";
import { ErrorBox, Spinner } from "@/components/States";
import { ProductImage } from "@/components/ProductImage";
import { SpecTable } from "@/components/SpecTable";

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { setOwned, setCandidate } = useCompatibility();
  const { state, reload } = useAsync((s) => getProduct(decodeURIComponent(id), s), [id]);

  if (state.status === "loading") return <Spinner label="Loading product" />;
  if (state.status === "error") return (
    <div className="space-y-4"><ErrorBox message={state.error} onRetry={reload} /><Link href="/products" className="text-sm font-semibold underline">Back to catalog</Link></div>
  );
  const p = state.data;
  const price = formatPrice(p.price, p.currency);
  return (
    <div className="space-y-6">
      <Link href="/products" className="text-sm font-semibold text-brand-dark underline">← Back to catalog</Link>
      <div className="grid gap-8 md:grid-cols-2">
        <ProductImage src={p.imageUrl} alt={p.name} className="card h-80 w-full md:h-96" />
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{p.name}</h1>
          <p className="mt-1 text-muted">{[p.brand, p.model].filter(Boolean).join(" · ") || "Brand and model not listed"}</p>
          {price && <p className="mt-3 text-2xl font-bold">{price}</p>}
          {p.description && <p className="mt-3 text-sm">{p.description}</p>}
          <p className="mt-3 text-sm">
            {p.verified === undefined ? "Verification status not provided." : p.verified ? <span className="font-semibold text-ok">✓ Verified specifications</span> : <span className="font-semibold text-warn">! Specifications not verified ({p.verificationStatus})</span>}
          </p>
          {p.source && <p className="mt-1 break-words text-sm text-muted">Source: {p.source}</p>}
          <div className="mt-6 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={() => { setCandidate(p); router.push("/compatibility"); }}>Check if this works with something I own</button>
            <button type="button" className="btn-secondary" onClick={() => { setOwned(p); router.push("/compatibility"); }}>I own this product</button>
          </div>
        </div>
      </div>
      <section className="card p-4">
        <h2 className="mb-2 text-lg font-bold">Specifications</h2>
        <SpecTable specs={p.specs} caption={`Specifications for ${p.name}`} />
      </section>
    </div>
  );
}
