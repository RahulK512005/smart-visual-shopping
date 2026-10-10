export type Role = "shopper" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string;
  brand: string;
  price: number;
  currency: string;
  image_url: string;
  product_url?: string;
  attributes?: Record<string, string | number>;
}

export interface UploadedImage {
  image_id: string;
  url: string;
}

export type JobStatus = "queued" | "processing" | "done" | "failed";

export interface Job<T = unknown> {
  job_id: string;
  status: JobStatus;
  stage?: string; // e.g. "embedding", "searching", "ranking", "checking_rules"
  progress?: number; // 0-100, optional
  result?: T;
  error_code?: string;
  message?: string;
}

/* ---------- Mode A: find similar ---------- */
export interface SimilarMatch {
  product: Product;
  score: number; // 0..1
  reason: string; // e.g. "Similar silhouette and colour"
}
export interface SimilarResult {
  category_guess?: { label: string; confidence: number };
  matches: SimilarMatch[];
}
export interface SimilarRequest {
  image_id?: string;
  product_id?: string; // used by "More like this"
  top_k?: number;
}

/* ---------- Mode B: will this work with mine ---------- */
export type Verdict = "compatible" | "partly_compatible" | "not_compatible" | "not_enough_info";

export interface OwnedItem {
  image_id?: string;
  product_id?: string;
  attributes?: Record<string, string | number>; // what the shopper told us, e.g. { connector: "USB-C" }
}
export interface CompatRequest {
  owned: OwnedItem;
  target_product_id: string;
}
export interface CompatCheck {
  rule: string;
  status: "pass" | "fail" | "unknown";
  detail: string;
}
export interface CompatResult {
  verdict: Verdict;
  reasons: string[];
  missing_info: string[];
  checks: CompatCheck[];
  source: "rules" | "rules+vlm";
}

/* ---------- Admin ---------- */
export interface AdminStats {
  product_count: number;
  indexed_count: number;
  last_indexed_at: string | null;
}
