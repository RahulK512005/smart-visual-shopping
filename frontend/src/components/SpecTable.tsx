import type { SpecValue } from "@/lib/types";

export function SpecTable({ specs, caption }: { specs: Record<string, SpecValue>; caption?: string }) {
  const rows = Object.entries(specs);
  if (!rows.length) return <p className="text-sm text-muted">No specifications are listed for this product.</p>;
  return (
    <table className="w-full text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k} className="border-b border-line last:border-0">
            <th scope="row" className="w-2/5 py-2 pr-3 font-medium text-muted">{k}</th>
            <td className="py-2 break-words">{String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
