/**
 * Fake backend so the UI can be built, demoed and tested before the real API exists.
 * Enabled with VITE_USE_MOCK=true. Behaviour hints for testing error states:
 *   - upload a file whose name contains "fail"   → job fails with IMAGE_UNREADABLE
 *   - upload a file whose name contains "nomatch" → job succeeds with zero matches
 *   - login: shopper@vyumi.test / shopper123  or  admin@vyumi.test / admin123
 */
import { ApiError } from "./client";
import type { Api } from "./types";
import type {
  AdminStats, CompatRequest, CompatResult, CompatCheck, Job, Product, SimilarRequest, SimilarResult, User,
} from "../types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- catalog ---------- */
const GLYPH: Record<string, [string, string]> = {
  Apparel: ["👕", "#DDE5FB"],
  Footwear: ["👟", "#FBE3D9"],
  Chargers: ["🔌", "#DFF3E8"],
  Shelves: ["🗄️", "#F3EAD7"],
  Appliances: ["🍳", "#EADFF5"],
};
function art(category: string): string {
  const [g, bg] = GLYPH[category] ?? ["📦", "#EEE"];
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='400' height='400' fill='${bg}'/><text x='200' y='235' font-size='150' text-anchor='middle'>${g}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
const P = (
  n: number, name: string, category: string, price: number,
  attributes?: Record<string, string | number>,
): Product => ({
  id: `p${n}`, sku: `VY-${1000 + n}`, name, category, brand: "Demo Brand", price, currency: "INR",
  image_url: art(category), attributes,
});

const CATALOG: Product[] = [
  P(1, "Linen Shirt – Sand", "Apparel", 1999),
  P(2, "Oxford Shirt – Sky Blue", "Apparel", 2299),
  P(3, "Oversized Linen Shirt – White", "Apparel", 2499),
  P(4, "Relaxed Tee – Charcoal", "Apparel", 999),
  P(5, "Trail Sneaker – Olive", "Footwear", 3499),
  P(6, "Court Sneaker – White", "Footwear", 2999),
  P(7, "65W USB-C Fast Charger", "Chargers", 1799, { connector: "USB-C" }),
  P(8, "18W USB-A Wall Charger", "Chargers", 599, { connector: "USB-A" }),
  P(9, "Micro-USB Travel Charger", "Chargers", 449, { connector: "Micro-USB" }),
  P(10, "Floating Wall Shelf 60 cm", "Shelves", 1299, { width_cm: 60 }),
  P(11, "Floor Bookshelf 80 cm", "Shelves", 4999, { width_cm: 80 }),
  P(12, "Compact Air Fryer 4L", "Appliances", 5499, { width_cm: 32 }),
  P(13, "Convection Microwave 28L", "Appliances", 8999, { width_cm: 52 }),
];

const REASON: Record<string, string> = {
  Apparel: "Similar silhouette and colour",
  Footwear: "Similar shape and sole style",
  Chargers: "Similar plug and body shape",
  Shelves: "Similar shape and finish",
  Appliances: "Similar form and size",
};

/* ---------- in-memory state ---------- */
const images = new Map<string, { name: string; size: number }>();
interface MockJob { id: string; startedAt: number; stages: string[]; result?: unknown; fail?: { code: string; message: string } }
const jobs = new Map<string, MockJob>();
let reindexedAt: string | null = null;

const USERS: (User & { password: string })[] = [
  { id: "u1", name: "Demo Shopper", email: "shopper@vyumi.test", password: "shopper123", role: "shopper" },
  { id: "u2", name: "Demo Admin", email: "admin@vyumi.test", password: "admin123", role: "admin" },
];

function strip(u: User & { password?: string }): User {
  return { id: u.id, name: u.name, email: u.email, role: u.role };
}
function newToken(u: User) {
  return "mock-" + u.id; // token just carries the user id, so a refresh keeps you signed in (demo accounts)
}

function createJob(stages: string[], result?: unknown, fail?: MockJob["fail"]) {
  const id = "job-" + Math.random().toString(36).slice(2, 9);
  jobs.set(id, { id, startedAt: Date.now(), stages, result, fail });
  return { job_id: id };
}

/* ---------- similarity ---------- */
function similar(req: SimilarRequest): SimilarResult {
  const cats = Object.keys(GLYPH);
  let category: string;
  let exclude: string | undefined;
  if (req.product_id) {
    const p = CATALOG.find((x) => x.id === req.product_id);
    category = p?.category ?? cats[0];
    exclude = p?.id;
  } else {
    const img = req.image_id ? images.get(req.image_id) : undefined;
    category = cats[(img?.size ?? 0) % cats.length];
    if (img?.name.toLowerCase().includes("nomatch")) return { matches: [] };
  }
  const same = CATALOG.filter((p) => p.category === category && p.id !== exclude);
  const others = CATALOG.filter((p) => p.category !== category);
  const ranked = [...same, ...others].slice(0, req.top_k ?? 6);
  return {
    category_guess: { label: category, confidence: 0.88 },
    matches: ranked.map((product, i) => ({
      product,
      score: Math.max(0.35, (product.category === category ? 0.95 : 0.6) - i * 0.06),
      reason: product.category === category ? REASON[category] : "Loosely related style",
    })),
  };
}

/* ---------- compatibility (mirrors the "rules first" idea from the spec) ---------- */
function compat(req: CompatRequest): CompatResult {
  const target = CATALOG.find((p) => p.id === req.target_product_id);
  const ownedProduct = req.owned.product_id ? CATALOG.find((p) => p.id === req.owned.product_id) : undefined;
  const known = { ...(ownedProduct?.attributes ?? {}), ...(req.owned.attributes ?? {}) };
  const checks: CompatCheck[] = [];
  const missing: string[] = [];

  if (target?.attributes?.connector !== undefined) {
    const have = known.connector;
    if (have === undefined) {
      checks.push({ rule: "Connector type", status: "unknown", detail: "We do not know the connector on your item." });
      missing.push("The connector type of your item (e.g. USB-C, USB-A)");
    } else if (String(have) === String(target.attributes.connector)) {
      checks.push({ rule: "Connector type", status: "pass", detail: `Both use ${have}.` });
    } else {
      checks.push({ rule: "Connector type", status: "fail", detail: `Your item uses ${have}; this product uses ${target.attributes.connector}.` });
    }
  }
  if (target?.attributes?.width_cm !== undefined) {
    const space = known.max_width_cm ?? known.width_cm;
    if (space === undefined) {
      checks.push({ rule: "Width", status: "unknown", detail: "We do not know how much width you have." });
      missing.push("The width of your space in cm");
    } else if (Number(target.attributes.width_cm) <= Number(space)) {
      checks.push({ rule: "Width", status: "pass", detail: `${target.attributes.width_cm} cm fits within ${space} cm.` });
    } else {
      checks.push({ rule: "Width", status: "fail", detail: `This product is ${target.attributes.width_cm} cm wide; your space is ${space} cm.` });
    }
  }

  if (checks.length === 0) {
    return {
      verdict: "not_enough_info",
      reasons: ["This product has no connector or size data we can compare."],
      missing_info: ["Product specifications for this item"],
      checks, source: "rules",
    };
  }
  const fails = checks.filter((c) => c.status === "fail");
  const unknown = checks.filter((c) => c.status === "unknown");
  const passes = checks.filter((c) => c.status === "pass");
  if (fails.length) {
    return { verdict: "not_compatible", reasons: fails.map((c) => c.detail), missing_info: missing, checks, source: "rules" };
  }
  if (unknown.length && passes.length) {
    return { verdict: "partly_compatible", reasons: passes.map((c) => c.detail), missing_info: missing, checks, source: "rules" };
  }
  if (unknown.length) {
    return { verdict: "not_enough_info", reasons: ["We cannot confirm this match yet."], missing_info: missing, checks, source: "rules" };
  }
  return { verdict: "compatible", reasons: passes.map((c) => c.detail), missing_info: [], checks, source: "rules" };
}

/* ---------- the Api implementation ---------- */
export const mockApi: Api = {
  async login(email, password) {
    await wait(500);
    const u = USERS.find((x) => x.email === email.trim().toLowerCase() && x.password === password);
    if (!u) throw new ApiError(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    const user = strip(u);
    return { token: newToken(user), user };
  },
  async register(name, email, password) {
    await wait(600);
    if (USERS.some((x) => x.email === email.trim().toLowerCase())) {
      throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.");
    }
    const u = { id: "u" + (USERS.length + 1), name, email: email.trim().toLowerCase(), password, role: "shopper" as const };
    USERS.push(u);
    const user = strip(u);
    return { token: newToken(user), user };
  },
  async me() {
    const t = localStorage.getItem("vyumi_token") ?? "";
    const u = USERS.find((x) => "mock-" + x.id === t);
    if (!u) throw new ApiError(401, "UNAUTHORIZED", "Please sign in again.");
    return strip(u);
  },

  async listProducts(q) {
    await wait(200);
    const s = (q ?? "").trim().toLowerCase();
    return s ? CATALOG.filter((p) => (p.name + p.category).toLowerCase().includes(s)) : CATALOG;
  },

  async uploadImage(file) {
    await wait(500);
    const image_id = "img-" + Math.random().toString(36).slice(2, 9);
    images.set(image_id, { name: file.name, size: file.size });
    return { image_id, url: URL.createObjectURL(file) };
  },

  async startSimilar(req) {
    const img = req.image_id ? images.get(req.image_id) : undefined;
    if (img?.name.toLowerCase().includes("fail")) {
      return createJob(["embedding"], undefined, { code: "IMAGE_UNREADABLE", message: "unreadable" });
    }
    return createJob(["embedding", "searching", "ranking"], similar(req));
  },
  async startCompat(req) {
    const img = req.owned.image_id ? images.get(req.owned.image_id) : undefined;
    if (img?.name.toLowerCase().includes("fail")) {
      return createJob(["analysing"], undefined, { code: "IMAGE_UNREADABLE", message: "unreadable" });
    }
    return createJob(["analysing", "checking_rules"], compat(req));
  },

  async getJob<T>(jobId: string): Promise<Job<T>> {
    const j = jobs.get(jobId);
    if (!j) throw new ApiError(404, "JOB_NOT_FOUND", "We could not find this request. Please start again.");
    const elapsed = Date.now() - j.startedAt;
    const STEP = 900;
    const idx = Math.floor((elapsed - 300) / STEP);
    if (elapsed < 300) return { job_id: j.id, status: "queued", progress: 0 };
    if (idx >= j.stages.length) {
      if (j.fail) return { job_id: j.id, status: "failed", error_code: j.fail.code, message: j.fail.message };
      return { job_id: j.id, status: "done", progress: 100, result: j.result as T };
    }
    return { job_id: j.id, status: "processing", stage: j.stages[Math.max(0, idx)], progress: Math.round(((idx + 1) / (j.stages.length + 1)) * 100) };
  },
  jobSocketUrl: () => null,

  async adminStats(): Promise<AdminStats> {
    await wait(250);
    return { product_count: CATALOG.length, indexed_count: reindexedAt ? CATALOG.length : CATALOG.length - 2, last_indexed_at: reindexedAt };
  },
  async adminReindex() {
    reindexedAt = new Date().toISOString();
    return createJob(["embedding", "indexing"], { ok: true });
  },
};
