import { describe, expect, it } from "vitest";
import { checkFileBasics, isEmail, validatePassword } from "./validation";
import { friendlyError, formatPrice, percent } from "./format";

describe("checkFileBasics", () => {
  it("accepts a normal jpeg", () => expect(checkFileBasics({ type: "image/jpeg", size: 1000 })).toBeNull());
  it("rejects pdf", () => expect(checkFileBasics({ type: "application/pdf", size: 1000 })).toMatch(/JPG, PNG or WebP/));
  it("rejects empty", () => expect(checkFileBasics({ type: "image/png", size: 0 })).toMatch(/empty/));
  it("rejects over 8 MB", () => expect(checkFileBasics({ type: "image/png", size: 9 * 1024 * 1024 })).toMatch(/8 MB/));
});

describe("forms", () => {
  it("validates email", () => { expect(isEmail("a@b.co")).toBe(true); expect(isEmail("nope")).toBe(false); });
  it("validates password", () => {
    expect(validatePassword("short1")).toMatch(/8 characters/);
    expect(validatePassword("longpassword")).toMatch(/letter and one number/);
    expect(validatePassword("longpass123")).toBeNull();
  });
});

describe("format", () => {
  it("maps known error codes to plain language", () => expect(friendlyError("IMAGE_UNREADABLE")).toMatch(/clearer photo/));
  it("falls back safely for unknown codes", () => expect(friendlyError("???", undefined)).toMatch(/try again/));
  it("formats price and percent", () => { expect(formatPrice(1999)).toContain("1,999"); expect(percent(0.924)).toBe("92%"); });
});
