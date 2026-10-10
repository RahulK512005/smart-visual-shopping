import { useMemo, useState } from "react";
import { useProducts } from "../hooks/useProducts";
import { formatPrice } from "../utils/format";
import ErrorBanner from "./ErrorBanner";

interface Props {
  label: string;
  value: string | null;
  onChange(id: string | null): void;
  disabled?: boolean;
}

/** Searchable list of catalog products; one can be selected. */
export default function ProductPicker({ label, value, onChange, disabled }: Props) {
  const { products, loading, error, retry } = useProducts();
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? products.filter((p) => (p.name + " " + p.category).toLowerCase().includes(s)) : products;
  }, [products, q]);

  return (
    <fieldset className="picker" disabled={disabled}>
      <legend>{label}</legend>
      <input type="search" placeholder="Search the catalog" aria-label={`Search: ${label}`} value={q} onChange={(e) => setQ(e.target.value)} />
      {loading && <p className="muted" role="status">Loading products…</p>}
      {error && <ErrorBanner message={error} onRetry={retry} />}
      {!loading && !error && shown.length === 0 && <p className="muted">No products match “{q}”.</p>}
      <ul className="picker-list">
        {shown.map((p) => (
          <li key={p.id}>
            <label className={value === p.id ? "pick on" : "pick"}>
              <input type="radio" name={label} checked={value === p.id} onChange={() => onChange(p.id)} />
              <img src={p.image_url} alt="" />
              <span className="pick-text">
                <strong>{p.name}</strong>
                <small>{p.category} · {formatPrice(p.price, p.currency)}</small>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </fieldset>
  );
}
