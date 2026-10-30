"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError, checkCompatibility, formatPrice, getHealth, identifyOwnedPhoto, searchMoreLikeThis, visualSearch,
} from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { CompatibilityResult, Product, SearchResult } from "@/lib/types";
import { useCompatibility } from "@/context/CompatibilityContext";
import { FilterChips } from "./FilterChips";
import { ImageUploader } from "./ImageUploader";
import { ProductCard } from "./ProductCard";
import { ProductImage } from "./ProductImage";
import { ProductPicker } from "./ProductPicker";
import { ResultView } from "./ResultView";
import { SampleStrip } from "./SampleStrip";
import { ScanProgress } from "./ScanProgress";
import { EmptyState, ErrorBox } from "./States";

export type Mode = "search" | "compatibility";

function BackendStatus() {
  const { state } = useAsync(() => getHealth(), []);
  const good = state.status === "ready" && state.data.ok;
  const text = state.status === "loading" ? "Connecting…" : state.status === "error" ? "Backend offline" : good ? "Live" : "Backend degraded";
  return (
    <p role="status" className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${good ? "border-neon/40 text-neon bg-neon/10" : "border-white/15 text-white/50 bg-white/5"}`}>
      <span aria-hidden className={`h-2 w-2 rounded-full ${good ? "animate-pulse bg-neon shadow-[0_0_8px_rgba(6,255,165,.8)]" : "bg-white/30"}`} />
      {text}
    </p>
  );
}

function Slot({ n, title, product, onClear, children }: { n: number; title: string; product: Product | null; onClear: () => void; children: React.ReactNode }) {
  return (
    <section
      className={`relative rounded-2xl border p-5 transition-all duration-500 sm:p-6 ${product ? "border-volt/40" : "border-white/10"}`}
      style={product ? {
        background: "linear-gradient(145deg, rgba(124,58,237,.12), rgba(10,10,15,.9))",
        boxShadow: "0 0 0 1px rgba(167,139,250,.2), 0 8px 32px rgba(124,58,237,.15)"
      } : {
        background: "linear-gradient(145deg, rgba(255,255,255,.03), rgba(10,10,15,.8))",
        backdropFilter: "blur(12px)"
      }}
      aria-label={title}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={`flex h-9 w-9 items-center justify-center rounded-full font-display text-base font-bold transition-all duration-300 ${product ? "text-ink" : "border border-white/20 text-white/60 bg-white/5"}`}
          style={product ? { background: "linear-gradient(135deg,#06FFA5,#00D9FF)" } : undefined}
        >
          {product ? "✓" : n}
        </span>
        <h3 className="font-display text-lg font-bold text-white">{title}</h3>
      </div>
      {product && (
        <div className="animate-rise mt-4 flex items-center gap-3 rounded-xl p-3" style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.15)" }}>
          <ProductImage src={product.imageUrl} alt={product.name} category={product.category} className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{product.category ?? "product"}</p>
            <p className="truncate font-bold text-white text-sm">{product.name}</p>
            <p className="text-xs text-white/40">{[product.brand, formatPrice(product.price, product.currency)].filter(Boolean).join(" · ")}</p>
          </div>
          <button type="button" onClick={onClear} className="btn-secondary min-h-0 px-3 py-1.5 text-xs">Remove</button>
        </div>
      )}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function UnifiedShoppingExperience({ initialMode = "search" }: { initialMode?: Mode }) {
  const { owned, candidate, setOwned, setCandidate, swap, reset } = useCompatibility();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [file, setFile] = useState<File | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  // Mode A
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [picked, setPicked] = useState<Product | null>(null);

  // Mode B
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [compat, setCompat] = useState<CompatibilityResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const scrollToResults = () => requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  useEffect(() => { if (results) scrollToResults(); }, [results]);
  useEffect(() => { if (compat) scrollToResults(); }, [compat]);

  async function findSimilar() {
    if (!file || busy.current) return;
    busy.current = true;
    setMode("search"); setSearchLoading(true); setSearchError(null); setResults(null); setPicked(null); setCats([]);
    scrollToResults();
    try { setResults((await visualSearch(file)).slice(0, 6)); }
    catch (e) { setSearchError(e instanceof ApiError ? e.message : "We could not read this image. Please upload a clearer photo."); }
    finally { busy.current = false; setSearchLoading(false); }
  }

  async function moreLikeThis(p: Product) {
    setSearchLoading(true); setSearchError(null); setPicked(null); setCats([]);
    scrollToResults();
    try { setResults((await searchMoreLikeThis(p.id)).slice(0, 6)); }
    catch { setSearchError("We could not fetch similar items for this product. Try another."); }
    finally { setSearchLoading(false); }
  }

  async function identifyOwned(img: File) {
    setIdentifying(true); setNote(null);
    try {
      const res = await identifyOwnedPhoto(img);
      if (res.identified) {
        setOwned(res.identified);
        setNote(`We think this is ${res.identified.name} (${Math.round(res.confidence * 100)}% visual match). Not right? Remove it and pick another.`);
      } else setNote("We could not recognise this photo. Pick your product from the catalog below.");
    } catch { setNote("We could not read this photo. Pick your product from the catalog below."); }
    finally { setIdentifying(false); }
  }

  function checkWithMine(p: Product) {
    setCandidate(p); setMode("compatibility"); setCompat(null);
    if (file && !owned) identifyOwned(file);
    requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function runCheck() {
    if (!owned || !candidate || busy.current) return;
    busy.current = true;
    setCompatLoading(true); setCompatError(null); setCompat(null);
    scrollToResults();
    try { setCompat(await checkCompatibility({ ownedProductId: owned.id, candidateProductId: candidate.id })); }
    catch (e) { setCompatError(e instanceof ApiError ? e.message : "We could not run the check. Try again."); }
    finally { busy.current = false; setCompatLoading(false); }
  }

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    (results ?? []).forEach((r) => { const c = r.product.category?.toLowerCase(); if (c) m.set(c, (m.get(c) ?? 0) + 1); });
    return [...m].map(([value, count]) => ({ value, count }));
  }, [results]);
  const shown = (results ?? []).filter((r) => cats.length === 0 || cats.includes(r.product.category?.toLowerCase() ?? ""));
  const togglePick = (p: Product) => setPicked((cur) => (cur?.id === p.id ? null : p));

  const tabs: { id: Mode; label: string; icon: string }[] = [
    { id: "search", label: "Find similar", icon: "🔍" },
    { id: "compatibility", label: "Will it work with mine?", icon: "⚡" },
  ];

  return (
    <div className="space-y-14">
      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-14"
        style={{
          background: "linear-gradient(145deg, #0F0F1A 0%, #131025 50%, #0A0F1A 100%)",
          border: "1px solid rgba(255,255,255,.07)",
          boxShadow: "0 40px 80px rgba(0,0,0,.6)"
        }}
        aria-label="Smart Visual Shopping"
      >
        {/* Background orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb absolute -left-32 -top-32 h-96 w-96 opacity-30" style={{ background: "radial-gradient(circle, rgba(124,58,237,.6) 0%, transparent 70%)" }} />
          <div className="orb absolute -bottom-40 -right-20 h-96 w-96 opacity-20" style={{ background: "radial-gradient(circle, rgba(0,217,255,.5) 0%, transparent 70%)" }} />
          <div className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 opacity-10" style={{ background: "radial-gradient(circle, rgba(6,255,165,.5) 0%, transparent 70%)" }} />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          {/* Left: Text + Tabs */}
          <div className="space-y-7">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow">VYUMI · Smart Visual Shopping</span>
              <BackendStatus />
            </div>

            <div>
              <h1 className="text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-7xl">
                <span className="text-white">See it.</span>
                <br />
                <span className="text-gradient">Find it.</span>
                <br />
                <span className="text-white">Check it fits.</span>
              </h1>
              <p className="mt-5 max-w-md text-base text-white/50 sm:text-lg leading-relaxed">
                Drop a photo. Get AI-ranked lookalikes, or find out instantly if a product works with what you own.
              </p>
            </div>

            {/* Tab switcher */}
            <div
              role="tablist"
              aria-label="Choose what to do"
              className="relative grid max-w-sm grid-cols-2 rounded-full p-1.5"
              style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}
            >
              <span
                aria-hidden
                className="absolute inset-y-1.5 left-1.5 w-[calc(50%-6px)] rounded-full transition-transform duration-300 ease-out"
                style={{
                  background: mode === "compatibility"
                    ? "linear-gradient(135deg,#7C3AED,#A78BFA)"
                    : "linear-gradient(135deg,#A78BFA,#06FFA5)",
                  transform: mode === "compatibility" ? "translateX(100%)" : "translateX(0)",
                  boxShadow: "0 4px 16px rgba(124,58,237,.4)"
                }}
              />
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={mode === t.id}
                  onClick={() => setMode(t.id)}
                  className={`relative z-10 min-h-[44px] rounded-full px-3 text-sm font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 ${mode === t.id ? "text-white" : "text-white/50 hover:text-white/100"}`}
                >
                  <span>{t.icon}</span>
                  <span className="hidden xs:inline">{t.label}</span>
                  <span className="xs:hidden">{t.id === "search" ? "Find" : "Check"}</span>
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-6 text-xs text-white/30">
              {[["🎯", "AI-ranked results"], ["⚡", "Instant matching"], ["🔒", "Rules-based check"]].map(([icon, label]) => (
                <span key={label} className="flex items-center gap-1.5">{icon} {label}</span>
              ))}
            </div>
          </div>

          {/* Right: Upload area */}
          <div className="space-y-3">
            <div
              className="rounded-2xl p-4 sm:p-5"
              style={{
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                backdropFilter: "blur(16px)"
              }}
            >
              <ImageUploader
                file={file}
                scanning={searchLoading || identifying}
                disabled={searchLoading || identifying}
                hint={mode === "compatibility" ? "Optional: a photo of what you own" : undefined}
                onChange={(f) => {
                  setFile(f); setResults(null); setSearchError(null); setCompat(null); setPicked(null);
                  if (f && mode === "compatibility" && !owned) identifyOwned(f);
                }}
              />
              <div className="mt-4">
                {mode === "search" ? (
                  <button
                    type="button"
                    className="btn-primary w-full text-base"
                    disabled={!file || searchLoading}
                    onClick={findSimilar}
                  >
                    {searchLoading ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />Searching…</>
                    ) : (
                      <><span>✦</span>Find similar products</>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="w-full min-h-[46px] rounded-full text-sm font-bold text-white transition-all flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg,rgba(124,58,237,.4),rgba(167,139,250,.2))", border: "1px solid rgba(167,139,250,.3)" }}
                    onClick={() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  >
                    <span>⚡</span>Pick your products below
                  </button>
                )}
              </div>
            </div>
            <SampleStrip
              disabled={searchLoading || identifying}
              onPick={(f) => { setFile(f); setResults(null); setSearchError(null); setPicked(null); }}
            />
          </div>
        </div>
      </section>

      {/* ─── RESULTS / WORKSPACE ─── */}
      <div ref={resultsRef} className="scroll-mt-24 space-y-8">
        {mode === "search" && (
          <section className="space-y-8" aria-live="polite">
            {searchLoading && <ScanProgress title="Finding your matches" steps={["Reading your image", "Searching the catalog", "Ranking the closest products"]} />}
            {searchError && <ErrorBox title="We couldn't finish that search" message={searchError} onRetry={file ? findSimilar : undefined} />}
            {!searchLoading && !searchError && !results && (
              <EmptyState title="Your matches will show up here">
                Drop a photo above and press Find similar. Not sure what to try? Tap a sample.
              </EmptyState>
            )}
            {results && !searchLoading && (
              <div className="animate-rise space-y-8">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="eyebrow">Top {results.length} matches</p>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                      Closest to your photo
                    </h2>
                  </div>
                  <span
                    className="rounded-full px-4 py-1.5 text-xs font-bold"
                    style={{ background: "linear-gradient(135deg,rgba(167,139,250,.2),rgba(6,255,165,.15))", border: "1px solid rgba(167,139,250,.3)", color: "#A78BFA" }}
                  >
                    ✦ AI-ranked
                  </span>
                </div>

                <p
                  className="max-w-3xl rounded-2xl px-5 py-3.5 text-sm text-white/60 leading-relaxed"
                  style={{ background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.12)" }}
                >
                  Match scores show how alike the images look. They are not the chance of an exact match, and they don&apos;t mean a product is compatible with anything you own.
                </p>

                {categories.length > 1 && (
                  <FilterChips label="Filter results by category" multi options={categories} selected={cats} onChange={setCats} />
                )}

                {results.length === 0 && <EmptyState title="We could not find a close match in this demo catalog">Try a clearer photo or a different angle.</EmptyState>}
                {results.length > 0 && shown.length === 0 && <EmptyState title="Nothing in those categories">Deselect a filter to see all matches.</EmptyState>}

                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {shown.map((r) => (
                    <ProductCard
                      key={r.product.id}
                      product={r.product}
                      rank={r.rank}
                      score={r.score}
                      explanation={r.explanation}
                      selected={picked?.id === r.product.id}
                      onToggleSelect={togglePick}
                    />
                  ))}
                </div>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => { setFile(null); setResults(null); setPicked(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  >
                    Try another photo
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {mode === "compatibility" && (
          <section className="space-y-8" aria-live="polite">
            <div ref={slotsRef} className="scroll-mt-24">
              <p className="eyebrow">Two quick picks</p>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">Will it work with mine?</h2>
            </div>

            {identifying && <ScanProgress title="Identifying your product" steps={["Reading your photo", "Matching it to the catalog"]} />}
            {note && !identifying && (
              <p
                role="status"
                className="animate-rise rounded-2xl px-5 py-3.5 text-sm font-medium text-white/100"
                style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.2)" }}
              >
                📸 {note}
              </p>
            )}

            <div className="relative grid gap-5 lg:grid-cols-2">
              <Slot n={1} title="What you own" product={owned} onClear={() => { setOwned(null); setCompat(null); setNote(null); }}>
                <ProductPicker label="owned" selected={owned} onSelect={(p) => { setOwned(p); setCompat(null); }} />
              </Slot>
              {owned && candidate && (
                <button
                  type="button"
                  onClick={() => { swap(); setCompat(null); }}
                  aria-label="Swap the two products"
                  className="absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-extrabold text-white transition-all duration-300 hover:rotate-180 hover:scale-110 lg:flex"
                  style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 0 4px rgba(10,10,15,1), 0 0 20px rgba(124,58,237,.5)" }}
                >
                  ⇄
                </button>
              )}
              <Slot n={2} title="What you want" product={candidate} onClear={() => { setCandidate(null); setCompat(null); }}>
                <ProductPicker label="candidate" selected={candidate} onSelect={(p) => { setCandidate(p); setCompat(null); }} />
              </Slot>
            </div>

            {compatLoading && <ScanProgress title="Checking compatibility" steps={["Reading both specifications", "Running the category rules", "Writing your verdict"]} />}
            {compatError && <ErrorBox title="We couldn't run that check" message={compatError} onRetry={runCheck} />}
            {compat && owned && candidate && !compatLoading && (
              <ResultView
                result={compat}
                owned={owned}
                candidate={candidate}
                onChange={() => { setCompat(null); slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}
              />
            )}
          </section>
        )}
      </div>

      {/* ─── FLOATING ACTION BAR ─── */}
      {mode === "search" && picked && !searchLoading && (
        <div
          role="region"
          aria-label="Selected product actions"
          className="animate-rise fixed bottom-5 left-4 right-20 z-30 mx-auto max-w-2xl rounded-2xl p-2 pl-4 text-white sm:left-1/2 sm:right-auto sm:w-[42rem] sm:-translate-x-1/2"
          style={{
            background: "rgba(15,15,26,.95)",
            border: "1px solid rgba(167,139,250,.25)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.6), 0 0 40px rgba(124,58,237,.2)"
          }}
        >
          <div className="flex items-center gap-3">
            <ProductImage src={picked.imageUrl} alt="" category={picked.category} className="hidden h-11 w-11 shrink-0 rounded-xl sm:block" />
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{picked.name}</p>
            <button
              type="button"
              className="min-h-[38px] rounded-full px-4 text-sm font-bold text-ink transition-all hover:brightness-110"
              style={{ background: "linear-gradient(135deg,#06FFA5,#00D9FF)" }}
              onClick={() => checkWithMine(picked)}
            >
              Check with mine
            </button>
            <button
              type="button"
              className="hidden min-h-[38px] rounded-full border border-white/15 px-4 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white sm:inline-flex sm:items-center"
              onClick={() => moreLikeThis(picked)}
            >
              More like this
            </button>
            <Link
              href={`/products/${encodeURIComponent(picked.id)}`}
              className="hidden min-h-[38px] items-center rounded-full border border-white/15 px-4 text-sm font-semibold text-white/70 hover:border-white/30 hover:text-white md:inline-flex"
            >
              View
            </Link>
            <button
              type="button"
              aria-label="Deselect product"
              onClick={() => setPicked(null)}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {mode === "compatibility" && owned && candidate && !compat && !compatLoading && (
        <div
          role="region"
          aria-label="Run the check"
          className="animate-rise fixed bottom-5 left-4 right-20 z-30 mx-auto max-w-xl rounded-2xl p-2 pl-5 text-white sm:left-1/2 sm:right-auto sm:w-[36rem] sm:-translate-x-1/2"
          style={{
            background: "rgba(15,15,26,.95)",
            border: "1px solid rgba(167,139,250,.25)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 20px 60px rgba(0,0,0,.6), 0 0 40px rgba(124,58,237,.2)"
          }}
        >
          <div className="flex items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">
              {owned.name} <span className="text-volt">+</span> {candidate.name}
            </p>
            <button
              type="button"
              className="min-h-[38px] rounded-full px-5 text-sm font-bold text-ink"
              style={{ background: "linear-gradient(135deg,#A78BFA,#7C3AED)" }}
              onClick={runCheck}
            >
              ⚡ Check it
            </button>
            <button
              type="button"
              aria-label="Clear both selections"
              onClick={() => { reset(); setCompat(null); setNote(null); }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/40 hover:bg-white/10 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
