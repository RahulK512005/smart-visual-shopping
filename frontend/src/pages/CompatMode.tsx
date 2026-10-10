import { useState } from "react";
import { api } from "../api";
import { useJobRunner } from "../hooks/useJobRunner";
import ImageDropzone from "../components/ImageDropzone";
import ProductPicker from "../components/ProductPicker";
import ProgressPanel from "../components/ProgressPanel";
import ErrorBanner from "../components/ErrorBanner";
import VerdictCard from "../components/VerdictCard";
import type { CompatRequest, CompatResult, OwnedItem } from "../types";

type Source = "photo" | "catalog";
const CONNECTORS = ["USB-C", "USB-A", "Micro-USB", "Lightning"];

export default function CompatMode() {
  const [source, setSource] = useState<Source>("photo");
  const [file, setFile] = useState<File | null>(null);
  const [ownedId, setOwnedId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [connector, setConnector] = useState("");
  const [width, setWidth] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const { state, run, reset } = useJobRunner<CompatResult>();
  const busy = state.phase === "running";

  async function check() {
    setFormError(null);
    if (source === "photo" && !file) return setFormError("Add a photo of the item you own, or pick one from the catalog.");
    if (source === "catalog" && !ownedId) return setFormError("Pick the item you already own.");
    if (!targetId) return setFormError("Pick the product you want to buy.");
    const w = width.trim() === "" ? undefined : Number(width);
    if (w !== undefined && (!Number.isFinite(w) || w <= 0 || w > 1000)) return setFormError("Enter the width as a number in cm, for example 60.");

    const attributes: Record<string, string | number> = {};
    if (connector) attributes.connector = connector;
    if (w !== undefined) attributes.max_width_cm = w;

    await run(async (setStage) => {
      const owned: OwnedItem = { attributes: Object.keys(attributes).length ? attributes : undefined };
      if (source === "photo" && file) {
        setStage("uploading");
        owned.image_id = (await api.uploadImage(file)).image_id;
      } else if (ownedId) {
        owned.product_id = ownedId;
      }
      const req: CompatRequest = { owned, target_product_id: targetId };
      return api.startCompat(req);
    });
  }

  const result = state.phase === "done" ? state.result : undefined;

  if (result) {
    return <div className="narrow-col"><VerdictCard result={result} onAgain={reset} /></div>;
  }

  return (
    <div className="split">
      <section aria-labelledby="owned-h">
        <h2 id="owned-h">1. What do you already own?</h2>
        <div className="seg" role="tablist" aria-label="How to describe your item">
          <button role="tab" aria-selected={source === "photo"} className={source === "photo" ? "on" : ""} onClick={() => setSource("photo")} disabled={busy}>Upload a photo</button>
          <button role="tab" aria-selected={source === "catalog"} className={source === "catalog" ? "on" : ""} onClick={() => setSource("catalog")} disabled={busy}>Pick from catalog</button>
        </div>
        {source === "photo"
          ? <ImageDropzone file={file} onChange={setFile} disabled={busy} scanning={busy} title="Add a photo of your item" hint="Show the item clearly, ports and labels visible" />
          : <ProductPicker label="Your item" value={ownedId} onChange={setOwnedId} disabled={busy} />}

        <details className="details">
          <summary>Add what you know (optional, makes the answer more certain)</summary>
          <label>Connector type
            <select value={connector} onChange={(e) => setConnector(e.target.value)} disabled={busy}>
              <option value="">I am not sure</option>
              {CONNECTORS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>Space available, width in cm
            <input inputMode="decimal" placeholder="e.g. 70" value={width} onChange={(e) => setWidth(e.target.value)} disabled={busy} />
          </label>
        </details>
      </section>

      <section aria-labelledby="target-h">
        <h2 id="target-h">2. What do you want to buy?</h2>
        <ProductPicker label="Product to buy" value={targetId} onChange={setTargetId} disabled={busy} />
        <div className="actions">
          <button className="btn" onClick={check} disabled={busy}>{busy ? "Checking…" : "Check with mine"}</button>
        </div>
        {formError && <p className="field-error" role="alert">{formError}</p>}
        {busy && <ProgressPanel stage={state.stage} progress={state.progress} />}
        {state.phase === "error" && <ErrorBanner message={state.error ?? "We could not finish this. Please try again."} onRetry={check} />}
      </section>
    </div>
  );
}
