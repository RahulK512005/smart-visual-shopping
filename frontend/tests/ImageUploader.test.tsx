import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageUploader } from "@/components/ImageUploader";

describe("ImageUploader", () => {
  it("rejects invalid file types and does not call onChange", () => {
    const onChange = vi.fn();
    render(<ImageUploader file={null} onChange={onChange} />);
    const bad = new File(["x"], "doc.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByTestId("file-input"), { target: { files: [bad] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/isn't supported/);
    expect(onChange).not.toHaveBeenCalled();
  });
  it("accepts a valid image", () => {
    const onChange = vi.fn();
    render(<ImageUploader file={null} onChange={onChange} />);
    const ok = new File(["x"], "a.png", { type: "image/png" });
    fireEvent.change(screen.getByTestId("file-input"), { target: { files: [ok] } });
    expect(onChange).toHaveBeenCalledWith(ok);
  });
});
