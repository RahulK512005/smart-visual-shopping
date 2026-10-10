import { describe, expect, it } from "vitest";
import { mockApi } from "./mock";
import type { CompatRequest, CompatResult, SimilarResult } from "../types";

async function finish<T>(jobId: string) {
  for (let i = 0; i < 40; i++) {
    const j = await mockApi.getJob<T>(jobId);
    if (j.status === "done" || j.status === "failed") return j;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error("job never finished");
}
const verdict = async (req: CompatRequest) => {
  const { job_id } = await mockApi.startCompat(req);
  return (await finish<CompatResult>(job_id)).result!.verdict;
};

describe("mock compatibility rules", () => {
  it("hard connector mismatch wins", async () => {
    // owned Micro-USB phone charger (p9) vs USB-C charger (p7)
    expect(await verdict({ owned: { product_id: "p9" }, target_product_id: "p7" })).toBe("not_compatible");
  }, 10000);
  it("same connector is compatible", async () => {
    expect(await verdict({ owned: { product_id: "p7" }, target_product_id: "p7" })).toBe("compatible");
  }, 10000);
  it("unknown data → not enough info, never a guess", async () => {
    expect(await verdict({ owned: { attributes: {} }, target_product_id: "p10" })).toBe("not_enough_info");
  }, 10000);
  it("too-wide product is not compatible", async () => {
    expect(await verdict({ owned: { attributes: { max_width_cm: 50 } }, target_product_id: "p13" })).toBe("not_compatible");
  }, 10000);
});

describe("mock similarity", () => {
  it("returns at most 6 matches and excludes the seed product", async () => {
    const { job_id } = await mockApi.startSimilar({ product_id: "p1", top_k: 6 });
    const r = (await finish<SimilarResult>(job_id)).result!;
    expect(r.matches.length).toBeLessThanOrEqual(6);
    expect(r.matches.some((m) => m.product.id === "p1")).toBe(false);
  }, 10000);
});
