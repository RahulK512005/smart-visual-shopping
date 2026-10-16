import { API_BASE_URL, API_TIMEOUT_MS } from "./config";
import {
  ParseError, normalizeCompatibility, normalizeProduct, normalizeProductList, normalizeSearchResults,
} from "./normalize";
import type { CompatibilityRequest, CompatibilityResult, Product, SearchResult } from "./types";

export class ApiError extends Error {
  constructor(message: string, public kind: "network" | "timeout" | "http" | "parse", public status?: number) {
    super(message);
  }
}

async function serverMessage(res: Response): Promise<string | undefined> {
  try {
    const body = await res.json();
    const m = body?.detail ?? body?.message ?? body?.error;
    return typeof m === "string" ? m : undefined;
  } catch {
    return undefined;
  }
}

const HTTP_HINTS: Record<number, string> = {
  400: "The server couldn't understand that request.",
  404: "That item wasn't found.",
  413: "That file is too large for the server.",
  415: "The server doesn't accept that file type.",
  422: "The server rejected the submitted data.",
  429: "Too many requests. Wait a moment and try again.",
  500: "The server hit an error. Try again shortly.",
  503: "The service is unavailable right now. Try again shortly.",
};

async function request<T>(path: string, parse: (raw: unknown) => T, init: RequestInit = {}, signal?: AbortSignal): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, API_TIMEOUT_MS);
  signal?.addEventListener("abort", () => controller.abort());
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) {
      const detail = await serverMessage(res);
      throw new ApiError(detail ?? HTTP_HINTS[res.status] ?? `Request failed (${res.status}).`, "http", res.status);
    }
    let raw: unknown;
    try { raw = await res.json(); } catch { throw new ApiError("The server sent a response that isn't valid JSON.", "parse"); }
    try { return parse(raw); } catch (e) {
      if (e instanceof ParseError) throw new ApiError(e.message, "parse");
      throw e;
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if (timedOut) throw new ApiError("The server took too long to respond. Try again.", "timeout");
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new ApiError("Can't reach the server. Check your connection and that the backend is running.", "network");
  } finally {
    clearTimeout(timer);
  }
}

export interface HealthStatus { ok: boolean; detail?: string }

export const getHealth = () =>
  request<HealthStatus>("/api/health", (raw) => {
    const status = typeof raw === "object" && raw ? (raw as Record<string, unknown>).status : undefined;
    return { ok: status === undefined || ["ok", "healthy", "up"].includes(String(status).toLowerCase()), detail: typeof status === "string" ? status : undefined };
  });

export const getProducts = (signal?: AbortSignal): Promise<Product[]> =>
  request("/api/products?page_size=100", normalizeProductList, {}, signal);

export const getProduct = (id: string, signal?: AbortSignal): Promise<Product> =>
  request(`/api/products/${encodeURIComponent(id)}`, normalizeProduct, {}, signal);

export const visualSearch = (image: File, signal?: AbortSignal): Promise<SearchResult[]> => {
  const form = new FormData();
  form.append("file", image); // backend: UploadFile field named "file"
  return request("/api/visual-search?limit=6", normalizeSearchResults, { method: "POST", body: form }, signal);
};

export const searchMoreLikeThis = (productId: string, signal?: AbortSignal): Promise<SearchResult[]> =>
  request(`/api/visual-search/more-like-this/${encodeURIComponent(productId)}?limit=6`, normalizeSearchResults, {}, signal);

export interface IdentifyPhotoResponse {
  identified: Product | null;
  confidence: number;
  candidates: { product: Product; score: number; explanation?: string }[];
}

export const identifyOwnedPhoto = (image: File, signal?: AbortSignal): Promise<IdentifyPhotoResponse> => {
  const form = new FormData();
  form.append("file", image);
  return request("/api/compatibility/identify-photo", (raw: any) => ({
    identified: raw?.identified ? normalizeProduct(raw.identified) : null,
    confidence: Number(raw?.confidence || 0),
    candidates: Array.isArray(raw?.candidates)
      ? raw.candidates.map((c: any) => ({
          product: normalizeProduct(c.product),
          score: Number(c.score || 0),
          explanation: typeof c.explanation === "string" ? c.explanation : undefined,
        }))
      : [],
  }), { method: "POST", body: form }, signal);
};


export const checkCompatibility = (req: CompatibilityRequest, signal?: AbortSignal): Promise<CompatibilityResult> =>
  request("/api/compatibility/check", normalizeCompatibility, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      existing_product_id: req.ownedProductId,
      candidate_product_id: req.candidateProductId,
      ...(req.userSpecs && Object.keys(req.userSpecs).length ? { context: req.userSpecs } : {}),
    }),
  }, signal);

export const formatPrice = (price?: number, currency?: string) =>
  price === undefined ? undefined : currency ? new Intl.NumberFormat(undefined, { style: "currency", currency }).format(price) : String(price);
