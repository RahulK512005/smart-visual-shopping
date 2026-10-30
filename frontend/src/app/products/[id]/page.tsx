"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { formatPrice, getProduct, searchMoreLikeThis } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { useCompatibility } from "@/context/CompatibilityContext";
import { ErrorBox, Spinner } from "@/components/States";
import { ProductCard } from "@/components/ProductCard";
import { ProductImage } from "@/components/ProductImage";
import { Reveal } from "@/components/Reveal";
import { SpecTable } from "@/components/SpecTable";

function Similar({ id }: { id: string }) {
  const { state } = useAsync((s) => searchMoreLikeThis(id, s), [id]);
  if (state.status !== "ready") return null; // optional section: stay quiet if unavailable
  const rest = state.data.filter((r) => r.product.id !== id).slice(0, 4);
  if (rest.length === 0) return null;
  return (
    <section aria-labelledby="similar" className="scroll-mt-24">
      <Reveal><p className="eyebrow text-muted">✦ AI-ranked</p><h2 id="similar" className="mt-2 text-3xl font-extrabold tracking-tight">More like this</h2></Reveal>
      <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 sm:-mx-6 sm:px-6">
        {rest.map((r) => <div key={r.product.id} className="w-72 shrink-0 snap-start"><ProductCard product={r.product} score={r.score} /></div>)}
      </div>
    </section>
  );
}

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { owned, candidate, setOwned, setCandidate } = useCompatibility();
  const pid = decodeURIComponent(id);
  const { state, reload } = useAsync((s) => getProduct(pid, s), [id]);

  if (state.status === "loading") return <Spinner label="Loading product" />;
  if (state.status === "error") return (
    <div className="space-y-4 pt-4"><ErrorBox message={state.error} onRetry={reload} /><Link href="/products" className="btn-secondary">Back to catalog</Link></div>
  );
  const p = state.data;
  const price = formatPrice(p.price, p.currency);
  const isOwned = owned?.id === p.id;
  const isCand = candidate?.id === p.id;
  return (
    <div className="space-y-14 pt-4">
      <Link href="/products" className="btn-ghost -ml-3">← Catalog</Link>
      <div className="grid gap-8 md:grid-cols-2 md:gap-12">
        <ProductImage src={p.imageUrl} alt={p.name} category={p.category} className="aspect-square w-full rounded-[2rem] shadow-lift" />
        <div className="animate-rise">
          <p className="eyebrow text-muted">{[p.brand, p.category].filter(Boolean).join(" · ") || "Product"}</p>
          <h1 className="mt-2 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{p.name}</h1>
          {p.model && <p className="mt-2 text-muted">{p.model}</p>}
          {price && <p className="mt-5 font-display text-4xl font-extrabold">{price}</p>}
          <p className="mt-4 text-sm">
            {p.verified === undefined ? "Verification status not provided." : p.verified
              ? <span className="rounded-full bg-ok-tint px-3 py-1 font-bold text-ok">✓ Verified specifications</span>
              : <span className="rounded-full bg-warn-tint px-3 py-1 font-bold text-warn">! Specifications not verified{p.verificationStatus ? ` (${p.verificationStatus})` : ""}</span>}
          </p>
          {p.description && <p className="mt-5 leading-relaxed text-ink/80">{p.description}</p>}
          {p.source && <p className="mt-2 break-words text-xs text-muted">Source: {p.source}</p>}
          <div className="mt-8 flex flex-wrap gap-3">
            <button type="button" aria-pressed={isCand} className={isCand ? "btn-volt" : "btn-primary"} onClick={() => { setCandidate(isCand ? null : p); if (!isCand) router.push("/compatibility"); }}>
              {isCand ? "✓ Selected to buy. Tap to undo" : "Will it work with mine?"}
            </button>
            <button type="button" aria-pressed={isOwned} className={isOwned ? "btn-volt" : "btn-secondary"} onClick={() => { setOwned(isOwned ? null : p); if (!isOwned) router.push("/compatibility"); }}>
              {isOwned ? "✓ I own this. Tap to undo" : "I own this"}
            </button>
          </div>
        </div>
      </div>
      <Reveal>
        <section className="card p-6 sm:p-8">
          <h2 className="mb-3 text-2xl font-extrabold">Specifications</h2>
          <SpecTable specs={p.specs} caption={`Specifications for ${p.name}`} />
        </section>
      </Reveal>
      <Similar id={p.id} />
    </div>
  );
}
