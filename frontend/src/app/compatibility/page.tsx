"use client";
import { useRef, useState } from "react";
import { ApiError, checkCompatibility } from "@/lib/api";
import type { CompatibilityResult } from "@/lib/types";
import { useCompatibility } from "@/context/CompatibilityContext";
import { ProductPicker } from "@/components/ProductPicker";
import { ResultView } from "@/components/ResultView";
import { SpecTable } from "@/components/SpecTable";
import { ErrorBox, Spinner } from "@/components/States";

interface SpecRow { key: string; value: string }

export default function CompatibilityPage() {
  const { owned, candidate, setOwned, setCandidate, swap, reset } = useCompatibility();
  const [extra, setExtra] = useState<SpecRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompatibilityResult | null>(null);
  const busy = useRef(false);

  const [ownedPhoto, setOwnedPhoto] = useState<File | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [photoNote, setPhotoNote] = useState<string | null>(null);

  async function submit() {
    if (!owned || !candidate || busy.current) return;
    busy.current = true;
    setLoading(true); setError(null); setResult(null);
    const userSpecs = Object.fromEntries(extra.filter((r) => r.key.trim() && r.value.trim()).map((r) => [r.key.trim(), r.value.trim()]));
    try {
      setResult(await checkCompatibility({ ownedProductId: owned.id, candidateProductId: candidate.id, userSpecs }));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "The check failed. Try again.");
    } finally {
      busy.current = false; setLoading(false);
    }
  }

  async function handlePhotoUpload(f: File | null) {
    setOwnedPhoto(f);
    if (!f) return;
    setIdentifying(true);
    setPhotoNote(null);
    try {
      const { identifyOwnedPhoto } = await import("@/lib/api");
      const res = await identifyOwnedPhoto(f);
      if (res.identified) {
        setOwned(res.identified);
        setPhotoNote(`Identified as: ${res.identified.name} (${Math.round(res.confidence * 100)}% match)`);
      }
    } catch (e) {
      // Fallback
    } finally {
      setIdentifying(false);
    }
  }

  if (result && owned && candidate) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Compatibility result</h1>
        <ResultView result={result} owned={owned} candidate={candidate} onChange={() => setResult(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Compatibility checker</h1>
        <p className="mt-2 max-w-2xl text-muted">Upload a photo of something you own OR pick from the 320+ catalog items, then select what you want to buy.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-4 space-y-3" aria-labelledby="s1">
          <h2 id="s1" className="text-lg font-bold">Step 1: Product you own</h2>
          <div className="border border-dashed border-line rounded-lg p-3 text-xs bg-surface">
            <label className="block font-semibold mb-1">📸 Option A: Identify from photo</label>
            <input
              type="file"
              accept="image/*"
              className="text-xs"
              onChange={(e) => handlePhotoUpload(e.target.files?.[0] || null)}
            />
            {identifying && <p className="mt-1 text-brand-dark animate-pulse">Analyzing photo with FAISS vector search…</p>}
            {photoNote && <p className="mt-1 text-ok font-semibold">{photoNote}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">📋 Option B: Pick from catalog</label>
            {owned && <p className="mt-1 text-sm">Selected: <strong>{owned.name}</strong></p>}
            <div className="mt-2"><ProductPicker label="owned" selected={owned} onSelect={setOwned} /></div>
          </div>
        </section>
        <section className="card p-4" aria-labelledby="s2">
          <h2 id="s2" className="text-lg font-bold">Step 2: Product you want to buy</h2>
          {candidate && <p className="mt-1 text-sm">Selected: <strong>{candidate.name}</strong></p>}
          <div className="mt-3"><ProductPicker label="candidate" selected={candidate} onSelect={setCandidate} /></div>
        </section>
      </div>


      <section className="card p-4" aria-labelledby="s3">
        <h2 id="s3" className="text-lg font-bold">Step 3: Review and check</h2>
        {!owned || !candidate ? (
          <p className="mt-2 text-sm text-muted">Select both products to continue.</p>
        ) : (
          <div className="mt-3 space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div><h3 className="mb-1 font-semibold">{owned.name}</h3><SpecTable specs={owned.specs} caption={`Specifications for ${owned.name}`} /></div>
              <div><h3 className="mb-1 font-semibold">{candidate.name}</h3><SpecTable specs={candidate.specs} caption={`Specifications for ${candidate.name}`} /></div>
            </div>

            <fieldset>
              <legend className="font-semibold">Extra details about the product you own (optional)</legend>
              <p className="text-sm text-muted">Add anything the catalog is missing, such as a port type or size.</p>
              {extra.map((r, i) => (
                <div key={i} className="mt-2 flex flex-wrap gap-2">
                  <input aria-label={`Detail name ${i + 1}`} className="input flex-1" placeholder="Name (e.g. Port)" value={r.key}
                    onChange={(e) => setExtra(extra.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                  <input aria-label={`Detail value ${i + 1}`} className="input flex-1" placeholder="Value (e.g. USB-C)" value={r.value}
                    onChange={(e) => setExtra(extra.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  <button type="button" className="btn-secondary" onClick={() => setExtra(extra.filter((_, j) => j !== i))}>Remove</button>
                </div>
              ))}
              <button type="button" className="btn-secondary mt-3" onClick={() => setExtra([...extra, { key: "", value: "" }])}>Add a detail</button>
            </fieldset>

            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" disabled={loading} onClick={submit}>{loading ? "Checking…" : "Check compatibility"}</button>
              <button type="button" className="btn-secondary" disabled={loading} onClick={swap}>Swap products</button>
              <button type="button" className="btn-secondary" disabled={loading} onClick={reset}>Clear selection</button>
            </div>
          </div>
        )}
        {loading && <Spinner label="Checking compatibility" />}
        {error && <div className="mt-4"><ErrorBox message={error} onRetry={submit} /></div>}
      </section>
    </div>
  );
}
