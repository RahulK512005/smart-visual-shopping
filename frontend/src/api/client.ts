const BASE: string = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "vyumi_token";

export const USE_MOCK: boolean = String(import.meta.env.VITE_USE_MOCK ?? "true") === "true";

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let unauthorizedHandler: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

/** Fetch wrapper: adds the auth token, parses JSON, converts failures into ApiError. */
export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = tokenStore.get();
  if (token) headers.Authorization = `Bearer ${token}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form; // browser sets the multipart boundary itself
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, { method: opts.method ?? "GET", headers, body, signal: opts.signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(0, "NETWORK", "We could not reach the server. Check your connection and try again.");
  }

  if (!res.ok) {
    let code = "HTTP_" + res.status;
    let message = "Something did not work. Please try again.";
    try {
      const data = await res.json();
      // Supports our contract { error_code, message } and FastAPI's default { detail }
      code = data.error_code ?? code;
      message = data.message ?? (typeof data.detail === "string" ? data.detail : message);
    } catch {
      /* body was not JSON */
    }
    if (res.status === 401 && path !== "/auth/login") unauthorizedHandler?.();
    throw new ApiError(res.status, code, message);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** WebSocket base, e.g. ws://localhost:5173/ws (proxied to the backend in dev). */
export function wsBase(): string {
  const override = import.meta.env.VITE_WS_BASE as string | undefined;
  if (override) return override;
  const proto = location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${location.host}/ws`;
}
