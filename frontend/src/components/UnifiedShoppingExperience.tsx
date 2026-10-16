"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  checkCompatibility,
  getProducts,
  identifyOwnedPhoto,
  searchMoreLikeThis,
  visualSearch,
  ApiError,
  formatPrice,
} from "@/lib/api";
import type {
  CompatibilityResult,
  Product,
  SearchResult,
} from "@/lib/types";
import { ImageUploader } from "./ImageUploader";
import { ProductCard } from "./ProductCard";
import { ProductPicker } from "./ProductPicker";
import { ResultView } from "./ResultView";
import { EmptyState, ErrorBox, Spinner } from "./States";
import { VERDICT_META } from "./Verdict";

type Mode = "search" | "compatibility";

export function UnifiedShoppingExperience() {
  const [mode, setMode] = useState<Mode>("search");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Mode A: Search state
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Mode B: Compatibility state
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [ownedProduct, setOwnedProduct] = useState<Product | null>(null);
  const [candidateProduct, setCandidateProduct] = useState<Product | null>(null);
  const [compatLoading, setCompatLoading] = useState(false);
  const [compatError, setCompatError] = useState<string | null>(null);
  const [compatResult, setCompatResult] = useState<CompatibilityResult | null>(null);
  const [identifyingPhoto, setIdentifyingPhoto] = useState(false);
  const [photoIdentifiedNote, setPhotoIdentifiedNote] = useState<string | null>(null);

  // Load catalog products once for pickers
  useEffect(() => {
    getProducts().then(setAllProducts).catch(() => {});
  }, []);

  // Update image preview
  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Execute Mode A: Visual Search
  async function handleFindSimilar() {
    if (!file) return;
    setMode("search");
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults(null);
    try {
      const results = await visualSearch(file);
      setSearchResults(results.slice(0, 6)); // Top 6 as specified
    } catch (e) {
      setSearchError(e instanceof ApiError ? e.message : "Visual search failed. Please try another image.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Execute "More Like This"
  async function handleMoreLikeThis(product: Product) {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const results = await searchMoreLikeThis(product.id);
      setSearchResults(results.slice(0, 6));
      window.scrollTo({ top: 400, behavior: "smooth" });
    } catch (e) {
      setSearchError("Failed to fetch similar items for this product.");
    } finally {
      setSearchLoading(false);
    }
  }

  // Move product to Mode B as candidate
  function handleCheckWithMineFromCard(product: Product) {
    setCandidateProduct(product);
    setMode("compatibility");
    setCompatResult(null);

    // If a photo was already uploaded, try to identify owned item from it
    if (file && !ownedProduct) {
      identifyOwnedFromPhoto(file);
    }
  }

  // Identify owned item from photo
  async function identifyOwnedFromPhoto(imageFile: File) {
    setIdentifyingPhoto(true);
    setPhotoIdentifiedNote(null);
    try {
      const res = await identifyOwnedPhoto(imageFile);
      if (res.identified) {
        setOwnedProduct(res.identified);
        setPhotoIdentifiedNote(
          `Identified as: ${res.identified.name} (${Math.round(res.confidence * 100)}% visual match)`
        );
      }
    } catch (e) {
      // Fallback
    } finally {
      setIdentifyingPhoto(false);
    }
  }

  // Execute Mode B: Check Compatibility
  async function handleRunCompatibility(eProd = ownedProduct, cProd = candidateProduct) {
    if (!eProd || !cProd) return;
    setCompatLoading(true);
    setCompatError(null);
    try {
      const res = await checkCompatibility({
        ownedProductId: eProd.id,
        candidateProductId: cProd.id,
      });
      setCompatResult(res);
    } catch (e) {
      setCompatError(e instanceof ApiError ? e.message : "Compatibility evaluation failed.");
    } finally {
      setCompatLoading(false);
    }
  }

  // Filtered visual search results
  const displayedResults = (searchResults || []).filter((r) => {
    if (categoryFilter === "all") return true;
    return r.product.category?.toLowerCase() === categoryFilter.toLowerCase();
  });

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="rounded-2xl border-2 border-brand bg-gradient-to-br from-brand-tint/50 via-white to-brand-tint/20 p-6 md:p-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-brand px-3 py-1 text-xs font-bold text-white uppercase tracking-wider">
          One Feature, Two Jobs
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-ink">
          Smart Visual Shopping
        </h1>
        <p className="mt-2 max-w-3xl text-base text-muted sm:text-lg">
          Upload an image to <strong>(A) Find Similar Products</strong> or{" "}
          <strong>(B) Check Compatibility</strong> with devices and accessories you already own.
        </p>

        {/* Section 4.6 UI Layout: Upload Image -> Dual Action Controls */}
        <div className="mt-6 space-y-4">
          <div className="max-w-2xl">
            <label className="mb-2 block text-sm font-bold text-ink">
              Step 1: Upload Image (Photo, Screenshot, or Product)
            </label>
            <ImageUploader
              file={file}
              disabled={searchLoading || identifyingPhoto}
              onChange={(f) => {
                setFile(f);
                setSearchResults(null);
                setSearchError(null);
                setCompatResult(null);
                if (f && mode === "compatibility") {
                  identifyOwnedFromPhoto(f);
                }
              }}
            />
          </div>

          {/* Section 4.6: [ Find Similar ] [ Check With Mine ] */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={!file || searchLoading}
              onClick={handleFindSimilar}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 shadow-sm ${
                mode === "search" && searchResults
                  ? "bg-brand text-white ring-2 ring-brand ring-offset-2"
                  : "bg-brand text-white hover:bg-brand-dark"
              } disabled:opacity-50`}
            >
              <span>🔍</span>
              {searchLoading ? "Analyzing with FAISS…" : "Find Similar (Mode A)"}
            </button>

            <button
              type="button"
              onClick={() => {
                setMode("compatibility");
                if (file && !ownedProduct) {
                  identifyOwnedFromPhoto(file);
                }
              }}
              className={`px-5 py-2.5 rounded-lg font-bold text-sm transition-all flex items-center gap-2 border-2 ${
                mode === "compatibility"
                  ? "border-brand bg-brand-tint text-brand-dark ring-2 ring-brand ring-offset-1"
                  : "border-line text-ink hover:border-brand hover:bg-brand-tint/30"
              }`}
            >
              <span>⚡</span>
              Will This Work With Mine? (Mode B)
            </button>

            {file && (
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setSearchResults(null);
                  setCompatResult(null);
                }}
                className="text-xs text-muted hover:text-bad underline ml-auto"
              >
                Clear Image
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODE A: FIND SIMILAR RESULTS                                */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mode === "search" && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-3">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
                <span>Mode A: Similar Products</span>
                <span className="text-xs bg-brand-tint text-brand-dark px-2.5 py-0.5 rounded-full font-medium">
                  FAISS Vector Index
                </span>
              </h2>
              <p className="text-sm text-muted">
                {searchResults
                  ? `Showing top ${displayedResults.length} nearest candidates with visual explanations.`
                  : "Upload an image above and click 'Find Similar' to search the vector catalog."}
              </p>
            </div>

            {/* Category filter pills (Requirement 4.1.5) */}
            {searchResults && (
              <div className="flex flex-wrap gap-1.5 text-xs">
                {["all", "smartphone", "charger", "cable", "laptop", "wearable", "case", "audio"].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full capitalize font-medium transition-colors ${
                      categoryFilter === cat
                        ? "bg-brand text-white"
                        : "bg-surface text-muted hover:text-ink border border-line"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {searchLoading && <Spinner label="Searching 300+ catalog vectors with FAISS…" />}
          {searchError && <ErrorBox message={searchError} onRetry={handleFindSimilar} />}

          {searchResults && displayedResults.length === 0 && (
            <EmptyState title="No matching items in this category filter">
              Try switching the category filter to All or uploading a different image angle.
            </EmptyState>
          )}

          {searchResults && displayedResults.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {displayedResults.map((r) => (
                <ProductCard
                  key={r.product.id}
                  product={r.product}
                  rank={r.rank}
                  score={r.score}
                  explanation={r.explanation}
                  actions={
                    <div className="w-full flex flex-col gap-2 pt-2 border-t border-line/60">
                      <button
                        type="button"
                        onClick={() => handleCheckWithMineFromCard(r.product)}
                        className="w-full btn-primary text-xs py-2 flex items-center justify-center gap-1.5"
                      >
                        <span>⚡</span> Check With Mine
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoreLikeThis(r.product)}
                        className="w-full btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"
                      >
                        <span>🔄</span> More like this
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────── */}
      {/* MODE B: WILL THIS WORK WITH MINE? COMPATIBILITY CHECKER     */}
      {/* ──────────────────────────────────────────────────────────── */}
      {mode === "compatibility" && (
        <div className="space-y-6">
          <div className="border-b border-line pb-3">
            <h2 className="text-2xl font-bold tracking-tight text-ink flex items-center gap-2">
              <span>Mode B: Will This Work With Mine?</span>
              <span className="text-xs bg-ok-tint text-ok px-2.5 py-0.5 rounded-full font-medium">
                Deterministic Rule Engine
              </span>
            </h2>
            <p className="text-sm text-muted">
              Select or identify what you own, pick the product you want to buy, and get an authoritative verdict.
            </p>
          </div>

          {/* Step 1 & Step 2 Side-by-Side Selection */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Product you own */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">1</span>
                  Product You Own
                </h3>
                {ownedProduct && (
                  <button
                    type="button"
                    onClick={() => setOwnedProduct(null)}
                    className="text-xs text-muted hover:text-bad"
                  >
                    Change
                  </button>
                )}
              </div>

              {identifyingPhoto && (
                <div className="p-3 bg-brand-tint rounded-lg text-xs flex items-center gap-2">
                  <Spinner label="Identifying product from photo…" />
                </div>
              )}

              {photoIdentifiedNote && (
                <div className="p-3 bg-brand-tint rounded-lg text-xs text-brand-dark font-medium flex items-center gap-2">
                  <span>📸</span> {photoIdentifiedNote}
                </div>
              )}

              {ownedProduct ? (
                <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-line">
                  <img
                    src={ownedProduct.imageUrl || "/placeholder.png"}
                    alt={ownedProduct.name}
                    className="h-14 w-14 rounded object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-dark capitalize">{ownedProduct.category}</p>
                    <p className="text-sm font-bold truncate text-ink">{ownedProduct.name}</p>
                    <p className="text-xs text-muted">
                      Port: {String(ownedProduct.specs?.port_type || ownedProduct.specs?.connector_type || "N/A")} · OS: {String(ownedProduct.specs?.os || "N/A")}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Choose from 320+ products in the verified catalog or use an uploaded photo:
                  </p>
                  <ProductPicker
                    label="owned"
                    selected={ownedProduct}
                    onSelect={(p) => {
                      setOwnedProduct(p);
                      setCompatResult(null);
                    }}
                  />
                </div>
              )}
            </div>

            {/* Right: Candidate product to buy */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-lg text-ink flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-xs text-white">2</span>
                  Product You Want to Buy
                </h3>
                {candidateProduct && (
                  <button
                    type="button"
                    onClick={() => setCandidateProduct(null)}
                    className="text-xs text-muted hover:text-bad"
                  >
                    Change
                  </button>
                )}
              </div>

              {candidateProduct ? (
                <div className="flex items-center gap-3 p-3 bg-surface rounded-lg border border-line">
                  <img
                    src={candidateProduct.imageUrl || "/placeholder.png"}
                    alt={candidateProduct.name}
                    className="h-14 w-14 rounded object-cover border"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-brand-dark capitalize">{candidateProduct.category}</p>
                    <p className="text-sm font-bold truncate text-ink">{candidateProduct.name}</p>
                    <p className="text-xs font-semibold text-ink">
                      {formatPrice(candidateProduct.price, candidateProduct.currency)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted">
                    Pick any candidate accessory, charger, cable, display, case, or device:
                  </p>
                  <ProductPicker
                    label="candidate"
                    selected={candidateProduct}
                    onSelect={(p) => {
                      setCandidateProduct(p);
                      setCompatResult(null);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Evaluation Action Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!ownedProduct || !candidateProduct || compatLoading}
              onClick={() => handleRunCompatibility()}
              className="btn-primary text-sm px-6 py-2.5 font-bold shadow-sm"
            >
              {compatLoading ? "Evaluating Rules…" : "Run Compatibility Check"}
            </button>

            {ownedProduct && candidateProduct && (
              <button
                type="button"
                onClick={() => {
                  const o = ownedProduct;
                  const c = candidateProduct;
                  setOwnedProduct(c);
                  setCandidateProduct(o);
                  setCompatResult(null);
                }}
                className="btn-secondary text-sm px-4 py-2"
              >
                🔄 Swap Products
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setOwnedProduct(null);
                setCandidateProduct(null);
                setCompatResult(null);
              }}
              className="text-xs text-muted hover:underline ml-auto"
            >
              Reset Selection
            </button>
          </div>

          {compatLoading && <Spinner label="Executing category rule engine (Hard mismatch, Wattage, Ecosystem, Dimensions)…" />}
          {compatError && <ErrorBox message={compatError} onRetry={() => handleRunCompatibility()} />}

          {/* Result Presentation */}
          {compatResult && ownedProduct && candidateProduct && (
            <div className="mt-6 pt-6 border-t border-line">
              <ResultView
                result={compatResult}
                owned={ownedProduct}
                candidate={candidateProduct}
                onChange={() => setCompatResult(null)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
