/* eslint-disable @next/next/no-img-element */
"use client";
import { useEffect, useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, MAX_UPLOAD_MB } from "@/lib/config";
import { validateImageFile } from "@/lib/validation";

interface Props { file: File | null; onChange: (file: File | null) => void; disabled?: boolean }

export function ImageUploader({ file, onChange, disabled }: Props) {
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
        <div className="card p-4">
          <img src={preview} alt={`Preview of ${file.name}`} className="mx-auto max-h-80 rounded object-contain" />
          <p className="mt-3 text-center text-sm text-muted">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</p>
          <div className="mt-3 flex justify-center gap-2">
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => pickRef.current?.click()}>Replace image</button>
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => { setError(null); onChange(null); }}>Remove image</button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); if (!disabled) accept(e.dataTransfer.files?.[0]); }}
          className={`rounded-lg border-2 border-dashed p-8 text-center ${dragging ? "border-brand bg-brand-tint" : "border-ink/30 bg-white"}`}
        >
          <p className="font-semibold">Drag a product photo here</p>
          <p className="mt-1 text-sm text-muted">JPG, PNG or WebP, up to {MAX_UPLOAD_MB} MB</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" disabled={disabled} onClick={() => pickRef.current?.click()}>Choose a file</button>
            <button type="button" className="btn-secondary" disabled={disabled} onClick={() => camRef.current?.click()}>Take a photo</button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm font-medium text-bad"><span aria-hidden>✕ </span>{error}</p>}
    </div>
  );
}
