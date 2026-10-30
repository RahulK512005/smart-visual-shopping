import type { SpecValue } from "@/lib/types";

const pretty = (k: string) => k.replace(/_/g, " ");
const show = (v: SpecValue) => (Array.isArray(v) ? (v as unknown[]).join(", ") : String(v));

export function SpecTable({ specs, caption }: { specs: Record<string, SpecValue>; caption?: string }) {
  const rows = Object.entries(specs);
  if (!rows.length) return <p className="text-sm text-muted">No specifications are listed for this product.</p>;
  return (
    <table className="w-full text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-line last:border-0">
            <th scope="row" className="w-2/5 py-2.5 pr-3 text-xs font-bold uppercase tracking-wide capitalize text-muted">{pretty(k)}</th>
            <td className="break-words py-2.5 font-medium">{show(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
