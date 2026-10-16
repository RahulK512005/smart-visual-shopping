export type SpecValue = string | number | boolean;

export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  category?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  specs: Record<string, SpecValue>;
  source?: string;
  verified?: boolean;
  verificationStatus?: string;
  description?: string;
}

export interface SearchResult {
  rank: number;
  product: Product;
  /** Only present when the backend supplies it. Never computed in the browser. */
  score?: number;
  explanation?: string;
}

export type Verdict = "compatible" | "incompatible" | "cannot_verify" | "partially_compatible";

export type CheckStatus = "passed" | "failed" | "warning" | "unknown";

export interface CompatibilityCheck {
  name: string;
  status: CheckStatus;
  explanation?: string;
  ownedValue?: string;
  candidateValue?: string;
  evidence: string[];
  severity?: string;
}

export interface CompatibilityResult {
  verdict: Verdict;
  summary?: string;
  checks: CompatibilityCheck[];
  missingSpecs: string[];
  warnings: string[];
  evidence: string[];
}

export interface CompatibilityRequest {
  ownedProductId: string;
  candidateProductId: string;
  userSpecs?: Record<string, string>;
}
