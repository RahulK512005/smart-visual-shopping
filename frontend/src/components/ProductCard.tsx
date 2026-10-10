import type { SimilarMatch } from "../types";
import { formatPrice, percent } from "../utils/format";

export default function ProductCard({ match, onMoreLikeThis }: { match: SimilarMatch; onMoreLikeThis(): void }) {
  const { product: p, score, reason } = match;
  return (
    <article className="card product">
      <div className="thumb">
        <img src={p.image_url} alt={p.name} loading="lazy" />
        <span className="score" title="AI-estimated similarity">{percent(score)} match</span>
      </div>
      <div className="card-body">
        <h3>{p.name}</h3>
        <p className="price">{formatPrice(p.price, p.currency)}</p>
        <p className="muted small-text">{reason}</p>
        <div className="row gap">
          <button className="btn small" onClick={onMoreLikeThis}>More like this</button>
          {p.product_url && <a className="btn ghost small" href={p.product_url} target="_blank" rel="noreferrer">View product</a>}
        </div>
      </div>
    </article>
  );
}
