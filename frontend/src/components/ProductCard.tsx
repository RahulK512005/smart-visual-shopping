import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({
  product,
  rank,
  score,
  explanation,
  actions,
}: {
  product: Product;
  rank?: number;
  score?: number;
  explanation?: string;
  actions?: ReactNode;
}) {
  const price = formatPrice(product.price, product.currency);
  return (
    <article className="card flex flex-col overflow-hidden transition-all hover:shadow-md">
      <ProductImage src={product.imageUrl} alt={product.name} className="h-44 w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between">
          {rank !== undefined && <p className="text-xs font-bold text-brand-dark uppercase tracking-wide">Match #{rank}</p>}
          {score !== undefined && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-tint text-brand-dark">
              {Math.round(score * 100)}% match
            </span>
          )}
        </div>
        <h3 className="font-semibold leading-snug">
          <Link href={`/products/${encodeURIComponent(product.id)}`} className="hover:underline">{product.name}</Link>
        </h3>
        <p className="text-xs text-muted">{[product.brand, product.model].filter(Boolean).join(" · ") || "Brand and model not listed"}</p>
        {price && <p className="text-sm font-bold text-ink">{price}</p>}
        {explanation && (
          <p className="text-xs text-brand-dark bg-brand-tint px-2.5 py-1 rounded-md font-medium">
            💡 {explanation}
          </p>
        )}
        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-3">{actions}</div>}
      </div>
    </article>
  );
}

