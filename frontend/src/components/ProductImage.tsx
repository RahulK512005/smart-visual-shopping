/* eslint-disable @next/next/no-img-element */
"use client";
import { useState } from "react";

export function ProductImage({ src, alt, className = "" }: { src?: string; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  if (!src || failed) {
    return (
      <div role="img" aria-label={`No image available for ${alt}`} className={`flex items-center justify-center bg-line/50 text-xs text-muted ${className}`}>
        No image
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden bg-line/40 ${className}`}>
      {!loaded && <span className="absolute inset-0 animate-pulse bg-line/60" aria-hidden />}
      <img src={src} alt={alt} loading="lazy" onLoad={() => setLoaded(true)} onError={() => setFailed(true)} className="h-full w-full object-contain" />
    </div>
  );
}
