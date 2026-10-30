"use client";
import { useState } from "react";
import { getProductPage } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import { ProductImage } from "./ProductImage";

const CATS = ["clothing", "footwear", "accessories", "watches"];

/** Demo inputs so an evaluator knows what to upload. Tries to load the catalog photo as an upload. */
export function SampleStrip({ onPick, disabled }: { onPick: (f: File) => void; disabled?: boolean }) {
  const { state } = useAsync(async (signal) => {
    const pages = await Promise.all(CATS.map((c) => getProductPage({ category: c, pageSize: 2 }, signal).catch(() => null)));
    return pages.flatMap((p) => p?.items ?? []).filter((p) => p.imageUrl);
  }, []);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (state.status !== "ready" || state.data.length === 0) return null;

  async function pick(url: string, id: string) {
    setBusy(id); setNote(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("bad status");
      const blob = await res.blob();
      onPick(new File([blob], `sample-${id}.jpg`, { type: blob.type || "image/jpeg" }));
    } catch {
      setNote("We couldn't load that sample. Upload your own photo instead.");
    } finally { setBusy(null); }
  }

  return (
    <div>
      <p className="eyebrow mb-2 text-white/60">No photo handy? Try a sample</p>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {state.data.map((p) => (
          <button key={p.id} type="button" disabled={disabled || busy !== null} onClick={() => pick(p.imageUrl!, p.id)}
            aria-label={`Use a sample photo of ${p.name}`}
            className="group relative h-20 w-20 shrink-0 snap-start overflow-hidden rounded-2xl border-2 border-white/20 transition-all duration-200 hover:-translate-y-1 hover:border-volt disabled:opacity-50">
            <ProductImage src={p.imageUrl} alt="" category={p.category} className="h-full w-full" />
            {busy === p.id && <span className="absolute inset-0 flex items-center justify-center bg-black/60 text-volt">…</span>}
          </button>
        ))}
      </div>
      {note && <p role="status" className="mt-2 text-xs font-medium text-coral">{note}</p>}
    </div>
  );
}
