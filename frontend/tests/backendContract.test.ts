import { describe, expect, it } from "vitest";
import { normalizeCompatibility, normalizeProductList, normalizeSearchResults } from "@/lib/normalize";

const product = { id: "p1", name: "Charger", brand: "Anker", model: "A1", category: "charger", image_url: "/img/a.png",
  price: 19.99, currency: "USD", specifications: { Port: "USB-C" }, spec_source: "datasheet", verification_status: "pending_review" };

describe("real backend payloads", () => {
  it("parses the paginated product list", () => {
    const [p] = normalizeProductList({ items: [product], total: 1, page: 1, page_size: 20, total_pages: 1 });
    expect(p.specs.Port).toBe("USB-C");
    expect(p.verified).toBe(false);
    expect(p.verificationStatus).toBe("pending_review");
    expect(p.imageUrl).toMatch(/\/img\/a\.png$/);
  });
  it("parses visual search with similarity_score", () => {
    const [r] = normalizeSearchResults({ query_image: {}, total_matches: 1, results: [{ rank: 1, similarity_score: 0.83, product }] });
    expect(r.score).toBe(0.83);
  });
  it("parses the compatibility response", () => {
    const item = (outcome: string) => ({ check_id: "c", title: "Port", existing_value: "USB-C", candidate_value: "Lightning", outcome,
      severity: "critical", explanation: "Ports differ", evidence: "Datasheet p.2" });
    const r = normalizeCompatibility({ verdict: "incompatible", summary_explanation: "Not compatible",
      passed_checks: [item("pass")], failed_checks: [item("fail")], cannot_verify_checks: [item("cannot_verify")],
      missing_specifications: [{ product_id: "p1", product_name: "Charger", missing_property: "Wattage", impact_reason: "Cannot judge speed" }] });
    expect(r.summary).toBe("Not compatible");
    expect(r.checks.map((c) => c.status)).toEqual(["passed", "failed", "unknown"]);
    expect(r.checks[1].ownedValue).toBe("USB-C");
    expect(r.checks[1].evidence).toEqual(["Datasheet p.2"]);
    expect(r.missingSpecs[0]).toContain("Wattage");
  });
});
