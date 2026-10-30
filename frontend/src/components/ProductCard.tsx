"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { formatPrice } from "@/lib/api";
import type { Product } from "@/lib/types";
import { ProductImage } from "./ProductImage";

export function ProductCard({ product, rank, score, explanation, actions, selected, onToggleSelect }: {
  product: Product; rank?: number; score?: number; explanation?: string; actions?: ReactNode;
  /** When onToggleSelect is given the card becomes selectable. Click again to deselect. */
  selected?: boolean; onToggleSelect?: (p: Product) => void;
}) {
  const price = formatPrice(product.price, product.currency);
  const selectable = !!onToggleSelect;
  const pct = score !== undefined ? Math.max(0, Math.min(100, Math.round(score * 100))) : undefined;

  return (
    <article
      className={`group relative flex flex-col overflow-hidden rounded-2xl transition-all duration-300 border-gradient ${
        selected
          ? "-translate-y-2"
          : "hover:-translate-y-1"
      }`}
      style={{
        background: selected
          ? "linear-gradient(145deg, rgba(124,58,237,.15), rgba(10,10,15,.95))"
          : "linear-gradient(145deg, rgba(255,255,255,.04), rgba(10,10,15,.9))",
        border: selected
          ? "1px solid rgba(167,139,250,.4)"
          : "1px solid rgba(255,255,255,.08)",
        boxShadow: selected
          ? "0 20px 60px rgba(0,0,0,.5), 0 0 40px rgba(124,58,237,.2), 0 0 0 1px rgba(167,139,250,.3)"
          : "0 4px 24px rgba(0,0,0,.3), 0 0 0 1px rgba(255,255,255,.04)",
        backdropFilter: "blur(12px)"
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          category={product.category}
          className="aspect-[4/3] w-full transition-transform duration-500 group-hover:scale-105"
        />
        {/* Category badge */}
        {product.category && (
          <span
            className="absolute left-3 top-3 rounded-full px-3 py-1 text-[11px] font-semibold capitalize"
            style={{ background: "rgba(10,10,15,.7)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)" }}
          >
            {product.category}
          </span>
        )}
        {/* Rank badge */}
        {rank !== undefined && (
          <span
            className="absolute bottom-3 left-3 flex h-8 min-w-8 items-center justify-center rounded-full px-2 font-display text-sm font-extrabold text-ink"
            style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}
          >
            #{rank}
          </span>
        )}
        {/* Select button */}
        {selectable && (
          <button
            type="button"
            aria-pressed={!!selected}
            aria-label={`${selected ? "Deselect" : "Select"} ${product.name}`}
            onClick={() => onToggleSelect(product)}
            className="absolute inset-0 flex items-start justify-end p-3 focus-visible:outline-offset-[-6px]"
          >
            <span
              aria-hidden
              className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-base font-extrabold transition-all duration-200 ${
                selected
                  ? "animate-pop border-transparent text-ink"
                  : "border-white/30 bg-black/30 text-transparent backdrop-blur group-hover:border-white/60 group-hover:text-white/60"
              }`}
              style={selected ? { background: "linear-gradient(135deg,#06FFA5,#00D9FF)" } : undefined}
            >
              ✓
            </span>
          </button>
        )}
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-1.5 p-5">
        <p className="eyebrow">{product.brand ?? "Brand not listed"}</p>
        <h3 className="font-display text-base font-bold leading-snug text-white">
          <Link href={`/products/${encodeURIComponent(product.id)}`} className="hover:text-volt transition-colors">
            {product.name}
          </Link>
        </h3>
        {product.model && <p className="text-xs text-white/30">{product.model}</p>}
        {price && (
          <p className="mt-1 font-display text-xl font-extrabold text-gradient-brand">{price}</p>
        )}

        {/* Match score bar */}
        {pct !== undefined && (
          <div className="mt-3" title="How alike the images look. Not the probability of an exact match.">
            <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
              <span className="text-white/50">AI visual match</span>
              <span className="text-volt/80">{pct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,.08)" }} aria-hidden>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  background: pct >= 70 ? "linear-gradient(90deg,#06FFA5,#00D9FF)" : pct >= 40 ? "linear-gradient(90deg,#A78BFA,#7C3AED)" : "linear-gradient(90deg,#FF6B6B,#FF4444)"
                }}
              />
            </div>
          </div>
        )}

        {/* Explanation */}
        {explanation && (
          <p
            className="mt-2 rounded-xl px-3 py-2 text-xs font-medium leading-relaxed text-white/70"
            style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.12)" }}
          >
            ✦ {explanation}
          </p>
        )}
        {actions && <div className="mt-auto flex flex-wrap gap-2 pt-4">{actions}</div>}
      </div>
    </article>
  );
}
