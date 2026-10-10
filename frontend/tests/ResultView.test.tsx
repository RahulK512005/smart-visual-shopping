import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResultView } from "@/components/ResultView";
import type { CompatibilityResult, Product } from "@/lib/types";

const p = (id: string, name: string): Product => ({ id, name, specs: { Port: "USB-C" } });
const base: CompatibilityResult = { verdict: "compatible", checks: [], missingSpecs: [], warnings: [], evidence: [] };

describe("ResultView", () => {
  it.each([
    ["compatible", "Compatible"],
    ["incompatible", "Incompatible"],
    ["cannot_verify", "Cannot verify"],
  ] as const)("shows a text label for %s", (verdict, label) => {
    render(<ResultView result={{ ...base, verdict }} owned={p("1", "Own")} candidate={p("2", "Buy")} onChange={() => {}} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("renders failed checks, missing specs and evidence from the backend", () => {
    const result: CompatibilityResult = {
      ...base, verdict: "incompatible",
      checks: [{ name: "Port type", status: "failed", explanation: "Ports differ", evidence: ["Manual p.4"] }],
      missingSpecs: ["Voltage"], warnings: ["Check cable length"], evidence: ["datasheet.pdf"],
    };
    render(<ResultView result={result} owned={p("1", "Own")} candidate={p("2", "Buy")} onChange={() => {}} />);
    expect(screen.getByText(/Port type/)).toBeInTheDocument();
    expect(screen.getByText("Ports differ")).toBeInTheDocument();
    expect(screen.getByText("Voltage")).toBeInTheDocument();
    expect(screen.getByText("Check cable length")).toBeInTheDocument();
    expect(screen.getByText("datasheet.pdf")).toBeInTheDocument();
  });
});
