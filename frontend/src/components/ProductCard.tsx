import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, rank, score, actions }: { product: Product; rank?: number; score?: number; actions?: ReactNode }) {
  const price = formatPrice(product.price, product.currency);
  return (
    <article className="card flex flex-col overflow-hidden">
      <ProductImage src={product.imageUrl} alt={product.name} className="h-44 w-full" />
      <div className="flex flex-1 flex-col gap-1 p-4">
        {rank !== undefined && <p className="text-xs font-semibold text-brand-dark">Match #{rank}</p>}
        <h3 className="font-semibold leading-snug">
          <Link href={`/products/${encodeURIComponent(product.id)}`} className="hover:underline">{product.name}</Link>
        </h3>
        <p className="text-sm text-muted">{[product.brand, product.model].filter(Boolean).join(" · ") || "Brand and model not listed"}</p>
        {price && <p className="text-sm font-semibold">{price}</p>}
        {score !== undefined && (
          <p className="text-sm">Visual similarity: <strong>{score.toFixed(2)}</strong></p>
        )}
        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-3">{actions}</div>}
      </div>
    </article>
  );
}
