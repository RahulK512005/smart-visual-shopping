import { describe, expect, it } from "vitest";
import { normalizeCompatibility, normalizeSearchResults, ParseError } from "@/lib/normalize";
import { validateImageFile } from "@/lib/validation";

describe("normalizeCompatibility", () => {
  it.each([["compatible"], ["incompatible"], ["cannot_verify"]])("accepts verdict %s", (verdict) => {
    expect(normalizeCompatibility({ verdict, checks: [] }).verdict).toBe(verdict);
  });
  it("reads grouped passed/failed checks", () => {
    const r = normalizeCompatibility({ verdict: "incompatible", passed_checks: [{ name: "A" }], failed_checks: [{ name: "B", reason: "no" }] });
    expect(r.checks.map((c) => c.status)).toEqual(["passed", "failed"]);
  });
  it("rejects unknown verdicts instead of guessing", () => {
    expect(() => normalizeCompatibility({ verdict: "maybe-ish" })).toThrow(ParseError);
    expect(() => normalizeCompatibility("nope")).toThrow(ParseError);
  });
});

describe("normalizeSearchResults", () => {
  it("keeps score only when supplied", () => {
    const r = normalizeSearchResults({ results: [{ product: { id: 1, name: "X" }, score: 0.9 }, { id: 2, name: "Y" }] });
    expect(r[0].score).toBe(0.9);
    expect(r[1].score).toBeUndefined();
  });
  it("throws on malformed data", () => {
    expect(() => normalizeSearchResults({ foo: 1 })).toThrow(ParseError);
  });
});

describe("validateImageFile", () => {
  it("accepts a small png", () => expect(validateImageFile({ type: "image/png", size: 1000 })).toBeNull());
  it("rejects wrong type", () => expect(validateImageFile({ type: "application/pdf", size: 1000 })).toMatch(/isn't supported/));
  it("rejects oversize", () => expect(validateImageFile({ type: "image/png", size: 50 * 1024 * 1024 })).toMatch(/larger than/));
});
