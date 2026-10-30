"use client";
import { useEffect, useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from "@/lib/config";
import { validateImageFile } from "@/lib/validation";

/* eslint-disable @next/next/no-img-element */

interface Props { file: File | null; onChange: (file: File | null) => void; disabled?: boolean; scanning?: boolean; hint?: string }

const CornerBrackets = () => (
  <>
    {[
      "left-2 top-2 border-l-2 border-t-2 rounded-tl-xl",
      "right-2 top-2 border-r-2 border-t-2 rounded-tr-xl",
      "left-2 bottom-2 border-l-2 border-b-2 rounded-bl-xl",
      "right-2 bottom-2 border-r-2 border-b-2 rounded-br-xl"
    ].map((c) => (
      <span key={c} aria-hidden className={`pointer-events-none absolute h-6 w-6 border-volt/60 ${c}`} />
    ))}
  </>
);

export function ImageUploader({ file, onChange, disabled, scanning, hint }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const pickRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function accept(f: File | undefined) {
    if (!f) return;
    const problem = validateImageFile(f);
    setError(problem);
    if (!problem) onChange(f);
  }

  const inputProps = { type: "file", className: "sr-only", tabIndex: -1, accept: ACCEPTED_IMAGE_TYPES.join(","), disabled } as const;

  return (
    <div>
      <input {...inputProps} ref={pickRef} aria-label="Choose an image file" data-testid="file-input"
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />
      <input {...inputProps} ref={camRef} capture="environment" aria-label="Take a photo"
        onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }} />

      {file && preview ? (
        <div className="animate-rise">
          <div className="relative overflow-hidden rounded-2xl" style={{ background: "#0A0A0F" }}>
            <img
              src={preview}
              alt={`Preview of ${file.name}`}
              className={`mx-auto max-h-72 w-full object-contain transition-all duration-500 ${scanning ? "scale-[1.02] opacity-75" : ""}`}
            />
            <CornerBrackets />
            {scanning && (
              <>
                <span
                  aria-hidden
                  className="animate-scan absolute inset-x-3 h-0.5 rounded-full"
                  style={{ background: "linear-gradient(90deg,transparent,#A78BFA,#06FFA5,transparent)", boxShadow: "0 0 20px rgba(167,139,250,.8)" }}
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
                  <div
                    className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-white"
                    style={{ background: "rgba(10,10,15,.8)", border: "1px solid rgba(167,139,250,.3)" }}
                  >
                    <span className="h-3 w-3 animate-spin rounded-full border border-volt/30 border-t-volt" />
                    Scanning…
                  </div>
                </div>
              </>
            )}
          </div>
          <p className="mt-2 truncate text-center text-xs text-white/30">{file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => pickRef.current?.click()}>
              Replace
            </button>
            <button type="button" className="btn-ghost" disabled={disabled} onClick={() => { setError(null); onChange(null); }}>
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) accept(e.dataTransfer.files?.[0]); }}
          className={`relative rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 sm:p-10 ${
            dragging
              ? "scale-[1.02]"
              : ""
          }`}
          style={{
            borderColor: dragging ? "rgba(167,139,250,.6)" : "rgba(255,255,255,.12)",
            background: dragging
              ? "rgba(167,139,250,.08)"
              : "rgba(255,255,255,.02)"
          }}
        >
          <CornerBrackets />

          {/* Upload icon */}
          <div
            aria-hidden
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-2xl transition-all duration-300 ${dragging ? "scale-110" : "animate-floaty"}`}
            style={{
              background: dragging
                ? "linear-gradient(135deg,rgba(167,139,250,.3),rgba(6,255,165,.2))"
                : "linear-gradient(135deg,rgba(124,58,237,.3),rgba(167,139,250,.15))",
              border: "1px solid rgba(167,139,250,.2)",
              boxShadow: dragging ? "0 0 30px rgba(167,139,250,.4)" : "0 0 20px rgba(124,58,237,.2)"
            }}
          >
            {dragging ? "✦" : "↑"}
          </div>

          <p className="mt-4 font-display text-xl font-bold text-white">
            {dragging ? "Drop it here" : "Drop a photo"}
          </p>
          <p className="mt-1.5 text-sm text-white/40">
            {hint ?? `JPG, PNG or WebP · up to ${MAX_UPLOAD_MB} MB`}
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className="btn-primary"
              disabled={disabled}
              onClick={() => pickRef.current?.click()}
            >
              Choose a file
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={disabled}
              onClick={() => camRef.current?.click()}
            >
              📷 Take a photo
            </button>
          </div>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-3 animate-rise rounded-xl px-4 py-2.5 text-sm font-semibold"
          style={{ background: "rgba(255,68,68,.1)", border: "1px solid rgba(255,68,68,.25)", color: "#FF6B6B" }}
        >
          <span aria-hidden>✕ </span>{error}
        </p>
      )}
    </div>
  );
}
