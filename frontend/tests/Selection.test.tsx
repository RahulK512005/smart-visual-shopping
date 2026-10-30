import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { FilterChips } from "@/components/FilterChips";
import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/types";

const product: Product = { id: "p1", name: "Anker Charger", brand: "Anker", category: "charger", specs: {} };

describe("ProductCard selection", () => {
  it("toggles select and deselect through onToggleSelect", () => {
    const onToggle = vi.fn();
    const { rerender } = render(<ProductCard product={product} selected={false} onToggleSelect={onToggle} />);
    const btn = screen.getByRole("button", { name: /select anker charger/i });
    expect(btn).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledWith(product);
    rerender(<ProductCard product={product} selected onToggleSelect={onToggle} />);
    expect(screen.getByRole("button", { name: /deselect anker charger/i })).toHaveAttribute("aria-pressed", "true");
  });
  it("shows a match score only when the backend sends one", () => {
    const { rerender } = render(<ProductCard product={product} />);
    expect(screen.queryByText(/AI visual match/)).toBeNull();
    rerender(<ProductCard product={product} score={0.94} />);
    expect(screen.getByText("94%")).toBeInTheDocument();
  });
});

function Harness({ multi }: { multi?: boolean }) {
  const [sel, setSel] = useState<string[]>([]);
  return <FilterChips label="Categories" multi={multi} options={[{ value: "charger" }, { value: "cable" }]} selected={sel} onChange={setSel} />;
}

describe("FilterChips", () => {
  it("selects, then deselects on a second click", () => {
    render(<Harness />);
    const chip = screen.getByRole("button", { name: /charger/i });
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(chip);
    expect(chip).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });
  it("single mode replaces the choice, multi mode adds to it", () => {
    const { unmount } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: /charger/i }));
    fireEvent.click(screen.getByRole("button", { name: /cable/i }));
    expect(screen.getByRole("button", { name: /charger/i })).toHaveAttribute("aria-pressed", "false");
    unmount();
    render(<Harness multi />);
    fireEvent.click(screen.getByRole("button", { name: /charger/i }));
    fireEvent.click(screen.getByRole("button", { name: /cable/i }));
    expect(screen.getByRole("button", { name: /charger/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /cable/i })).toHaveAttribute("aria-pressed", "true");
  });
  it("Clear filters resets to All", () => {
    render(<Harness multi />);
    fireEvent.click(screen.getByRole("button", { name: /charger/i }));
    fireEvent.click(screen.getByRole("button", { name: /clear filters/i }));
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });
});
