import { API_BASE_URL } from "./config";
import type {
  CheckStatus, CompatibilityCheck, CompatibilityResult, Product, SearchResult, SpecValue, Verdict,
} from "./types";

export class ParseError extends Error {}

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v.trim() ? v.trim() : typeof v === "number" ? String(v) : undefined;
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const strList = (v: unknown): string[] =>
  typeof v === "string" && v.trim() ? [v.trim()] : Array.isArray(v) ? v.map((x) => (isRec(x) ? str(x.text ?? x.source ?? x.url ?? x.name) : str(x))).filter((x): x is string => !!x) : [];

function absoluteUrl(url?: string): string | undefined {
  if (!url) return undefined;
  if (/^(https?:|data:)/i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

function normalizeSpecs(raw: unknown): Record<string, SpecValue> {
  const out: Record<string, SpecValue> = {};
  if (isRec(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") out[k] = v;
      else if (v != null) out[k] = JSON.stringify(v);
    }
  } else if (Array.isArray(raw)) {
    for (const item of raw) {
      if (isRec(item)) {
        const k = str(item.name ?? item.key ?? item.label);
        const v = item.value;
        if (k && (typeof v === "string" || typeof v === "number" || typeof v === "boolean")) out[k] = v;
      }
    }
  }
  return out;
}

export function normalizeProduct(raw: unknown): Product {
  if (!isRec(raw)) throw new ParseError("Product data was not in the expected format.");
  const id = str(raw.id ?? raw.product_id ?? raw.sku);
  const name = str(raw.name ?? raw.title);
  if (!id || !name) throw new ParseError("A product is missing its id or name.");
  return {
    id,
    name,
    brand: str(raw.brand ?? raw.manufacturer),
    model: str(raw.model ?? raw.model_number),
    category: str(raw.category),
    price: num(raw.price),
    currency: str(raw.currency),
    imageUrl: absoluteUrl(str(raw.image_url ?? raw.imageUrl ?? raw.image)),
    specs: normalizeSpecs(raw.specifications ?? raw.specs ?? raw.attributes),
    source: str(raw.spec_source ?? raw.source ?? raw.source_url),
    verificationStatus: str(raw.verification_status),
    verified: typeof raw.verified === "boolean" ? raw.verified : str(raw.verification_status) ? str(raw.verification_status) === "verified" : undefined,
    description: str(raw.description),
  };
}

function listFrom(raw: unknown, keys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (isRec(raw)) for (const k of keys) if (Array.isArray(raw[k])) return raw[k] as unknown[];
  throw new ParseError("The server returned a list in an unexpected format.");
}

export function normalizeProductList(raw: unknown): Product[] {
  return listFrom(raw, ["products", "items", "results", "data"]).map(normalizeProduct);
}

export function normalizeSearchResults(raw: unknown): SearchResult[] {
  const items = listFrom(raw, ["results", "matches", "items", "products", "data"]);
  return items.map((item, i) => {
    if (!isRec(item)) throw new ParseError("A search result was not in the expected format.");
    const product = normalizeProduct(isRec(item.product) ? item.product : item);
    return {
      rank: num(item.rank) ?? i + 1,
      product,
      score: num(item.score ?? item.similarity ?? item.similarity_score),
      explanation: str(item.similarity_explanation ?? item.explanation ?? item.detection_label),
    };
  });
}

const VERDICTS: Record<string, Verdict> = {
  compatible: "compatible", yes: "compatible", pass: "compatible", passed: "compatible",
  partially_compatible: "partially_compatible", partly_compatible: "partially_compatible", partial: "partially_compatible",
  incompatible: "incompatible", not_compatible: "incompatible", no: "incompatible", fail: "incompatible", failed: "incompatible",
  cannot_verify: "cannot_verify", cannotverify: "cannot_verify", unknown: "cannot_verify",
  uncertain: "cannot_verify", insufficient_data: "cannot_verify", unverifiable: "cannot_verify",
};

const STATUSES: Record<string, CheckStatus> = {
  passed: "passed", pass: "passed", ok: "passed", compatible: "passed",
  failed: "failed", fail: "failed", incompatible: "failed",
  warning: "warning", warn: "warning",
  unknown: "unknown", missing: "unknown", unverifiable: "unknown", cannot_verify: "unknown",
};
const key = (v: unknown) => (str(v) ?? "").toLowerCase().replace(/[\s-]+/g, "_");

function normalizeCheck(raw: unknown, fallback?: CheckStatus): CompatibilityCheck {
  if (!isRec(raw)) {
    const name = str(raw);
    if (!name) throw new ParseError("A compatibility check was not in the expected format.");
    return { name, status: fallback ?? "unknown", evidence: [] };
  }
  const status = STATUSES[key(raw.outcome ?? raw.status ?? raw.result)] ?? fallback ?? "unknown";
  return {
    name: str(raw.title ?? raw.name ?? raw.check ?? raw.rule) ?? "Check",
    status,
    explanation: str(raw.explanation ?? raw.reason ?? raw.message ?? raw.details),
    ownedValue: str(raw.existing_value ?? raw.owned_value ?? raw.ownedValue ?? raw.owned),
    candidateValue: str(raw.candidate_value ?? raw.candidateValue ?? raw.candidate),
    evidence: strList(raw.evidence ?? raw.evidence_refs ?? raw.sources),
    severity: str(raw.severity),
  };
}

function missingList(v: unknown): string[] {
  if (!Array.isArray(v)) return strList(v);
  return v.map((m) => {
    if (!isRec(m)) return str(m);
    const prop = str(m.missing_property ?? m.property ?? m.name);
    const who = str(m.product_name ?? m.product_id);
    const why = str(m.impact_reason ?? m.reason);
    return [who && prop ? `${who}: ${prop}` : prop ?? who, why].filter(Boolean).join(" - ");
  }).filter((x): x is string => !!x);
}

export function normalizeCompatibility(raw: unknown): CompatibilityResult {
  if (!isRec(raw)) throw new ParseError("The compatibility result was not in the expected format.");
  const verdict = VERDICTS[key(raw.verdict ?? raw.result ?? raw.status)];
  if (!verdict) throw new ParseError("The compatibility result did not include a recognised verdict.");

  let checks: CompatibilityCheck[] = [];
  if (Array.isArray(raw.checks)) checks = raw.checks.map((c) => normalizeCheck(c));
  else {
    const grouped: [unknown, CheckStatus][] = [
      [raw.passed_checks, "passed"], [raw.failed_checks, "failed"], [raw.warning_checks, "warning"], [raw.cannot_verify_checks, "unknown"],
    ];
    for (const [list, status] of grouped) if (Array.isArray(list)) checks.push(...list.map((c) => normalizeCheck(c, status)));
  }
  return {
    verdict,
    summary: str(raw.summary_explanation ?? raw.summary ?? raw.explanation ?? raw.message),
    checks,
    missingSpecs: missingList(raw.missing_specifications ?? raw.missing_specs ?? raw.missingSpecs ?? raw.missing),
    warnings: strList(raw.warnings),
    evidence: strList(raw.evidence ?? raw.evidence_refs ?? raw.sources),
  };
}
