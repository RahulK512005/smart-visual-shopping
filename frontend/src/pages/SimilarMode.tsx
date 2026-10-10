import { useState } from "react";
import { api } from "../api";
import { useJobRunner } from "../hooks/useJobRunner";
import ImageDropzone from "../components/ImageDropzone";
import ProgressPanel from "../components/ProgressPanel";
import ErrorBanner from "../components/ErrorBanner";
import ProductCard from "../components/ProductCard";
import type { Product, SimilarResult } from "../types";
import { percent } from "../utils/format";

export default function SimilarMode() {
  const [file, setFile] = useState<File | null>(null);
  const [imageId, setImageId] = useState<string | null>(null);
  const [seed, setSeed] = useState<Product | null>(null); // set when the user taps "More like this"
  const { state, run, reset } = useJobRunner<SimilarResult>();
  const busy = state.phase === "running";

  async function search() {
    if (!file) return;
    setSeed(null);
    await run(async (setStage) => {
      setStage("uploading");
      let id = imageId;
      if (!id) {
        const up = await api.uploadImage(file);
        id = up.image_id;
        setImageId(id);
      }
      return api.startSimilar({ image_id: id, top_k: 6 });
    });
  }

  async function moreLike(p: Product) {
    setSeed(p);
    await run(() => api.startSimilar({ product_id: p.id, top_k: 6 }));
  }

  function changeFile(f: File | null) {
    setFile(f);
    setImageId(null); // a new file must be uploaded again
    setSeed(null);
    reset();
  }

  const result = state.phase === "done" ? state.result : undefined;

  return (
    <div className="split">
      <section aria-labelledby="upload-h">
        <h2 id="upload-h" className="sr">Upload an image</h2>
        <ImageDropzone file={file} onChange={changeFile} disabled={busy} scanning={busy} title="Add a photo to search with" hint="A screenshot, inspiration photo or product image" />
        <div className="actions">
          <button className="btn" disabled={!file || busy} onClick={search}>{busy ? "Searching…" : "Find similar"}</button>
          {!file && <span className="muted small-text">Add a photo first.</span>}
        </div>
      </section>

      <section aria-labelledby="results-h" className="results">
        <h2 id="results-h" className="sr">Results</h2>
        {state.phase === "idle" && (
          <div className="empty">
            <h3>Your matches will show up here</h3>
            <p className="muted">We compare your photo with the demo catalog and show the 6 closest products.</p>
          </div>
        )}
        {busy && <ProgressPanel stage={state.stage} progress={state.progress} />}
        {state.phase === "error" && (
          <ErrorBanner message={state.error ?? "We could not finish this. Please try again."} onRetry={seed ? () => moreLike(seed) : search} />
        )}
        {result && (
          <>
            <div className="result-head">
              {seed
                ? <p>Showing products similar to <strong>{seed.name}</strong>. <button className="link" onClick={search} disabled={!file}>Back to my photo</button></p>
                : result.category_guess && <p>Looks like <strong>{result.category_guess.label}</strong> <span className="tag">AI estimate · {percent(result.category_guess.confidence)} sure</span></p>}
            </div>
            {result.matches.length === 0 ? (
              <div className="empty">
                <h3>No close match</h3>
                <p className="muted">We could not find a close match in this demo catalog.</p>
                <button className="btn" onClick={() => changeFile(null)}>Try another image</button>
              </div>
            ) : (
              <>
                <div className="grid">
                  {result.matches.map((m) => <ProductCard key={m.product.id} match={m} onMoreLikeThis={() => moreLike(m.product)} />)}
                </div>
                <p className="muted small-text">Match scores are AI-estimated and may not be exact.</p>
              </>
            )}
          </>
        )}
      </section>
    </div>
  );
}
