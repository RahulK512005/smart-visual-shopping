"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError, checkCompatibility, formatPrice, getHealth, identifyOwnedPhoto, searchMoreLikeThis, universalFashionSearch, visualSearch,
} from "@/lib/api";
import { useAsync } from "@/lib/useAsync";
import type { CompatibilityResult, ExtractedFilters, Product, SearchResult } from "@/lib/types";
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

const FASHION_STYLES = [
  "All Styles",
  "Streetwear",
  "Y2K",
  "Korean Fashion",
  "Minimalist",
  "Old Money",
  "Vintage",
  "Athleisure",
  "Casual",
  "Formal",
];

const FASHION_CATEGORIES = [
  "All Categories",
  "Clothing",
  "Footwear",
  "Watches",
  "Accessories",
];

const FASHION_PRICE_LIMITS = [
  { label: "Any Price", val: undefined },
  { label: "< ₹1,000", val: 1000 },
  { label: "< ₹2,000", val: 2000 },
  { label: "< ₹3,000", val: 3000 },
  { label: "< ₹5,000", val: 5000 },
];

function BackendStatus() {
  const { state } = useAsync(() => getHealth(), []);
  const good = state.status === "ready" && state.data.ok;
  const text = state.status === "loading" ? "Connecting…" : state.status === "error" ? "Backend offline" : good ? "Live · FashionCLIP" : "Backend degraded";
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
  const [searchMethod, setSearchMethod] = useState<"visual" | "text">("visual");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [queryText, setQueryText] = useState("");
  const resultsRef = useRef<HTMLDivElement>(null);
  const slotsRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Search Filters
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedStyle, setSelectedStyle] = useState("All Styles");
  const [selectedMaxPrice, setSelectedMaxPrice] = useState<number | undefined>(undefined);
  const [extractedFilters, setExtractedFilters] = useState<ExtractedFilters | null>(null);

  // Mode A: Search
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [cats, setCats] = useState<string[]>([]);
  const [picked, setPicked] = useState<Product | null>(null);

  // Mode B: Compatibility
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [compat, setCompat] = useState<CompatibilityResult | null>(null);
  const [identifying, setIdentifying] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const scrollToResults = () => requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));

  useEffect(() => { if (results) scrollToResults(); }, [results]);
  useEffect(() => { if (compat) scrollToResults(); }, [compat]);

  const hasImage = Boolean(file);
  const hasText = Boolean(queryText.trim());
  const effectiveMode = hasImage && hasText ? "hybrid" : hasImage ? "image" : "text";

  async function handleImageUpload(selectedFile: File | null) {
    setFile(selectedFile);
    if (!selectedFile) {
      setResults(null);
      setExtractedFilters(null);
      return;
    }
    // Auto-search immediately on upload
    await executeUniversalSearch(selectedFile);
  }

  async function executeUniversalSearch(fileOverride?: File | null, textOverride?: string) {
    const activeFile = fileOverride !== undefined ? fileOverride : file;
    const activeText = textOverride !== undefined ? textOverride : queryText;

    if ((!activeFile && !activeText.trim()) || busy.current) return;
    busy.current = true;
    setMode("search");
    setSearchLoading(true);
    setSearchError(null);
    setResults(null);
    setPicked(null);
    setCats([]);
    setExtractedFilters(null);
    scrollToResults();

    try {
      const catParam = selectedCategory !== "All Categories" ? selectedCategory.toLowerCase() : undefined;
      const styleParam = selectedStyle !== "All Styles" ? selectedStyle.toLowerCase() : undefined;

      const currentMode = activeFile && activeText.trim() ? "hybrid" : activeFile ? "image" : "text";

      const res = await universalFashionSearch({
        query: activeText.trim() || undefined,
        image: activeFile,
        mode: currentMode,
        category: catParam,
        style: styleParam,
        maxPrice: selectedMaxPrice,
        limit: 12,
      });

      setResults(res.results);
      if (res.extracted_filters && Object.keys(res.extracted_filters).length > 0) {
        setExtractedFilters(res.extracted_filters);
      }
    } catch (e) {
      setSearchError(e instanceof ApiError ? e.message : "We could not complete your fashion search. Please try again.");
    } finally {
      busy.current = false;
      setSearchLoading(false);
    }
  }

  async function moreLikeThis(p: Product) {
    setSearchLoading(true);
    setSearchError(null);
    setPicked(null);
    setCats([]);
    setExtractedFilters(null);
    scrollToResults();
    try {
      setResults((await searchMoreLikeThis(p.id)).slice(0, 8));
    } catch {
      setSearchError("We could not fetch similar items for this product. Try another.");
    } finally {
      setSearchLoading(false);
    }
  }

  async function identifyOwned(img: File) {
    setIdentifying(true);
    setNote(null);
    try {
      const res = await identifyOwnedPhoto(img);
      if (res.identified) {
        setOwned(res.identified);
        setNote(`We think this is ${res.identified.name} (${Math.round(res.confidence * 100)}% visual match). Not right? Remove it and pick another.`);
      } else {
        setNote("We could not recognise this photo. Pick your product from the catalog below.");
      }
    } catch {
      setNote("We could not read this photo. Pick your product from the catalog below.");
    } finally {
      setIdentifying(false);
    }
  }

  function checkWithMine(p: Product) {
    setCandidate(p);
    setMode("compatibility");
    setCompat(null);
    if (file && !owned) identifyOwned(file);
    requestAnimationFrame(() => slotsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  async function runCheck() {
    if (!owned || !candidate || busy.current) return;
    busy.current = true;
    setCompatLoading(true);
    setCompatError(null);
    setCompat(null);
    scrollToResults();
    try {
      setCompat(await checkCompatibility({ ownedProductId: owned.id, candidateProductId: candidate.id }));
    } catch (e) {
      setCompatError(e instanceof ApiError ? e.message : "We could not run the check. Try again.");
    } finally {
      busy.current = false;
      setCompatLoading(false);
    }
  }

  const categories = useMemo(() => {
    const m = new Map<string, number>();
    (results ?? []).forEach((r) => {
      const c = r.product.category?.toLowerCase();
      if (c) m.set(c, (m.get(c) ?? 0) + 1);
    });
    return [...m].map(([value, count]) => ({ value, count }));
  }, [results]);

  const shown = (results ?? []).filter((r) => cats.length === 0 || cats.includes(r.product.category?.toLowerCase() ?? ""));
  const togglePick = (p: Product) => setPicked((cur) => (cur?.id === p.id ? null : p));

  const tabs: { id: Mode; label: string; icon: string }[] = [
    { id: "search", label: "Fashion Discovery", icon: "✨" },
    { id: "compatibility", label: "Styling & Compatibility", icon: "⚡" },
  ];

  return (
    <div className="space-y-14">
      {/* ─── HERO & UNIVERSAL SEARCH PANEL ─── */}
      <section
        className="relative overflow-hidden rounded-3xl p-6 sm:p-10 lg:p-12"
        style={{
          background: "linear-gradient(145deg, #0D0B18 0%, #16122C 50%, #090E18 100%)",
          border: "1px solid rgba(255,255,255,.08)",
          boxShadow: "0 40px 90px rgba(0,0,0,.7)"
        }}
        aria-label="Universal Fashion Discovery"
      >
        {/* Background ambient orbs */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="orb absolute -left-28 -top-28 h-96 w-96 opacity-35" style={{ background: "radial-gradient(circle, rgba(124,58,237,.65) 0%, transparent 70%)" }} />
          <div className="orb absolute -bottom-36 -right-20 h-96 w-96 opacity-25" style={{ background: "radial-gradient(circle, rgba(0,217,255,.5) 0%, transparent 70%)" }} />
          <div className="orb absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-72 w-72 opacity-15" style={{ background: "radial-gradient(circle, rgba(6,255,165,.55) 0%, transparent 70%)" }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
        </div>

        <div className="relative space-y-8">
          {/* Header Row */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="eyebrow">VYUMI · Universal AI Fashion Discovery</span>
              <BackendStatus />
            </div>

            {/* Mode Tab Switcher */}
            <div
              role="tablist"
              aria-label="Search Modes"
              className="relative grid w-full max-w-xs grid-cols-2 rounded-full p-1.5"
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
                  className={`relative z-10 min-h-[40px] rounded-full px-3 text-xs font-bold transition-colors duration-200 flex items-center justify-center gap-1.5 ${mode === t.id ? "text-white" : "text-white/50 hover:text-white"}`}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title Area */}
          <div>
            <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl text-white">
              Smart Visual <span className="text-gradient">Shopping</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm sm:text-base text-white/60 leading-relaxed">
              Describe what you want, upload an outfit photo, or combine both to instantly find matching styles across clothing, footwear, watches, and accessories.
            </p>
          </div>

          {mode === "search" && (
            <div className="space-y-6">
              {/* Method Switcher: Visual (Upload Photo) vs Written Text Query */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSearchMethod("visual")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                      searchMethod === "visual"
                        ? "bg-neon/20 text-neon border border-neon/40 shadow-sm"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                  >
                    <span>📸</span> Visual Search (Upload Image)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMethod("text")}
                    className={`rounded-full px-5 py-2 text-xs font-bold transition-all flex items-center gap-2 ${
                      searchMethod === "text"
                        ? "bg-volt/20 text-volt border border-volt/40 shadow-sm"
                        : "bg-white/5 text-white/60 hover:text-white"
                    }`}
                  >
                    <span>💬</span> Text Query & AI Prompts
                  </button>
                </div>

                <div className="flex items-center gap-2 text-xs text-white/50">
                  <span>Engine:</span>
                  <span className="font-bold text-white/90">
                    {effectiveMode === "hybrid" && "⚡ Smart Search (Photo + Description)"}
                    {effectiveMode === "image" && "📸 Visual Photo Search"}
                    {effectiveMode === "text" && "💬 Style Description Search"}
                  </span>
                </div>
              </div>

              {/* ─── VISUAL SEARCH PANEL (Primary on image mode) ─── */}
              {searchMethod === "visual" && (
                <div
                  className="rounded-3xl p-6 sm:p-8 transition-all"
                  style={{
                    background: "rgba(255,255,255,.03)",
                    border: "2px dashed rgba(6,255,165,.35)",
                    boxShadow: "0 12px 40px rgba(0,0,0,.4)",
                  }}
                >
                  <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2.5">
                        <span className="text-neon">📸</span> Upload Any Photo to Find Similar Clothes
                      </h2>
                      <p className="text-xs sm:text-sm text-white/60 mt-1">
                        Drop an outfit, sneaker, watch, or accessory photo to instantly find matching styles and lookalikes.
                      </p>
                    </div>
                    {file && (
                      <button
                        type="button"
                        onClick={() => { setFile(null); setResults(null); }}
                        className="btn-ghost text-xs text-coral hover:text-white shrink-0"
                      >
                        ✕ Remove Photo
                      </button>
                    )}
                  </div>

                  <ImageUploader
                    file={file}
                    scanning={searchLoading}
                    disabled={searchLoading}
                    hint="Drag & drop any fashion photo here, or click to browse files"
                    onChange={handleImageUpload}
                  />

                  {/* Optional refinement input */}
                  <div className="mt-4 flex flex-col sm:flex-row items-center gap-2 rounded-2xl p-2 bg-white/5 border border-white/10">
                    <span className="pl-3 text-xs font-semibold text-white/50 shrink-0">Refine visually similar results:</span>
                    <input
                      type="text"
                      value={queryText}
                      onChange={(e) => setQueryText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") executeUniversalSearch(); }}
                      placeholder="e.g. only black color, under ₹2,000, or streetwear style..."
                      className="w-full bg-transparent px-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => executeUniversalSearch()}
                      disabled={searchLoading || (!file && !queryText.trim())}
                      className="btn-primary min-h-[38px] px-5 text-xs font-bold shrink-0"
                    >
                      {searchLoading ? "Scanning..." : "Search"}
                    </button>
                  </div>

                  {/* Sample photos */}
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <SampleStrip
                      disabled={searchLoading}
                      onPick={(f) => {
                        setFile(f);
                        executeUniversalSearch(f);
                      }}
                    />
                  </div>
                </div>
              )}

              {/* ─── NATURAL LANGUAGE TEXT SEARCH PANEL ─── */}
              {searchMethod === "text" && (
                <div
                  className="relative rounded-2xl p-2 transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,.05)",
                    border: "1px solid rgba(167,139,250,.25)",
                    boxShadow: "0 8px 32px rgba(0,0,0,.3)",
                  }}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="relative flex flex-1 items-center">
                      <span className="pl-4 pr-2 text-lg text-white/40">🔍</span>
                      <input
                        type="text"
                        value={queryText}
                        onChange={(e) => setQueryText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") executeUniversalSearch(); }}
                        placeholder="Describe your style... e.g. black oversized streetwear under ₹1,000"
                        className="w-full bg-transparent py-3 pr-4 text-sm font-medium text-white placeholder-white/40 focus:outline-none sm:text-base"
                      />
                      {queryText && (
                        <button
                          type="button"
                          onClick={() => setQueryText("")}
                          className="mr-2 text-xs text-white/40 hover:text-white"
                          title="Clear query"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => executeUniversalSearch()}
                      disabled={(!file && !queryText.trim()) || searchLoading}
                      className="btn-primary min-h-[46px] shrink-0 px-6 text-sm font-bold"
                    >
                      {searchLoading ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Searching…</>
                      ) : (
                        <><span>✦</span> Discover Style</>
                      )}
                    </button>
                  </div>
                </div>
              )}


            </div>
          )}
        </div>
      </section>

      {/* ─── RESULTS / WORKSPACE ─── */}
      <div ref={resultsRef} className="scroll-mt-24 space-y-8">
        {mode === "search" && (
          <section className="space-y-8" aria-live="polite">
            {searchLoading && (
              <ScanProgress
                title="Finding Matching Styles"
                steps={[
                  effectiveMode === "hybrid"
                    ? "Analyzing photo and style description"
                    : effectiveMode === "image"
                    ? "Scanning photo colors, patterns, and silhouette"
                    : "Understanding style, color, and fit details",
                  "Finding matching items across the catalog",
                  "Ranking the most relevant styles for you",
                ]}
              />
            )}

            {searchError && (
              <ErrorBox
                title="Search Error"
                message={searchError}
                onRetry={executeUniversalSearch}
              />
            )}

            {!searchLoading && !searchError && !results && (
              <EmptyState title="Your AI fashion matches will appear here">
                Type a natural query above (e.g. &quot;Korean summer dress&quot; or &quot;black oversized streetwear under ₹1,000&quot;), or drop a photo to begin discovery.
              </EmptyState>
            )}

            {results && !searchLoading && (
              <div className="animate-rise space-y-6">
                {/* Result header */}
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="eyebrow">
                      {effectiveMode.toUpperCase()} SEARCH · {results.length} MATCHES
                    </p>
                    <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                      {effectiveMode === "image" ? "Visually Similar Products" : "Curated Fashion Discoveries"}
                    </h2>
                  </div>

                  <span
                    className="rounded-full px-4 py-1.5 text-xs font-bold"
                    style={{
                      background: "linear-gradient(135deg,rgba(167,139,250,.2),rgba(6,255,165,.15))",
                      border: "1px solid rgba(167,139,250,.3)",
                      color: "#A78BFA",
                    }}
                  >
                    ✦ Marqo FashionCLIP
                  </span>
                </div>

                {/* Query Image Banner when searching by photo */}
                {file && previewUrl && (
                  <div
                    className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl p-4 transition-all"
                    style={{ background: "rgba(6,255,165,.06)", border: "1px solid rgba(6,255,165,.25)" }}
                  >
                    <img
                      src={previewUrl}
                      alt="Query visual upload"
                      className="h-20 w-20 shrink-0 rounded-xl object-contain bg-black/60 border border-white/20"
                    />
                    <div className="min-w-0 flex-1 text-center sm:text-left">
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                        <span className="eyebrow text-neon">VISUAL QUERY PHOTO</span>
                        <span className="rounded-full bg-neon/20 px-2 py-0.5 text-[10px] font-bold text-neon">
                          {results.length} Similar Items Found
                        </span>
                      </div>
                      <p className="truncate font-bold text-white text-sm mt-0.5">{file.name}</p>
                      <p className="text-xs text-white/50">
                        Ranked by visual similarity in silhouette, colorway, and texture using FashionCLIP & FAISS.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFile(null);
                        setResults(null);
                        setQueryText("");
                      }}
                      className="btn-secondary text-xs shrink-0"
                    >
                      Clear & Upload New Photo
                    </button>
                  </div>
                )}

                {/* Extracted Query Filters Badges Strip */}
                {extractedFilters && (
                  <div
                    className="flex flex-wrap items-center gap-2 rounded-2xl p-4 text-xs"
                    style={{ background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.18)" }}
                  >
                    <span className="font-bold text-white/60">Extracted Filters:</span>
                    {extractedFilters.category && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">
                        🏷️ {extractedFilters.category}
                      </span>
                    )}
                    {extractedFilters.subcategory && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">
                        👔 {extractedFilters.subcategory}
                      </span>
                    )}
                    {extractedFilters.colour && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white capitalize">
                        🎨 {extractedFilters.colour}
                      </span>
                    )}
                    {extractedFilters.style && (
                      <span className="rounded-full bg-volt/20 text-volt border border-volt/30 px-3 py-1 font-bold capitalize">
                        ✨ {extractedFilters.style}
                      </span>
                    )}
                    {extractedFilters.brand && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white">
                        🏢 {extractedFilters.brand}
                      </span>
                    )}
                    {extractedFilters.max_price && (
                      <span className="rounded-full bg-neon/20 text-neon border border-neon/30 px-3 py-1 font-bold">
                        💰 ≤ ₹{extractedFilters.max_price}
                      </span>
                    )}
                    {extractedFilters.gender && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white capitalize">
                        👤 {extractedFilters.gender}
                      </span>
                    )}
                    {extractedFilters.occasion && (
                      <span className="rounded-full bg-white/10 px-3 py-1 font-semibold text-white capitalize">
                        🎯 {extractedFilters.occasion}
                      </span>
                    )}
                  </div>
                )}

                {/* Category Filter Chips */}
                {categories.length > 1 && (
                  <FilterChips
                    label="Filter results by category"
                    multi
                    options={categories}
                    selected={cats}
                    onChange={setCats}
                  />
                )}

                {results.length === 0 && (
                  <EmptyState title="No matching fashion products found">
                    Try broadening your price range or adjusting keywords.
                  </EmptyState>
                )}

                {results.length > 0 && shown.length === 0 && (
                  <EmptyState title="No items in selected category filter">
                    Deselect category pills to view all results.
                  </EmptyState>
                )}

                {/* Product Grid */}
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
                    onClick={() => {
                      setFile(null);
                      setQueryText("");
                      setResults(null);
                      setPicked(null);
                      setExtractedFilters(null);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Clear Search
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* ─── COMPATIBILITY & OUTFIT STYLING MODE ─── */}
        {mode === "compatibility" && (() => {
          const isFashionPair = Boolean(
            (owned && ["clothing", "footwear", "watches", "accessories"].includes((owned.category || "").toLowerCase())) ||
            (candidate && ["clothing", "footwear", "watches", "accessories"].includes((candidate.category || "").toLowerCase()))
          );
          return (
            <section className="space-y-8" aria-live="polite">
              <div ref={slotsRef} className="scroll-mt-24">
                <p className="eyebrow">
                  {isFashionPair ? "AI Outfit Styling & Pairing" : "Two quick picks"}
                </p>
                <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
                  {isFashionPair ? "Will this pair with my outfit?" : "Will it work with mine?"}
                </h2>
                <p className="mt-2 text-sm text-white/60 max-w-2xl">
                  {isFashionPair
                    ? "Evaluating aesthetic cohesion, color theory, silhouette proportions, and occasion suitability across fashion & lifestyle items."
                    : "Deterministic hardware rules check physical ports, wattage sufficiency, charging protocols, and ecosystem compatibility."}
                </p>
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
                <Slot
                  n={1}
                  title={isFashionPair ? "Wardrobe Item (What you own)" : "What you own"}
                  product={owned}
                  onClear={() => { setOwned(null); setCompat(null); setNote(null); }}
                >
                  <ProductPicker label="owned" selected={owned} onSelect={(p) => { setOwned(p); setCompat(null); }} />
                </Slot>
                {owned && candidate && (
                  <button
                    type="button"
                    onClick={() => { swap(); setCompat(null); }}
                    aria-label={isFashionPair ? "Swap outfit pieces" : "Swap the two products"}
                    className="absolute left-1/2 top-1/2 z-10 hidden h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full font-extrabold text-white transition-all duration-300 hover:rotate-180 hover:scale-110 lg:flex"
                    style={{ background: "linear-gradient(135deg,#7C3AED,#A78BFA)", boxShadow: "0 0 0 4px rgba(10,10,15,1), 0 0 20px rgba(124,58,237,.5)" }}
                  >
                    ⇄
                  </button>
                )}
                <Slot
                  n={2}
                  title={isFashionPair ? "Item to Pair With (What you want)" : "What you want"}
                  product={candidate}
                  onClear={() => { setCandidate(null); setCompat(null); }}
                >
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
          );
        })()}
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
