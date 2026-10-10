import { useEffect, useRef, useState } from "react";
import { validateImage } from "../utils/validation";

interface Props {
  file: File | null;
  onChange(file: File | null): void;
  disabled?: boolean;
  scanning?: boolean; // shows the scan line while the AI is working
  title?: string;
  hint?: string;
}

/** Click / drag-and-drop / keyboard image picker with preview, validation and a "viewfinder" frame. */
export default function ImageDropzone({ file, onChange, disabled, scanning, title = "Add a photo", hint = "JPG, PNG or WebP, up to 8 MB" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function accept(f: File | undefined) {
    if (!f) return;
    const problem = await validateImage(f);
    if (problem) {
      setError(problem);
      onChange(null);
      return;
    }
    setError(null);
    onChange(f);
  }

  return (
    <div>
      <div
        className={`viewfinder ${over ? "over" : ""} ${file ? "filled" : ""} ${scanning ? "scanning" : ""}`}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (!disabled) accept(e.dataTransfer.files?.[0]); }}
      >
        <i className="c tl" /><i className="c tr" /><i className="c bl" /><i className="c br" />
        {preview ? (
          <img src={preview} alt="Your uploaded image preview" />
        ) : (
          <button type="button" className="vf-empty" disabled={disabled} onClick={() => inputRef.current?.click()}>
            <strong>{title}</strong>
            <span>Drop it here or click to browse</span>
            <small>{hint}</small>
          </button>
        )}
        {scanning && <span className="scanline" aria-hidden="true" />}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          hidden
          onChange={(e) => { accept(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      {file && (
        <div className="row gap">
          <span className="muted small-text">{file.name}</span>
          <button type="button" className="link" disabled={disabled} onClick={() => inputRef.current?.click()}>Change photo</button>
          <button type="button" className="link" disabled={disabled} onClick={() => { setError(null); onChange(null); }}>Remove</button>
        </div>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}
