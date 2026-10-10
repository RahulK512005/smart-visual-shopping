import { useSearchParams } from "react-router-dom";
import SimilarMode from "./SimilarMode";
import CompatMode from "./CompatMode";

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const mode = params.get("mode") === "compat" ? "compat" : "similar";

  return (
    <div className="page">
      <h1>Smart Visual Shopping</h1>
      <p className="lead">Find what you saw, or check whether it works with what you own.</p>
      <div className="seg big" role="tablist" aria-label="Mode">
        <button role="tab" aria-selected={mode === "similar"} className={mode === "similar" ? "on" : ""} onClick={() => setParams({ mode: "similar" })}>Find similar</button>
        <button role="tab" aria-selected={mode === "compat"} className={mode === "compat" ? "on" : ""} onClick={() => setParams({ mode: "compat" })}>Check with mine</button>
      </div>
      {/* key forces a clean state when switching modes */}
      {mode === "similar" ? <SimilarMode key="s" /> : <CompatMode key="c" />}
    </div>
  );
}
