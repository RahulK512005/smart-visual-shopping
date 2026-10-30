/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";

export const CATEGORY_ICON: Record<string, string> = {
  smartphone: "▯", laptop: "▭", smartwatch: "◔", charger: "⚡", cable: "∿", case: "◫", audio: "♪", monitor: "▣", hub: "⌗",
};

export function ProductImage({ src, alt, className = "", category }: { src?: string; alt: string; className?: string; category?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={`No image available for ${alt}`} className={`flex flex-col items-center justify-center gap-1 bg-gradient-to-br from-volt-tint to-paper text-ink/40 ${className}`}>
        <span aria-hidden className="text-3xl">{CATEGORY_ICON[category ?? ""] ?? "◌"}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider">No image</span>
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-paper ${className}`}>
      {!loaded && <span className="skeleton absolute inset-0" aria-hidden />}
      <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-all duration-500 ${loaded ? "scale-100 opacity-100" : "scale-105 opacity-0"}`} />
    </div>
  );
}
