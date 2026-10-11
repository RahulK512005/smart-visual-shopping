"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product } from "@/lib/types";

interface Ctx {
  owned: Product | null;
  candidate: Product | null;
  setOwned: (p: Product | null) => void;
  setCandidate: (p: Product | null) => void;
  swap: () => void;
  reset: () => void;
}

const KEY = "svs.compat.selection";
const CompatCtx = createContext<Ctx | null>(null);

export function CompatibilityProvider({ children }: { children: ReactNode }) {
  const [owned, setOwned] = useState<Product | null>(null);
  const [candidate, setCandidate] = useState<Product | null>(null);

  // Restore the selection so it survives navigation and refreshes in this tab.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) {
        const p = JSON.parse(saved);
        setOwned(p.owned ?? null);
        setCandidate(p.candidate ?? null);
      }
    } catch { /* storage unavailable: start empty */ }
  }, []);
  useEffect(() => {
    try { sessionStorage.setItem(KEY, JSON.stringify({ owned, candidate })); } catch { /* ignore */ }
  }, [owned, candidate]);

  const swap = useCallback(() => { setOwned(candidate); setCandidate(owned); }, [owned, candidate]);
  const reset = useCallback(() => { setOwned(null); setCandidate(null); }, []);
  const value = useMemo(() => ({ owned, candidate, setOwned, setCandidate, swap, reset }), [owned, candidate, swap, reset]);
  return <CompatCtx.Provider value={value}>{children}</CompatCtx.Provider>;
}

export function useCompatibility() {
  const ctx = useContext(CompatCtx);
  if (!ctx) throw new Error("useCompatibility must be used inside CompatibilityProvider");
  return ctx;
}
